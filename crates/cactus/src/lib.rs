mod error;
mod ffi_utils;
mod llm;
mod model;
mod response;
mod stt;

pub use error::Error;
pub use llm::{CompleteOptions, Message, complete_stream};
pub use model::Model;
pub use response::CactusResponse;
pub use stt::{Language, StreamResult, TranscribeOptions, Transcriber};

pub use hypr_llm_types::{Response, StreamingParser};
