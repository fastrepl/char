mod error;
mod ffi_utils;
mod llm;
mod model;
mod stt;
mod vad;

pub use error::Error;
pub use hypr_language::Language;
pub use llm::{CompleteOptions, CompletionResult, Message, complete_stream};
pub use model::Model;
pub use stt::{
    StreamResult, TranscribeEvent, TranscribeOptions, Transcriber, TranscriptionResult,
    constrain_to, transcribe_stream,
};
pub use vad::{VadOptions, VadResult, VadSegment};

pub use hypr_llm_types::{Response, StreamingParser};
