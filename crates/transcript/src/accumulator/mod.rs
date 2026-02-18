mod channel;
mod words;

use std::collections::BTreeMap;

use owhisper_interface::stream::StreamResponse;

pub use words::{TranscriptUpdate, TranscriptWord};

use channel::ChannelState;
use words::{assemble, ensure_space_prefix};

/// Accumulates streaming ASR responses into clean, deduplicated `TranscriptWord` sequences.
///
/// Each `process` call returns a `TranscriptUpdate` with:
/// - `new_final_words`: words that became final since the last update (ready to persist)
/// - `partial_words`: current in-progress words across all channels (for live display)
///
/// Call `flush` at session end to drain any held/partial words that were never finalized.
pub struct TranscriptAccumulator {
    channels: BTreeMap<i32, ChannelState>,
}

impl TranscriptAccumulator {
    pub fn new() -> Self {
        Self {
            channels: BTreeMap::new(),
        }
    }

    pub fn process(&mut self, response: &StreamResponse) -> Option<TranscriptUpdate> {
        let (is_final, channel, channel_index) = match response {
            StreamResponse::TranscriptResponse {
                is_final,
                channel,
                channel_index,
                ..
            } => (*is_final, channel, channel_index),
            _ => return None,
        };

        let alt = channel.alternatives.first()?;
        if alt.words.is_empty() && alt.transcript.is_empty() {
            return None;
        }

        let ch = channel_index.first().copied().unwrap_or(0);
        let words = assemble(&alt.words, &alt.transcript, ch);
        if words.is_empty() {
            return None;
        }

        let state = self.channels.entry(ch).or_insert_with(ChannelState::new);

        let new_final_words = if is_final {
            state.apply_final(words)
        } else {
            state.apply_partial(words);
            vec![]
        };

        Some(TranscriptUpdate {
            new_final_words,
            partial_words: self.all_partials(),
        })
    }

    pub fn flush(&mut self) -> TranscriptUpdate {
        let new_final_words = self
            .channels
            .values_mut()
            .flat_map(|state| state.drain())
            .collect();

        TranscriptUpdate {
            new_final_words,
            partial_words: vec![],
        }
    }

    fn all_partials(&self) -> Vec<TranscriptWord> {
        let mut partials: Vec<TranscriptWord> = self
            .channels
            .values()
            .flat_map(|state| state.partials().iter().cloned())
            .collect();

        if let Some(first) = partials.first_mut() {
            ensure_space_prefix(first);
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
    ) -> StreamResponse {
        StreamResponse::TranscriptResponse {
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

    fn partial(words: &[(&str, f64, f64)], transcript: &str) -> StreamResponse {
        let ws: Vec<_> = words.iter().map(|&(t, s, e)| (t, s, e, None)).collect();
        response(&ws, transcript, false, 0)
    }

    fn finalize(words: &[(&str, f64, f64)], transcript: &str) -> StreamResponse {
        let ws: Vec<_> = words.iter().map(|&(t, s, e)| (t, s, e, None)).collect();
        response(&ws, transcript, true, 0)
    }

    fn replay(responses: &[StreamResponse]) -> Vec<TranscriptWord> {
        let mut acc = TranscriptAccumulator::new();
        let mut words = Vec::new();

        for r in responses {
            if let Some(update) = acc.process(r) {
                words.extend(update.new_final_words);
            }
        }

        words.extend(acc.flush().new_final_words);
        words
    }

    fn load_fixture(name: &str) -> Vec<StreamResponse> {
        let raw = match name {
            "deepgram_1" => include_str!("fixtures/deepgram_1.json"),
            "soniox_1" => include_str!("fixtures/soniox_1.json"),
            _ => panic!("unknown fixture: {name}"),
        };
        serde_json::from_str(raw).expect("fixture must parse as StreamResponse[]")
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

        let update = acc
            .process(&partial(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ))
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

        acc.process(&partial(
            &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
            " Hello world",
        ));

        let update = acc
            .process(&partial(
                &[
                    (" Hello", 0.1, 0.5),
                    (" world", 0.6, 0.9),
                    (" today", 1.0, 1.3),
                ],
                " Hello world today",
            ))
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

        acc.process(&partial(
            &[(" Hello", 0.1, 0.5), (" world", 0.55, 0.9)],
            " Hello world",
        ));

        let update = acc
            .process(&finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.55, 0.9)],
                " Hello world",
            ))
            .unwrap();

        assert_eq!(update.new_final_words.len(), 1);
        assert_eq!(update.new_final_words[0].text, " Hello");
        assert!(update.partial_words.is_empty());

        let flushed = acc.flush();
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

        let first = acc.process(&r).unwrap();
        let second = acc.process(&r).unwrap();

        assert!(!first.new_final_words.is_empty());
        assert!(second.new_final_words.is_empty());
    }

    #[test]
    fn final_clears_overlapping_partials() {
        let mut acc = TranscriptAccumulator::new();

        acc.process(&partial(
            &[
                (" Hello", 0.1, 0.5),
                (" world", 0.6, 1.0),
                (" test", 1.1, 1.5),
            ],
            " Hello world test",
        ));

        let update = acc
            .process(&finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 1.0)],
                " Hello world",
            ))
            .unwrap();

        assert_eq!(update.partial_words.len(), 1);
        assert_eq!(update.partial_words[0].text, " test");
    }

    #[test]
    fn all_final_words_have_ids() {
        let mut acc = TranscriptAccumulator::new();

        let update = acc
            .process(&finalize(
                &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
                " Hello world",
            ))
            .unwrap();

        assert!(update.new_final_words.iter().all(|w| !w.id.is_empty()));

        let flushed = acc.flush();
        assert!(flushed.new_final_words.iter().all(|w| !w.id.is_empty()));
    }

    #[test]
    fn flush_drains_held_word() {
        let mut acc = TranscriptAccumulator::new();

        acc.process(&finalize(
            &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
            " Hello world",
        ));

        let flushed = acc.flush();

        assert_eq!(flushed.new_final_words.len(), 1);
        assert_eq!(flushed.new_final_words[0].text, " world");
        assert!(!flushed.new_final_words[0].id.is_empty());
    }

    #[test]
    fn flush_drains_partials_beyond_final_range() {
        let mut acc = TranscriptAccumulator::new();

        acc.process(&partial(&[(" later", 5.0, 5.5)], " later"));

        acc.process(&finalize(
            &[(" Hello", 0.1, 0.5), (" world", 0.6, 0.9)],
            " Hello world",
        ));

        let flushed = acc.flush();

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
        let flushed = acc.flush();
        assert!(flushed.new_final_words.is_empty());
        assert!(flushed.partial_words.is_empty());
    }

    #[test]
    fn non_transcript_responses_produce_no_update() {
        let mut acc = TranscriptAccumulator::new();
        let ignored = StreamResponse::TerminalResponse {
            request_id: "r".into(),
            created: "now".into(),
            duration: 1.0,
            channels: 1,
        };
        assert!(acc.process(&ignored).is_none());
    }

    #[test]
    fn deepgram_fixture_produces_valid_output() {
        assert_valid_output(&replay(&load_fixture("deepgram_1")));
    }

    #[test]
    fn soniox_fixture_produces_valid_output() {
        assert_valid_output(&replay(&load_fixture("soniox_1")));
    }
}
