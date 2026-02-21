use crate::accumulator::{FlushMode, TranscriptAccumulator};
use crate::id::{IdGenerator, UuidIdGen};
use crate::input::TranscriptInput;
use crate::postprocess::PostProcessUpdate;
use crate::types::{SpeakerHint, TranscriptFrame, TranscriptWord};

/// Debug snapshot of the accumulator pipeline state, intended for tooling and
/// visualisation only. Not part of the stable rendering contract.
#[derive(Debug, Clone, Default)]
pub struct PipelineDebugFrame {
    /// Each partial word currently in flight, paired with the number of
    /// consecutive partial responses that have confirmed it unchanged.
    /// Higher counts mean the word is more stable and closer to promotion.
    pub partial_stability: Vec<(String, u32)>,
    /// Number of postprocess batches applied via [`TranscriptView::apply_postprocess`]
    /// since this view was created (or last reset).
    pub postprocess_applied: usize,
    /// The word currently held by the stitch stage, per channel.
    /// Format: (channel_index, word_text).
    pub held_words: Vec<(i32, String)>,
    /// The dedup watermark (end_ms of the last finalized word) per channel.
    /// Format: (channel_index, watermark_ms).
    pub watermarks: Vec<(i32, i64)>,
}

/// Stateful driver that accumulates responses and exposes a complete
/// [`TranscriptFrame`] snapshot on every update.
///
/// Use this when your renderer wants to read the full current state (e.g., a
/// terminal UI or a test assertion) rather than handle deltas manually.
/// For fine-grained delta control (e.g., a Tauri plugin that needs to persist
/// only newly finalized words), use [`TranscriptAccumulator`] directly.
pub struct TranscriptView {
    acc: TranscriptAccumulator,
    final_words: Vec<TranscriptWord>,
    speaker_hints: Vec<SpeakerHint>,
    postprocess_applied: usize,
}

impl TranscriptView {
    pub fn new() -> Self {
        Self::with_config(UuidIdGen)
    }

    pub fn with_config(id_gen: impl IdGenerator + 'static) -> Self {
        Self {
            acc: TranscriptAccumulator::with_config(id_gen),
            final_words: Vec::new(),
            speaker_hints: Vec::new(),
            postprocess_applied: 0,
        }
    }

    /// Feed one [`TranscriptInput`]. Returns `true` if the visible frame changed.
    pub fn process(&mut self, input: TranscriptInput) -> bool {
        match self.acc.process(input) {
            Some(update) => {
                self.final_words.extend(update.new_final_words);
                self.speaker_hints.extend(update.speaker_hints);
                true
            }
            None => false,
        }
    }

    /// Drain any held or partial words at session end.
    ///
    /// - [`FlushMode::DrainAll`]: promotes everything, including transient
    ///   partials. Suitable for hard session end.
    /// - [`FlushMode::PromotableOnly`]: drops partials that do not satisfy
    ///   the promotion policy; held words (already ASR-confirmed) are always
    ///   promoted. Suitable for graceful close when noisy tails are unwanted.
    pub fn flush(&mut self, mode: FlushMode) {
        let update = self.acc.flush(mode);
        self.final_words.extend(update.new_final_words);
        self.speaker_hints.extend(update.speaker_hints);
    }

    /// Returns the complete snapshot needed to render the current transcript.
    pub fn frame(&self) -> TranscriptFrame {
        TranscriptFrame {
            final_words: self.final_words.clone(),
            partial_words: self.acc.all_partials(),
            speaker_hints: self.speaker_hints.clone(),
        }
    }

    /// Returns a debug snapshot of internal pipeline state.
    ///
    /// Intended for tooling and visualisation; not part of the stable
    /// rendering contract and may change freely.
    pub fn pipeline_debug(&self) -> PipelineDebugFrame {
        PipelineDebugFrame {
            partial_stability: self.acc.partial_stability(),
            postprocess_applied: self.postprocess_applied,
            held_words: self.acc.held_words(),
            watermarks: self.acc.watermarks(),
        }
    }

    /// Apply a batch of postprocessed words back into the transcript.
    ///
    /// Each word is matched to an existing final word by `id`. Words whose IDs
    /// are not found are silently ignored (e.g., if the session was reset
    /// between the snapshot and the apply).
    ///
    /// Returns a [`PostProcessUpdate`] describing what changed, suitable for
    /// sending to the frontend as a distinct event (separate from new-word
    /// events so the UI can animate updates differently).
    pub fn apply_postprocess(&mut self, words: Vec<TranscriptWord>) -> PostProcessUpdate {
        let mut updated = Vec::new();
        let mut replaced_ids = Vec::new();

        for word in words {
            if let Some(existing) = self.final_words.iter_mut().find(|w| w.id == word.id) {
                replaced_ids.push(existing.id.clone());
                *existing = word.clone();
                updated.push(word);
            }
        }

        if !updated.is_empty() {
            self.postprocess_applied += 1;
        }

        PostProcessUpdate {
            updated,
            replaced_ids,
        }
    }
}

