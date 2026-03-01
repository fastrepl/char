use hypr_listener_core::State;
use hypr_transcript::WordState;
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Gauge, Padding, Paragraph, Wrap},
};

use crate::app::App;

pub fn draw(frame: &mut Frame, app: &App) {
    let [header_area, meters_area, transcript_area, status_area] = Layout::vertical([
        Constraint::Length(3),
        Constraint::Length(3),
        Constraint::Min(6),
        Constraint::Length(1),
    ])
    .areas(frame.area());

    draw_header(frame, app, header_area);
    draw_meters(frame, app, meters_area);
    draw_transcript(frame, app, transcript_area);
    draw_status_bar(frame, app, status_area);
}

fn draw_header(frame: &mut Frame, app: &App, area: Rect) {
    let elapsed = app.elapsed();
    let secs = elapsed.as_secs();
    let time_str = format!(
        "{:02}:{:02}:{:02}",
        secs / 3600,
        (secs % 3600) / 60,
        secs % 60
    );

    let state_style = match app.state {
        State::Active if app.degraded.is_some() => Style::new().fg(Color::Yellow),
        State::Active => Style::new().fg(Color::Green),
        State::Finalizing => Style::new().fg(Color::Yellow),
        State::Inactive => Style::new().fg(Color::Red),
    };

    let title = Line::from(vec![
        Span::styled(" hypr-listener ", Style::new().bold()),
        Span::raw(" "),
        Span::styled(&app.status, state_style),
    ]);

    let time = Line::from(vec![Span::styled(
        format!("{time_str} "),
        Style::new().fg(Color::DarkGray),
    )]);

    let block = Block::new()
        .borders(Borders::ALL)
        .border_style(Style::new().fg(Color::DarkGray))
        .title(title)
        .title_bottom(last_error_line(app))
        .title_alignment(ratatui::layout::Alignment::Left)
        .title(time.alignment(ratatui::layout::Alignment::Right));

    frame.render_widget(block, area);
}

fn last_error_line(app: &App) -> Line<'_> {
    if let Some(err) = app.errors.last() {
        Line::from(vec![Span::styled(
            format!(" {err} "),
            Style::new().fg(Color::Red),
        )])
    } else {
        Line::default()
    }
}

fn draw_meters(frame: &mut Frame, app: &App, area: Rect) {
    let [mic_area, spk_area] =
        Layout::horizontal([Constraint::Percentage(50), Constraint::Percentage(50)]).areas(area);

    let mic_ratio = (app.mic_level as f64 / 1000.0).min(1.0);
    let mic_label = if app.mic_muted { "Mic (muted)" } else { "Mic" };
    let mic_gauge = Gauge::default()
        .block(
            Block::new()
                .borders(Borders::LEFT | Borders::BOTTOM)
                .border_style(Style::new().fg(Color::DarkGray))
                .padding(Padding::horizontal(1)),
        )
        .gauge_style(if app.mic_muted {
            Style::new().fg(Color::DarkGray)
        } else {
            Style::new().fg(Color::Cyan)
        })
        .label(mic_label)
        .ratio(mic_ratio);

    let spk_ratio = (app.speaker_level as f64 / 1000.0).min(1.0);
    let spk_gauge = Gauge::default()
        .block(
            Block::new()
                .borders(Borders::RIGHT | Borders::BOTTOM)
                .border_style(Style::new().fg(Color::DarkGray))
                .padding(Padding::horizontal(1)),
        )
        .gauge_style(Style::new().fg(Color::Magenta))
        .label("Speaker")
        .ratio(spk_ratio);

    frame.render_widget(mic_gauge, mic_area);
    frame.render_widget(spk_gauge, spk_area);
}

fn draw_transcript(frame: &mut Frame, app: &App, area: Rect) {
    let mut spans: Vec<Span> = Vec::new();

    for word in &app.words {
        let style = match word.state {
            WordState::Final => Style::new(),
            WordState::Pending => Style::new().fg(Color::Yellow),
        };
        spans.push(Span::styled(&word.text, style));
        spans.push(Span::raw(" "));
    }

    if !app.partials.is_empty() {
        for partial in &app.partials {
            spans.push(Span::styled(
                &partial.text,
                Style::new()
                    .fg(Color::DarkGray)
                    .add_modifier(Modifier::ITALIC),
            ));
            spans.push(Span::raw(" "));
        }
    }

    if spans.is_empty() {
        spans.push(Span::styled(
            "Waiting for speech...",
            Style::new().fg(Color::DarkGray).italic(),
        ));
    }

    let text = vec![Line::from(spans)];

    let block = Block::new()
        .borders(Borders::LEFT | Borders::RIGHT)
        .border_style(Style::new().fg(Color::DarkGray))
        .padding(Padding::new(2, 2, 1, 1));

    let paragraph = Paragraph::new(text)
        .block(block)
        .wrap(Wrap { trim: false })
        .scroll((app.scroll_offset, 0));

    frame.render_widget(paragraph, area);
}

fn draw_status_bar(frame: &mut Frame, app: &App, area: Rect) {
    let word_count = app.words.len();

    let line = Line::from(vec![
        Span::styled(" [q]", Style::new().fg(Color::DarkGray)),
        Span::raw(" quit  "),
        Span::styled("[j/k]", Style::new().fg(Color::DarkGray)),
        Span::raw(" scroll  "),
        Span::styled(
            format!("{word_count} words"),
            Style::new().fg(Color::DarkGray),
        ),
    ]);

    frame.render_widget(Paragraph::new(line), area);
}
