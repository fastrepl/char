use crate::FsDbPluginExt;
use crate::types::{
    EnhancedNoteData, SessionContent, SessionEnhancedNotes, SessionTranscript, TranscriptData,
};

#[tauri::command]
#[specta::specta]
pub(crate) async fn load_session_content<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<SessionContent, String> {
    app.fs_db()
        .load_session_content(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn load_session_transcript<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<SessionTranscript, String> {
    app.fs_db()
        .load_session_transcript(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn load_session_enhanced_notes<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<SessionEnhancedNotes, String> {
    app.fs_db()
        .load_session_enhanced_notes(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_session_content<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    raw_md: String,
) -> Result<(), String> {
    app.fs_db()
        .save_session_content(&session_id, &raw_md)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_session_transcript<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    transcript: TranscriptData,
) -> Result<(), String> {
    app.fs_db()
        .save_session_transcript(&session_id, transcript)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_session_enhanced_note<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    note: EnhancedNoteData,
    filename: String,
) -> Result<(), String> {
    app.fs_db()
        .save_session_enhanced_note(&session_id, note, &filename)
        .await
        .map_err(|e| e.to_string())
}
