use owhisper_interface::stream::Word;

use crate::id::IdGenerator;
use crate::types::{PartialWord, RawWord, SpeakerHint, TranscriptWord};

// ── Partial stability tracking ────────────────────────────────────────────────

/// A partial word together with how many consecutive partial responses have
/// confirmed it at the same start time and with the same text.
///
/// The `consecutive_seen` counter is the primary input to
/// Used by `channel::ChannelState` to track stability of partial words.
#[derive(Debug, Clone)]
pub(crate) struct PartialEntry {
    pub(crate) word: RawWord,
    pub(crate) consecutive_seen: u32,
}

// ── Assembly ──────────────────────────────────────────────────────────────────

/// Assemble raw ASR tokens into merged `RawWord`s.
///
/// The transcript string is the **sole oracle** for word boundaries within a
/// single response. `spacing_from_transcript` aligns each token to the
/// transcript; a space prefix means "new word", no space means "same word."
/// Adjacent tokens without a space prefix are unconditionally merged —
/// no timing heuristics.
pub(crate) fn assemble(raw: &[Word], transcript: &str, channel: i32) -> Vec<RawWord> {
    let spaced = spacing_from_transcript(raw, transcript);
    let mut result: Vec<RawWord> = Vec::new();

    for (w, text) in raw.iter().zip(&spaced) {
        let start_ms = (w.start * 1000.0).round() as i64;
        let end_ms = (w.end * 1000.0).round() as i64;

        let should_merge = !text.starts_with(' ') && result.last().is_some();

        if should_merge {
            let last = result.last_mut().unwrap();
            last.text.push_str(text);
            last.end_ms = end_ms;
            if last.speaker.is_none() {
                last.speaker = w.speaker;
            }
        } else {
            result.push(RawWord {
                text: text.clone(),
                start_ms,
                end_ms,
                channel,
                speaker: w.speaker,
            });
        }
    }

    result
}

/// Align each token to the transcript string and recover its spacing.
///
/// The transcript is the oracle: if a token is found in the transcript, the
/// whitespace between the previous match and this one is prepended verbatim.
/// If a token cannot be found (ASR/transcript mismatch), a space is forced
/// so it becomes a separate word — "unknown = word boundary."
fn spacing_from_transcript(raw: &[Word], transcript: &str) -> Vec<String> {
    let mut result = Vec::with_capacity(raw.len());
    let mut pos = 0;

    for w in raw {
        let text = w.punctuated_word.as_deref().unwrap_or(&w.word);
        let trimmed = text.trim();

        if trimmed.is_empty() {
            result.push(text.to_string());
            continue;
        }

        match transcript[pos..].find(trimmed) {
            Some(found) => {
                let abs = pos + found;
                result.push(format!("{}{trimmed}", &transcript[pos..abs]));
                pos = abs + trimmed.len();
            }
            None => {
                let mut fallback = text.to_string();
                if !fallback.starts_with(' ') {
                    fallback.insert(0, ' ');
                }
                result.push(fallback);
            }
        }
    }

    result
}

// ── Pipeline stages ───────────────────────────────────────────────────────────

/// Drop words already covered by the watermark (deduplication).
pub(super) fn dedup(words: Vec<RawWord>, watermark: i64) -> Vec<RawWord> {
    words
        .into_iter()
        .skip_while(|w| w.end_ms <= watermark)
        .collect()
}

/// Cross-response word boundary handling — the one place where a timing
/// heuristic is unavoidable, because no transcript spans both responses.
///
/// Holds back the last word of each finalized batch so it can be merged
/// with the first word of the next batch if the provider split a word
/// across responses (common with Korean particles, contractions, etc.).
pub(super) fn stitch(
    held: Option<RawWord>,
    mut words: Vec<RawWord>,
) -> (Vec<RawWord>, Option<RawWord>) {
    if words.is_empty() {
        return (held.into_iter().collect(), None);
    }

    if let Some(h) = held {
        if should_stitch(&h, &words[0]) {
            words[0] = merge_words(h, words[0].clone());
        } else {
            words.insert(0, h);
        }
    }

    let new_held = words.pop();
    (words, new_held)
}

