mod fixture;
mod renderer;
mod source;

use std::time::{Duration, Instant};

use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use fixture::Fixture;
use ratatui::DefaultTerminal;
use source::Source;
use owhisper_interface::stream::StreamResponse;
use transcript::FlushMode;
use transcript::input::TranscriptInput;
use transcript::postprocess::PostProcessUpdate;
use transcript::types::TranscriptWord;
use transcript::view::{ProcessOutcome, TranscriptView};

#[derive(clap::Parser)]
#[command(name = "replay", about = "Replay transcript fixture in the terminal")]
struct Args {
    #[arg(short, long, default_value_t = Fixture::Deepgram)]
    fixture: Fixture,

    #[arg(short, long, default_value_t = 30)]
    speed: u64,

    #[arg(long, help = "Cactus API base URL (e.g. http://localhost:8080)")]
    cactus: Option<String>,

    #[arg(long, help = "Path to audio file to stream (required with --cactus)")]
    audio: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LastEvent {
    Final,
    Partial,
    Correction,
    Skipped,
}

#[derive(Clone, Default)]
pub struct CactusMetrics {
    pub decode_tps: f64,
    pub prefill_tps: f64,
    pub time_to_first_token_ms: f64,
    pub total_time_ms: f64,
    pub decode_tokens: f64,
    pub prefill_tokens: f64,
    pub total_tokens: f64,
    pub buffer_duration_ms: f64,
}

impl CactusMetrics {
    fn from_stream_response(sr: &StreamResponse) -> Option<Self> {
        let extra = match sr {
            StreamResponse::TranscriptResponse { metadata, .. } => metadata.extra.as_ref()?,
            _ => return None,
        };
        let f = |key: &str| -> f64 {
            extra
                .get(key)
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0)
        };
        Some(Self {
            decode_tps: f("decode_tps"),
            prefill_tps: f("prefill_tps"),
            time_to_first_token_ms: f("time_to_first_token_ms"),
            total_time_ms: f("total_time_ms"),
            decode_tokens: f("decode_tokens"),
            prefill_tokens: f("prefill_tokens"),
            total_tokens: f("total_tokens"),
            buffer_duration_ms: f("buffer_duration_ms"),
        })
    }
}

pub struct App {
    source: Source,
    pub position: usize,
    pub paused: bool,
    pub speed_ms: u64,
    pub view: TranscriptView,
    pub source_name: String,
    pub last_event: LastEvent,
    pub flush_mode: FlushMode,
    pub last_postprocess: Option<PostProcessUpdate>,
    pub cactus_metrics: Option<CactusMetrics>,
}

impl App {
    fn new(source: Source, speed_ms: u64, source_name: String) -> Self {
        Self {
            source,
            position: 0,
            paused: false,
            speed_ms,
            view: TranscriptView::new(),
            source_name,
            last_event: LastEvent::Skipped,
            flush_mode: FlushMode::DrainAll,
            last_postprocess: None,
            cactus_metrics: None,
        }
    }

    pub fn total(&self) -> usize {
        self.source.total()
    }

    fn seek_to(&mut self, target: usize) {
        let target = target.min(self.total());
        self.view = TranscriptView::new();
        self.last_postprocess = None;
        self.cactus_metrics = None;
        self.position = 0;
        let mut last_event = LastEvent::Skipped;
        for i in 0..target {
            if let Some(sr) = self.source.get(i) {
                if let Some(m) = CactusMetrics::from_stream_response(sr) {
                    self.cactus_metrics = Some(m);
                }
                match TranscriptInput::from_stream_response(sr) {
                    Some(input) => {
                        last_event = match &input {
                            TranscriptInput::Final { .. } => LastEvent::Final,
                            TranscriptInput::Partial { .. } => LastEvent::Partial,
                            TranscriptInput::Correction { .. } => LastEvent::Correction,
                        };
                        let outcome = self.view.process(input);
                        if let ProcessOutcome::Corrected(update) = outcome {
                            self.last_postprocess = Some(update);
                        }
                    }
                    None => {
                        last_event = LastEvent::Skipped;
                    }
                }
            }
        }
        self.last_event = last_event;
        self.position = target;
    }

    fn advance(&mut self) -> bool {
        if self.source.is_live() {
            if let Some(sr) = self.source.poll_next() {
                let sr = sr.clone();
                self.position = self.source.total();
                if let Some(m) = CactusMetrics::from_stream_response(&sr) {
                    self.cactus_metrics = Some(m);
                }
                match TranscriptInput::from_stream_response(&sr) {
                    Some(input) => {
                        self.last_event = match &input {
                            TranscriptInput::Final { .. } => LastEvent::Final,
                            TranscriptInput::Partial { .. } => LastEvent::Partial,
                            TranscriptInput::Correction { .. } => LastEvent::Correction,
                        };
                        let outcome = self.view.process(input);
                        if let ProcessOutcome::Corrected(update) = outcome {
                            self.last_postprocess = Some(update);
                        }
                    }
                    None => {
                        self.last_event = LastEvent::Skipped;
                    }
                }
                return true;
            }
            return false;
        }

        if self.position >= self.total() {
            return false;
        }
        if let Some(sr) = self.source.get(self.position) {
            let sr = sr.clone();
            if let Some(m) = CactusMetrics::from_stream_response(&sr) {
                self.cactus_metrics = Some(m);
            }
            match TranscriptInput::from_stream_response(&sr) {
                Some(input) => {
                    self.last_event = match &input {
                        TranscriptInput::Final { .. } => LastEvent::Final,
                        TranscriptInput::Partial { .. } => LastEvent::Partial,
                        TranscriptInput::Correction { .. } => LastEvent::Correction,
                    };
                    let outcome = self.view.process(input);
                    if let ProcessOutcome::Corrected(update) = outcome {
                        self.last_postprocess = Some(update);
                    }
                }
                None => {
                    self.last_event = LastEvent::Skipped;
                }
            }
        }
        self.position += 1;
        true
    }

    pub fn is_done(&self) -> bool {
        if self.source.is_live() {
            return false;
        }
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
    let speed_ms = args.speed;

    let (source, source_name) = if let Some(api_base) = args.cactus {
        let audio = args
            .audio
            .expect("--audio <path> is required with --cactus");
        (
            Source::from_cactus(&api_base, &audio),
            format!("cactus:{}", api_base),
        )
    } else {
        let fixture = args.fixture;
        let name = fixture.to_string();
        (Source::from_fixture(fixture.json()), name)
    };

    let mut terminal = ratatui::init();
    let result = run(&mut terminal, source, speed_ms, source_name.clone());
    ratatui::restore();

    match result {
        Ok(app) => {
            println!(
                "Done. {} final words from {} events ({}).",
                app.view.frame().final_words.len(),
                app.total(),
                source_name,
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
    source: Source,
    speed_ms: u64,
    source_name: String,
) -> std::io::Result<App> {
    let mut app = App::new(source, speed_ms, source_name);
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
                    KeyCode::Right if !app.source.is_live() => {
                        app.seek_to(app.position + 1);
                    }
                    KeyCode::Left if !app.source.is_live() => {
                        app.seek_to(app.position.saturating_sub(1));
                    }
                    KeyCode::Up => {
                        app.speed_ms = app.speed_ms.saturating_sub(10).max(5);
                    }
                    KeyCode::Down => {
                        app.speed_ms += 10;
                    }
                    KeyCode::Home if !app.source.is_live() => {
                        app.seek_to(0);
                    }
                    KeyCode::End if !app.source.is_live() => {
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
