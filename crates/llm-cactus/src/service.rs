use std::{
    future::Future,
    path::PathBuf,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use axum::{
    body::Body,
    http::{Request, StatusCode},
    response::{IntoResponse, Response, sse},
};
use futures_util::StreamExt;
use tokio_util::sync::CancellationToken;
use tower::Service;

use hypr_llm_types::Response as LlmResponse;

#[derive(Clone)]
pub struct CompleteService {
    model: Arc<hypr_cactus::Model>,
}

impl CompleteService {
    pub fn builder() -> CompleteServiceBuilder {
        CompleteServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct CompleteServiceBuilder {
    model_path: Option<PathBuf>,
}

impl CompleteServiceBuilder {
    pub fn model_path(mut self, model_path: PathBuf) -> Self {
        self.model_path = Some(model_path);
        self
    }

    pub fn build(self) -> CompleteService {
        let model_path = self
            .model_path
            .expect("CompleteServiceBuilder requires model_path");
        let model = hypr_cactus::Model::new(&model_path)
            .unwrap_or_else(|e| panic!("failed to load model from {}: {e}", model_path.display()));
        CompleteService {
            model: Arc::new(model),
        }
    }
}

impl Service<Request<Body>> for CompleteService {
    type Response = Response;
    type Error = String;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let model = Arc::clone(&self.model);

        Box::pin(async move {
            let body_bytes = match axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await {
                Ok(b) => b,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let request: ChatCompletionRequest = match serde_json::from_slice(&body_bytes) {
                Ok(r) => r,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let is_stream = request.stream.unwrap_or(false);
            let messages = convert_messages(&request.messages);
            let options = build_options(&request);

            let (stream, cancellation_token, _worker_handle) =
                match hypr_cactus::complete_stream(&model, messages, options) {
                    Ok(tuple) => tuple,
                    Err(e) => {
                        return Ok(
                            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
                        );
                    }
                };

            if is_stream {
                Ok(build_streaming_response(
                    stream,
                    cancellation_token,
                    &request.model,
                ))
            } else {
                Ok(build_non_streaming_response(stream, &request.model).await)
            }
        })
    }
}

#[derive(serde::Deserialize)]
struct ChatCompletionRequest {
    #[serde(default)]
    model: Option<String>,
    messages: Vec<ChatMessage>,
    #[serde(default)]
    stream: Option<bool>,
    #[serde(default)]
    temperature: Option<f32>,
    #[serde(default)]
    top_p: Option<f32>,
    #[serde(default)]
    max_tokens: Option<u32>,
    #[serde(default)]
    max_completion_tokens: Option<u32>,
}

#[derive(serde::Deserialize)]
struct ChatMessage {
    role: String,
    #[serde(default)]
    content: Option<String>,
}

fn convert_messages(messages: &[ChatMessage]) -> Vec<hypr_llm_types::Message> {
    messages
        .iter()
        .map(|m| hypr_llm_types::Message {
            role: m.role.clone(),
            content: m.content.clone().unwrap_or_default(),
        })
        .collect()
}

fn build_options(request: &ChatCompletionRequest) -> hypr_cactus::CompleteOptions {
    hypr_cactus::CompleteOptions {
        temperature: request.temperature,
        top_p: request.top_p,
        max_tokens: request.max_completion_tokens.or(request.max_tokens),
        ..Default::default()
    }
}

fn model_name(model: &Option<String>) -> &str {
    model.as_deref().unwrap_or("cactus")
}

fn build_streaming_response(
    stream: impl futures_util::Stream<Item = LlmResponse> + Send + 'static,
    _cancellation_token: CancellationToken,
    model: &Option<String>,
) -> Response {
    let id = format!("chatcmpl-{}", uuid::Uuid::new_v4());
    let created = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let model_name = model_name(model).to_string();

    let event_stream = stream.filter_map(move |item| {
        let id = id.clone();
        let model_name = model_name.clone();

        async move {
            let delta = match item {
                LlmResponse::TextDelta(text) => {
                    serde_json::json!({ "content": text, "role": "assistant" })
                }
                LlmResponse::ToolCall { name, arguments } => {
                    serde_json::json!({
                        "tool_calls": [{
                            "index": 0,
                            "id": format!("call_{}", uuid::Uuid::new_v4()),
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": serde_json::to_string(&arguments).unwrap_or_default()
                            }
                        }]
                    })
                }
                LlmResponse::Reasoning(_) => return None,
            };

            let chunk = serde_json::json!({
                "id": id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model_name,
                "choices": [{
                    "index": 0,
                    "delta": delta,
                    "finish_reason": null
                }]
            });

            let data = serde_json::to_string(&chunk).unwrap_or_default();
            Some(Ok::<_, std::convert::Infallible>(
                sse::Event::default().data(data),
            ))
        }
    });

    sse::Sse::new(event_stream).into_response()
}

async fn build_non_streaming_response(
    stream: impl futures_util::Stream<Item = LlmResponse> + Send + 'static,
    model: &Option<String>,
) -> Response {
    futures_util::pin_mut!(stream);

    let mut content = String::new();
    let mut tool_calls: Vec<serde_json::Value> = Vec::new();

    while let Some(item) = stream.next().await {
        match item {
            LlmResponse::TextDelta(text) => content.push_str(&text),
            LlmResponse::ToolCall { name, arguments } => {
                tool_calls.push(serde_json::json!({
                    "id": format!("call_{}", uuid::Uuid::new_v4()),
                    "type": "function",
                    "function": {
                        "name": name,
                        "arguments": serde_json::to_string(&arguments).unwrap_or_default()
                    }
                }));
            }
            LlmResponse::Reasoning(_) => {}
        }
    }

    let id = format!("chatcmpl-{}", uuid::Uuid::new_v4());
    let created = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut message = serde_json::json!({ "role": "assistant" });
    if !content.is_empty() {
        message["content"] = serde_json::Value::String(content);
    }
    if !tool_calls.is_empty() {
        message["tool_calls"] = serde_json::Value::Array(tool_calls);
    }

    let response = serde_json::json!({
        "id": id,
        "object": "chat.completion",
        "created": created,
        "model": model_name(model),
        "choices": [{
            "index": 0,
            "message": message,
            "finish_reason": "stop"
        }]
    });

    axum::Json(response).into_response()
}
