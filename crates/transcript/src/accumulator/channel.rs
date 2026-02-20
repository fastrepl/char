use super::words::{
    RawWord, SpeakerHint, TranscriptWord, dedup, finalize_words, splice, stitch, strip_overlap,
};

pub(super) struct ChannelState {
    watermark: i64,
    held: Option<RawWord>,
    partials: Vec<RawWord>,
}

impl ChannelState {
    pub(super) fn new() -> Self {
        Self {
            watermark: 0,
            held: None,
            partials: Vec::new(),
        }
    }

    pub(super) fn partials(&self) -> &[RawWord] {
        &self.partials
    }

    pub(super) fn apply_final(
        &mut self,
        words: Vec<RawWord>,
    ) -> (Vec<TranscriptWord>, Vec<SpeakerHint>) {
        let response_end = words.last().map_or(0, |w| w.end_ms);
        let new_words: Vec<_> = dedup(words, self.watermark);

        if new_words.is_empty() {
            return (vec![], vec![]);
        }

        self.watermark = response_end;
        self.partials = strip_overlap(std::mem::take(&mut self.partials), response_end);

        let (emitted, held) = stitch(self.held.take(), new_words);
        self.held = held;
        finalize_words(emitted)
    }

    pub(super) fn apply_partial(&mut self, words: Vec<RawWord>) {
        self.partials = splice(&self.partials, words);
    }

    pub(super) fn drain(&mut self) -> (Vec<TranscriptWord>, Vec<SpeakerHint>) {
        let mut raw: Vec<_> = self.held.take().into_iter().collect();
        raw.extend(std::mem::take(&mut self.partials));
        finalize_words(raw)
    }
}
