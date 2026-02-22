use owhisper_interface::stream::StreamResponse;
use ratatui::style::Style;

use crate::renderer::debug::DebugSection;

pub trait TranscriptFeed {
    fn total(&self) -> usize;
    fn get(&self, index: usize) -> Option<&StreamResponse>;
    fn poll_next(&mut self) -> Option<&StreamResponse>;
    fn is_live(&self) -> bool;

    fn debug_sections(&self) -> Vec<DebugSection> {
        vec![]
    }

    fn word_style(&self, channel: i32, start_ms: i64, end_ms: i64) -> Option<Style> {
        let _ = (channel, start_ms, end_ms);
        None
    }
}

pub struct LiveCollector {
    rx: std::sync::mpsc::Receiver<StreamResponse>,
    collected: Vec<StreamResponse>,
}

impl LiveCollector {
    pub fn new(rx: std::sync::mpsc::Receiver<StreamResponse>) -> Self {
        Self {
            rx,
            collected: Vec::new(),
        }
    }

    pub fn total(&self) -> usize {
        self.collected.len()
    }

    pub fn get(&self, index: usize) -> Option<&StreamResponse> {
        self.collected.get(index)
    }

    pub fn poll_next(&mut self) -> Option<&StreamResponse> {
        if let Ok(sr) = self.rx.try_recv() {
            self.collected.push(sr);
            self.collected.last()
        } else {
            None
        }
    }

    pub fn try_recv(&self) -> Option<StreamResponse> {
        self.rx.try_recv().ok()
    }

    pub fn push(&mut self, sr: StreamResponse) {
        self.collected.push(sr);
    }

    pub fn last(&self) -> Option<&StreamResponse> {
        self.collected.last()
    }
}