/// Replace the time range covered by `incoming` within `existing`.
///
/// Kept as a standalone tested function; production code uses
/// [`splice_partials`] which adds stability-counter tracking.
#[allow(dead_code)]
pub(super) fn splice(existing: &[RawWord], incoming: Vec<RawWord>) -> Vec<RawWord> {
    let first_start = incoming.first().map_or(0, |w| w.start_ms);
    let last_end = incoming.last().map_or(0, |w| w.end_ms);

    existing
        .iter()
        .filter(|w| w.end_ms <= first_start)
        .cloned()
        .chain(incoming)
        .chain(existing.iter().filter(|w| w.start_ms >= last_end).cloned())
        .collect()
}

/// Remove partials that overlap with the finalized time range.
///
/// Kept as a standalone tested function; production code uses
/// [`strip_overlap_entries`] which operates on [`PartialEntry`].
#[allow(dead_code)]
pub(super) fn strip_overlap(partials: Vec<RawWord>, final_end: i64) -> Vec<RawWord> {
    partials
        .into_iter()
        .filter(|w| w.start_ms > final_end)
        .collect()
}

/// Splice incoming words into the partial entries list, updating stability
/// counters for unchanged words and resetting them for new/changed words.
///
/// A partial is "the same" if its `start_ms` and `text` match an existing
/// entry; in that case the `consecutive_seen` counter is incremented.
/// New or changed words start at 1.
pub(super) fn splice_partials(
    existing: &[PartialEntry],
    incoming: Vec<RawWord>,
) -> Vec<PartialEntry> {
    if incoming.is_empty() {
        return existing.to_vec();
    }

    let first_start = incoming.first().map_or(0, |w| w.start_ms);
    let last_end = incoming.last().map_or(0, |w| w.end_ms);

    let before = existing
        .iter()
        .filter(|e| e.word.end_ms <= first_start)
        .cloned();
    let after = existing
        .iter()
        .filter(|e| e.word.start_ms >= last_end)
        .cloned();

    let middle = incoming.into_iter().map(|word| {
        let consecutive_seen = existing
            .iter()
            .find(|e| e.word.start_ms == word.start_ms && e.word.text == word.text)
            .map_or(1, |e| e.consecutive_seen + 1);
        PartialEntry {
            word,
            consecutive_seen,
        }
    });

    before.chain(middle).chain(after).collect()
}

/// Remove partial entries whose start time falls within the finalized range.
pub(super) fn strip_overlap_entries(
    entries: Vec<PartialEntry>,
    final_end: i64,
) -> Vec<PartialEntry> {
    entries
        .into_iter()
        .filter(|e| e.word.start_ms > final_end)
        .collect()
}

// ── Word-level transforms ─────────────────────────────────────────────────────

pub(super) fn ensure_space_prefix_raw(w: &mut RawWord) {
    if !w.text.starts_with(' ') {
        w.text.insert(0, ' ');
    }
}

pub(crate) fn ensure_space_prefix_partial(w: &mut PartialWord) {
    if !w.text.starts_with(' ') {
        w.text.insert(0, ' ');
    }
}

fn should_stitch(tail: &RawWord, head: &RawWord) -> bool {
    !head.text.starts_with(' ') && (head.start_ms - tail.end_ms) <= 300
}

fn merge_words(mut left: RawWord, right: RawWord) -> RawWord {
    left.text.push_str(&right.text);
    left.end_ms = right.end_ms;
    if left.speaker.is_none() {
        left.speaker = right.speaker;
    }
    left
}

