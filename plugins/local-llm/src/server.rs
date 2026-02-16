use std::net::{Ipv4Addr, SocketAddr};
use std::pin::Pin;
use std::sync::{Arc, Mutex};

use async_openai::types::{
    ChatChoice, ChatChoiceStream, ChatCompletionMessageToolCallChunk,
    ChatCompletionResponseMessage, ChatCompletionStreamResponseDelta, ChatCompletionToolType,
    CreateChatCompletionRequest, CreateChatCompletionResponse, CreateChatCompletionStreamResponse,
    FunctionCallStream, Role,
};
use axum::{
    Router,
    extract::State as AxumState,
    http::StatusCode,
    response::{IntoResponse, Json, Response, sse},
    routing::{get, post},
};

use futures_util::StreamExt;
use reqwest_streams::error::StreamBodyError;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use tower_http::cors::{self, CorsLayer};

use hypr_llm_types::Response as LlmResponse;

use crate::{ModelManager, events::LLMEvent};

type StreamWithCancellation = (
    Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send + 'static>>,
    CancellationToken,
);

#[derive(Clone)]
pub struct ServerHandle {
    pub addr: SocketAddr,
    pub shutdown: tokio::sync::watch::Sender<()>,
}

impl ServerHandle {
    pub fn shutdown(self) -> Result<(), tokio::sync::watch::error::SendError<()>> {
        self.shutdown.send(())
    }
}

#[derive(Clone)]
pub struct ServerState {
    pub emitter: Arc<dyn Fn(LLMEvent) + Send + Sync>,
    pub model_manager: ModelManager,
    pub cancellation_tokens: Arc<Mutex<Vec<CancellationToken>>>,
}

impl ServerState {
    pub fn new(
        emitter: impl Fn(LLMEvent) + 'static + Send + Sync,
        model_manager: ModelManager,
    ) -> Self {
        Self {
            emitter: Arc::new(emitter),
            model_manager,
            cancellation_tokens: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn cancel_all(&self) {
        if let Ok(tokens) = self.cancellation_tokens.lock() {
            for token in tokens.iter() {
                token.cancel();
            }
        }
    }

    fn register_token(&self, token: CancellationToken) {
        if let Ok(mut tokens) = self.cancellation_tokens.lock() {
            tokens.retain(|t| !t.is_cancelled());
            tokens.push(token);
        }
    }
}

pub async fn run_server(state: ServerState) -> Result<ServerHandle, crate::Error> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/cancel", get(cancel))
        .route("/chat/completions", post(chat_completions))
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin(cors::Any)
                .allow_methods(cors::Any)
                .allow_headers(cors::Any),
        );

    let listener =
        tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

    let server_addr = listener.local_addr()?;

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

    let server_handle = ServerHandle {
        addr: server_addr,
        shutdown: shutdown_tx,
    };

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                shutdown_rx.changed().await.ok();
            })
            .await
            .unwrap();
    });

    tracing::info!("local_llm_server_started {}", server_addr);
    Ok(server_handle)
}

async fn health(AxumState(state): AxumState<ServerState>) -> impl IntoResponse {
    match state.model_manager.get_model().await {
        Ok(_) => (StatusCode::OK, "OK".to_string()),
        Err(e) => (StatusCode::SERVICE_UNAVAILABLE, e.to_string()),
    }
}

// Tauri SSE client disconnects don't propagate to Axum, so we can't use a drop guard.
async fn cancel(AxumState(state): AxumState<ServerState>) -> impl IntoResponse {
    tracing::info!("canceling_all");
    state.cancel_all();
    StatusCode::OK
}

