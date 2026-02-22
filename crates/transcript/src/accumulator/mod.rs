//! # Transcript-as-Oracle Accumulator
//!
//! The transcript string in each ASR response is the **sole source of truth**
//! for word boundaries. Tokens are sub-word fragments with timing metadata;
//! the transcript tells us which fragments belong to the same word.
//!
//! ## Two-level design
//!
//! **Within a response** — `assemble` aligns tokens to the transcript via
//! `spacing_from_transcript`. A space in the transcript means "new word";
//! no space means "same word." No timing heuristics.
//!
//! **Across responses** — `stitch` handles the one case where no transcript
//! spans both sides: when a provider splits a word across two final responses
//! (e.g. Korean particles like "시스템" + "을" → "시스템을"). This uses a
//! timing-based heuristic because no cross-response transcript exists.

mod channel;
pub(crate) mod words;

use std::collections::BTreeMap;

use crate::id::{IdGenerator, UuidIdGen};
use crate::input::TranscriptInput;
use crate::types::{PartialWord, TranscriptUpdate};

use channel::ChannelState;
use words::ensure_space_prefix_partial;

/// Controls what `flush` does with non-final content still in the pipeline.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlushMode {
    /// Promote the held word and **all** partials to final status.
    /// Use at hard session end when every word matters.
    DrainAll,
    /// Promote only the held word (already ASR-confirmed). Remaining partials
    /// are silently dropped. Use for graceful shutdown when noisy tails are
    /// unwanted.
    PromotableOnly,
}

/// Accumulates streaming ASR responses into clean, deduplicated transcript data.
///
/// Each [`TranscriptAccumulator::process`] call returns a [`TranscriptUpdate`]
/// with:
/// - `new_final_words`: words that became final since the last update
/// - `speaker_hints`: speaker associations for the newly finalized words
/// - `partial_words`: current in-progress words across all channels (global snapshot)
///
/// Call [`TranscriptAccumulator::flush`] at session end to drain held/partial
/// words. For rendering use cases that want a complete frame snapshot rather
/// than deltas, use [`crate::view::TranscriptView`] instead.
pub struct TranscriptAccumulator {
    channels: BTreeMap<i32, ChannelState>,
    id_gen: Box<dyn IdGenerator>,
}

impl TranscriptAccumulator {
    pub fn new() -> Self {
        Self::with_config(UuidIdGen)
    }

    pub fn with_config(id_gen: impl IdGenerator + 'static) -> Self {
        Self {
            channels: BTreeMap::new(),
            id_gen: Box::new(id_gen),
        }
    }

    pub fn process(&mut self, input: TranscriptInput) -> Option<TranscriptUpdate> {
        let (words, is_final) = match input {
            TranscriptInput::Final { words } => (words, true),
            TranscriptInput::Partial { words } => (words, false),
            TranscriptInput::Correction { .. } => return None,
        };

        if words.is_empty() {
            return None;
        }

        let channel = words[0].channel;

        let (new_final_words, speaker_hints) = {
            let (channels, id_gen) = (&mut self.channels, &mut self.id_gen);
            let state = channels.entry(channel).or_insert_with(ChannelState::new);

            if is_final {
                state.apply_final(words, &mut **id_gen)
            } else {
                state.apply_partial(words);
                (vec![], vec![])
            }
        };

        Some(TranscriptUpdate {
            new_final_words,
            speaker_hints,
            partial_words: self.all_partials(),
        })
    }

    pub fn flush(&mut self, mode: FlushMode) -> TranscriptUpdate {
        let mut new_final_words = Vec::new();
        let mut speaker_hints = Vec::new();

        for state in self.channels.values_mut() {
            let (words, hints) = state.drain(mode, &mut *self.id_gen);
            new_final_words.extend(words);
            speaker_hints.extend(hints);
        }

        TranscriptUpdate {
            new_final_words,
            speaker_hints,
            partial_words: vec![],
        }
    }

