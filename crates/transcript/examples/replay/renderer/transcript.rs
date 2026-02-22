use std::collections::HashMap;

use ratatui::{
    Frame,
    layout::Rect,
    style::Modifier,
    text::{Line, Span},
    widgets::{Block, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Wrap},
};
use transcript::types::TranscriptFrame;

use crate::app::{App, SelectedWord};
use crate::theme::THEME;

use super::{LayoutInfo, WordRegion};

pub(super) fn render_transcript(frame: &mut Frame, app: &App, area: Rect) -> LayoutInfo {
    let frame_data = app.view.frame();

    let speaker_map: HashMap<&str, usize> = frame_data
        .speaker_hints
        .iter()
        .map(|h| (h.word_id.as_str(), h.speaker_index as usize))
        .collect();

    let selected_final_idx = match &app.selected_word {
        Some(SelectedWord::Final { word, .. }) => {
            frame_data.final_words.iter().position(|w| w.id == word.id)
        }
        _ => None,
    };
    let selected_partial_idx = match &app.selected_word {
        Some(SelectedWord::Partial { word, .. }) => frame_data
            .partial_words
            .iter()
            .position(|w| w.text == word.text && w.start_ms == word.start_ms),
        _ => None,
    };

    let cursor_span =
        (!frame_data.partial_words.is_empty()).then(|| Span::styled("▏", THEME.transcript_cursor));

    let spans: Vec<Span> = frame_data
        .final_words
        .iter()
        .enumerate()
        .map(|(i, word)| {
            let base_style = if let Some(&idx) = speaker_map.get(word.id.as_str()) {
                THEME.speaker[idx % THEME.speaker.len()]
            } else {
                THEME.transcript_final
            };
            let style = if selected_final_idx == Some(i) {
                base_style.add_modifier(Modifier::REVERSED)
            } else {
                base_style
            };
            Span::styled(word.text.clone(), style)
        })
        .chain(
            frame_data
                .partial_words
                .iter()
                .enumerate()
                .map(|(i, word)| {
                    let style = if selected_partial_idx == Some(i) {
                        THEME.transcript_partial.add_modifier(Modifier::REVERSED)
                    } else {
                        THEME.transcript_partial
                    };
                    Span::styled(word.text.clone(), style)
                }),
        )
        .chain(cursor_span)
        .collect();

    let word_regions = compute_word_regions(
        &frame_data.final_words.len(),
        &spans,
        area.width,
        &frame_data,
    );

    let lines = if spans.is_empty() {
        vec![]
    } else {
        vec![Line::from(spans)]
    };

    let line_count = compute_line_count(&lines, area.width);

    let scroll_offset = if app.auto_scroll {
        line_count.saturating_sub(area.height)
    } else {
        app.transcript_scroll
    };

    frame.render_widget(
        Paragraph::new(lines)
            .block(Block::default())
            .wrap(Wrap { trim: false })
            .scroll((scroll_offset, 0)),
        area,
    );

    if line_count > area.height {
        let mut scrollbar_state =
            ScrollbarState::new(line_count as usize).position(scroll_offset as usize);
        frame.render_stateful_widget(
            Scrollbar::new(ScrollbarOrientation::VerticalRight)
                .begin_symbol(None)
                .end_symbol(None)
                .track_symbol(None)
                .thumb_symbol("▐"),
            area,
            &mut scrollbar_state,
        );
    }

    LayoutInfo {
        transcript_lines: line_count,
        transcript_area_height: area.height,
        word_regions,
        transcript_area: area,
    }
}

pub(super) fn compute_word_regions(
    final_count: &usize,
    spans: &[Span],
    area_width: u16,
    frame_data: &TranscriptFrame,
) -> Vec<WordRegion> {
    if area_width == 0 {
        return Vec::new();
    }

    let mut regions = Vec::new();
    let mut row: u16 = 0;
    let mut col: u16 = 0;

    let word_span_count = *final_count + frame_data.partial_words.len();

    for (span_idx, span) in spans.iter().enumerate() {
        if span_idx >= word_span_count {
            break;
        }

        let is_final = span_idx < *final_count;
        let word_index = if is_final {
            span_idx
        } else {
            span_idx - *final_count
        };

        let text = span.content.as_ref();
        let char_count = text.chars().count() as u16;

        if char_count == 0 {
            regions.push(WordRegion {
                index: word_index,
                is_final,
                row,
                col_start: col,
                col_end: col,
            });
            continue;
        }

        if col + char_count > area_width {
            if col == 0 {
                let col_start = col;
                let remaining = area_width - col;
                let col_end = col + remaining.min(char_count);
                regions.push(WordRegion {
                    index: word_index,
                    is_final,
                    row,
                    col_start,
                    col_end,
                });
                let full_rows = char_count / area_width;
                let leftover = char_count % area_width;
                row += full_rows;
                col = leftover;
            } else {
                let trimmed = text.trim_start_matches(' ');
                let leading = (char_count - trimmed.chars().count() as u16).min(char_count);
                let content_width = char_count - leading;
                row += 1;
                col = 0;
                let col_start = col;
                let col_end = col + content_width;
                regions.push(WordRegion {
                    index: word_index,
                    is_final,
                    row,
                    col_start,
                    col_end,
                });
                col = col_end;
                if col >= area_width {
                    row += col / area_width;
                    col %= area_width;
                }
            }
        } else {
            let col_start = col;
            let col_end = col + char_count;
            regions.push(WordRegion {
                index: word_index,
                is_final,
                row,
                col_start,
                col_end,
            });
            col = col_end;
            if col >= area_width {
                row += col / area_width;
                col %= area_width;
            }
        }
    }

    regions
}

pub(super) fn compute_line_count(lines: &[Line], area_width: u16) -> u16 {
    if area_width == 0 {
        return 1;
    }
    let total_chars: usize = lines
        .iter()
        .flat_map(|l| l.spans.iter())
        .map(|s| s.content.chars().count())
        .sum();
    ((total_chars + area_width as usize - 1) / area_width as usize).max(1) as u16
}
