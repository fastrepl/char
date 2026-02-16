use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

use llama_cpp_2::{
    LogOptions,
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{AddBos, LlamaModel, Special, params::LlamaModelParams},
    sampling::LlamaSampler,
    send_logs_to_tracing,
};
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_util::sync::CancellationToken;

use hypr_gguf::GgufExt;

mod error;
mod types;

pub use error::*;
pub use hypr_llm_types::{Response, StreamingParser};
pub use types::*;

const DEFAULT_MAX_INPUT_TOKENS: u32 = 1024 * 16;
const DEFAULT_MAX_OUTPUT_TOKENS: u32 = 1024 * 2;

static LLAMA_BACKEND: OnceLock<Arc<LlamaBackend>> = OnceLock::new();

#[derive(Debug, PartialEq, Eq)]
pub enum ModelName {
    HyprLLM,
    Other(Option<String>),
}

pub struct Llama {
    pub name: ModelName,
    task_sender: tokio::sync::mpsc::UnboundedSender<Task>,
}

pub enum Task {
    Generate {
        request: LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<Response>,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
        cancellation_token: CancellationToken,
    },
}

struct ProgressData {
    total: usize,
    processed: AtomicUsize,
    enabled: AtomicBool,
    callback: Mutex<Box<dyn FnMut(f64) + Send + 'static>>,
    last_reported: Mutex<i32>,
    cancellation_token: CancellationToken,
}

impl Llama {
    fn get_backend() -> Arc<LlamaBackend> {
        LLAMA_BACKEND
            .get_or_init(|| {
                let backend = LlamaBackend::init().unwrap();
                Arc::new(backend)
            })
            .clone()
    }

    fn load_model(model_path: impl AsRef<std::path::Path>) -> Result<LlamaModel, crate::Error> {
        let backend = Self::get_backend();

        let full_gpu_layers: u32 = std::num::NonZeroU32::MAX.into();
        let cpu_only_layers: u32 = 0;

        let gpu_params = LlamaModelParams::default().with_n_gpu_layers(full_gpu_layers);

        match LlamaModel::load_from_file(&backend, &model_path, &gpu_params) {
            Ok(model) => Ok(model),
            Err(_) => {
                let params = LlamaModelParams::default().with_n_gpu_layers(cpu_only_layers);
                LlamaModel::load_from_file(&backend, model_path, &params).map_err(Into::into)
            }
        }
    }

    fn get_sampler(model: &LlamaModel, grammar: Option<&str>) -> LlamaSampler {
        let mut samplers = Vec::new();

        if let Some(grammar) = grammar {
            if let Some(grammar_sampler) = LlamaSampler::grammar(model, grammar, "root") {
                samplers.push(grammar_sampler);
            }

            if cfg!(debug_assertions) {
                println!("---\n{:?}\n---", grammar);
            }
        }

        {
            // https://huggingface.co/Qwen/Qwen3-1.7B-GGUF
            samplers.push(LlamaSampler::temp(0.6));
            samplers.push(LlamaSampler::top_k(20));
            samplers.push(LlamaSampler::top_p(0.95, 10));
            samplers.push(LlamaSampler::min_p(0.0, 10));

            samplers.push(LlamaSampler::penalties(0, 1.5, 0.2, 0.2));
            samplers.push(LlamaSampler::dist(1234));
        }

        LlamaSampler::chain_simple(samplers)
    }

