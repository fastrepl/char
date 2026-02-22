mod app;
mod feed;
mod fixture;
mod provider;
mod renderer;
mod source;
mod theme;
mod viewport;

use std::time::{Duration, Instant};

use app::{App, KeyAction};
use crossterm::event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyEventKind};
use crossterm::execute;
use feed::TranscriptFeed;
use fixture::Fixture;
use owhisper_client::Provider;
use provider::{CactusProvider, CloudProvider};
use ratatui::DefaultTerminal;
use renderer::debug::DebugSection;
use source::FixtureSource;

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
    /// Stream an audio file for live transcription
    File {
        path: String,
        #[command(subcommand)]
        provider: ProviderCmd,
    },
    /// Stream default microphone for live transcription
    Mic {
        #[command(subcommand)]
        provider: ProviderCmd,
    },
}

#[derive(clap::Subcommand)]
enum ProviderCmd {
    /// Transcribe locally using a Cactus model
    Cactus {
        #[arg(long)]
        model: String,
    },
    /// Transcribe via a cloud STT provider
    Cloud {
        #[arg(long)]
        provider: Provider,
        /// API key (falls back to the provider's env var if omitted)
        #[arg(long)]
        api_key: Option<String>,
    },
}

fn main() {
    use clap::Parser;
    let args = Args::parse();
    let speed_ms = args.speed;

    let (replay_source, source_debug, source_name): (
        Box<dyn TranscriptFeed>,
        Vec<DebugSection>,
        String,
    ) = match args.source {
        SourceCmd::Fixture { name } => {
            let label = name.to_string();
            (
                Box::new(FixtureSource::from_json(label.clone(), name.json())),
                vec![],
                label,
            )
        }
        SourceCmd::File { path, provider } => {
            let label = format!("file:{path}");
            let path_for_closure = path.clone();
            let feed: Box<dyn TranscriptFeed> = match provider {
                ProviderCmd::Cactus { model } => {
                    Box::new(CactusProvider::spawn(&model, move || {
                        let s = hypr_audio_utils::source_from_path(&path_for_closure)
                            .expect("failed to open audio file");
                        source::throttled_audio_stream(s)
                    }))
                }
                ProviderCmd::Cloud { provider, api_key } => {
                    Box::new(CloudProvider::spawn(provider, api_key, move || {
                        let s = hypr_audio_utils::source_from_path(&path_for_closure)
                            .expect("failed to open audio file");
                        source::throttled_audio_stream(s)
                    }))
                }
            };
            let debug = vec![DebugSection {
                title: "file",
                entries: vec![("path", path)],
            }];
            (feed, debug, label)
        }
        SourceCmd::Mic { provider } => {
            use hypr_audio::MicInput;

            let mic = MicInput::new(None).expect("failed to open microphone");
            let device_name = mic.device_name();
            let label = format!("mic:{device_name}");

            let feed: Box<dyn TranscriptFeed> = match provider {
                ProviderCmd::Cactus { model } => {
                    Box::new(CactusProvider::spawn(&model, move || {
                        source::throttled_audio_stream(mic.stream())
                    }))
                }
                ProviderCmd::Cloud { provider, api_key } => {
                    Box::new(CloudProvider::spawn(provider, api_key, move || {
                        source::throttled_audio_stream(mic.stream())
                    }))
                }
            };
            let debug = vec![DebugSection {
                title: "mic",
                entries: vec![("device", device_name)],
            }];
            (feed, debug, label)
        }
    };

    let mut terminal = ratatui::init();
    execute!(std::io::stdout(), EnableMouseCapture).ok();
    let result = run(
        &mut terminal,
        replay_source,
        source_debug,
        speed_ms,
        source_name.clone(),
    );
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
    source: Box<dyn TranscriptFeed>,
    source_debug: Vec<DebugSection>,
    speed_ms: u64,
    source_name: String,
) -> std::io::Result<App> {
    let mut app = App::new(source, source_debug, speed_ms, source_name);
    let mut last_tick = Instant::now();

    loop {
        let mut layout = renderer::LayoutInfo::default();
        terminal.draw(|frame| {
            layout = renderer::render(frame, &app);
        })?;
        app.update_layout(layout);

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
