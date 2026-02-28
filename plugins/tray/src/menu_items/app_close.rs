use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct AppClose;

impl MenuItemHandler for AppClose {
    const ID: &'static str = "hypr_app_close";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Close", true, Some("cmd+q"))?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(_app: &AppHandle<tauri::Wry>) {
        #[cfg(target_os = "macos")]
        hypr_intercept::trigger_cmd_q_pressed();
    }
}
