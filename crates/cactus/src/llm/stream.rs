use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

use futures_util::Stream;
use hypr_llm_types::{Response, StreamingParser};
use tokio::sync::mpsc::UnboundedSender;
use tokio_stream::wrappers::UnboundedReceiverStream;
use tokio_util::sync::CancellationToken;

use crate::error::Result;
use crate::model::Model;

use super::CompleteOptions;
use super::Message;

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
        if let Some(response) = self.parser.flush() {
            let _ = self.tx.send(response);
        }
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

/// A streaming LLM completion session.
///
/// Implements [`Stream`] yielding [`Response`] items. Cancelling the stream
/// (via [`CompletionStream::cancel`] or by dropping) stops the underlying
/// inference and joins the worker thread.
pub struct CompletionStream {
    inner: UnboundedReceiverStream<Response>,
    cancellation_token: CancellationToken,
    handle: Option<std::thread::JoinHandle<()>>,
}

impl CompletionStream {
    /// Returns a reference to the cancellation token for external use
    /// (e.g. attaching a `drop_guard`).
    pub fn cancellation_token(&self) -> &CancellationToken {
        &self.cancellation_token
    }

    /// Signal the worker to stop generating tokens.
    pub fn cancel(&self) {
        self.cancellation_token.cancel();
    }
}

impl Stream for CompletionStream {
    type Item = Response;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        Pin::new(&mut self.inner).poll_next(cx)
    }
}

impl Drop for CompletionStream {
    fn drop(&mut self) {
        self.cancellation_token.cancel();
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

pub fn complete_stream(
    model: &Arc<Model>,
    messages: Vec<Message>,
    options: CompleteOptions,
) -> Result<CompletionStream> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let cancellation_token = CancellationToken::new();

    let model = Arc::clone(model);
    let worker_cancellation_token = cancellation_token.clone();

    let handle = std::thread::spawn(move || {
        run_stream_worker(model, messages, options, worker_cancellation_token, tx);
    });

    let inner = UnboundedReceiverStream::new(rx);
    Ok(CompletionStream {
        inner,
        cancellation_token,
        handle: Some(handle),
    })
}