/// Convert finalized `RawWord`s into `TranscriptWord`s and `SpeakerHint`s.
///
/// IDs are generated by `id_gen`, ensuring space prefixes, and extracting
/// speaker associations.
pub(super) fn finalize_words(
    mut words: Vec<RawWord>,
    id_gen: &mut dyn IdGenerator,
) -> (Vec<TranscriptWord>, Vec<SpeakerHint>) {
    words.iter_mut().for_each(ensure_space_prefix_raw);

    let mut final_words = Vec::with_capacity(words.len());
    let mut hints = Vec::new();

    for w in words {
        let id = id_gen.next_id();
        let (word, hint) = w.to_final(id);
        final_words.push(word);
        if let Some(h) = hint {
            hints.push(h);
        }
    }

    (final_words, hints)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::id::SequentialIdGen;

    fn raw_word(text: &str, start: f64, end: f64) -> Word {
        Word {
            word: text.to_string(),
            start,
            end,
            confidence: 1.0,
            speaker: None,
            punctuated_word: Some(text.to_string()),
            language: None,
        }
    }

    fn word(text: &str, start_ms: i64, end_ms: i64) -> RawWord {
        RawWord {
            text: text.to_string(),
            start_ms,
            end_ms,
            channel: 0,
            speaker: None,
        }
    }

    fn entry(text: &str, start_ms: i64, end_ms: i64, seen: u32) -> PartialEntry {
        PartialEntry {
            word: word(text, start_ms, end_ms),
            consecutive_seen: seen,
        }
    }

    // ── spacing_from_transcript ──────────────────────────────────────────

    #[test]
    fn spacing_recovered_from_transcript() {
        let raw = vec![raw_word("Hello", 0.0, 0.5), raw_word("world", 0.6, 1.0)];
        let spaced = spacing_from_transcript(&raw, " Hello world");
        assert_eq!(spaced, [" Hello", " world"]);
    }

    #[test]
    fn spacing_forces_word_boundary_on_unfound_token() {
        let raw = vec![raw_word("Hello", 0.0, 0.5)];
        let spaced = spacing_from_transcript(&raw, "completely different");
        assert_eq!(spaced, [" Hello"]);
    }

    #[test]
    fn spacing_preserves_no_space_at_transcript_start() {
        let raw = vec![raw_word("기", 0.0, 0.1), raw_word("간", 0.2, 0.3)];
        let spaced = spacing_from_transcript(&raw, "기간");
        assert_eq!(spaced, ["기", "간"]);
    }

    // ── assemble ─────────────────────────────────────────────────────────

    #[test]
    fn assemble_merges_attached_punctuation() {
        let raw = vec![raw_word(" Hello", 0.0, 0.5), raw_word("'s", 0.51, 0.6)];
        let words = assemble(&raw, " Hello's", 0);
        assert_eq!(words.len(), 1);
        assert_eq!(words[0].text, " Hello's");
        assert_eq!(words[0].end_ms, 600);
    }

    #[test]
    fn assemble_does_not_merge_spaced_tokens() {
        let raw = vec![raw_word(" Hello", 0.0, 0.5), raw_word(" world", 0.51, 1.0)];
        let words = assemble(&raw, " Hello world", 0);
        assert_eq!(words.len(), 2);
    }

    #[test]
    fn assemble_separates_unfound_tokens() {
        let raw = vec![raw_word("Hello", 0.0, 0.5), raw_word("world", 0.51, 0.6)];
        let words = assemble(&raw, "completely different text", 0);
        assert_eq!(words.len(), 2);
        assert!(words[0].text.starts_with(' '));
        assert!(words[1].text.starts_with(' '));
    }

    #[test]
    fn assemble_merges_cjk_syllables_with_large_gap() {
        let raw = vec![
            raw_word("있는", 0.0, 0.3),
            raw_word("데", 0.54, 0.66),
            raw_word(",", 0.84, 0.9),
        ];
        let words = assemble(&raw, " 있는데,", 0);
        assert_eq!(
            words.len(),
            1,
            "syllables in same CJK word must merge: {words:?}"
        );
        assert_eq!(words[0].text, " 있는데,");
        assert_eq!(words[0].end_ms, 900);
    }

    #[test]
    fn assemble_splits_cjk_words_at_transcript_space_boundary() {
        let raw = vec![
            raw_word("있는", 0.0, 0.3),
            raw_word("데", 0.54, 0.66),
            raw_word("학습", 1.0, 1.3),
            raw_word("과", 1.54, 1.66),
        ];
        let words = assemble(&raw, " 있는데 학습과", 0);
        assert_eq!(
            words.len(),
            2,
            "space in transcript must split words: {words:?}"
        );
        assert_eq!(words[0].text, " 있는데");
        assert_eq!(words[1].text, " 학습과");
    }

    // ── dedup ────────────────────────────────────────────────────────────

    #[test]
    fn dedup_drops_words_at_or_before_watermark() {
        let words = vec![
            word(" a", 0, 100),
            word(" b", 100, 200),
            word(" c", 200, 300),
        ];
        let result = dedup(words, 200);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, " c");
    }

    #[test]
    fn dedup_keeps_all_when_watermark_is_zero() {
        let words = vec![word(" a", 0, 100), word(" b", 100, 200)];
        let result = dedup(words, 0);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn dedup_returns_empty_when_all_covered() {
        let words = vec![word(" a", 0, 100), word(" b", 100, 200)];
        let result = dedup(words, 200);
        assert!(result.is_empty());
    }

    // ── stitch ───────────────────────────────────────────────────────────

    #[test]
    fn stitch_no_held_holds_last() {
        let ws = vec![word(" Hello", 0, 500), word(" world", 600, 1000)];
        let (emitted, held) = stitch(None, ws);
        assert_eq!(emitted.len(), 1);
        assert_eq!(emitted[0].text, " Hello");
        assert_eq!(held.unwrap().text, " world");
    }

    #[test]
    fn stitch_merges_spaceless_adjacent_head() {
        let held = word(" Hello", 0, 500);
        let ws = vec![word("'s", 550, 700)];
        let (emitted, held) = stitch(Some(held), ws);
        assert!(emitted.is_empty());
        assert_eq!(held.unwrap().text, " Hello's");
    }

    #[test]
    fn stitch_separates_spaced_head() {
        let held = word(" Hello", 0, 500);
        let ws = vec![word(" world", 600, 1000)];
        let (emitted, held) = stitch(Some(held), ws);
        assert_eq!(emitted.len(), 1);
        assert_eq!(emitted[0].text, " Hello");
        assert_eq!(held.unwrap().text, " world");
    }

    #[test]
    fn stitch_separates_distant_spaceless_head() {
        let held = word(" Hello", 0, 500);
        let ws = vec![word("world", 1000, 1500)];
        let (emitted, held) = stitch(Some(held), ws);
        assert_eq!(emitted.len(), 1);
        assert_eq!(emitted[0].text, " Hello");
        assert_eq!(held.unwrap().text, "world");
    }

    #[test]
    fn stitch_empty_batch_releases_held() {
        let held = word(" Hello", 0, 500);
        let (emitted, held) = stitch(Some(held), vec![]);
        assert_eq!(emitted.len(), 1);
        assert!(held.is_none());
    }

    #[test]
    fn stitch_single_word_batch_yields_no_emission() {
        let ws = vec![word(" Hello", 0, 500)];
        let (emitted, held) = stitch(None, ws);
        assert!(emitted.is_empty());
        assert_eq!(held.unwrap().text, " Hello");
    }

    // ── splice ───────────────────────────────────────────────────────────

    #[test]
    fn splice_replaces_overlapping_range() {
        let existing = vec![
            word(" a", 0, 100),
            word(" b", 100, 200),
            word(" c", 300, 400),
        ];
        let incoming = vec![word(" B", 100, 200), word(" new", 200, 300)];
        let result = splice(&existing, incoming);
        assert_eq!(
            result.iter().map(|w| &w.text[..]).collect::<Vec<_>>(),
            [" a", " B", " new", " c"]
        );
    }

    #[test]
    fn splice_appends_when_no_overlap() {
        let existing = vec![word(" a", 0, 100)];
        let incoming = vec![word(" b", 200, 300)];
        let result = splice(&existing, incoming);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn splice_full_replacement() {
        let existing = vec![word(" a", 0, 100), word(" b", 100, 200)];
        let incoming = vec![
            word(" x", 0, 100),
            word(" y", 100, 200),
            word(" z", 200, 300),
        ];
        let result = splice(&existing, incoming);
        assert_eq!(
            result.iter().map(|w| &w.text[..]).collect::<Vec<_>>(),
            [" x", " y", " z"]
        );
    }

    // ── strip_overlap ────────────────────────────────────────────────────

    #[test]
    fn strip_overlap_removes_covered_partials() {
        let partials = vec![
            word(" a", 0, 100),
            word(" b", 100, 200),
            word(" c", 300, 400),
        ];
        let result = strip_overlap(partials, 200);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].text, " c");
    }

    #[test]
    fn strip_overlap_keeps_all_beyond_range() {
        let partials = vec![word(" a", 300, 400), word(" b", 400, 500)];
        let result = strip_overlap(partials, 200);
        assert_eq!(result.len(), 2);
    }

    // ── splice_partials ──────────────────────────────────────────────────

    #[test]
    fn splice_partials_increments_counter_for_stable_word() {
        let existing = vec![entry(" Hello", 0, 500, 2)];
        let incoming = vec![word(" Hello", 0, 500)];
        let result = splice_partials(&existing, incoming);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].consecutive_seen, 3);
    }

    #[test]
    fn splice_partials_resets_counter_for_changed_text() {
        let existing = vec![entry(" Helo", 0, 500, 5)];
        let incoming = vec![word(" Hello", 0, 500)];
        let result = splice_partials(&existing, incoming);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].consecutive_seen, 1);
    }

    #[test]
    fn splice_partials_starts_at_one_for_new_word() {
        let incoming = vec![word(" new", 0, 500)];
        let result = splice_partials(&[], incoming);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].consecutive_seen, 1);
    }

    #[test]
    fn splice_partials_preserves_before_and_after() {
        let existing = vec![entry(" a", 0, 100, 3), entry(" c", 300, 400, 2)];
        let incoming = vec![word(" b", 100, 300)];
        let result = splice_partials(&existing, incoming);
        assert_eq!(
            result
                .iter()
                .map(|e| e.word.text.as_str())
                .collect::<Vec<_>>(),
            [" a", " b", " c"]
        );
        assert_eq!(result[0].consecutive_seen, 3);
        assert_eq!(result[1].consecutive_seen, 1);
        assert_eq!(result[2].consecutive_seen, 2);
    }

    // ── finalize_words ───────────────────────────────────────────────────

    #[test]
    fn finalize_words_assigns_ids_and_space_prefix() {
        let words = vec![word("hello", 0, 500), word(" world", 500, 1000)];
        let mut id_gen = SequentialIdGen::new();
        let (final_words, hints): (Vec<TranscriptWord>, Vec<SpeakerHint>) =
            finalize_words(words, &mut id_gen);
        assert_eq!(final_words.len(), 2);
        assert!(final_words.iter().all(|w| !w.id.is_empty()));
        assert!(final_words.iter().all(|w| w.text.starts_with(' ')));
        assert!(hints.is_empty());
    }

    #[test]
    fn finalize_words_uses_sequential_ids() {
        let words = vec![word(" a", 0, 100), word(" b", 100, 200)];
        let mut id_gen = SequentialIdGen::new();
        let (final_words, _): (Vec<TranscriptWord>, Vec<SpeakerHint>) =
            finalize_words(words, &mut id_gen);
        assert_eq!(final_words[0].id, "0");
        assert_eq!(final_words[1].id, "1");
    }
}
