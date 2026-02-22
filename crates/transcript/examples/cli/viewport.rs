use ratatui::layout::Rect;

use crate::renderer::{LayoutInfo, WordRegion};

pub struct ViewportState {
    pub scroll: u16,
    pub auto_scroll: bool,
    pub content_lines: u16,
    pub visible_height: u16,
    pub word_regions: Vec<WordRegion>,
    pub area: Rect,
}

impl ViewportState {
    pub fn new() -> Self {
        Self {
            scroll: 0,
            auto_scroll: true,
            content_lines: 0,
            visible_height: 0,
            word_regions: Vec::new(),
            area: Rect::default(),
        }
    }

    pub fn update(&mut self, layout: LayoutInfo) {
        self.content_lines = layout.transcript_lines;
        self.visible_height = layout.transcript_area_height;
        self.word_regions = layout.word_regions;
        self.area = layout.transcript_area;
    }

    pub fn current_scroll_offset(&self) -> u16 {
        if self.auto_scroll {
            self.content_lines.saturating_sub(self.visible_height)
        } else {
            self.scroll
        }
    }

    pub fn reset(&mut self) {
        self.scroll = 0;
        self.auto_scroll = true;
        self.content_lines = 0;
        self.visible_height = 0;
        self.word_regions.clear();
        self.area = Rect::default();
    }

    pub fn scroll_up(&mut self, amount: u16) {
        self.auto_scroll = false;
        self.scroll = self.current_scroll_offset().saturating_sub(amount);
    }

    pub fn scroll_down(&mut self, amount: u16) {
        let max = self.content_lines.saturating_sub(self.visible_height);
        let next = (self.current_scroll_offset() + amount).min(max);
        if next >= max {
            self.auto_scroll = true;
        }
        self.scroll = next;
    }
}
