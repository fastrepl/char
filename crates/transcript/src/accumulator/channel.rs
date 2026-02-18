use super::words::{
    TranscriptWord, assign_id, dedup, ensure_space_prefix, splice, stitch, strip_overlap,
};

pub(super) struct ChannelState {
    watermark: i64,
    held: Option<TranscriptWord>,
    partials: Vec<TranscriptWord>,
}

impl ChannelState {
    pub(super) fn new() -> Self {
        Self {
            watermark: 0,
            held: None,
            partials: Vec::new(),
        }
    }

    pub(super) fn partials(&self) -> &[TranscriptWord] {
        &self.partials
    }

    pub(super) fn apply_final(&mut self, words: Vec<TranscriptWord>) -> Vec<TranscriptWord> {
        let response_end = words.last().map_or(0, |w| w.end_ms);
        let new_words: Vec<_> = dedup(words, self.watermark)
            .into_iter()
            .map(assign_id)
            .collect();

        if new_words.is_empty() {
            return vec![];
        }

        self.watermark = response_end;
        self.partials = strip_overlap(std::mem::take(&mut self.partials), response_end);

        let (mut emitted, held) = stitch(self.held.take(), new_words);
        self.held = held;
        emitted.iter_mut().for_each(ensure_space_prefix);
        emitted
    }

    pub(super) fn apply_partial(&mut self, words: Vec<TranscriptWord>) {
        self.partials = splice(&self.partials, words);
    }

    pub(super) fn drain(&mut self) -> Vec<TranscriptWord> {
        let mut result: Vec<_> = self.held.take().into_iter().collect();
        result.extend(
            std::mem::take(&mut self.partials)
                .into_iter()
                .map(assign_id),
        );
        result.iter_mut().for_each(ensure_space_prefix);
        result
    }
}
