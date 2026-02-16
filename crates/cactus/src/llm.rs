use std::ffi::{CStr, CString};
use std::sync::Arc;

use hypr_llm_types::{Response, StreamingParser};
use tokio::sync::mpsc::UnboundedSender;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_util::sync::CancellationToken;

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, parse_response_buf};
use crate::model::Model;
use crate::response::CactusResponse;

pub use hypr_llm_types::Message;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct CompleteOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,
}

type TokenCallback = unsafe extern "C" fn(*const std::ffi::c_char, u32, *mut std::ffi::c_void);

struct CallbackState<'a, F: FnMut(&str) -> bool> {
    on_token: &'a mut F,
    stopped: bool,
}

unsafe extern "C" fn token_trampoline<F: FnMut(&str) -> bool>(
    token: *const std::ffi::c_char,
    _token_id: u32,
    user_data: *mut std::ffi::c_void,
) {
    if token.is_null() || user_data.is_null() {
        return;
    }

    unsafe {
        let state = &mut *(user_data as *mut CallbackState<F>);
        let chunk = CStr::from_ptr(token).to_string_lossy();
        if !(state.on_token)(&chunk) {
            state.stopped = true;
        }
    }
}

fn serialize_complete_request(
    messages: &[Message],
    options: &CompleteOptions,
) -> Result<(CString, CString)> {
    let messages_c = CString::new(serde_json::to_string(messages)?)?;
    let options_c = CString::new(serde_json::to_string(options)?)?;
    Ok((messages_c, options_c))
}

fn complete_error(rc: i32) -> Error {
    Error::from_ffi_or(format!("cactus_complete failed ({rc})"))
}

struct StreamWorker {
    model: Arc<Model>,
    cancellation_token: CancellationToken,
    tx: UnboundedSender<Response>,
    parser: StreamingParser,
}

impl StreamWorker {
    fn new(
        model: Arc<Model>,
        cancellation_token: CancellationToken,
        tx: UnboundedSender<Response>,
    ) -> Self {
        Self {
            model,
            cancellation_token,
            tx,
            parser: StreamingParser::new(),
        }
    }

    fn should_continue(&self) -> bool {
        if self.cancellation_token.is_cancelled() || self.tx.is_closed() {
            self.model.stop();
            return false;
        }
        true
    }

    fn emit_chunk_responses(&mut self, chunk: &str) -> bool {
        for response in self.parser.process_chunk(chunk) {
            if self.tx.send(response).is_err() {
                self.model.stop();
                return false;
            }
        }
        true
    }

    fn handle_chunk(&mut self, chunk: &str) -> bool {
        if !self.should_continue() {
            return false;
        }

        self.emit_chunk_responses(chunk)
    }

    fn run(&mut self, messages: &[Message], options: &CompleteOptions) {
        let model = Arc::clone(&self.model);
        let _ = model.complete_streaming(messages, options, |chunk| self.handle_chunk(chunk));
    }
}

fn run_stream_worker(
    model: Arc<Model>,
    messages: Vec<Message>,
    options: CompleteOptions,
    worker_cancellation_token: CancellationToken,
    tx: UnboundedSender<Response>,
) {
    let mut worker = StreamWorker::new(model, worker_cancellation_token, tx);
    worker.run(&messages, &options);
}

impl Model {
    fn call_complete(
        &self,
        messages_c: &CString,
        options_c: &CString,
        callback: Option<TokenCallback>,
        user_data: *mut std::ffi::c_void,
    ) -> (i32, Vec<u8>) {
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_complete(
                self.raw_handle(),
                messages_c.as_ptr(),
                buf.as_mut_ptr().cast::<i8>(),
                buf.len(),
                options_c.as_ptr(),
                std::ptr::null(),
                callback,
                user_data,
            )
        };

        (rc, buf)
    }

    pub fn complete(
        &self,
        messages: &[Message],
        options: &CompleteOptions,
    ) -> Result<CactusResponse> {
        let (messages_c, options_c) = serialize_complete_request(messages, options)?;
        let (rc, buf) = self.call_complete(&messages_c, &options_c, None, std::ptr::null_mut());

        if rc < 0 {
            return Err(complete_error(rc));
        }

        parse_response_buf(&buf)
    }

    pub fn complete_streaming<F>(
        &self,
        messages: &[Message],
        options: &CompleteOptions,
        mut on_token: F,
    ) -> Result<CactusResponse>
    where
        F: FnMut(&str) -> bool,
    {
        let (messages_c, options_c) = serialize_complete_request(messages, options)?;

        let mut state = CallbackState {
            on_token: &mut on_token,
            stopped: false,
        };

        let (rc, buf) = self.call_complete(
            &messages_c,
            &options_c,
            Some(token_trampoline::<F>),
            (&mut state as *mut CallbackState<F>).cast::<std::ffi::c_void>(),
        );

        if rc < 0 && !state.stopped {
            return Err(complete_error(rc));
        }

        parse_response_buf(&buf)
    }
}

pub fn complete_stream(
    model: &Arc<Model>,
    messages: Vec<Message>,
    options: CompleteOptions,
) -> Result<(
    impl futures_util::Stream<Item = Response> + 'static,
    CancellationToken,
)> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let cancellation_token = CancellationToken::new();

    let model = Arc::clone(model);
    let worker_cancellation_token = cancellation_token.clone();

    std::thread::spawn(move || {
        run_stream_worker(model, messages, options, worker_cancellation_token, tx);
    });

    let stream = UnboundedReceiverStream::new(rx);
    Ok((stream, cancellation_token))
}
