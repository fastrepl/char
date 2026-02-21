use crossterm::event::{KeyCode, MouseButton, MouseEvent, MouseEventKind};
use owhisper_interface::stream::StreamResponse;
use ratatui::layout::Rect;
use transcript::FlushMode;
use transcript::SequentialIdGen;
use transcript::input::TranscriptInput;
use transcript::postprocess::PostProcessUpdate;
use transcript::types::{PartialWord, SpeakerHint, TranscriptWord};
use transcript::view::{ProcessOutcome, TranscriptView};

use crate::renderer::{LayoutInfo, WordRegion};
use crate::source::{CactusMetrics, Source};

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LastEvent {
    Final,
    Partial,
    Correction,
    Skipped,
}

pub enum KeyAction {
    Quit,
    Continue { reset_tick: bool },
}

pub enum SelectedWord {
    Final {
        word: TranscriptWord,
        speaker: Option<SpeakerHint>,
    },
    Partial {
        word: PartialWord,
        stability: Option<u32>,
    },
}

pub struct App {
    source: Source,
    pub position: usize,
    pub paused: bool,
    pub speed_ms: u64,
    pub view: TranscriptView,
    pub source_name: String,
    pub last_event: LastEvent,
    pub flush_mode: FlushMode,
    pub last_postprocess: Option<PostProcessUpdate>,
    pub cactus_metrics: Option<CactusMetrics>,
    pub transcript_scroll: u16,
    pub auto_scroll: bool,
    pub transcript_lines: u16,
    pub transcript_area_height: u16,
    pub selected_word: Option<SelectedWord>,
    pub word_regions: Vec<WordRegion>,
    pub transcript_area: Rect,
}

impl App {
    pub fn new(source: Source, speed_ms: u64, source_name: String) -> Self {
        Self {
            source,
            position: 0,
            paused: false,
            speed_ms,
            view: TranscriptView::with_config(SequentialIdGen::new()),
            source_name,
            last_event: LastEvent::Skipped,
            flush_mode: FlushMode::DrainAll,
            last_postprocess: None,
            cactus_metrics: None,
            transcript_scroll: 0,
            auto_scroll: true,
            transcript_lines: 0,
            transcript_area_height: 0,
            selected_word: None,
            word_regions: Vec::new(),
            transcript_area: Rect::default(),
        }
    }

    pub fn total(&self) -> usize {
        self.source.total()
    }

    pub fn is_live(&self) -> bool {
        self.source.is_live()
    }

    pub fn is_done(&self) -> bool {
        if self.source.is_live() {
            return false;
        }
        self.position >= self.total()
    }

    pub fn advance(&mut self) -> bool {
        if self.source.is_live() {
            if let Some(sr) = self.source.poll_next().cloned() {
                self.position = self.source.total();
                self.process_one(&sr);
                return true;
            }
            return false;
        }

        if self.position >= self.total() {
            return false;
        }
        if let Some(sr) = self.source.get(self.position).cloned() {
            self.process_one(&sr);
        }
        self.position += 1;
        true
    }

