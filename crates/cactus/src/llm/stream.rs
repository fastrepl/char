use std::sync::Arc;

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

pub fn complete_stream(
    model: &Arc<Model>,
    messages: Vec<Message>,
    options: CompleteOptions,
) -> Result<(
    impl futures_util::Stream<Item = Response> + 'static,
    CancellationToken,
    std::thread::JoinHandle<()>,
)> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let cancellation_token = CancellationToken::new();

    let model = Arc::clone(model);
    let worker_cancellation_token = cancellation_token.clone();

    let handle = std::thread::spawn(move || {
        run_stream_worker(model, messages, options, worker_cancellation_token, tx);
    });

    let stream = UnboundedReceiverStream::new(rx);
    Ok((stream, cancellation_token, handle))
}
