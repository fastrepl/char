use owhisper_interface::stream::StreamResponse;

use crate::accumulator::words::assemble;
use crate::types::RawWord;

/// Provider-agnostic input to the transcript accumulator.
///
/// Convert your provider-specific event type into `TranscriptInput` before
/// feeding it to [`crate::accumulator::TranscriptAccumulator::process`] or
/// [`crate::view::TranscriptView::process`]. This keeps the accumulator core
/// free of provider dependencies and makes it easy to feed corrections or
/// synthetic events without going through a wire-format struct.
///
/// For the `owhisper_interface` wire format use
/// [`TranscriptInput::from_stream_response`].
#[derive(Debug, Clone)]
pub enum TranscriptInput {
    Final { words: Vec<RawWord> },
    Partial { words: Vec<RawWord> },
    Correction { words: Vec<RawWord> },
}

impl TranscriptInput {
    /// Convert an `owhisper_interface` streaming response into a
    /// `TranscriptInput`, running the transcript-as-oracle word assembly.
    ///
    /// Returns `None` for non-transcript variants (metadata, errors, …) and
    /// for responses whose word list and transcript string are both empty.
    pub fn from_stream_response(response: &StreamResponse) -> Option<Self> {
        let (is_final, channel, channel_index, metadata) = match response {
            StreamResponse::TranscriptResponse {
                is_final,
                channel,
                channel_index,
                metadata,
                ..
            } => (*is_final, channel, channel_index, metadata),
            _ => return None,
        };

        let is_correction = metadata
            .extra
            .as_ref()
            .and_then(|e| e.get("cloud_corrected"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let alt = channel.alternatives.first()?;
        if alt.words.is_empty() && alt.transcript.is_empty() {
            return None;
        }

        let ch = channel_index.first().copied().unwrap_or(0);
        let words = assemble(&alt.words, &alt.transcript, ch);
        if words.is_empty() {
            return None;
        }

        Some(if is_correction {
            Self::Correction { words }
        } else if is_final {
            Self::Final { words }
        } else {
            Self::Partial { words }
        })
    }
}
