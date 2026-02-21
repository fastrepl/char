mod app;
mod fixture;
mod renderer;
mod source;
mod theme;

use std::time::{Duration, Instant};

use app::{App, KeyAction};
use crossterm::event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyEventKind};
use crossterm::execute;
use fixture::Fixture;
use ratatui::DefaultTerminal;
use source::Source;

#[derive(clap::Parser)]
#[command(name = "replay", about = "Replay transcript fixture in the terminal")]
struct Args {
    #[arg(short, long, default_value_t = 30)]
    speed: u64,

    #[command(subcommand)]
    source: SourceCmd,
}

#[derive(clap::Subcommand)]
enum SourceCmd {
    /// Replay a built-in transcript fixture
    Fixture {
        #[arg(default_value_t = Fixture::Deepgram)]
        name: Fixture,
    },
    /// Stream an audio file to Cactus for live transcription
    File {
        path: String,
        #[arg(long)]
        url: String,
        #[arg(long, env = "CACTUS_API_KEY")]
        api_key: Option<String>,
    },
    /// Stream default microphone to Cactus for live transcription
    Mic {
        #[arg(long)]
        url: String,
        #[arg(long, env = "CACTUS_API_KEY")]
        api_key: Option<String>,
    },
}

fn main() {
    use clap::Parser;
    let args = Args::parse();
    let speed_ms = args.speed;

    let (source, source_name) = match args.source {
        SourceCmd::Fixture { name } => {
            let label = name.to_string();
            (Source::from_fixture(name.json()), label)
        }
        SourceCmd::File { path, url, api_key } => {
            let label = format!("file:{url}");
            (Source::from_cactus_file(&url, &path, api_key), label)
        }
        SourceCmd::Mic { url, api_key } => {
            let (source, device_name) = Source::from_cactus_mic(&url, api_key);
            (source, format!("mic:{device_name}"))
        }
    };

    let mut terminal = ratatui::init();
    execute!(std::io::stdout(), EnableMouseCapture).ok();
    let result = run(&mut terminal, source, speed_ms, source_name.clone());
    execute!(std::io::stdout(), DisableMouseCapture).ok();
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
        let mut layout = None;
        terminal.draw(|frame| {
            layout = Some(renderer::render(frame, &app));
        })?;
        app.update_layout(layout.unwrap());

        let tick_duration = Duration::from_millis(app.speed_ms);
        let elapsed = last_tick.elapsed();
        let timeout = tick_duration.saturating_sub(elapsed);

        if event::poll(timeout)? {
            match event::read()? {
                Event::Key(key) => {
                    if key.kind != KeyEventKind::Press {
                        continue;
                    }
                    match app.handle_key(key.code) {
                        KeyAction::Quit => break,
                        KeyAction::Continue { reset_tick } => {
                            if reset_tick {
                                last_tick = Instant::now();
                            }
                        }
                    }
                }
                Event::Mouse(mouse) => {
                    app.handle_mouse(mouse);
                }
                _ => {}
            }
        } else if !app.paused {
            if last_tick.elapsed() >= tick_duration {
                app.advance();
                last_tick = Instant::now();

                if app.is_done() {
                    let mode = app.flush_mode;
                    app.view.flush(mode);
                    terminal.draw(|frame| {
                        renderer::render(frame, &app);
                    })?;
                    app.paused = true;
                }
            }
        }
    }

    Ok(app)
}
