use std::collections::VecDeque;

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use hypr_listener_core::{
    DegradedError, SessionDataEvent, SessionErrorEvent, SessionLifecycleEvent,
    SessionProgressEvent, State,
};
use hypr_transcript::{FinalizedWord, PartialWord, TranscriptProcessor};

use crate::frame::FrameRequester;
use crate::runtime::ListenerEvent;

const AUDIO_HISTORY_CAP: usize = 64;

pub struct MemoView {
    pub lines: Vec<String>,
    pub cursor_row: u16,
    pub cursor_col: u16,
}

pub struct App {
    pub should_quit: bool,
    pub state: State,
    pub status: String,
    pub degraded: Option<DegradedError>,
    pub errors: Vec<String>,
    pub mic_level: u16,
    pub speaker_level: u16,
    pub mic_history: VecDeque<u64>,
    pub speaker_history: VecDeque<u64>,
    pub mic_muted: bool,
    pub words: Vec<FinalizedWord>,
    pub partials: Vec<PartialWord>,
    transcript: TranscriptProcessor,
    pub started_at: std::time::Instant,
    pub scroll_offset: u16,
    frame_requester: FrameRequester,

    pub memo_focused: bool,
    pub transcript_focused: bool,
    notepad_width_percent: u16,
    memo_lines: Vec<String>,
    memo_cursor_row: usize,
    memo_cursor_col: usize,
}

impl App {
    pub fn new(frame_requester: FrameRequester) -> Self {
        Self {
            should_quit: false,
            state: State::Inactive,
            status: "Starting...".into(),
            degraded: None,
            errors: Vec::new(),
            mic_level: 0,
            speaker_level: 0,
            mic_history: VecDeque::with_capacity(AUDIO_HISTORY_CAP),
            speaker_history: VecDeque::with_capacity(AUDIO_HISTORY_CAP),
            mic_muted: false,
            words: Vec::new(),
            partials: Vec::new(),
            transcript: TranscriptProcessor::new(),
            started_at: std::time::Instant::now(),
            scroll_offset: 0,
            frame_requester,

            memo_focused: false,
            transcript_focused: true,
            notepad_width_percent: 67,
            memo_lines: vec![String::new()],
            memo_cursor_row: 0,
            memo_cursor_col: 0,
        }
    }

    pub fn elapsed(&self) -> std::time::Duration {
        self.started_at.elapsed()
    }

    pub fn handle_key(&mut self, key: KeyEvent) {
        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
            self.should_quit = true;
            return;
        }

        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Left {
            self.adjust_notepad_width(-2);
            self.frame_requester.schedule_frame();
            return;
        }

        if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Right {
            self.adjust_notepad_width(2);
            self.frame_requester.schedule_frame();
            return;
        }

        if key.code == KeyCode::Tab {
            self.toggle_focus();
            self.frame_requester.schedule_frame();
            return;
        }