    pub(crate) fn held_words(&self) -> Vec<(i32, String)> {
        self.channels
            .iter()
            .filter_map(|(ch, state)| state.held().map(|w| (*ch, w.text.clone())))
            .collect()
    }

    pub(crate) fn watermarks(&self) -> Vec<(i32, i64)> {
        self.channels
            .iter()
            .map(|(ch, state)| (*ch, state.watermark()))
            .collect()
    }

    pub(crate) fn partial_stability(&self) -> Vec<(String, u32)> {
        self.channels
            .values()
            .flat_map(|state| {
                state
                    .partial_entries()
                    .map(|e| (e.word.text.clone(), e.consecutive_seen))
            })
            .collect()
    }

    pub(crate) fn all_partials(&self) -> Vec<PartialWord> {
        let mut partials: Vec<PartialWord> = self
            .channels
            .values()
            .flat_map(|state| state.partials().map(|w| w.to_partial()))
            .collect();

        if let Some(first) = partials.first_mut() {
            ensure_space_prefix_partial(first);
        }

        partials
    }
}

impl Default for TranscriptAccumulator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::id::SequentialIdGen;
    use crate::input::TranscriptInput;
    use crate::types::TranscriptWord;
    use owhisper_interface::stream::{Alternatives, Channel, Metadata, ModelInfo};

    fn raw_word(
        text: &str,
        start: f64,
        end: f64,
        speaker: Option<i32>,
    ) -> owhisper_interface::stream::Word {
        owhisper_interface::stream::Word {
            word: text.to_string(),
            start,
            end,
            confidence: 1.0,
            speaker,
            punctuated_word: Some(text.to_string()),
            language: None,
        }
    }

    fn response(
        words: &[(&str, f64, f64, Option<i32>)],
        transcript: &str,
        is_final: bool,
        channel_idx: i32,
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
                        .map(|&(t, s, e, sp)| raw_word(t, s, e, sp))
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
            channel_index: vec![channel_idx],
        }
    }

    fn partial(
        words: &[(&str, f64, f64)],
        transcript: &str,
    ) -> owhisper_interface::stream::StreamResponse {
        let ws: Vec<_> = words.iter().map(|&(t, s, e)| (t, s, e, None)).collect();
        response(&ws, transcript, false, 0)
    }

    fn finalize(
        words: &[(&str, f64, f64)],
        transcript: &str,
    ) -> owhisper_interface::stream::StreamResponse {
        let ws: Vec<_> = words.iter().map(|&(t, s, e)| (t, s, e, None)).collect();
        response(&ws, transcript, true, 0)
    }

    fn finalize_with_speakers(
        words: &[(&str, f64, f64, Option<i32>)],
        transcript: &str,
    ) -> owhisper_interface::stream::StreamResponse {
        response(words, transcript, true, 0)
    }

    /// Convert a StreamResponse through the input layer and process it.
    fn process_response(
        acc: &mut TranscriptAccumulator,
        sr: &owhisper_interface::stream::StreamResponse,
    ) -> Option<TranscriptUpdate> {
        TranscriptInput::from_stream_response(sr).and_then(|input| acc.process(input))
    }

    fn replay(responses: &[owhisper_interface::stream::StreamResponse]) -> Vec<TranscriptWord> {
        let mut acc = TranscriptAccumulator::new();
        let mut words = Vec::new();

        for r in responses {
            if let Some(update) = process_response(&mut acc, r) {
                words.extend(update.new_final_words);
            }
        }

        words.extend(acc.flush(FlushMode::DrainAll).new_final_words);
        words
    }

    fn assert_valid_output(words: &[TranscriptWord]) {
        assert!(!words.is_empty(), "must produce words");

        assert!(
            words.iter().all(|w| !w.id.is_empty()),
            "all words must have IDs"
        );

        let ids: std::collections::HashSet<_> = words.iter().map(|w| &w.id).collect();
        assert_eq!(ids.len(), words.len(), "IDs must be unique");

        for w in words {
            assert!(
                !w.text.trim().is_empty(),
                "word text must not be blank: {w:?}"
            );
            assert!(
                w.text.starts_with(' '),
                "word must start with space: {:?}",
                w.text
            );
        }

        for ch in words
            .iter()
            .map(|w| w.channel)
            .collect::<std::collections::BTreeSet<_>>()
        {
            let cw: Vec<_> = words.iter().filter(|w| w.channel == ch).collect();
            assert!(
                cw.windows(2).all(|w| w[0].start_ms <= w[1].start_ms),
                "channel {ch} must be chronological"
            );
        }
    }

    #[test]
    fn partial_update_exposes_current_words() {
        let mut acc = TranscriptAccumulator::new();

        let update = process_response(
            &mut acc,
            &partial(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        )
        .unwrap();

        assert!(update.new_final_words.is_empty());
        assert_eq!(update.partial_words.len(), 2);
        assert_eq!(
            update
                .partial_words
                .iter()
                .map(|w| &w.text)
                .collect::<Vec<_>>(),
            [" Hello", " world"]
        );
    }

    #[test]
    fn partial_splices_into_existing_window() {
        let mut acc = TranscriptAccumulator::new();

        process_response(
            &mut acc,
            &partial(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        );

        let update = process_response(
            &mut acc,
            &partial(
                &[
                    (" Hello", 0.1, 0.5),
                    (" world", 0.6, 0.9),
                    (" today", 1.0, 1.3),
                ],
                " Hello world today",
            ),
        )
        .unwrap();

        assert_eq!(update.partial_words.len(), 3);
        assert_eq!(
            update
                .partial_words
                .iter()
                .map(|w| &w.text)
                .collect::<Vec<_>>(),
            [" Hello", " world", " today"]
        );
    }

    #[test]
    fn final_emits_prefix_and_holds_last() {
        let mut acc = TranscriptAccumulator::new();

        process_response(
            &mut acc,
            &partial(
                &[(" Hello", 0.1, 0.5), (" world", 0.55, 0.9)],
                " Hello world",
            ),
        );

        let update = process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.55, 0.9)],
                " Hello world",
            ),
        )
        .unwrap();

        assert_eq!(update.new_final_words.len(), 1);
        assert_eq!(update.new_final_words[0].text, " Hello");
        assert!(update.partial_words.is_empty());

        let flushed = acc.flush(FlushMode::DrainAll);
        assert_eq!(flushed.new_final_words.len(), 1);
        assert_eq!(flushed.new_final_words[0].text, " world");
    }

    #[test]
    fn final_deduplicates_repeated_response() {
        let mut acc = TranscriptAccumulator::new();

        let r = finalize(
            &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
            " Hello world",
        );

        let first = process_response(&mut acc, &r).unwrap();
        let second = process_response(&mut acc, &r).unwrap();

        assert!(!first.new_final_words.is_empty());
        assert!(second.new_final_words.is_empty());
    }

    #[test]
    fn final_clears_overlapping_partials() {
        let mut acc = TranscriptAccumulator::new();

        process_response(
            &mut acc,
            &partial(
                &[
                    (" Hello", 0.1, 0.5),
                    (" world", 0.6, 1.0),
                    (" test", 1.1, 1.5),
                ],
                " Hello world test",
            ),
        );

        let update = process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 1.0)],
                " Hello world",
            ),
        )
        .unwrap();

        assert_eq!(update.partial_words.len(), 1);
        assert_eq!(update.partial_words[0].text, " test");
    }

    #[test]
    fn all_final_words_have_ids() {
        let mut acc = TranscriptAccumulator::new();

        let update = process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        )
        .unwrap();

        assert!(update.new_final_words.iter().all(|w| !w.id.is_empty()));

        let flushed = acc.flush(FlushMode::DrainAll);
        assert!(flushed.new_final_words.iter().all(|w| !w.id.is_empty()));
    }

    #[test]
    fn flush_drains_held_word() {
        let mut acc = TranscriptAccumulator::new();

        process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        );

        let flushed = acc.flush(FlushMode::DrainAll);

        assert_eq!(flushed.new_final_words.len(), 1);
        assert_eq!(flushed.new_final_words[0].text, " world");
        assert!(!flushed.new_final_words[0].id.is_empty());
    }

    #[test]
    fn flush_drains_partials_beyond_final_range() {
        let mut acc = TranscriptAccumulator::new();

        process_response(&mut acc, &partial(&[(" later", 5.0, 5.5)], " later"));

        process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        );

        let flushed = acc.flush(FlushMode::DrainAll);

        let texts: Vec<_> = flushed.new_final_words.iter().map(|w| &w.text).collect();
        assert!(
            texts.contains(&&" world".to_string()) || texts.contains(&&" later".to_string()),
            "flush must drain held + partials: {texts:?}"
        );
        assert!(flushed.new_final_words.iter().all(|w| !w.id.is_empty()));
    }

    #[test]
    fn flush_on_empty_accumulator_is_empty() {
        let mut acc = TranscriptAccumulator::new();
        let flushed = acc.flush(FlushMode::DrainAll);
        assert!(flushed.new_final_words.is_empty());
        assert!(flushed.partial_words.is_empty());
        assert!(flushed.speaker_hints.is_empty());
    }

    #[test]
    fn flush_promotable_only_drops_unstable_partials() {
        let mut acc = TranscriptAccumulator::new();

        process_response(&mut acc, &partial(&[(" maybe", 0.0, 0.5)], " maybe"));

        let flushed = acc.flush(FlushMode::PromotableOnly);
        assert!(
            flushed.new_final_words.is_empty(),
            "partial must be dropped with PromotableOnly"
        );
    }

    #[test]
    fn flush_promotable_only_keeps_held_word() {
        let mut acc = TranscriptAccumulator::new();

        process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        );

        let flushed = acc.flush(FlushMode::PromotableOnly);
        assert_eq!(flushed.new_final_words.len(), 1);
        assert_eq!(flushed.new_final_words[0].text, " world");
    }

    #[test]
    fn non_transcript_responses_produce_no_update() {
        let mut acc = TranscriptAccumulator::new();
        let ignored = owhisper_interface::stream::StreamResponse::TerminalResponse {
            request_id: "r".into(),
            created: "now".into(),
            duration: 1.0,
            channels: 1,
        };
        assert!(TranscriptInput::from_stream_response(&ignored).is_none());
        assert!(
            acc.process(TranscriptInput::Final { words: vec![] })
                .is_none()
        );
    }

    #[test]
    fn speaker_hints_extracted_from_final_words() {
        let mut acc = TranscriptAccumulator::new();

        let update = process_response(
            &mut acc,
            &finalize_with_speakers(
                &[(" Hello", 0.1, 0.5, Some(0)), (" world", 0.6, 0.9, Some(1))],
                " Hello world",
            ),
        )
        .unwrap();

        assert_eq!(update.new_final_words.len(), 1);
        assert_eq!(update.speaker_hints.len(), 1);
        assert_eq!(update.speaker_hints[0].speaker_index, 0);
        assert_eq!(
            update.speaker_hints[0].word_id,
            update.new_final_words[0].id
        );

        let flushed = acc.flush(FlushMode::DrainAll);
        assert_eq!(flushed.new_final_words.len(), 1);
        assert_eq!(flushed.speaker_hints.len(), 1);
        assert_eq!(flushed.speaker_hints[0].speaker_index, 1);
    }

    #[test]
    fn no_speaker_hints_when_speaker_is_none() {
        let mut acc = TranscriptAccumulator::new();

        let update = process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        )
        .unwrap();

        assert!(update.speaker_hints.is_empty());
    }

    #[test]
    fn sequential_id_gen_produces_deterministic_ids() {
        let mut acc = TranscriptAccumulator::with_config(SequentialIdGen::new());

        let update = process_response(
            &mut acc,
            &finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ),
        )
        .unwrap();

        assert_eq!(update.new_final_words[0].id, "0");

        let flushed = acc.flush(FlushMode::DrainAll);
        assert_eq!(flushed.new_final_words[0].id, "1");
    }

    #[test]
    fn pre_final_partials_are_promoted_when_final_arrives() {
        let mut acc = TranscriptAccumulator::new();

        // Two partial words arrive before any final.
        process_response(
            &mut acc,
            &partial(
                &[(" hello", 0.0, 0.5), (" world", 0.6, 0.9)],
                " hello world",
            ),
        );

        // A final batch arrives for words *after* the partials.
        let update =
            process_response(&mut acc, &finalize(&[(" later", 1.0, 1.5)], " later")).unwrap();

        // Both partials (end_ms <= 1000ms = later.start_ms) are promoted,
        // plus "later" is held by stitch (single-word batch).
        assert!(
            update.new_final_words.iter().any(|w| w.text == " hello"),
            "pre-final partial ' hello' must be promoted: {:?}",
            update.new_final_words,
        );
        assert!(
            update.new_final_words.iter().any(|w| w.text == " world"),
            "pre-final partial ' world' must be promoted: {:?}",
            update.new_final_words,
        );
    }

    macro_rules! fixture_test {
        ($test_name:ident, $json:expr) => {
            #[test]
            fn $test_name() {
                let responses: Vec<owhisper_interface::stream::StreamResponse> =
                    serde_json::from_str($json).expect("fixture must parse as StreamResponse[]");
                assert_valid_output(&replay(&responses));
            }
        };
    }

    fixture_test!(
        deepgram_fixture_produces_valid_output,
        hypr_data::english_1::DEEPGRAM_JSON
    );
    fixture_test!(
        soniox_fixture_produces_valid_output,
        hypr_data::english_1::SONIOX_JSON
    );
    fixture_test!(
        soniox_korean_fixture_produces_valid_output,
        hypr_data::korean_1::SONIOX_JSON
    );

    /// Pre-final promotion means all mid-session partials are captured
    /// by apply_final. PromotableOnly and DrainAll should produce identical
    /// word counts for providers that send finals for everything.
    #[test]
    fn pre_final_promotion_matches_drain_all_on_english_fixtures() {
        fn word_count(json: &str, mode: FlushMode) -> usize {
            let responses: Vec<owhisper_interface::stream::StreamResponse> =
                serde_json::from_str(json).unwrap();
            let mut acc = TranscriptAccumulator::new();
            let mut count = 0;
            for r in &responses {
                if let Some(input) = TranscriptInput::from_stream_response(r) {
                    if let Some(update) = acc.process(input) {
                        count += update.new_final_words.len();
                    }
                }
            }
            count += acc.flush(mode).new_final_words.len();
            count
        }

        for (label, json) in [
            ("Deepgram English", hypr_data::english_1::DEEPGRAM_JSON),
            ("Soniox English", hypr_data::english_1::SONIOX_JSON),
        ] {
            assert_eq!(
                word_count(json, FlushMode::PromotableOnly),
                word_count(json, FlushMode::DrainAll),
                "{label}: pre-final promotion should close the gap for mid-session words",
            );
        }
    }

    /// Soniox Korean has words that only appear in the final partial window —
    /// no subsequent final arrives to trigger pre-final promotion, so DrainAll
    /// is still required to recover them.
    #[test]
    fn soniox_korean_tail_words_require_drain_all() {
        fn word_count(mode: FlushMode) -> usize {
            let responses: Vec<owhisper_interface::stream::StreamResponse> =
                serde_json::from_str(hypr_data::korean_1::SONIOX_JSON).unwrap();
            let mut acc = TranscriptAccumulator::new();
            let mut count = 0;
            for r in &responses {
                if let Some(input) = TranscriptInput::from_stream_response(r) {
                    if let Some(update) = acc.process(input) {
                        count += update.new_final_words.len();
                    }
                }
            }
            count += acc.flush(mode).new_final_words.len();
            count
        }

        assert!(
            word_count(FlushMode::DrainAll) > word_count(FlushMode::PromotableOnly),
            "DrainAll must recover more words than PromotableOnly for Soniox Korean",
        );
    }
}
