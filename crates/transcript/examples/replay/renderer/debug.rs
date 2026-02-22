use std::collections::HashMap;

use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::Style,
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
};
use transcript::FlushMode;
use transcript::types::TranscriptFrame;

use crate::app::{App, SelectedWord};
use crate::source::CactusMetrics;
use crate::theme::THEME;

use super::utils::{dim_line, kv, section_header, truncate};

pub(super) fn render_debug(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(selected) = &app.selected_word {
        let block = Block::default()
            .borders(Borders::LEFT)
            .border_style(THEME.debug_border)
            .title(Span::styled(" word ", THEME.debug_border));
        let inner = block.inner(area);
        frame.render_widget(block, area);
        render_word_detail(frame, selected, inner, inner.width);
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

fn render_word_detail(frame: &mut Frame, selected: &SelectedWord, area: Rect, width: u16) {
    let lines = match selected {
        SelectedWord::Final { word, speaker } => {
            let id_display =
                truncate(word.id.as_str(), (width.saturating_sub(2)) as usize).to_string();
            let extra = if let Some(hint) = speaker {
                kv(
                    "speaker  ",
                    hint.speaker_index.to_string(),
                    THEME.highlight_cyan,
                )
            } else {
                kv("speaker  ", "—", THEME.dim)
            };
            let mut lines = word_timing_lines(
                "final word",
                word.text.trim(),
                THEME.transcript_final,
                word.start_ms,
                word.end_ms,
                word.channel,
            );
            lines.insert(2, kv("id       ", id_display, THEME.dim));
            lines.push(extra);
            lines
        }
        SelectedWord::Partial { word, stability } => {
            let extra = if let Some(count) = stability {
                kv(
                    "seen     ",
                    format!("×{count}"),
                    if *count >= 3 {
                        THEME.highlight_yellow
                    } else {
                        THEME.dim
                    },
                )
            } else {
                kv("seen     ", "—", THEME.dim)
            };
            let mut lines = word_timing_lines(
                "partial word",
                word.text.trim(),
                THEME.transcript_partial,
                word.start_ms,
                word.end_ms,
                word.channel,
            );
            lines.push(extra);
            lines
        }
    };
    frame.render_widget(Paragraph::new(lines), area);
}

fn word_timing_lines(
    title: &str,
    text: &str,
    text_style: Style,
    start_ms: i64,
    end_ms: i64,
    channel: i32,
) -> Vec<Line<'static>> {
    vec![
        section_header(title),
        kv("text     ", text, text_style),
        kv("start    ", format!("{}ms", start_ms), THEME.highlight_cyan),
        kv("end      ", format!("{}ms", end_ms), THEME.highlight_cyan),
        kv(
            "duration ",
            format!("{}ms", end_ms - start_ms),
            THEME.watermark_active,
        ),
        kv("channel  ", channel.to_string(), Style::default()),
    ]
}

fn render_event_section(frame: &mut Frame, app: &App, area: Rect) {
    use crate::app::LastEvent;

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
        kv(
            "finals   ",
            frame_data.final_words.len().to_string(),
            Style::default(),
        ),
        kv(
            "partials ",
            frame_data.partial_words.len().to_string(),
            Style::default(),
        ),
        kv(
            "speakers ",
            frame_data.speaker_hints.len().to_string(),
            Style::default(),
        ),
        kv("flush    ", flush_label, THEME.watermark_active),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_postprocess_section(frame: &mut Frame, app: &App, area: Rect) {
    let dbg = app.view.pipeline_debug();

    let mut lines = vec![
        section_header("postprocess"),
        kv(
            "batches  ",
            dbg.postprocess_applied.to_string(),
            if dbg.postprocess_applied > 0 {
                THEME.highlight_yellow
            } else {
                THEME.dim
            },
        ),
    ];

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
        kv(
            "decode   ",
            format!("{:.0} tok/s", m.decode_tps),
            THEME.metric_value,
        ),
        kv(
            "prefill  ",
            format!("{:.0} tok/s", m.prefill_tps),
            THEME.metric_value,
        ),
        kv(
            "ttft     ",
            format!("{:.0}ms", m.time_to_first_token_ms),
            Style::default(),
        ),
        kv(
            "total    ",
            format!("{:.0}ms", m.total_time_ms),
            Style::default(),
        ),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}
