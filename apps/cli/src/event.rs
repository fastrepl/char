use crossterm::event::{Event as CrosstermEvent, EventStream, KeyEvent, KeyEventKind};
use tokio::sync::mpsc;
use tokio_stream::StreamExt;

use crate::runtime::ListenerEvent;

pub enum AppEvent {
    Listener(ListenerEvent),
    Key(KeyEvent),
    Resize,
    Tick,
}

pub struct EventHandler {
    rx: mpsc::UnboundedReceiver<AppEvent>,
    _task: tokio::task::JoinHandle<()>,
}

impl EventHandler {
    pub fn new(mut listener_rx: mpsc::UnboundedReceiver<ListenerEvent>) -> Self {
        let (tx, rx) = mpsc::unbounded_channel();

        let task = tokio::spawn(async move {
            let mut event_stream = EventStream::new();
            let mut tick = tokio::time::interval(std::time::Duration::from_millis(100));

            loop {
                let event = tokio::select! {
                    _ = tick.tick() => AppEvent::Tick,
                    Some(listener_event) = listener_rx.recv() => {
                        AppEvent::Listener(listener_event)
                    }
                    Some(Ok(ct_event)) = event_stream.next() => {
                        match ct_event {
                            CrosstermEvent::Key(key) if key.kind == KeyEventKind::Press => {
                                AppEvent::Key(key)
                            }
                            CrosstermEvent::Resize(_, _) => AppEvent::Resize,
                            _ => continue,
                        }
                    }
                    else => break,
                };

                if tx.send(event).is_err() {
                    break;
                }
            }
        });

        Self { rx, _task: task }
    }

    pub async fn next(&mut self) -> Option<AppEvent> {
        self.rx.recv().await
    }
}
