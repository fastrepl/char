#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TranscriptWord {
    pub id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct PartialWord {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SpeakerHint {
    pub word_id: String,
    pub speaker_index: i32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TranscriptUpdate {
    pub new_final_words: Vec<TranscriptWord>,
    pub speaker_hints: Vec<SpeakerHint>,
    /// Current partials across **all** channels — a global snapshot, not a
    /// per-channel delta. When channel 0 finalizes, this field still includes
    /// channel 1's in-progress words. Callers that only care about newly
    /// finalized words can ignore this and call
    /// [`crate::view::TranscriptView::frame`] for a complete frame snapshot.
    pub partial_words: Vec<PartialWord>,
}

/// Complete snapshot of transcript state at a point in time.
///
/// This is the rendering contract: everything a UI layer needs to draw one
/// frame, whether that UI is the terminal replay tool, the TypeScript
/// frontend, or a test assertion. Produced by `TranscriptView::frame()`.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TranscriptFrame {
    pub final_words: Vec<TranscriptWord>,
    pub partial_words: Vec<PartialWord>,
    pub speaker_hints: Vec<SpeakerHint>,
}

// ── Internal pipeline type ───────────────────────────────────────────────────

/// Pre-finalization word data — the lingua franca of the accumulator pipeline.
///
/// Produced by [`crate::accumulator::words::assemble`] from raw ASR tokens and
/// consumed by the pipeline stages (`dedup`, `stitch`, `splice`, …) before
/// being promoted to [`TranscriptWord`] via `finalize_words`.
///
/// Also carried in [`crate::input::TranscriptInput`], so callers that
/// construct synthetic inputs (tests, non-ASR sources) work with this type.
#[derive(Debug, Clone)]
pub struct RawWord {
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    pub speaker: Option<i32>,
}

impl RawWord {
    pub fn to_final(self, id: String) -> (TranscriptWord, Option<SpeakerHint>) {
        let hint = self.speaker.map(|speaker_index| SpeakerHint {
            word_id: id.clone(),
            speaker_index,
        });
        let word = TranscriptWord {
            id,
            text: self.text,
            start_ms: self.start_ms,
            end_ms: self.end_ms,
            channel: self.channel,
        };
        (word, hint)
    }

    pub fn to_partial(&self) -> PartialWord {
        PartialWord {
            text: self.text.clone(),
            start_ms: self.start_ms,
            end_ms: self.end_ms,
            channel: self.channel,
        }
    }
}
