use std::sync::Arc;

use hypr_listener_core::actors::{RootActor, RootArgs, RootMsg, SessionParams};
use ractor::Actor;

use crate::{
    app::App,
    event::{EventHandler, TuiEvent},
    frame::FrameRequester,
    runtime::TuiRuntime,
};

pub struct Args {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub language: String,
    pub record: bool,
}

fn setup_panic_hook() {
    let original = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        ratatui::restore();
        original(info);
    }));
}

pub async fn run(args: Args) {
    let languages = vec![
        args.language
            .parse::<hypr_language::Language>()
            .expect("invalid language code"),
    ];

    let session_id = uuid::Uuid::new_v4().to_string();
    let vault_base = std::env::temp_dir().join("char-cli");

    let (listener_tx, mut listener_rx) = tokio::sync::mpsc::unbounded_channel();
    let runtime = Arc::new(TuiRuntime::new(vault_base, listener_tx));

    let (root_ref, _handle) = Actor::spawn(
        Some(RootActor::name()),
        RootActor,
        RootArgs {
            runtime: runtime.clone(),
        },
    )
    .await
    .expect("failed to spawn root actor");

    let params = SessionParams {
        session_id,
        languages,
        onboarding: false,
        record_enabled: args.record,
        model: args.model,
        base_url: args.base_url,
        api_key: args.api_key,
        keywords: vec![],
    };

    let started = ractor::call!(root_ref, RootMsg::StartSession, params)
        .expect("failed to send start message");

    if !started {
        eprintln!("Failed to start session");
        std::process::exit(1);
    }

    setup_panic_hook();
    let mut terminal = ratatui::init();
    let (draw_tx, draw_rx) = tokio::sync::broadcast::channel(16);
    let frame_requester = FrameRequester::new(draw_tx);
    let mut app = App::new(frame_requester.clone());
    let mut events = EventHandler::new(draw_rx);
    events.resume_events();

    frame_requester.schedule_frame();

    loop {
        tokio::select! {
            Some(tui_event) = events.next() => {
                match tui_event {
                    TuiEvent::Key(key) => app.handle_key(key),
                    TuiEvent::Paste(pasted) => app.handle_paste(pasted),
                    TuiEvent::Draw => {
                        terminal.draw(|frame| crate::ui::draw(frame, &app)).ok();
                        frame_requester.schedule_frame_in(std::time::Duration::from_secs(1));
                    }
                }
            }
            Some(listener_event) = listener_rx.recv() => {
                app.handle_listener_event(listener_event);
            }
            else => break,
        }

        if app.should_quit {
            break;
        }
    }

    events.pause_events();
    ratatui::restore();

    let _ = ractor::call!(root_ref, RootMsg::StopSession);
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
}
