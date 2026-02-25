use std::path::PathBuf;

use crate::PdfPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn export<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: PathBuf,
    input: crate::PdfInput,
) -> Result<(), String> {
    app.pdf().export(&path, input).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn export_text(
    path: PathBuf,
    content: String,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}
