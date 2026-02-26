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
