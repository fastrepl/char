use ratatui::{
    style::Style,
    text::{Line, Span},
};

use crate::theme::THEME;

pub(super) fn kv(label: &str, value: impl Into<String>, style: Style) -> Line<'static> {
    Line::from(vec![
        Span::styled(label.to_string(), THEME.dim),
        Span::styled(value.into(), style),
    ])
}

pub(super) fn section_header(title: &str) -> Line<'static> {
    Line::from(Span::styled(title.to_string(), THEME.section_header))
}

pub(super) fn dim_line(text: &str) -> Line<'static> {
    Line::from(Span::styled(text.to_string(), THEME.dim))
}

pub(super) fn truncate(s: &str, max_chars: usize) -> &str {
    if s.chars().count() <= max_chars {
        return s;
    }
    let mut end = 0;
    for (i, _) in s.char_indices().take(max_chars) {
        end = i;
    }
    &s[..end]
}
