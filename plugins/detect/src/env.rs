use tauri::{AppHandle, EventTarget, Runtime};
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::DetectEvent;

pub(crate) trait Env: Clone + Send + Sync + 'static {
    fn emit(&self, event: DetectEvent);
    fn is_do_not_disturb(&self) -> bool;
}

pub(crate) struct TauriEnv<R: Runtime> {
    pub(crate) app_handle: AppHandle<R>,
}

impl<R: Runtime> Clone for TauriEnv<R> {
    fn clone(&self) -> Self {
        Self {
            app_handle: self.app_handle.clone(),
        }
    }
}

impl<R: Runtime> Env for TauriEnv<R> {
    fn emit(&self, event: DetectEvent) {
        let _ = event.emit_to(
            &self.app_handle,
            EventTarget::AnyLabel {
                label: tauri_plugin_windows::AppWindow::Main.label(),
            },
        );
    }

    fn is_do_not_disturb(&self) -> bool {
        crate::dnd::is_do_not_disturb()
    }
}

#[cfg(test)]
pub(crate) mod test_support {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};

    #[derive(Clone)]
    pub(crate) struct TestEnv {
        pub(crate) events: Arc<std::sync::Mutex<Vec<DetectEvent>>>,
        dnd: Arc<AtomicBool>,
    }

    impl TestEnv {
        pub(crate) fn new() -> Self {
            Self {
                events: Arc::new(std::sync::Mutex::new(Vec::new())),
                dnd: Arc::new(AtomicBool::new(false)),
            }
        }

        pub(crate) fn set_dnd(&self, value: bool) {
            self.dnd.store(value, Ordering::Relaxed);
        }
    }

    impl Env for TestEnv {
        fn emit(&self, event: DetectEvent) {
            self.events.lock().unwrap().push(event);
        }

        fn is_do_not_disturb(&self) -> bool {
            self.dnd.load(Ordering::Relaxed)
        }
    }
}