async fn chat_completions(
    AxumState(state): AxumState<ServerState>,
    Json(request): Json<CreateChatCompletionRequest>,
) -> Result<Response, (StatusCode, String)> {
    let response = if request.model == "mock-onboarding" {
        let provider = MockProvider::default();
        tracing::info!("using_mock_provider");
        provider.chat_completions(request, &state).await
    } else {
        let provider = LocalProvider::new(state.emitter.clone(), state.model_manager.clone());
        tracing::info!("using_local_provider");
        provider.chat_completions(request, &state).await
    };

    response
        .map(|r| r.into_response())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

struct LocalProvider {
    emitter: Arc<dyn Fn(LLMEvent) + Send + Sync>,
    model_manager: ModelManager,
}

impl LocalProvider {
    fn new(emitter: Arc<dyn Fn(LLMEvent) + Send + Sync>, model_manager: ModelManager) -> Self {
        Self {
            emitter,
            model_manager,
        }
    }

    async fn chat_completions(
        &self,
        request: CreateChatCompletionRequest,
        state: &ServerState,
    ) -> Result<ChatCompletionResponse, crate::Error> {
        let model = self.model_manager.get_model().await?;
        tracing::info!("loaded_model: {:?}", model.name);

        let emitter = self.emitter.clone();

        build_chat_completion_response(
            &request,
            || {
                let (stream, token) = Self::build_stream(&model, &request)?;
                state.register_token(token.clone());
                Ok(stream)
            },
            move |v| {
                emitter(LLMEvent::Progress(v));
            },
        )
        .await
    }

    fn build_stream(
        model: &hypr_llama::Llama,
        request: &CreateChatCompletionRequest,
    ) -> Result<StreamWithCancellation, crate::Error> {
        let messages = request
            .messages
            .iter()
            .map(hypr_llm_types::FromOpenAI::from_openai)
            .collect();

        let maybe_grammar = request
            .metadata
            .as_ref()
            .and_then(|v| v.get("grammar"))
            .and_then(|v| serde_json::from_value::<hypr_gbnf::Grammar>(v.clone()).ok());

        let grammar = match maybe_grammar {
            None => None,
            Some(g) => {
                if model.name == hypr_llama::ModelName::HyprLLM {
                    match &g {
                        hypr_gbnf::Grammar::Enhance { sections: None } => None,
                        _ => Some(g.build()),
                    }
                } else {
                    Some(g.build())
                }
            }
        };

        let tools = request.tools.clone();

        let request = hypr_llama::LlamaRequest {
            messages,
            grammar,
            tools,
            max_tokens: request.max_completion_tokens,
        };

        let (progress_sender, mut progress_receiver) = mpsc::unbounded_channel::<f64>();

        let (response_stream, cancellation_token) = model.generate_stream_with_callback(
            request,
            Box::new(move |v| {
                let _ = progress_sender.send(v);
            }),
        )?;

        let mixed_stream = async_stream::stream! {
            tokio::pin!(response_stream);

            loop {
                tokio::select! {
                    response_result = response_stream.next() => {
                        match response_result {
                            Some(response) => yield StreamEvent::Response(response),
                            None => break,
                        }
                    },
                    progress_result = progress_receiver.recv() => {
                        match progress_result {
                            Some(progress) => yield StreamEvent::Progress(progress),
                            None => {}
                        }
                    }
                }
            }
        };

        Ok((Box::pin(mixed_stream), cancellation_token))
    }
}

#[derive(Default)]
struct MockProvider {}

impl MockProvider {
    async fn chat_completions(
        &self,
        request: CreateChatCompletionRequest,
        state: &ServerState,
    ) -> Result<ChatCompletionResponse, crate::Error> {
        let content = crate::ONBOARDING_ENHANCED_MD;
        build_chat_completion_response(
            &request,
            || {
                let (stream, token) = Self::build_stream(content);
                state.register_token(token.clone());
                Ok(stream)
            },
            |_v| {},
        )
        .await
    }

    fn build_stream(
        content: impl AsRef<str>,
    ) -> (
        Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send>>,
        CancellationToken,
    ) {
        use futures_util::stream::{self, StreamExt};
        use std::time::Duration;

        let chunk_size = 30;

        let chunks = content
            .as_ref()
            .chars()
            .collect::<Vec<_>>()
            .chunks(chunk_size)
            .map(|c| c.iter().collect::<String>())
            .collect::<Vec<_>>();

        let stream = Box::pin(stream::iter(chunks).then(|chunk| async move {
            tokio::time::sleep(Duration::from_millis(50)).await;
            StreamEvent::Response(LlmResponse::TextDelta(chunk))
        }));

        let cancellation_token = CancellationToken::new();
        (stream, cancellation_token)
    }
}

#[derive(Debug, Clone)]
enum StreamEvent {
    Response(LlmResponse),
    Progress(f64),
}

async fn build_chat_completion_response(
    request: &CreateChatCompletionRequest,
    response_stream_fn: impl FnOnce() -> Result<
        Pin<Box<dyn futures_util::Stream<Item = StreamEvent> + Send>>,
        crate::Error,
    >,
    progress_fn: impl Fn(f64) + Send + Sync + 'static,
) -> Result<ChatCompletionResponse, crate::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let created = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as u32;
    let model_name = request.model.clone();

    #[allow(deprecated)]
    let empty_message = ChatCompletionResponseMessage {
        content: None,
        refusal: None,
        tool_calls: None,
        role: Role::Assistant,
        audio: None,
        function_call: None,
    };

    let empty_choice = ChatChoice {
        message: empty_message.clone(),
        index: 0,
        finish_reason: None,
        logprobs: None,
    };

    let base_response_template = CreateChatCompletionResponse {
        id: id.clone(),
        choices: vec![],
        created,
        model: model_name.clone(),
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion".to_string(),
        usage: None,
    };

    let base_stream_response_template = CreateChatCompletionStreamResponse {
        id,
        choices: vec![],
        created,
        model: model_name,
        service_tier: None,
        system_fingerprint: None,
        object: "chat.completion.chunk".to_string(),
        usage: None,
    };

    #[allow(deprecated)]
    let empty_stream_response_delta = ChatCompletionStreamResponseDelta {
        content: None,
        function_call: None,
        tool_calls: None,
        role: None,
        refusal: None,
    };

    let is_stream = request.stream.unwrap_or(false);

    if !is_stream {
        let mut stream = response_stream_fn()?;
        let mut completion = String::new();
        let mut tool_calls = Vec::new();

        while let Some(event) = futures_util::StreamExt::next(&mut stream).await {
            match event {
                StreamEvent::Response(response) => match response {
                    LlmResponse::TextDelta(chunk) => completion.push_str(&chunk),
                    LlmResponse::ToolCall { name, arguments } => {
                        tool_calls.push(async_openai::types::ChatCompletionMessageToolCall {
                            id: uuid::Uuid::new_v4().to_string(),
                            r#type: ChatCompletionToolType::Function,
                            function: async_openai::types::FunctionCall {
                                name,
                                arguments: serde_json::to_string(&arguments).unwrap_or_default(),
                            },
                        });
                    }
                    LlmResponse::Reasoning(s) => {
                        tracing::debug!("reasoning: {}", s);
                    }
                },
                StreamEvent::Progress(_) => {}
            }
        }

        let res = CreateChatCompletionResponse {
            choices: vec![ChatChoice {
                message: ChatCompletionResponseMessage {
                    content: if completion.is_empty() {
                        None
                    } else {
                        Some(completion)
                    },
                    tool_calls: if tool_calls.is_empty() {
                        None
                    } else {
                        Some(tool_calls)
                    },
                    ..empty_message
                },
                ..empty_choice
            }],
            ..base_response_template
        };

        Ok(ChatCompletionResponse::NonStream(res))
    } else {
        let source_stream = response_stream_fn()?;
        let stream = Box::pin(
            source_stream
                .enumerate()
                .map(move |(index, event)| {
                    let delta_template = empty_stream_response_delta.clone();
                    let response_template = base_stream_response_template.clone();

                    match event {
                        StreamEvent::Response(llama_response) => match llama_response {
                            LlmResponse::TextDelta(chunk) => {
                                Some(Ok(CreateChatCompletionStreamResponse {
                                    choices: vec![ChatChoiceStream {
                                        index: 0,
                                        delta: ChatCompletionStreamResponseDelta {
                                            content: Some(chunk),
                                            ..delta_template
                                        },
                                        finish_reason: None,
                                        logprobs: None,
                                    }],
                                    ..response_template
                                }))
                            }
                            LlmResponse::Reasoning(_) => None,
                            LlmResponse::ToolCall { name, arguments } => {
                                Some(Ok(CreateChatCompletionStreamResponse {
                                    choices: vec![ChatChoiceStream {
                                        index: 0,
                                        delta: ChatCompletionStreamResponseDelta {
                                            tool_calls: Some(vec![
                                                ChatCompletionMessageToolCallChunk {
                                                    index: index.try_into().unwrap_or(0),
                                                    id: Some(uuid::Uuid::new_v4().to_string()),
                                                    r#type: Some(ChatCompletionToolType::Function),
                                                    function: Some(FunctionCallStream {
                                                        name: Some(name),
                                                        arguments: Some(
                                                            serde_json::to_string(&arguments)
                                                                .unwrap_or_default(),
                                                        ),
                                                    }),
                                                },
                                            ]),
                                            ..delta_template
                                        },
                                        finish_reason: None,
                                        logprobs: None,
                                    }],
                                    ..response_template
                                }))
                            }
                        },
                        StreamEvent::Progress(v) => {
                            progress_fn(v);
                            None
                        }
                    }
                })
                .filter_map(|x| async move { x }),
        );

        Ok(ChatCompletionResponse::Stream(stream))
    }
}

pub enum ChatCompletionResponse {
    Stream(
        futures_util::stream::BoxStream<
            'static,
            Result<CreateChatCompletionStreamResponse, StreamBodyError>,
        >,
    ),
    NonStream(CreateChatCompletionResponse),
}

impl IntoResponse for ChatCompletionResponse {
    fn into_response(self) -> Response {
        match self {
            ChatCompletionResponse::Stream(stream) => {
                let event_stream = stream.map(|result| {
                    result.map(|response| {
                        let data = serde_json::to_string(&response).unwrap_or_default();
                        sse::Event::default().data(data)
                    })
                });
                sse::Sse::new(event_stream).into_response()
            }
            ChatCompletionResponse::NonStream(response) => Json(response).into_response(),
        }
    }
}
