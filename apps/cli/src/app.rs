use crossterm::event::{KeyCode, KeyEvent};
use hypr_listener_core::{
    DegradedError, SessionDataEvent, SessionErrorEvent, SessionLifecycleEvent,
    SessionProgressEvent, State,
};
use hypr_transcript::{FinalizedWord, PartialWord, TranscriptProcessor};

use crate::runtime::ListenerEvent;

pub struct App {
    pub should_quit: bool,
    pub state: State,
    pub status: String,
    pub degraded: Option<DegradedError>,
    pub errors: Vec<String>,
    pub mic_level: u16,
    pub speaker_level: u16,
    pub mic_muted: bool,
    pub words: Vec<FinalizedWord>,
    pub partials: Vec<PartialWord>,
    transcript: TranscriptProcessor,
    pub started_at: std::time::Instant,
    pub scroll_offset: u16,
}

impl App {
    pub fn new() -> Self {
        Self {
            should_quit: false,
            state: State::Inactive,
            status: "Starting...".into(),
            degraded: None,
            errors: Vec::new(),
            mic_level: 0,
            speaker_level: 0,
            mic_muted: false,
            words: Vec::new(),
            partials: Vec::new(),
            transcript: TranscriptProcessor::new(),
            started_at: std::time::Instant::now(),
            scroll_offset: 0,
        }
    }

    pub fn elapsed(&self) -> std::time::Duration {
        self.started_at.elapsed()
    }

    pub fn handle_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => self.should_quit = true,
            KeyCode::Char('j') | KeyCode::Down => {
                self.scroll_offset = self.scroll_offset.saturating_add(1);
            }
            KeyCode::Char('k') | KeyCode::Up => {
                self.scroll_offset = self.scroll_offset.saturating_sub(1);
            }
            _ => {}
        }
    }

    pub fn handle_listener_event(&mut self, event: ListenerEvent) {
        match event {
            ListenerEvent::Lifecycle(e) => self.handle_lifecycle(e),
            ListenerEvent::Progress(e) => self.handle_progress(e),
            ListenerEvent::Error(e) => self.handle_error(e),
            ListenerEvent::Data(e) => self.handle_data(e),
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
