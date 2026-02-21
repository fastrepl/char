mod fixture;
mod renderer;

use std::time::{Duration, Instant};

use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use fixture::Fixture;
use owhisper_interface::stream::StreamResponse;
use ratatui::DefaultTerminal;
use transcript::FlushMode;
use transcript::input::TranscriptInput;
use transcript::postprocess::PostProcessUpdate;
use transcript::types::TranscriptWord;
use transcript::view::TranscriptView;

#[derive(clap::Parser)]
#[command(name = "replay", about = "Replay transcript fixture in the terminal")]
struct Args {
    #[arg(short, long, default_value_t = Fixture::Deepgram)]
    fixture: Fixture,

    #[arg(short, long, default_value_t = 30)]
    speed: u64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LastEvent {
    Final,
    Partial,
    Skipped,
}

pub struct App {
    responses: Vec<StreamResponse>,
    pub position: usize,
    pub paused: bool,
    pub speed_ms: u64,
    pub view: TranscriptView,
    pub fixture_name: String,
    pub last_event: LastEvent,
    pub flush_mode: FlushMode,
    pub last_postprocess: Option<PostProcessUpdate>,
}

impl App {
    fn new(responses: Vec<StreamResponse>, speed_ms: u64, fixture_name: String) -> Self {
        Self {
            responses,
            position: 0,
            paused: false,
            speed_ms,
            view: TranscriptView::new(),
            fixture_name,
            last_event: LastEvent::Skipped,
            flush_mode: FlushMode::DrainAll,
            last_postprocess: None,
        }
    }

    pub fn total(&self) -> usize {
        self.responses.len()
    }

    fn seek_to(&mut self, target: usize) {
        let target = target.min(self.total());
        self.view = TranscriptView::new();
        self.last_postprocess = None;
        self.position = 0;
        let mut last_event = LastEvent::Skipped;
        for i in 0..target {
            match TranscriptInput::from_stream_response(&self.responses[i]) {
                Some(input) => {
                    last_event = match &input {
                        TranscriptInput::Final { .. } => LastEvent::Final,
                        TranscriptInput::Partial { .. } => LastEvent::Partial,
                    };
                    self.view.process(input);
                }
                None => {
                    last_event = LastEvent::Skipped;
                }
            }
        }
        self.last_event = last_event;
        self.position = target;
    }

    fn advance(&mut self) -> bool {
        if self.position >= self.total() {
            return false;
        }
        match TranscriptInput::from_stream_response(&self.responses[self.position]) {
            Some(input) => {
                self.last_event = match &input {
                    TranscriptInput::Final { .. } => LastEvent::Final,
                    TranscriptInput::Partial { .. } => LastEvent::Partial,
                };
                self.view.process(input);
            }
            None => {
                self.last_event = LastEvent::Skipped;
            }
        }
        self.position += 1;
        true
    }

    pub fn is_done(&self) -> bool {
        self.position >= self.total()
    }

    fn toggle_flush_mode(&mut self) {
        self.flush_mode = match self.flush_mode {
            FlushMode::DrainAll => FlushMode::PromotableOnly,
            FlushMode::PromotableOnly => FlushMode::DrainAll,
        };
    }

    fn simulate_postprocess(&mut self) {
        let finals = self.view.frame().final_words;
        if finals.is_empty() {
            return;
        }
        let transformed: Vec<TranscriptWord> = finals
            .into_iter()
            .map(|w| {
                let new_text = title_case_word(&w.text);
                TranscriptWord {
                    text: new_text,
                    ..w
                }
            })
            .collect();
        let update = self.view.apply_postprocess(transformed);
        self.last_postprocess = Some(update);
    }
}

/// Title-case a word that may have a leading space (e.g. " hello" -> " Hello").
fn title_case_word(s: &str) -> String {
    let trimmed = s.trim_start_matches(' ');
    let leading_spaces = &s[..s.len() - trimmed.len()];
    let mut chars = trimmed.chars();
    match chars.next() {
        None => s.to_string(),
        Some(first) => {
            let upper: String = first.to_uppercase().collect();
            format!("{leading_spaces}{upper}{}", chars.as_str())
        }
    }
}

fn main() {
    use clap::Parser;
    let args = Args::parse();
    let fixture = args.fixture;
    let speed_ms = args.speed;
    let fixture_name = fixture.to_string();

    let responses: Vec<StreamResponse> =
        serde_json::from_str(fixture.json()).expect("fixture must parse as StreamResponse[]");

    let mut terminal = ratatui::init();
    let result = run(&mut terminal, responses, speed_ms, fixture_name.clone());
    ratatui::restore();

    match result {
        Ok(app) => {
            println!(
                "Done. {} final words from {} events ({} fixture).",
                app.view.frame().final_words.len(),
                app.total(),
                fixture_name,
            );
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

fn run(
    terminal: &mut DefaultTerminal,
    responses: Vec<StreamResponse>,
    speed_ms: u64,
    fixture_name: String,
) -> std::io::Result<App> {
    let mut app = App::new(responses, speed_ms, fixture_name);
    let mut last_tick = Instant::now();

    loop {
        terminal.draw(|frame| renderer::render(frame, &app))?;

        let tick_duration = Duration::from_millis(app.speed_ms);
        let elapsed = last_tick.elapsed();
        let timeout = tick_duration.saturating_sub(elapsed);

        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => break,
                    KeyCode::Char(' ') => {
                        app.paused = !app.paused;
                        last_tick = Instant::now();
                    }
                    KeyCode::Right => {
                        app.seek_to(app.position + 1);
                    }
                    KeyCode::Left => {
                        app.seek_to(app.position.saturating_sub(1));
                    }
                    KeyCode::Up => {
                        app.speed_ms = app.speed_ms.saturating_sub(10).max(5);
                    }
                    KeyCode::Down => {
                        app.speed_ms += 10;
                    }
                    KeyCode::Home => {
                        app.seek_to(0);
                    }
                    KeyCode::End => {
                        let total = app.total();
                        app.seek_to(total);
                        let mode = app.flush_mode;
                        app.view.flush(mode);
                    }
                    KeyCode::Char('f') => {
                        app.toggle_flush_mode();
                    }
                    KeyCode::Char('p') => {
                        app.simulate_postprocess();
                    }
                    _ => {}
                }
            }
        } else if !app.paused {
            if last_tick.elapsed() >= tick_duration {
                app.advance();
                last_tick = Instant::now();

                if app.is_done() {
                    let mode = app.flush_mode;
                    app.view.flush(mode);
                    terminal.draw(|frame| renderer::render(frame, &app))?;
                    app.paused = true;
                }
            }
        }
    }

    Ok(app)
}
