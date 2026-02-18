use owhisper_interface::stream::Word;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TranscriptWord {
    pub id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    pub speaker: Option<i32>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TranscriptUpdate {
    pub new_final_words: Vec<TranscriptWord>,
    pub partial_words: Vec<TranscriptWord>,
}

// ── Assembly ─────────────────────────────────────────────────────────────────

/// Assemble raw ASR tokens into merged `TranscriptWord`s, recovering spacing
/// from the transcript string. Adjacent tokens without a space prefix and
/// within 120ms are merged (handles split punctuation/contractions).
pub(super) fn assemble(raw: &[Word], transcript: &str, channel: i32) -> Vec<TranscriptWord> {
    let spaced = spacing_from_transcript(raw, transcript);
    let mut result: Vec<TranscriptWord> = Vec::new();

    for (w, text) in raw.iter().zip(&spaced) {
        let start_ms = (w.start * 1000.0).round() as i64;
        let end_ms = (w.end * 1000.0).round() as i64;

        let should_merge = !text.starts_with(' ')
            && result
                .last()
                .map_or(false, |prev| start_ms - prev.end_ms <= 120);

        if should_merge {
            let last = result.last_mut().unwrap();
            last.text.push_str(text);
            last.end_ms = end_ms;
            if last.speaker.is_none() {
                last.speaker = w.speaker;
            }
        } else {
            result.push(TranscriptWord {
                id: String::new(),
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
            None => result.push(text.to_string()),
        }
    }

    result
}

// ── Pipeline stages ──────────────────────────────────────────────────────────

/// Drop words already covered by the watermark (deduplication).
pub(super) fn dedup(words: Vec<TranscriptWord>, watermark: i64) -> Vec<TranscriptWord> {
    words
        .into_iter()
        .skip_while(|w| w.end_ms <= watermark)
        .collect()
}

/// Stitch a held-back word with the front of a new batch, then hold back
/// the last word for the next boundary. ASR can split tokens across responses;
/// this lets us re-join them before emitting.
///
/// Does NOT enforce spacing — callers apply `ensure_space_prefix` at output time,
/// so that `should_stitch` can still inspect raw spacing to decide merges.
pub(super) fn stitch(
    held: Option<TranscriptWord>,
    mut words: Vec<TranscriptWord>,
) -> (Vec<TranscriptWord>, Option<TranscriptWord>) {
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
pub(super) fn splice(
    existing: &[TranscriptWord],
    incoming: Vec<TranscriptWord>,
) -> Vec<TranscriptWord> {
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
pub(super) fn strip_overlap(partials: Vec<TranscriptWord>, final_end: i64) -> Vec<TranscriptWord> {
    partials
        .into_iter()
        .filter(|w| w.start_ms > final_end)
        .collect()
}

// ── Word-level transforms ────────────────────────────────────────────────────

pub(super) fn assign_id(mut w: TranscriptWord) -> TranscriptWord {
    w.id = Uuid::new_v4().to_string();
    w
}

pub(super) fn ensure_space_prefix(w: &mut TranscriptWord) {
    if !w.text.starts_with(' ') {
        w.text.insert(0, ' ');
    }
}

fn should_stitch(tail: &TranscriptWord, head: &TranscriptWord) -> bool {
    !head.text.starts_with(' ') && (head.start_ms - tail.end_ms) <= 300
}

fn merge_words(mut left: TranscriptWord, right: TranscriptWord) -> TranscriptWord {
    left.text.push_str(&right.text);
    left.end_ms = right.end_ms;
    if left.speaker.is_none() {
        left.speaker = right.speaker;
    }
    left
}

#[cfg(test)]
mod tests {
    use super::*;

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

    fn word(text: &str, start_ms: i64, end_ms: i64) -> TranscriptWord {
        TranscriptWord {
            id: Uuid::new_v4().to_string(),
            text: text.to_string(),
            start_ms,
            end_ms,
            channel: 0,
            speaker: None,
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
    fn spacing_falls_back_to_raw_when_not_found() {
        let raw = vec![raw_word("Hello", 0.0, 0.5)];
        let spaced = spacing_from_transcript(&raw, "completely different");
        assert_eq!(spaced, ["Hello"]);
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
    fn assemble_does_not_merge_distant_tokens() {
        let raw = vec![raw_word(" Hello", 0.0, 0.5), raw_word("world", 1.0, 1.5)];
        let words = assemble(&raw, " Hello world", 0);
        assert_eq!(words.len(), 2);
    }

    #[test]
    fn assemble_does_not_merge_spaced_tokens() {
        let raw = vec![raw_word(" Hello", 0.0, 0.5), raw_word(" world", 0.51, 1.0)];
        let words = assemble(&raw, " Hello world", 0);
        assert_eq!(words.len(), 2);
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
}
