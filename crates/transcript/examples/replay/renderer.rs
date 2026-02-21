use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Gauge, Paragraph, Wrap},
};
use transcript::FlushMode;

use crate::App;
use crate::CactusMetrics;
use crate::LastEvent;

const DEBUG_PANEL_WIDTH: u16 = 36;

pub fn render(frame: &mut Frame, app: &App) {
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
    render_transcript(frame, app, transcript_area);
    render_debug(frame, app, debug_area);
    render_timeline(frame, app, timeline_area);
    render_hints(frame, hint_area);
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
    frame.render_widget(
        Paragraph::new(text).style(Style::default().fg(Color::DarkGray)),
        area,
    );
}

fn render_transcript(frame: &mut Frame, app: &App, area: Rect) {
    let frame_data = app.view.frame();
    let mut spans: Vec<Span> = Vec::new();

    for word in &frame_data.final_words {
        spans.push(Span::raw(word.text.clone()));
    }

    for word in &frame_data.partial_words {
        spans.push(Span::styled(
            word.text.clone(),
            Style::default()
                .fg(Color::DarkGray)
                .add_modifier(Modifier::ITALIC),
        ));
    }

    if !frame_data.partial_words.is_empty() {
        spans.push(Span::styled("▏", Style::default().fg(Color::DarkGray)));
    }

    let lines = if spans.is_empty() {
        vec![]
    } else {
        vec![Line::from(spans)]
    };

    frame.render_widget(
        Paragraph::new(lines)
            .block(Block::default())
            .wrap(Wrap { trim: false }),
        area,
    );
}

fn render_debug(frame: &mut Frame, app: &App, area: Rect) {
    let block = Block::default()
        .borders(Borders::LEFT)
        .border_style(Style::default().fg(Color::DarkGray))
        .title(Span::styled(
            " pipeline ",
            Style::default().fg(Color::DarkGray),
        ));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let has_metrics = app.cactus_metrics.is_some();
    let metrics_height = if has_metrics { 6 } else { 0 };

    let [event_area, pipeline_area, counts_area, postprocess_area, metrics_area] =
        Layout::vertical([
            Constraint::Length(3),
            Constraint::Fill(1),
            Constraint::Length(5),
            Constraint::Length(5),
            Constraint::Length(metrics_height),
        ])
        .areas(inner);

    render_event_section(frame, app, event_area);
    render_pipeline_section(frame, app, pipeline_area);
    render_counts_section(frame, app, counts_area);
    render_postprocess_section(frame, app, postprocess_area);
    if let Some(metrics) = &app.cactus_metrics {
        render_metrics_section(frame, metrics, metrics_area);
    }
}

