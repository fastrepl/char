use crossterm::event::KeyCode;
use owhisper_interface::stream::StreamResponse;
use transcript::FlushMode;
use transcript::input::TranscriptInput;
use transcript::postprocess::PostProcessUpdate;
use transcript::types::TranscriptWord;
use transcript::view::{ProcessOutcome, TranscriptView};

use crate::source::Source;

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LastEvent {
    Final,
    Partial,
    Correction,
    Skipped,
}

#[derive(Clone, Default)]
pub struct CactusMetrics {
    pub decode_tps: f64,
    pub prefill_tps: f64,
    pub time_to_first_token_ms: f64,
    pub total_time_ms: f64,
    pub decode_tokens: f64,
    pub prefill_tokens: f64,
    pub total_tokens: f64,
    pub buffer_duration_ms: f64,
}

impl CactusMetrics {
    pub fn from_stream_response(sr: &StreamResponse) -> Option<Self> {
        let extra = match sr {
            StreamResponse::TranscriptResponse { metadata, .. } => metadata.extra.as_ref()?,
            _ => return None,
        };
        let f = |key: &str| -> f64 { extra.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0) };
        Some(Self {
            decode_tps: f("decode_tps"),
            prefill_tps: f("prefill_tps"),
            time_to_first_token_ms: f("time_to_first_token_ms"),
            total_time_ms: f("total_time_ms"),
            decode_tokens: f("decode_tokens"),
            prefill_tokens: f("prefill_tokens"),
            total_tokens: f("total_tokens"),
            buffer_duration_ms: f("buffer_duration_ms"),
        })
    }
}

pub enum KeyAction {
    Quit,
    Continue { reset_tick: bool },
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
}

impl App {
    pub fn new(source: Source, speed_ms: u64, source_name: String) -> Self {
        Self {
            source,
            position: 0,
            paused: false,
            speed_ms,
            view: TranscriptView::new(),
            source_name,
            last_event: LastEvent::Skipped,
            flush_mode: FlushMode::DrainAll,
            last_postprocess: None,
            cactus_metrics: None,
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
            KeyCode::Char('q') | KeyCode::Esc => KeyAction::Quit,
            KeyCode::Char(' ') => {
                self.paused = !self.paused;
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
        self.view = TranscriptView::new();
        self.last_postprocess = None;
        self.cactus_metrics = None;
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