        if self.memo_focused {
            self.handle_memo_key(key);
        } else {
            self.handle_global_key(key);
        }
    }

    pub fn handle_paste(&mut self, pasted: String) {
        if !self.memo_focused {
            return;
        }
        let pasted = pasted.replace("\r\n", "\n").replace('\r', "\n");
        self.memo_insert_str(&pasted);
        self.clamp_cursor();
        self.frame_requester.schedule_frame();
    }

    pub fn handle_listener_event(&mut self, event: ListenerEvent) {
        match event {
            ListenerEvent::Lifecycle(e) => self.handle_lifecycle(e),
            ListenerEvent::Progress(e) => self.handle_progress(e),
            ListenerEvent::Error(e) => self.handle_error(e),
            ListenerEvent::Data(e) => self.handle_data(e),
        }
        self.frame_requester.schedule_frame();
    }

    pub fn memo_view(&self, max_rows: usize, max_cols: usize) -> MemoView {
        if max_rows == 0 || max_cols == 0 {
            return MemoView {
                lines: Vec::new(),
                cursor_row: 0,
                cursor_col: 0,
            };
        }

        let cursor_row = self
            .memo_cursor_row
            .min(self.memo_lines.len().saturating_sub(1));
        let cursor_col = self.memo_cursor_col.min(self.current_line_len());

        let row_start = if cursor_row + 1 > max_rows {
            cursor_row + 1 - max_rows
        } else {
            0
        };

        let col_start = if cursor_col + 1 > max_cols {
            cursor_col + 1 - max_cols
        } else {
            0
        };

        let row_end = (row_start + max_rows).min(self.memo_lines.len());
        let lines = self.memo_lines[row_start..row_end]
            .iter()
            .map(|line| {
                let end = (col_start + max_cols).min(line.chars().count());
                substring_by_char_range(line, col_start, end)
            })
            .collect();

        MemoView {
            lines,
            cursor_row: cursor_row.saturating_sub(row_start) as u16,
            cursor_col: cursor_col.saturating_sub(col_start) as u16,
        }
    }

    pub fn memo_is_empty(&self) -> bool {
        self.memo_lines.iter().all(String::is_empty)
    }

    pub fn notepad_width_percent(&self) -> u16 {
        self.notepad_width_percent
    }

    fn handle_global_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') => self.should_quit = true,
            KeyCode::Char('m') => {
                self.memo_focused = true;
                self.transcript_focused = false;
                self.memo_cursor_row = self.memo_lines.len().saturating_sub(1);
                self.memo_cursor_col = self.current_line_len();
                self.frame_requester.schedule_frame();
            }
            KeyCode::Char('j') | KeyCode::Down => {
                self.scroll_offset = self.scroll_offset.saturating_add(1);
                self.frame_requester.schedule_frame();
            }
            KeyCode::Char('k') | KeyCode::Up => {
                self.scroll_offset = self.scroll_offset.saturating_sub(1);
                self.frame_requester.schedule_frame();
            }
            _ => {}
        }
    }

    fn handle_memo_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Esc => {
                self.memo_focused = false;
                self.transcript_focused = true;
            }
            KeyCode::Left => {
                if self.memo_cursor_col > 0 {
                    self.memo_cursor_col = self.memo_cursor_col.saturating_sub(1);
                } else if self.memo_cursor_row > 0 {
                    self.memo_cursor_row = self.memo_cursor_row.saturating_sub(1);
                    self.memo_cursor_col = self.current_line_len();
                }
            }
            KeyCode::Right => {
                let line_len = self.current_line_len();
                if self.memo_cursor_col < line_len {
                    self.memo_cursor_col += 1;
                } else if self.memo_cursor_row + 1 < self.memo_lines.len() {
                    self.memo_cursor_row += 1;
                    self.memo_cursor_col = 0;
                }
            }
            KeyCode::Up => {
                if self.memo_cursor_row > 0 {
                    self.memo_cursor_row = self.memo_cursor_row.saturating_sub(1);
                    self.memo_cursor_col = self.memo_cursor_col.min(self.current_line_len());
                }
            }
            KeyCode::Down => {
                if self.memo_cursor_row + 1 < self.memo_lines.len() {
                    self.memo_cursor_row += 1;
                    self.memo_cursor_col = self.memo_cursor_col.min(self.current_line_len());
                }
            }
            KeyCode::Home => {
                self.memo_cursor_col = 0;
            }
            KeyCode::End => {
                self.memo_cursor_col = self.current_line_len();
            }
            KeyCode::Backspace => {
                self.memo_backspace();
            }
            KeyCode::Delete => {
                self.memo_delete();
            }
            KeyCode::Enter => {
                self.memo_insert_newline();
            }
            KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                self.memo_lines.clear();
                self.memo_lines.push(String::new());
                self.memo_cursor_row = 0;
                self.memo_cursor_col = 0;
            }
            KeyCode::Char(ch)
                if !key.modifiers.contains(KeyModifiers::CONTROL)
                    && !key.modifiers.contains(KeyModifiers::ALT) =>
            {
                self.memo_insert_char(ch);
            }
            _ => {}
        }

        self.clamp_cursor();
        self.frame_requester.schedule_frame();
    }

    fn toggle_focus(&mut self) {
        if self.memo_focused {
            self.memo_focused = false;
            self.transcript_focused = true;
        } else {
            self.memo_focused = true;
            self.transcript_focused = false;
        }
    }

    fn adjust_notepad_width(&mut self, delta: i16) {
        const MIN_NOTEPAD_WIDTH_PERCENT: u16 = 45;
        const MAX_NOTEPAD_WIDTH_PERCENT: u16 = 80;

        let next = (self.notepad_width_percent as i16 + delta).clamp(
            MIN_NOTEPAD_WIDTH_PERCENT as i16,
            MAX_NOTEPAD_WIDTH_PERCENT as i16,
        ) as u16;
        self.notepad_width_percent = next;
    }

    fn line_byte_index_for_char(line: &str, char_index: usize) -> usize {
        if char_index == 0 {
            return 0;
        }
        line.char_indices()
            .nth(char_index)
            .map(|(i, _)| i)
            .unwrap_or(line.len())
    }

    fn current_line_len(&self) -> usize {
        self.memo_lines
            .get(self.memo_cursor_row)
            .map(|line| line.chars().count())
            .unwrap_or(0)
    }

    fn clamp_cursor(&mut self) {
        if self.memo_lines.is_empty() {
            self.memo_lines.push(String::new());
        }
        self.memo_cursor_row = self
            .memo_cursor_row
            .min(self.memo_lines.len().saturating_sub(1));
        self.memo_cursor_col = self.memo_cursor_col.min(self.current_line_len());
    }

    fn memo_insert_char(&mut self, ch: char) {
        if ch == '\n' {
            self.memo_insert_newline();
            return;
        }

        if let Some(line) = self.memo_lines.get_mut(self.memo_cursor_row) {
            let byte_index = Self::line_byte_index_for_char(line, self.memo_cursor_col);
            line.insert(byte_index, ch);
            self.memo_cursor_col += 1;
        }
    }

    fn memo_insert_str(&mut self, s: &str) {
        for ch in s.chars() {
            self.memo_insert_char(ch);
        }
    }

    fn memo_insert_newline(&mut self) {
        if let Some(line) = self.memo_lines.get_mut(self.memo_cursor_row) {
            let byte_index = Self::line_byte_index_for_char(line, self.memo_cursor_col);
            let tail = line.split_off(byte_index);
            self.memo_cursor_row += 1;
            self.memo_cursor_col = 0;
            self.memo_lines.insert(self.memo_cursor_row, tail);
        }
    }

    fn memo_backspace(&mut self) {
        if self.memo_cursor_col > 0 {
            if let Some(line) = self.memo_lines.get_mut(self.memo_cursor_row) {
                let start =
                    Self::line_byte_index_for_char(line, self.memo_cursor_col.saturating_sub(1));
                let end = Self::line_byte_index_for_char(line, self.memo_cursor_col);
                line.replace_range(start..end, "");
                self.memo_cursor_col = self.memo_cursor_col.saturating_sub(1);
            }
            return;
        }

        if self.memo_cursor_row == 0 {
            return;
        }

        let current_line = self.memo_lines.remove(self.memo_cursor_row);
        self.memo_cursor_row = self.memo_cursor_row.saturating_sub(1);
        if let Some(prev_line) = self.memo_lines.get_mut(self.memo_cursor_row) {
            self.memo_cursor_col = prev_line.chars().count();
            prev_line.push_str(&current_line);
        }
    }

    fn memo_delete(&mut self) {
        let line_len = self.current_line_len();
        if self.memo_cursor_col < line_len {
            if let Some(line) = self.memo_lines.get_mut(self.memo_cursor_row) {
                let start = Self::line_byte_index_for_char(line, self.memo_cursor_col);
                let end = Self::line_byte_index_for_char(line, self.memo_cursor_col + 1);
                line.replace_range(start..end, "");
            }
            return;
        }

        if self.memo_cursor_row + 1 >= self.memo_lines.len() {
            return;
        }

        let next_line = self.memo_lines.remove(self.memo_cursor_row + 1);
        if let Some(line) = self.memo_lines.get_mut(self.memo_cursor_row) {
            line.push_str(&next_line);
        }
    }

    fn handle_lifecycle(&mut self, event: SessionLifecycleEvent) {
        match event {
            SessionLifecycleEvent::Active { error, .. } => {
                self.state = State::Active;
                self.degraded = error;
                if self.degraded.is_some() {
                    self.status = "Active (degraded)".into();
                } else {
                    self.status = "Listening".into();
                }
            }
            SessionLifecycleEvent::Inactive { error, .. } => {
                self.state = State::Inactive;
                if let Some(err) = error {
                    self.status = format!("Stopped: {err}");
                } else {
                    self.status = "Stopped".into();
                }
            }
            SessionLifecycleEvent::Finalizing { .. } => {
                self.state = State::Finalizing;
                self.status = "Finalizing...".into();
            }
        }
    }

    fn handle_progress(&mut self, event: SessionProgressEvent) {
        match event {
            SessionProgressEvent::AudioInitializing { .. } => {
                self.status = "Initializing audio...".into();
            }
            SessionProgressEvent::AudioReady { device, .. } => {
                if let Some(dev) = device {
                    self.status = format!("Audio ready ({dev})");
                } else {
                    self.status = "Audio ready".into();
                }
            }
            SessionProgressEvent::Connecting { .. } => {
                self.status = "Connecting...".into();
            }
            SessionProgressEvent::Connected { adapter, .. } => {
                self.status = format!("Connected via {adapter}");
            }
        }
    }

    fn handle_error(&mut self, event: SessionErrorEvent) {
        match event {
            SessionErrorEvent::AudioError { error, .. } => {
                self.errors.push(format!("Audio: {error}"));
            }
            SessionErrorEvent::ConnectionError { error, .. } => {
                self.errors.push(format!("Connection: {error}"));
            }
        }
    }

    fn handle_data(&mut self, event: SessionDataEvent) {
        match event {
            SessionDataEvent::AudioAmplitude { mic, speaker, .. } => {
                self.mic_level = mic;
                self.speaker_level = speaker;

                if self.mic_history.len() >= AUDIO_HISTORY_CAP {
                    self.mic_history.pop_front();
                }
                self.mic_history.push_back(mic as u64);

                if self.speaker_history.len() >= AUDIO_HISTORY_CAP {
                    self.speaker_history.pop_front();
                }
                self.speaker_history.push_back(speaker as u64);
            }
            SessionDataEvent::MicMuted { value, .. } => {
                self.mic_muted = value;
            }
            SessionDataEvent::StreamResponse { response, .. } => {
                if let Some(delta) = self.transcript.process(response.as_ref()) {
                    if !delta.replaced_ids.is_empty() {
                        self.words.retain(|w| !delta.replaced_ids.contains(&w.id));
                    }
                    self.words.extend(delta.new_words);
                    self.partials = delta.partials;
                }
            }
        }
    }
}

fn substring_by_char_range(s: &str, start: usize, end: usize) -> String {
    if start >= end {
        return String::new();
    }

    let start_byte = s
        .char_indices()
        .nth(start)
        .map(|(i, _)| i)
        .unwrap_or_else(|| s.len());
    let end_byte = s
        .char_indices()
        .nth(end)
        .map(|(i, _)| i)
        .unwrap_or_else(|| s.len());
    s.get(start_byte..end_byte).unwrap_or("").to_string()
}
