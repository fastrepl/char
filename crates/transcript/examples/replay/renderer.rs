use std::collections::HashMap;

use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::Modifier,
    text::{Line, Span},
    widgets::{
        Block, Borders, Gauge, Paragraph, Scrollbar, ScrollbarOrientation, ScrollbarState, Wrap,
    },
};
use transcript::{FlushMode, types::TranscriptFrame};

use crate::app::{App, LastEvent, SelectedWord};
use crate::source::CactusMetrics;
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
    let layout = render_transcript(frame, app, transcript_area);
    render_debug(frame, app, debug_area);
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

fn render_transcript(frame: &mut Frame, app: &App, area: Rect) -> LayoutInfo {
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

    let mut spans: Vec<Span> = Vec::new();

    for (i, word) in frame_data.final_words.iter().enumerate() {
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
        spans.push(Span::styled(word.text.clone(), style));
    }

    for (i, word) in frame_data.partial_words.iter().enumerate() {
        let style = if selected_partial_idx == Some(i) {
            THEME.transcript_partial.add_modifier(Modifier::REVERSED)
        } else {
            THEME.transcript_partial
        };
        spans.push(Span::styled(word.text.clone(), style));
    }

    if !frame_data.partial_words.is_empty() {
        spans.push(Span::styled("▏", THEME.transcript_cursor));
    }

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

fn compute_word_regions(
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

        // If the span doesn't fit on this line, wrap to next
        if col + char_count > area_width {
            if col == 0 {
                // Span is wider than the whole line; it'll be split but we track the start
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
                // Wrap: move to next row, but skip any leading space
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

fn render_debug(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(selected) = &app.selected_word {
        let block = Block::default()
            .borders(Borders::LEFT)
            .border_style(THEME.debug_border)
            .title(Span::styled(" word ", THEME.debug_border));
        let inner = block.inner(area);
        frame.render_widget(block, area);
        render_word_detail(frame, selected, inner);
        return;
    }

    let frame_data = app.view.frame();

    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(THEME.debug_border)
        .title(Span::styled(" pipeline ", THEME.debug_border));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let metrics_height = if app.cactus_metrics.is_some() { 6 } else { 0 };

    let [
        event_area,
        pipeline_area,
        counts_area,
        postprocess_area,
        metrics_area,
    ] = Layout::vertical([
        Constraint::Length(3),
        Constraint::Fill(1),
        Constraint::Length(5),
        Constraint::Length(5),
        Constraint::Length(metrics_height),
    ])
    .areas(inner);

    render_event_section(frame, app, event_area);
    render_pipeline_section(frame, app, pipeline_area, &frame_data);
    render_counts_section(frame, app, counts_area, &frame_data);
    render_postprocess_section(frame, app, postprocess_area);
    if let Some(metrics) = &app.cactus_metrics {
        render_metrics_section(frame, metrics, metrics_area);
    }
}

fn render_word_detail(frame: &mut Frame, selected: &SelectedWord, area: Rect) {
    match selected {
        SelectedWord::Final { word, speaker } => {
            let speaker_line = if let Some(hint) = speaker {
                Line::from(vec![
                    Span::styled("speaker  ", THEME.dim),
                    Span::styled(hint.speaker_index.to_string(), THEME.highlight_cyan),
                ])
            } else {
                Line::from(vec![
                    Span::styled("speaker  ", THEME.dim),
                    Span::styled("—", THEME.dim),
                ])
            };

            let id_display =
                truncate(word.id.as_str(), (area.width.saturating_sub(2)) as usize).to_string();

            let lines = vec![
                section_header("final word"),
                Line::from(vec![
                    Span::styled("text     ", THEME.dim),
                    Span::styled(word.text.trim().to_string(), THEME.transcript_final),
                ]),
                Line::from(vec![
                    Span::styled("id       ", THEME.dim),
                    Span::styled(id_display, THEME.dim),
                ]),
                Line::from(vec![
                    Span::styled("start    ", THEME.dim),
                    Span::styled(format!("{}ms", word.start_ms), THEME.highlight_cyan),
                ]),
                Line::from(vec![
                    Span::styled("end      ", THEME.dim),
                    Span::styled(format!("{}ms", word.end_ms), THEME.highlight_cyan),
                ]),
                Line::from(vec![
                    Span::styled("duration ", THEME.dim),
                    Span::styled(
                        format!("{}ms", word.end_ms - word.start_ms),
                        THEME.watermark_active,
                    ),
                ]),
                Line::from(vec![
                    Span::styled("channel  ", THEME.dim),
                    Span::raw(word.channel.to_string()),
                ]),
                speaker_line,
            ];
            frame.render_widget(Paragraph::new(lines), area);
        }
        SelectedWord::Partial { word, stability } => {
            let stability_line = if let Some(count) = stability {
                Line::from(vec![
                    Span::styled("seen     ", THEME.dim),
                    Span::styled(
                        format!("×{count}"),
                        if *count >= 3 {
                            THEME.highlight_yellow
                        } else {
                            THEME.dim
                        },
                    ),
                ])
            } else {
                Line::from(vec![
                    Span::styled("seen     ", THEME.dim),
                    Span::styled("—", THEME.dim),
                ])
            };

            let lines = vec![
                section_header("partial word"),
                Line::from(vec![
                    Span::styled("text     ", THEME.dim),
                    Span::styled(word.text.trim().to_string(), THEME.transcript_partial),
                ]),
                Line::from(vec![
                    Span::styled("start    ", THEME.dim),
                    Span::styled(format!("{}ms", word.start_ms), THEME.highlight_cyan),
                ]),
                Line::from(vec![
                    Span::styled("end      ", THEME.dim),
                    Span::styled(format!("{}ms", word.end_ms), THEME.highlight_cyan),
                ]),
                Line::from(vec![
                    Span::styled("duration ", THEME.dim),
                    Span::styled(
                        format!("{}ms", word.end_ms - word.start_ms),
                        THEME.watermark_active,
                    ),
                ]),
                Line::from(vec![
                    Span::styled("channel  ", THEME.dim),
                    Span::raw(word.channel.to_string()),
                ]),
                stability_line,
            ];
            frame.render_widget(Paragraph::new(lines), area);
        }
    }
}

fn render_event_section(frame: &mut Frame, app: &App, area: Rect) {
    let (label, style) = match app.last_event {
        LastEvent::Final => ("FINAL", THEME.event_final),
        LastEvent::Partial => ("PARTIAL", THEME.event_partial),
        LastEvent::Correction => ("CORRECTION", THEME.event_correction),
        LastEvent::Skipped => ("SKIPPED", THEME.event_skipped),
    };

    let lines = vec![
        section_header("event"),
        Line::from(vec![
            Span::styled(label, style),
            Span::styled(format!("  {}/{}", app.position, app.total()), THEME.dim),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_pipeline_section(frame: &mut Frame, app: &App, area: Rect, frame_data: &TranscriptFrame) {
    let dbg = app.view.pipeline_debug();
    let mut lines = vec![section_header("pipeline")];

    let timing_map: HashMap<&str, (i64, i64)> = frame_data
        .partial_words
        .iter()
        .map(|w| (w.text.as_str(), (w.start_ms, w.end_ms)))
        .collect();

    if dbg.held_words.is_empty() {
        lines.push(dim_line("held  —"));
    } else {
        for (ch, text) in &dbg.held_words {
            lines.push(Line::from(vec![
                Span::styled("held  ", THEME.dim),
                Span::styled(format!("[ch{}] ", ch), THEME.dim),
                Span::styled(
                    truncate(text.trim(), (area.width.saturating_sub(8)) as usize).to_string(),
                    THEME.highlight_cyan,
                ),
            ]));
        }
    }

    if dbg.watermarks.is_empty() {
        lines.push(dim_line("wmark —"));
    } else {
        for (ch, wm) in &dbg.watermarks {
            lines.push(Line::from(vec![
                Span::styled("wmark ", THEME.dim),
                Span::styled(format!("[ch{}] ", ch), THEME.dim),
                Span::styled(
                    format!("{}ms", wm),
                    if *wm > 0 {
                        THEME.watermark_active
                    } else {
                        THEME.dim
                    },
                ),
            ]));
        }
    }

    lines.push(Line::raw(""));

    if dbg.partial_stability.is_empty() {
        lines.push(dim_line("no partials"));
    } else {
        let text_width = area.width.saturating_sub(14) as usize;
        for (text, seen) in &dbg.partial_stability {
            let word_display = truncate(text.trim(), text_width).to_string();
            let timing_suffix = timing_map
                .get(text.as_str())
                .map(|(s, e)| format!(" {s}–{e}ms"))
                .unwrap_or_default();
            lines.push(Line::from(vec![
                Span::styled(
                    format!("{:<width$}", word_display, width = text_width),
                    THEME.transcript_partial,
                ),
                Span::styled(
                    format!(" ×{seen}"),
                    if *seen >= 3 {
                        THEME.highlight_yellow
                    } else {
                        THEME.dim
                    },
                ),
                Span::styled(timing_suffix, THEME.dim),
            ]));
        }
    }

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_counts_section(frame: &mut Frame, app: &App, area: Rect, frame_data: &TranscriptFrame) {
    let flush_label = match app.flush_mode {
        FlushMode::DrainAll => "drain-all",
        FlushMode::PromotableOnly => "promotable",
    };

    let lines = vec![
        section_header("counts"),
        Line::from(vec![
            Span::styled("finals   ", THEME.dim),
            Span::raw(frame_data.final_words.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("partials ", THEME.dim),
            Span::raw(frame_data.partial_words.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("speakers ", THEME.dim),
            Span::raw(frame_data.speaker_hints.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("flush    ", THEME.dim),
            Span::styled(flush_label, THEME.watermark_active),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_postprocess_section(frame: &mut Frame, app: &App, area: Rect) {
    let dbg = app.view.pipeline_debug();

    let mut lines = vec![section_header("postprocess")];
    lines.push(Line::from(vec![
        Span::styled("batches  ", THEME.dim),
        Span::styled(
            dbg.postprocess_applied.to_string(),
            if dbg.postprocess_applied > 0 {
                THEME.highlight_yellow
            } else {
                THEME.dim
            },
        ),
    ]));

    match &app.last_postprocess {
        None => {
            lines.push(dim_line("no run yet  [p]"));
        }
        Some(update) => {
            lines.push(Line::from(vec![
                Span::styled("replaced ", THEME.dim),
                Span::styled(update.updated.len().to_string(), THEME.highlight_yellow),
                Span::styled(" words", THEME.dim),
            ]));
            if let Some(sample) = update.updated.first() {
                let sample_text =
                    truncate(sample.text.trim(), (area.width.saturating_sub(2)) as usize);
                lines.push(Line::from(Span::styled(
                    format!("↳ {sample_text}"),
                    THEME.dim,
                )));
            }
        }
    }

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_metrics_section(frame: &mut Frame, m: &CactusMetrics, area: Rect) {
    let lines = vec![
        section_header("cactus"),
        Line::from(vec![
            Span::styled("decode   ", THEME.dim),
            Span::styled(format!("{:.0} tok/s", m.decode_tps), THEME.metric_value),
        ]),
        Line::from(vec![
            Span::styled("prefill  ", THEME.dim),
            Span::styled(format!("{:.0} tok/s", m.prefill_tps), THEME.metric_value),
        ]),
        Line::from(vec![
            Span::styled("ttft     ", THEME.dim),
            Span::raw(format!("{:.0}ms", m.time_to_first_token_ms)),
        ]),
        Line::from(vec![
            Span::styled("total    ", THEME.dim),
            Span::raw(format!("{:.0}ms", m.total_time_ms)),
        ]),
    ];
    frame.render_widget(Paragraph::new(lines), area);
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
    let spans: Vec<Span> = if app.selected_word.is_some() {
        let keys = [("Esc", "clear word"), ("q", "quit")];
        keys.iter()
            .flat_map(|(key, desc)| {
                [
                    Span::styled(format!(" {key} "), THEME.key),
                    Span::styled(format!(" {desc} "), THEME.key_desc),
                ]
            })
            .collect()
    } else {
        let keys = [
            ("click", "inspect"),
            ("Space", "pause"),
            ("←/→", "seek"),
            ("↑/↓", "speed"),
            ("PgUp/Dn", "scroll"),
            ("f", "flush"),
            ("p", "postprocess"),
            ("q", "quit"),
        ];
        keys.iter()
            .flat_map(|(key, desc)| {
                [
                    Span::styled(format!(" {key} "), THEME.key),
                    Span::styled(format!(" {desc} "), THEME.key_desc),
                ]
            })
            .collect()
    };
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

fn section_header(title: &str) -> Line<'static> {
    Line::from(Span::styled(title.to_string(), THEME.section_header))
}

fn dim_line(text: &str) -> Line<'static> {
    Line::from(Span::styled(text.to_string(), THEME.dim))
}

fn compute_line_count(lines: &[Line], area_width: u16) -> u16 {
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

fn truncate(s: &str, max_chars: usize) -> &str {
    if s.chars().count() <= max_chars {
        return s;
    }
    let mut end = 0;
    for (i, _) in s.char_indices().take(max_chars) {
        end = i;
    }
    &s[..end]
}
