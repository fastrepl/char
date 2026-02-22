mod debug;
mod transcript;
mod utils;

use ::transcript::FlushMode;
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    text::{Line, Span},
    widgets::{Gauge, Paragraph},
};

use crate::app::App;
use crate::theme::THEME;

const DEBUG_PANEL_WIDTH: u16 = 36;

pub struct WordRegion {
    pub index: usize,
    pub is_final: bool,
    pub row: u16,
    pub col_start: u16,
    pub col_end: u16,
}

pub struct LayoutInfo {
    pub transcript_lines: u16,
    pub transcript_area_height: u16,
    pub word_regions: Vec<WordRegion>,
    pub transcript_area: Rect,
}

pub fn render(frame: &mut Frame, app: &App) -> LayoutInfo {
    let [header_area, body_area, timeline_area, hint_area] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Fill(1),
        Constraint::Length(1),
        Constraint::Length(1),
    ])
    .areas(frame.area());

    let [transcript_area, debug_area] =
        Layout::horizontal([Constraint::Fill(1), Constraint::Length(DEBUG_PANEL_WIDTH)])
            .areas(body_area);

    render_header(frame, app, header_area);
    let layout = transcript::render_transcript(frame, app, transcript_area);
    debug::render_debug(frame, app, debug_area);
    render_timeline(frame, app, timeline_area);
    render_hints(frame, app, hint_area);
    layout
}

fn render_header(frame: &mut Frame, app: &App, area: Rect) {
    let status = if app.paused {
        "⏸ PAUSED"
    } else {
        "▶ PLAYING"
    };
    let flush_label = match app.flush_mode {
        FlushMode::DrainAll => "drain-all",
        FlushMode::PromotableOnly => "promotable-only",
    };
    let text = format!(
        " {} | {} | {}ms/event | flush: {} ",
        app.source_name, status, app.speed_ms, flush_label
    );
    frame.render_widget(Paragraph::new(text).style(THEME.header), area);
}

fn render_timeline(frame: &mut Frame, app: &App, area: Rect) {
    let total = app.total();
    let ratio = if total == 0 {
        0.0
    } else {
        app.position as f64 / total as f64
    };
    let label = format!("{}/{}", app.position, total);
    let gauge = Gauge::default()
        .gauge_style(THEME.gauge)
        .ratio(ratio)
        .label(label);
    frame.render_widget(gauge, area);
}

fn render_hints(frame: &mut Frame, app: &App, area: Rect) {
    let spans = if app.selected_word.is_some() {
        hint_spans(&[("Esc", "clear word"), ("q", "quit")])
    } else {
        hint_spans(&[
            ("click", "inspect"),
            ("Space", "pause"),
            ("←/→", "seek"),
            ("↑/↓", "speed"),
            ("PgUp/Dn", "scroll"),
            ("f", "flush"),
            ("p", "postprocess"),
            ("q", "quit"),
        ])
    };
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

fn hint_spans(keys: &[(&str, &str)]) -> Vec<Span<'static>> {
    keys.iter()
        .flat_map(|(key, desc)| {
            [
                Span::styled(format!(" {key} "), THEME.key),
                Span::styled(format!(" {desc} "), THEME.key_desc),
            ]
        })
        .collect()
}
