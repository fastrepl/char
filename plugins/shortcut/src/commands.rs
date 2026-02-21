use crate::registry;
use crate::types::ShortcutDef;

#[tauri::command]
#[specta::specta]
pub(crate) fn get_all_shortcuts() -> Vec<ShortcutDef> {
    registry::all()
}