    fn process_prefill<'a>(
        model: &'a LlamaModel,
        backend: &LlamaBackend,
        template: &str,
        request: &LlamaRequest,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
        cancellation_token: CancellationToken,
    ) -> Result<
        (
            llama_cpp_2::context::LlamaContext<'a>,
            LlamaBatch,
            i32,
            *mut std::ffi::c_void,
            u32,
        ),
        crate::Error,
    > {
        let prompt = {
            let mut env = minijinja::Environment::new();
            env.set_unknown_method_callback(minijinja_contrib::pycompat::unknown_method_callback);

            env.add_template("chat", template).unwrap();
            env.get_template("chat")
                .unwrap()
                // https://huggingface.co/unsloth/Qwen3-1.7B/blob/main/chat_template.jinja
                .render(serde_json::json!({
                    "messages": request.messages,
                    "tools": request.tools,
                    "add_generation_prompt": true,
                    "enable_thinking": true
                }))
                .unwrap()
        };

        let mut tokens_list = model.str_to_token(&prompt, AddBos::Always).unwrap();
        tokens_list.truncate(DEFAULT_MAX_INPUT_TOKENS as usize);
        let input_tokens_len = tokens_list.len() as u32;
        let max_output_tokens = request.max_tokens.unwrap_or(DEFAULT_MAX_OUTPUT_TOKENS);

        let progress_data = Box::new(ProgressData {
            total: input_tokens_len as usize,
            processed: AtomicUsize::new(0),
            enabled: AtomicBool::new(true),
            callback: Mutex::new(callback),
            last_reported: Mutex::new(-1),
            cancellation_token,
        });
        let progress_data_ptr = Box::into_raw(progress_data) as *mut std::ffi::c_void;

        extern "C" fn cb_eval_fn(
            _t: *mut llama_cpp_sys_2::ggml_tensor,
            _ask: bool,
            user_data: *mut std::ffi::c_void,
        ) -> bool {
            if user_data.is_null() {
                return false;
            }

            unsafe {
                let progress_data = &*(user_data as *mut ProgressData);

                if progress_data.cancellation_token.is_cancelled() {
                    return true;
                }

                if progress_data.enabled.load(Ordering::Relaxed) {
                    let count = progress_data.processed.fetch_add(1, Ordering::Relaxed) + 1;

                    let mut progress = (count as f64) / ((progress_data.total * 2) as f64);
                    if progress > 1.0 {
                        progress = 1.0;
                    }

                    let rounded_progress_int = (progress * 100.0).round() as i32;

                    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        if let Ok(mut last_reported) = progress_data.last_reported.lock()
                            && *last_reported != rounded_progress_int
                        {
                            *last_reported = rounded_progress_int;
                            let rounded_progress = rounded_progress_int as f64 / 100.0;

                            if let Ok(mut cb) = progress_data.callback.lock() {
                                (cb)(rounded_progress);
                            }
                        }
                    }));
                }
            }

            false
        }

        let mut ctx = model
            .new_context(
                backend,
                LlamaContextParams::default()
                    .with_n_ctx(std::num::NonZeroU32::new(
                        input_tokens_len + max_output_tokens,
                    ))
                    .with_n_batch(input_tokens_len)
                    .with_embeddings(false)
                    .with_swa_full(false)
                    // https://github.com/ggml-org/llama.cpp/blob/f505bd8/include/llama.h#L182
                    .with_flash_attention_policy(0)
                    .with_cb_eval_user_data(progress_data_ptr)
                    .with_cb_eval(Some(cb_eval_fn)),
            )
            .unwrap();

        let batch_size = tokens_list.len().max(512);
        let mut batch = LlamaBatch::new(batch_size, 1);

        let last_index = (tokens_list.len() - 1) as i32;
        for (i, token) in (0_i32..).zip(tokens_list.into_iter()) {
            let is_last = i == last_index;
            batch.add(token, i, &[0], is_last).unwrap();
        }

        ctx.decode(&mut batch).unwrap();

        unsafe {
            let progress_data = &*(progress_data_ptr as *mut ProgressData);
            progress_data.enabled.store(false, Ordering::Relaxed);

            let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                if let Ok(mut cb) = progress_data.callback.lock() {
                    (cb)(1.0);
                }
            }));
        }

        Ok((ctx, batch, last_index, progress_data_ptr, max_output_tokens))
    }

    #[allow(clippy::too_many_arguments)]
    fn process_generation<'a>(
        model: &LlamaModel,
        mut ctx: llama_cpp_2::context::LlamaContext<'a>,
        mut batch: LlamaBatch,
        last_index: i32,
        request: &LlamaRequest,
        response_sender: tokio::sync::mpsc::UnboundedSender<Response>,
        progress_data_ptr: *mut std::ffi::c_void,
        cancellation_token: CancellationToken,
        max_output_tokens: u32,
    ) {
        let mut n_cur = batch.n_tokens();
        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut sampler = Self::get_sampler(model, request.grammar.as_deref());
        let mut parser = StreamingParser::new();

        'generation: while n_cur <= last_index + max_output_tokens as i32 {
            if cancellation_token.is_cancelled() || response_sender.is_closed() {
                break;
            }

            let token = sampler.sample(&ctx, batch.n_tokens() - 1);

            if model.is_eog_token(token) {
                break;
            }

            let output_bytes = model.token_to_bytes(token, Special::Tokenize).unwrap();
            let mut output_string = String::with_capacity(32);
            let _decode_result = decoder.decode_to_string(&output_bytes, &mut output_string, false);

            if cfg!(debug_assertions) {
                use std::io::{self, Write};
                print!("{}", output_string);
                io::stdout().flush().unwrap();
            }

            let responses = parser.process_chunk(&output_string);
            for response in responses {
                if response_sender.send(response).is_err() {
                    break 'generation;
                }
            }

            batch.clear();
            batch.add(token, n_cur, &[0], true).unwrap();

            n_cur += 1;
            if cancellation_token.is_cancelled() || response_sender.is_closed() {
                break;
            }
            ctx.decode(&mut batch).unwrap();
        }

        drop(response_sender);

        unsafe {
            let _ = Box::from_raw(progress_data_ptr as *mut ProgressData);
        }
    }

    fn setup_log() {
        send_logs_to_tracing(LogOptions::default().with_logs_enabled(false));
    }

    pub fn new(model_path: impl AsRef<std::path::Path>) -> Result<Self, crate::Error> {
        Self::setup_log();

        let template = model_path.chat_format()?.unwrap();

        let backend = Self::get_backend();
        let model = Self::load_model(model_path)?;
        let name = match model.meta_val_str("general.name") {
            Ok(name) if name == "hypr-llm" => ModelName::HyprLLM,
            Ok(name) => ModelName::Other(Some(name.to_string())),
            Err(_) => ModelName::Other(None),
        };

        let (task_sender, mut task_receiver) = tokio::sync::mpsc::unbounded_channel::<Task>();

        std::thread::spawn({
            move || {
                while let Some(task) = task_receiver.blocking_recv() {
                    match task {
                        Task::Generate {
                            request,
                            response_sender,
                            callback,
                            cancellation_token,
                        } => {
                            match Self::process_prefill(
                                &model,
                                &backend,
                                template.as_ref(),
                                &request,
                                callback,
                                cancellation_token.clone(),
                            ) {
                                Ok((
                                    ctx,
                                    batch,
                                    last_index,
                                    progress_data_ptr,
                                    max_output_tokens,
                                )) => {
                                    Self::process_generation(
                                        &model,
                                        ctx,
                                        batch,
                                        last_index,
                                        &request,
                                        response_sender,
                                        progress_data_ptr,
                                        cancellation_token,
                                        max_output_tokens,
                                    );
                                }
                                Err(e) => {
                                    tracing::error!("Prefill failed: {:?}", e);
                                    drop(response_sender);
                                }
                            }
                        }
                    }
                }
            }
        });

        Ok(Self { name, task_sender })
    }

    pub fn generate_stream(
        &self,
        request: LlamaRequest,
    ) -> Result<impl futures_util::Stream<Item = Response> + 'static, crate::Error> {
        let callback = Box::new(|_| {});
        let (stream, _cancellation_token) =
            self.generate_stream_with_callback(request, callback)?;
        Ok(stream)
    }

    pub fn generate_stream_with_callback(
        &self,
        request: LlamaRequest,
        callback: Box<dyn FnMut(f64) + Send + 'static>,
    ) -> Result<
        (
            impl futures_util::Stream<Item = Response> + 'static,
            CancellationToken,
        ),
        crate::Error,
    > {
        let (response_sender, response_receiver) =
            tokio::sync::mpsc::unbounded_channel::<Response>();
        let cancellation_token = CancellationToken::new();

        let task = Task::Generate {
            request,
            response_sender,
            callback,
            cancellation_token: cancellation_token.clone(),
        };

        self.task_sender.send(task)?;
        let stream = UnboundedReceiverStream::new(response_receiver);

        Ok((stream, cancellation_token))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{StreamExt, pin_mut};

    async fn run(model: &Llama, request: LlamaRequest) -> Vec<Response> {
        let (stream, _cancellation_token) = model
            .generate_stream_with_callback(
                request,
                Box::new(|progress| println!("progress: {}", progress)),
            )
            .unwrap();
        pin_mut!(stream);

        let mut responses = Vec::new();

        while let Some(response) = stream.next().await {
            responses.push(response.clone());
        }

        responses
    }

    fn get_model() -> Llama {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("hyprnote")
            .join("models/llm/hypr-llm.gguf");

        Llama::new(model_path).unwrap()
    }

    fn get_request() -> LlamaRequest {
        LlamaRequest {
            grammar: Some(hypr_gbnf::Grammar::Enhance { sections: None }.build()),
            messages: vec![
                LlamaMessage {
                    role: "system".into(),
                    content: "Summarize the text the user gives you.".into(),
                },
                LlamaMessage {
                    role: "user".into(),
                    content: hypr_data::english_3::WORDS_JSON.repeat(1),
                },
            ],
            ..Default::default()
        }
    }

    // cargo test test_tool -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_tool() {
        let llama = get_model();
        let request = LlamaRequest {
            messages: vec![LlamaMessage {
                role: "user".into(),
                content: "response, and say hi".into(),
            }],
            tools: Some(vec![
                async_openai::types::ChatCompletionTool {
                    r#type: async_openai::types::ChatCompletionToolType::Function,
                    function: async_openai::types::FunctionObject {
                        name: "greet".into(),
                        description: Some("Greet the user".into()),
                        strict: None,
                        parameters: Some(serde_json::json!({
                            "type": "object",
                            "properties": {
                                "text": { "type": "string" },
                            }
                        })),
                    },
                },
                async_openai::types::ChatCompletionTool {
                    r#type: async_openai::types::ChatCompletionToolType::Function,
                    function: async_openai::types::FunctionObject {
                        name: "response".into(),
                        description: Some("Response to the user".into()),
                        strict: None,
                        parameters: Some(serde_json::json!({
                            "type": "object",
                            "properties": {
                                "text": { "type": "string" },
                            }
                        })),
                    },
                },
            ]),
            ..Default::default()
        };

        run(&llama, request).await;
    }

    // cargo test test_simple -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_simple() {
        let llama = get_model();
        let request = LlamaRequest {
            messages: vec![
                LlamaMessage {
                    role: "system".into(),
                    content: "You are helpful assistamt.".into(),
                },
                LlamaMessage {
                    role: "user".into(),
                    content: "hello".into(),
                },
            ],
            max_tokens: Some(5),
            ..Default::default()
        };

        run(&llama, request).await;
    }

    // cargo test test_english_3 -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_english_3() {
        let llama = get_model();
        let request = get_request();

        run(&llama, request).await;
    }

    // cargo test test_cancel_generation -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_cancel_generation() {
        let llama = get_model();
        let request = get_request();

        let (stream, cancellation_token) = llama
            .generate_stream_with_callback(
                request,
                Box::new(|progress| println!("progress: {}", progress)),
            )
            .unwrap();
        pin_mut!(stream);

        let mut count = 0;

        while let Some(_response) = stream.next().await {
            count += 1;

            if count > 3 {
                let token_clone = cancellation_token.clone();
                std::thread::spawn(move || {
                    token_clone.cancel();
                });
            }
        }
        assert!(count < 10);
    }

    // cargo test test_cancel_prefill -p llama -- --nocapture --ignored
    #[ignore]
    #[tokio::test]
    async fn test_cancel_prefill() {
        use std::sync::{Arc, Mutex};

        let llama = get_model();
        let request = get_request();

        let last_progress = Arc::new(Mutex::new(0.0));
        let last_progress_clone = last_progress.clone();

        let (_stream, cancellation_token) = llama
            .generate_stream_with_callback(
                request,
                Box::new(move |progress| {
                    println!("progress: {}", progress);
                    *last_progress_clone.lock().unwrap() = progress;
                }),
            )
            .unwrap();

        let token_clone = cancellation_token.clone();
        let handle = tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(3000)).await;
            token_clone.cancel();
        });

        handle.await.unwrap();
        assert!(*last_progress.lock().unwrap() < 0.5);
    }
}
