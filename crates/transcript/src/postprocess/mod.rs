use std::future::Future;
use std::pin::Pin;

use crate::types::TranscriptWord;

pub type PostProcessError = Box<dyn std::error::Error + Send + Sync + 'static>;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// A snapshot of what changed as a result of one postprocessing pass.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PostProcessUpdate {
    /// The updated words. IDs are identical to the originals so the
    /// frontend can match them to existing displayed words.
    pub updated: Vec<TranscriptWord>,
    /// IDs of the words that were replaced, one-to-one with `updated`.
    pub replaced_ids: Vec<String>,
}

/// Async postprocessor contract for finalized transcript words.
///
/// An implementation receives a batch of finalized [`TranscriptWord`]s and
/// returns a replacement slice of the **same length** with updated text.
/// Word IDs must be preserved — the frontend relies on them to match
/// updates to already-displayed words.
///
/// The caller decides which words to feed in (all finals, last N, new since
/// last run) and is responsible for scheduling. The recommended pattern:
///
/// ```ignore
/// let words = view.frame().final_words.clone();  // snapshot
/// let result = processor.process(&words).await?; // async, may take 1-2s
/// let update = view.apply_postprocess(result);   // apply by ID match
/// ```
///
/// Staleness is handled automatically: if the session resets or words change
/// between snapshot and apply, unknown IDs are silently ignored.
///
/// # Object safety
///
/// The trait is object-safe via the explicit `BoxFuture` return type. Use
/// `dyn PostProcessor` when you need dynamic dispatch.
pub trait PostProcessor: Send + Sync {
    fn process<'a>(
        &'a self,
        words: &'a [TranscriptWord],
    ) -> BoxFuture<'a, Result<Vec<TranscriptWord>, PostProcessError>>;
}
