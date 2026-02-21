use ratatui::style::{Color, Modifier, Style};

pub struct Theme {
    pub header: Style,
    pub transcript_final: Style,
    pub transcript_partial: Style,
    pub transcript_cursor: Style,
    pub debug_border: Style,
    pub section_header: Style,
    pub dim: Style,
    pub event_final: Style,
    pub event_partial: Style,
    pub event_correction: Style,
    pub event_skipped: Style,
    pub key: Style,
    pub key_desc: Style,
    pub highlight_cyan: Style,
    pub highlight_yellow: Style,
    pub watermark_active: Style,
    pub metric_value: Style,
    pub gauge: Style,
    pub speaker: [Style; 6],
}

pub const THEME: Theme = Theme {
    header: Style::new().fg(Color::DarkGray),
    transcript_final: Style::new(),
    transcript_partial: Style::new()
        .fg(Color::DarkGray)
        .add_modifier(Modifier::ITALIC),
    transcript_cursor: Style::new().fg(Color::DarkGray),
    debug_border: Style::new().fg(Color::DarkGray),
    section_header: Style::new()
        .fg(Color::DarkGray)
        .add_modifier(Modifier::UNDERLINED),
    dim: Style::new().fg(Color::DarkGray),
    event_final: Style::new().fg(Color::Green).add_modifier(Modifier::BOLD),
    event_partial: Style::new().fg(Color::Yellow).add_modifier(Modifier::BOLD),
    event_correction: Style::new().fg(Color::Magenta).add_modifier(Modifier::BOLD),
    event_skipped: Style::new()
        .fg(Color::DarkGray)
        .add_modifier(Modifier::BOLD),
    key: Style::new().fg(Color::Rgb(20, 20, 20)).bg(Color::DarkGray),
    key_desc: Style::new().fg(Color::DarkGray),
    highlight_cyan: Style::new().fg(Color::Cyan),
    highlight_yellow: Style::new().fg(Color::Yellow),
    watermark_active: Style::new().fg(Color::White),
    metric_value: Style::new().fg(Color::Cyan),
    gauge: Style::new().fg(Color::White).bg(Color::DarkGray),
    speaker: [
        Style::new().fg(Color::Cyan),
        Style::new().fg(Color::Green),
        Style::new().fg(Color::Magenta),
        Style::new().fg(Color::Yellow),
        Style::new().fg(Color::LightBlue),
        Style::new().fg(Color::LightRed),
    ],
};