impl Default for TranscriptView {
    fn default() -> Self {
        Self::new()
    }
}

// ── Convenience conversions ──────────────────────────────────────────────────

impl TranscriptFrame {
    /// Collect all words (final + partial) in chronological order, tagged by finality.
    /// Useful for renderers that want a single flat word list.
    pub fn all_words(&self) -> impl Iterator<Item = (&str, bool)> {
        self.final_words
            .iter()
            .map(|w| (w.text.as_str(), true))
            .chain(self.partial_words.iter().map(|w| (w.text.as_str(), false)))
    }
}

impl From<TranscriptView> for TranscriptFrame {
    fn from(mut view: TranscriptView) -> Self {
        view.flush(FlushMode::DrainAll);
        view.frame()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use owhisper_interface::stream::{Alternatives, Channel, Metadata, ModelInfo};

    fn make_response(
        words: &[(&str, f64, f64)],
        transcript: &str,
        is_final: bool,
    ) -> owhisper_interface::stream::StreamResponse {
        owhisper_interface::stream::StreamResponse::TranscriptResponse {
            start: 0.0,
            duration: 0.0,
            is_final,
            speech_final: is_final,
            from_finalize: false,
            channel: Channel {
                alternatives: vec![Alternatives {
                    transcript: transcript.to_string(),
                    words: words
                        .iter()
                        .map(|&(t, s, e)| owhisper_interface::stream::Word {
                            word: t.to_string(),
                            start: s,
                            end: e,
                            confidence: 1.0,
                            speaker: None,
                            punctuated_word: Some(t.to_string()),
                            language: None,
                        })
                        .collect(),
                    confidence: 1.0,
                    languages: vec![],
                }],
            },
            metadata: Metadata {
                request_id: String::new(),
                model_info: ModelInfo {
                    name: String::new(),
                    version: String::new(),
                    arch: String::new(),
                },
                model_uuid: String::new(),
                extra: None,
            },
            channel_index: vec![0],
        }
    }

    fn process_sr(
        view: &mut TranscriptView,
        sr: &owhisper_interface::stream::StreamResponse,
    ) -> bool {
        if let Some(input) = TranscriptInput::from_stream_response(sr) {
            view.process(input)
        } else {
            false
        }
    }

    #[test]
    fn frame_reflects_partials() {
        let mut view = TranscriptView::new();

        process_sr(
            &mut view,
            &make_response(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
                false,
            ),
        );

        let frame = view.frame();
        assert!(frame.final_words.is_empty());
        assert_eq!(frame.partial_words.len(), 2);
    }

    #[test]
    fn frame_accumulates_finals_across_calls() {
        let mut view = TranscriptView::new();

        process_sr(
            &mut view,
            &make_response(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
                true,
            ),
        );
        process_sr(
            &mut view,
            &make_response(&[(" foo", 1.0, 1.3), (" bar", 1.4, 1.7)], " foo bar", true),
        );

        // accumulator holds last word of each batch; flush drains them
        view.flush(FlushMode::DrainAll);
        let flushed = view.frame();
        assert_eq!(flushed.final_words.len(), 4);
        assert!(flushed.partial_words.is_empty());
    }

    #[test]
    fn into_frame_flushes_automatically() {
        let mut view = TranscriptView::new();
        process_sr(
            &mut view,
            &make_response(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
                true,
            ),
        );
        let frame: TranscriptFrame = view.into();
        assert_eq!(frame.final_words.len(), 2);
    }

    #[test]
    fn apply_postprocess_patches_existing_words() {
        use crate::id::SequentialIdGen;
        let mut view = TranscriptView::with_config(SequentialIdGen::new());

        process_sr(
            &mut view,
            &make_response(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
                true,
            ),
        );
        view.flush(FlushMode::DrainAll);

        let frame = view.frame();
        assert_eq!(frame.final_words.len(), 2);

        let original_id = frame.final_words[0].id.clone();
        let corrected_word = TranscriptWord {
            id: original_id.clone(),
            text: " Hello!".to_string(),
            start_ms: frame.final_words[0].start_ms,
            end_ms: frame.final_words[0].end_ms,
            channel: frame.final_words[0].channel,
        };

        let update = view.apply_postprocess(vec![corrected_word]);
        assert_eq!(update.updated.len(), 1);
        assert_eq!(update.replaced_ids, [original_id]);
        assert_eq!(view.frame().final_words[0].text, " Hello!");
    }

    #[test]
    fn apply_postprocess_ignores_unknown_ids() {
        let mut view = TranscriptView::new();
        let update = view.apply_postprocess(vec![TranscriptWord {
            id: "nonexistent".to_string(),
            text: " x".to_string(),
            start_ms: 0,
            end_ms: 100,
            channel: 0,
        }]);
        assert!(update.updated.is_empty());
        assert!(update.replaced_ids.is_empty());
    }
}