fn render_event_section(frame: &mut Frame, app: &App, area: Rect) {
    let (label, color) = match app.last_event {
        LastEvent::Final => ("FINAL", Color::Green),
        LastEvent::Partial => ("PARTIAL", Color::Yellow),
        LastEvent::Correction => ("CORRECTION", Color::Magenta),
        LastEvent::Skipped => ("SKIPPED", Color::DarkGray),
    };

    let lines = vec![
        section_header("event"),
        Line::from(vec![
            Span::styled(
                label,
                Style::default().fg(color).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!("  {}/{}", app.position, app.total()),
                Style::default().fg(Color::DarkGray),
            ),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_pipeline_section(frame: &mut Frame, app: &App, area: Rect) {
    let dbg = app.view.pipeline_debug();
    let mut lines = vec![section_header("pipeline")];

    // Held word(s)
    if dbg.held_words.is_empty() {
        lines.push(dim_line("held  —"));
    } else {
        for (ch, text) in &dbg.held_words {
            lines.push(Line::from(vec![
                Span::styled("held  ", Style::default().fg(Color::DarkGray)),
                Span::styled(format!("[ch{}] ", ch), Style::default().fg(Color::DarkGray)),
                Span::styled(
                    truncate(text.trim(), (area.width.saturating_sub(8)) as usize),
                    Style::default().fg(Color::Cyan),
                ),
            ]));
        }
    }

    // Watermarks
    if dbg.watermarks.is_empty() {
        lines.push(dim_line("wmark —"));
    } else {
        for (ch, wm) in &dbg.watermarks {
            lines.push(Line::from(vec![
                Span::styled("wmark ", Style::default().fg(Color::DarkGray)),
                Span::styled(format!("[ch{}] ", ch), Style::default().fg(Color::DarkGray)),
                Span::styled(
                    format!("{}ms", wm),
                    Style::default().fg(if *wm > 0 {
                        Color::White
                    } else {
                        Color::DarkGray
                    }),
                ),
            ]));
        }
    }

    // Partial stability
    lines.push(Line::raw(""));
    if dbg.partial_stability.is_empty() {
        lines.push(dim_line("no partials"));
    } else {
        let bar_width = area.width.saturating_sub(6) as usize;
        for (text, seen) in &dbg.partial_stability {
            let word_display = truncate(text.trim(), bar_width);
            lines.push(Line::from(vec![
                Span::styled(
                    format!("{:<width$}", word_display, width = bar_width),
                    Style::default()
                        .fg(Color::DarkGray)
                        .add_modifier(Modifier::ITALIC),
                ),
                Span::raw(" "),
                Span::styled(
                    format!("×{seen}"),
                    Style::default().fg(if *seen >= 3 {
                        Color::Yellow
                    } else {
                        Color::DarkGray
                    }),
                ),
            ]));
        }
    }

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_counts_section(frame: &mut Frame, app: &App, area: Rect) {
    let frame_data = app.view.frame();
    let flush_label = match app.flush_mode {
        FlushMode::DrainAll => "drain-all",
        FlushMode::PromotableOnly => "promotable",
    };

    let lines = vec![
        section_header("counts"),
        Line::from(vec![
            Span::styled("finals   ", Style::default().fg(Color::DarkGray)),
            Span::raw(frame_data.final_words.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("partials ", Style::default().fg(Color::DarkGray)),
            Span::raw(frame_data.partial_words.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("speakers ", Style::default().fg(Color::DarkGray)),
            Span::raw(frame_data.speaker_hints.len().to_string()),
        ]),
        Line::from(vec![
            Span::styled("flush    ", Style::default().fg(Color::DarkGray)),
            Span::styled(flush_label, Style::default().fg(Color::White)),
        ]),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_postprocess_section(frame: &mut Frame, app: &App, area: Rect) {
    let dbg = app.view.pipeline_debug();

    let mut lines = vec![section_header("postprocess")];
    lines.push(Line::from(vec![
        Span::styled("batches  ", Style::default().fg(Color::DarkGray)),
        Span::styled(
            dbg.postprocess_applied.to_string(),
            Style::default().fg(if dbg.postprocess_applied > 0 {
                Color::Yellow
            } else {
                Color::DarkGray
            }),
        ),
    ]));

    match &app.last_postprocess {
        None => {
            lines.push(dim_line("no run yet  [p]"));
        }
        Some(update) => {
            lines.push(Line::from(vec![
                Span::styled("replaced ", Style::default().fg(Color::DarkGray)),
                Span::styled(
                    update.updated.len().to_string(),
                    Style::default().fg(Color::Yellow),
                ),
                Span::styled(" words", Style::default().fg(Color::DarkGray)),
            ]));
            if let Some(sample) = update.updated.first() {
                let sample_text =
                    truncate(sample.text.trim(), (area.width.saturating_sub(2)) as usize);
                lines.push(Line::from(Span::styled(
                    format!("↳ {sample_text}"),
                    Style::default().fg(Color::DarkGray),
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
            Span::styled("decode   ", Style::default().fg(Color::DarkGray)),
            Span::styled(
                format!("{:.0} tok/s", m.decode_tps),
                Style::default().fg(Color::Cyan),
            ),
        ]),
        Line::from(vec![
            Span::styled("prefill  ", Style::default().fg(Color::DarkGray)),
            Span::styled(
                format!("{:.0} tok/s", m.prefill_tps),
                Style::default().fg(Color::Cyan),
            ),
        ]),
        Line::from(vec![
            Span::styled("ttft     ", Style::default().fg(Color::DarkGray)),
            Span::raw(format!("{:.0}ms", m.time_to_first_token_ms)),
        ]),
        Line::from(vec![
            Span::styled("total    ", Style::default().fg(Color::DarkGray)),
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
        .gauge_style(Style::default().fg(Color::White).bg(Color::DarkGray))
        .ratio(ratio)
        .label(label);
    frame.render_widget(gauge, area);
}

fn render_hints(frame: &mut Frame, area: Rect) {
    frame.render_widget(
        Paragraph::new(
            " [Space] pause  [←/→] seek  [↑/↓] speed  [Home/End] jump  [f] flush  [p] postprocess  [q] quit",
        )
        .style(Style::default().fg(Color::DarkGray)),
        area,
    );
}

fn section_header(title: &str) -> Line<'static> {
    Line::from(Span::styled(
        title.to_string(),
        Style::default()
            .fg(Color::DarkGray)
            .add_modifier(Modifier::UNDERLINED),
    ))
}

fn dim_line(text: &str) -> Line<'static> {
    Line::from(Span::styled(
        text.to_string(),
        Style::default().fg(Color::DarkGray),
    ))
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
