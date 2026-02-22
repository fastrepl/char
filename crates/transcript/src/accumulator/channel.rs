use crate::id::IdGenerator;
use crate::types::{RawWord, SpeakerHint, TranscriptWord};

use super::FlushMode;
use super::words::{
    PartialEntry, dedup, finalize_words, splice_partials, stitch, strip_overlap_entries,
};

pub(super) struct ChannelState {
    watermark: i64,
    held: Option<RawWord>,
    partials: Vec<PartialEntry>,
}

impl ChannelState {
    pub(super) fn new() -> Self {
        Self {
            watermark: 0,
            held: None,
            partials: Vec::new(),
        }
    }

    pub(super) fn partials(&self) -> impl Iterator<Item = &RawWord> {
        self.partials.iter().map(|e| &e.word)
    }

    pub(super) fn partial_entries(&self) -> impl Iterator<Item = &PartialEntry> {
        self.partials.iter()
    }

    pub(super) fn held(&self) -> Option<&RawWord> {
        self.held.as_ref()
    }

    pub(super) fn watermark(&self) -> i64 {
        self.watermark
    }

    /// Process a confirmed final batch.
    ///
    /// Two things happen in order:
    ///
    /// 1. Any partial words whose time range ends *before* this batch starts
    ///    are promoted to final. The provider is confirming words after them,
    ///    so those partials are guaranteed not to change anymore.
    ///
    /// 2. The final words themselves are processed (dedup, stitch, emit).
    pub(super) fn apply_final(
        &mut self,
        words: Vec<RawWord>,
        id_gen: &mut dyn IdGenerator,
    ) -> (Vec<TranscriptWord>, Vec<SpeakerHint>) {
        let new_words = dedup(words, self.watermark);
        if new_words.is_empty() {
            return (vec![], vec![]);
        }

        let final_start = new_words.first().map_or(0, |w| w.start_ms);
        let final_end = new_words.last().map_or(0, |w| w.end_ms);

        // Promote partials that come before this final batch.
        let (pre_final, rest): (Vec<_>, Vec<_>) = std::mem::take(&mut self.partials)
            .into_iter()
            .partition(|e| e.word.end_ms <= final_start);

        // Drop partials that overlap the final range; keep those after it.
        self.partials = strip_overlap_entries(rest, final_end);

        self.watermark = final_end;

        let mut to_finalize: Vec<RawWord> = pre_final.into_iter().map(|e| e.word).collect();

        let (emitted, held) = stitch(self.held.take(), new_words);
        self.held = held;
        to_finalize.extend(emitted);

        finalize_words(to_finalize, id_gen)
    }

    /// Update the partial buffer. No promotion happens here — partials are
    /// promoted either by an incoming final (see `apply_final`) or at flush.
    pub(super) fn apply_partial(&mut self, words: Vec<RawWord>) {
        // Filter words already covered by the watermark so that words
        // finalized mid-session cannot re-enter the partial buffer.
        let words = dedup(words, self.watermark);
        if words.is_empty() {
            return;
        }
        self.partials = splice_partials(&self.partials, words);
    }

    /// Drain remaining state at session end.
    ///
    /// - [`FlushMode::DrainAll`]: promotes the held word and all partials.
    /// - [`FlushMode::PromotableOnly`]: promotes only the held word (already
    ///   ASR-confirmed). Remaining partials are silently dropped.
    pub(super) fn drain(
        &mut self,
        mode: FlushMode,
        id_gen: &mut dyn IdGenerator,
    ) -> (Vec<TranscriptWord>, Vec<SpeakerHint>) {
        let mut raw: Vec<RawWord> = self.held.take().into_iter().collect();

        match mode {
            FlushMode::DrainAll => {
                raw.extend(
                    std::mem::take(&mut self.partials)
                        .into_iter()
                        .map(|e| e.word),
                );
            }
            FlushMode::PromotableOnly => {
                self.partials.clear();
            }
        }

        finalize_words(raw, id_gen)
    }
}
