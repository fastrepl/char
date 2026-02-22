use crossterm::event::{KeyCode, MouseButton, MouseEvent, MouseEventKind};
use owhisper_interface::stream::StreamResponse;
use ratatui::style::Style;
use transcript::FlushMode;
use transcript::SequentialIdGen;
use transcript::input::TranscriptInput;
use transcript::postprocess::PostProcessUpdate;
use transcript::types::{PartialWord, SpeakerHint, TranscriptWord};
use transcript::view::{ProcessOutcome, TranscriptView};

use crate::feed::TranscriptFeed;
use crate::renderer::debug::DebugSection;
use crate::renderer::{LayoutInfo, WordRegion};
use crate::viewport::ViewportState;

fn lookup_word(region: &WordRegion, view: &TranscriptView) -> Option<SelectedWord> {
    let frame = view.frame();
    let dbg = view.pipeline_debug();
    if region.is_final {
        let word = frame.final_words.get(region.index)?.clone();
        let speaker = frame
            .speaker_hints
            .iter()
            .find(|h| h.word_id == word.id)
            .cloned();
        Some(SelectedWord::Final { word, speaker })
    } else {
        let word = frame.partial_words.get(region.index)?.clone();
        let stability = dbg
            .partial_stability
            .iter()
            .find(|(text, _)| *text == word.text)
            .map(|(_, count)| *count);
        Some(SelectedWord::Partial { word, stability })
    }
}

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
    source: Box<dyn TranscriptFeed>,
    source_debug: Vec<DebugSection>,
    pub position: usize,
    pub paused: bool,
    pub speed_ms: u64,
    pub view: TranscriptView,
    pub source_name: String,
    pub last_event: LastEvent,
    pub flush_mode: FlushMode,
    pub last_postprocess: Option<PostProcessUpdate>,
    pub viewport: ViewportState,
    pub selected_word: Option<SelectedWord>,
}

impl App {
    pub fn new(
        source: Box<dyn TranscriptFeed>,
        source_debug: Vec<DebugSection>,
        speed_ms: u64,
        source_name: String,
    ) -> Self {
        let paused = !source.is_live();
        Self {
            source,
            source_debug,
            position: 0,
            paused,
            speed_ms,
            view: TranscriptView::with_config(SequentialIdGen::new()),
            source_name,
            last_event: LastEvent::Skipped,
            flush_mode: FlushMode::DrainAll,
            last_postprocess: None,
            viewport: ViewportState::new(),
            selected_word: None,
        }
    }

    pub fn source_debug_sections(&self) -> Vec<DebugSection> {
        let mut sections = self.source_debug.clone();
        sections.extend(self.source.debug_sections());
        sections
    }

    pub fn source_word_style(&self, channel: i32, start_ms: i64, end_ms: i64) -> Option<Style> {
        self.source.word_style(channel, start_ms, end_ms)
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
            KeyCode::Char('q') => return KeyAction::Quit,
            KeyCode::Esc if self.selected_word.is_some() => {
                self.selected_word = None;
            }
            KeyCode::Esc => return KeyAction::Quit,
            KeyCode::Char(' ') => {
                self.paused = !self.paused;
                if !self.paused {
                    self.viewport.auto_scroll = true;
                }
                return KeyAction::Continue { reset_tick: true };
            }
            KeyCode::Right if !self.source.is_live() => {
                self.seek_to(self.position + 1);
            }
            KeyCode::Left if !self.source.is_live() => {
                self.seek_to(self.position.saturating_sub(1));
            }
            KeyCode::Up => {
                self.speed_ms = self.speed_ms.saturating_sub(10).max(5);
            }
            KeyCode::Down => {
                self.speed_ms += 10;
            }
            KeyCode::Home if !self.source.is_live() => {
                self.seek_to(0);
            }
            KeyCode::End if !self.source.is_live() => {
                let total = self.total();
                self.seek_to(total);
                let mode = self.flush_mode;
                self.view.flush(mode);
                self.viewport.auto_scroll = true;
            }
            KeyCode::PageUp => {
                self.viewport.scroll_up(5);
            }
            KeyCode::PageDown => {
                self.viewport.scroll_down(5);
            }
            KeyCode::Char('f') => {
                self.toggle_flush_mode();
            }
            KeyCode::Char('p') => {
                self.simulate_postprocess();
            }
            _ => {}
        }
        KeyAction::Continue { reset_tick: false }
    }

    pub fn update_layout(&mut self, layout: LayoutInfo) {
        self.viewport.update(layout);
    }

    pub fn handle_mouse(&mut self, event: MouseEvent) {
        if event.kind != MouseEventKind::Down(MouseButton::Left) {
            return;
        }

        let area = self.viewport.area;
        let col = event.column;
        let row = event.row;
        if col < area.x || col >= area.x + area.width || row < area.y || row >= area.y + area.height
        {
            return;
        }

        let scroll_offset = self.viewport.current_scroll_offset();
        let logical_col = col - area.x;
        let logical_row = (row - area.y) + scroll_offset;

        let hit = self.viewport.word_regions.iter().find(|r| {
            r.row == logical_row && logical_col >= r.col_start && logical_col < r.col_end
        });

        if let Some(region) = hit {
            self.selected_word = lookup_word(region, &self.view);
        }
    }

    fn process_one(&mut self, sr: &StreamResponse) {
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
        self.selected_word = None;
        self.viewport.reset();
        self.position = 0;
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
        let title_case = |s: &str| -> String {
            let trimmed = s.trim_start_matches(' ');
            let leading = &s[..s.len() - trimmed.len()];
            let mut chars = trimmed.chars();
            match chars.next() {
                None => s.to_string(),
                Some(first) => format!("{leading}{}{}", first.to_uppercase(), chars.as_str()),
            }
        };
        let transformed = finals
            .into_iter()
            .map(|w| TranscriptWord {
                text: title_case(&w.text),
                ..w
            })
            .collect();
        self.last_postprocess = Some(self.view.apply_postprocess(transformed));
    }
}