    pub fn handle_key(&mut self, code: KeyCode) -> KeyAction {
        match code {
            KeyCode::Char('q') => KeyAction::Quit,
            KeyCode::Esc => {
                if self.selected_word.is_some() {
                    self.selected_word = None;
                    return KeyAction::Continue { reset_tick: false };
                }
                KeyAction::Quit
            }
            KeyCode::Char(' ') => {
                self.paused = !self.paused;
                if !self.paused {
                    self.auto_scroll = true;
                }
                KeyAction::Continue { reset_tick: true }
            }
            KeyCode::Right if !self.source.is_live() => {
                self.seek_to(self.position + 1);
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Left if !self.source.is_live() => {
                self.seek_to(self.position.saturating_sub(1));
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Up => {
                self.speed_ms = self.speed_ms.saturating_sub(10).max(5);
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Down => {
                self.speed_ms += 10;
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Home if !self.source.is_live() => {
                self.seek_to(0);
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::End if !self.source.is_live() => {
                let total = self.total();
                self.seek_to(total);
                let mode = self.flush_mode;
                self.view.flush(mode);
                self.auto_scroll = true;
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::PageUp => {
                let current = self.current_scroll_offset();
                self.auto_scroll = false;
                self.transcript_scroll = current.saturating_sub(5);
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::PageDown => {
                let max = self
                    .transcript_lines
                    .saturating_sub(self.transcript_area_height);
                let current = self.current_scroll_offset();
                let next = (current + 5).min(max);
                if next >= max {
                    self.auto_scroll = true;
                }
                self.transcript_scroll = next;
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Char('f') => {
                self.toggle_flush_mode();
                KeyAction::Continue { reset_tick: false }
            }
            KeyCode::Char('p') => {
                self.simulate_postprocess();
                KeyAction::Continue { reset_tick: false }
            }
            _ => KeyAction::Continue { reset_tick: false },
        }
    }

    pub fn update_layout(&mut self, layout: LayoutInfo) {
        self.transcript_lines = layout.transcript_lines;
        self.transcript_area_height = layout.transcript_area_height;
        self.word_regions = layout.word_regions;
        self.transcript_area = layout.transcript_area;
    }

    pub fn handle_mouse(&mut self, event: MouseEvent) {
        if event.kind != MouseEventKind::Down(MouseButton::Left) {
            return;
        }
        let col = event.column;
        let row = event.row;

        let area = self.transcript_area;
        if col < area.x || col >= area.x + area.width || row < area.y || row >= area.y + area.height
        {
            return;
        }

        let scroll_offset = self.current_scroll_offset();

        let logical_col = col - area.x;
        let logical_row = (row - area.y) + scroll_offset;

        let hit = self.word_regions.iter().find(|r| {
            r.row == logical_row && logical_col >= r.col_start && logical_col < r.col_end
        });

        let Some(region) = hit else {
            return;
        };

        let frame = self.view.frame();
        let dbg = self.view.pipeline_debug();

        if region.is_final {
            let Some(word) = frame.final_words.get(region.index).cloned() else {
                return;
            };
            let speaker = frame
                .speaker_hints
                .iter()
                .find(|h| h.word_id == word.id)
                .cloned();
            self.selected_word = Some(SelectedWord::Final { word, speaker });
        } else {
            let Some(word) = frame.partial_words.get(region.index).cloned() else {
                return;
            };
            let stability = dbg
                .partial_stability
                .iter()
                .find(|(text, _)| *text == word.text)
                .map(|(_, count)| *count);
            self.selected_word = Some(SelectedWord::Partial { word, stability });
        }
    }

    fn current_scroll_offset(&self) -> u16 {
        if self.auto_scroll {
            self.transcript_lines
                .saturating_sub(self.transcript_area_height)
        } else {
            self.transcript_scroll
        }
    }

    fn process_one(&mut self, sr: &StreamResponse) {
        if let Some(m) = CactusMetrics::from_stream_response(sr) {
            self.cactus_metrics = Some(m);
        }
        match TranscriptInput::from_stream_response(sr) {
            Some(input) => {
                self.last_event = match &input {
                    TranscriptInput::Final { .. } => LastEvent::Final,
                    TranscriptInput::Partial { .. } => LastEvent::Partial,
                    TranscriptInput::Correction { .. } => LastEvent::Correction,
                };
                if let ProcessOutcome::Corrected(update) = self.view.process(input) {
                    self.last_postprocess = Some(update);
                }
            }
            None => {
                self.last_event = LastEvent::Skipped;
            }
        }
    }

    fn seek_to(&mut self, target: usize) {
        let target = target.min(self.total());
        self.view = TranscriptView::with_config(SequentialIdGen::new());
        self.last_postprocess = None;
        self.cactus_metrics = None;
        self.selected_word = None;
        self.position = 0;
        self.auto_scroll = true;
        for i in 0..target {
            if let Some(sr) = self.source.get(i).cloned() {
                self.process_one(&sr);
            }
        }
        self.position = target;
    }

    fn toggle_flush_mode(&mut self) {
        self.flush_mode = match self.flush_mode {
            FlushMode::DrainAll => FlushMode::PromotableOnly,
            FlushMode::PromotableOnly => FlushMode::DrainAll,
        };
    }

    fn simulate_postprocess(&mut self) {
        let finals = self.view.frame().final_words;
        if finals.is_empty() {
            return;
        }
        let transformed: Vec<TranscriptWord> = finals
            .into_iter()
            .map(|w| TranscriptWord {
                text: title_case_word(&w.text),
                ..w
            })
            .collect();
        let update = self.view.apply_postprocess(transformed);
        self.last_postprocess = Some(update);
    }
}

fn title_case_word(s: &str) -> String {
    let trimmed = s.trim_start_matches(' ');
    let leading_spaces = &s[..s.len() - trimmed.len()];
    let mut chars = trimmed.chars();
    match chars.next() {
        None => s.to_string(),
        Some(first) => {
            let upper: String = first.to_uppercase().collect();
            format!("{leading_spaces}{upper}{}", chars.as_str())
        }
    }
}
