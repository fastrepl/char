use owhisper_client::AdapterKind;
use std::str::FromStr;

use crate::{BatchParams, Listener2PluginExt, Subtitle, VttWord};
use hypr_pyannote_local::diarize::DiarizationSegment;

#[tauri::command]
#[specta::specta]
pub async fn run_batch<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    params: BatchParams,
) -> Result<(), String> {
    app.listener2()
        .run_batch(params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn parse_subtitle<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<Subtitle, String> {
    app.listener2().parse_subtitle(path)
}

#[tauri::command]
#[specta::specta]
pub async fn export_to_vtt<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    words: Vec<VttWord>,
) -> Result<String, String> {
    app.listener2().export_to_vtt(session_id, words)
}

#[tauri::command]
#[specta::specta]
pub async fn is_supported_languages_batch<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    provider: String,
    model: Option<String>,
    languages: Vec<String>,
) -> Result<bool, String> {
    if provider == "custom" || provider == "hyprnote" {
        return Ok(true);
    }

    let languages_parsed = languages
        .iter()
        .map(|s| hypr_language::Language::from_str(s))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("unknown_language: {}", e))?;
    let adapter_kind =
        AdapterKind::from_str(&provider).map_err(|_| format!("unknown_provider: {}", provider))?;

    Ok(adapter_kind.is_supported_languages_batch(&languages_parsed, model.as_deref()))
}

#[tauri::command]
#[specta::specta]
pub async fn suggest_providers_for_languages_batch<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    languages: Vec<String>,
) -> Result<Vec<String>, String> {
    let languages_parsed = languages
        .iter()
        .map(|s| hypr_language::Language::from_str(s))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("unknown_language: {}", e))?;

    let all_providers = [
        AdapterKind::Argmax,
        AdapterKind::Soniox,
        AdapterKind::Fireworks,
        AdapterKind::Deepgram,
        AdapterKind::AssemblyAI,
        AdapterKind::OpenAI,
        AdapterKind::Gladia,
        AdapterKind::ElevenLabs,
        AdapterKind::DashScope,
        AdapterKind::Mistral,
    ];

    let mut with_support: Vec<_> = all_providers
        .iter()
        .map(|kind| {
            let support = kind.language_support_batch(&languages_parsed, None);
            (*kind, support)
        })
        .filter(|(_, support)| support.is_supported())
        .collect();

    with_support.sort_by(|(_, s1), (_, s2)| s2.cmp(s1));

    let supported: Vec<String> = with_support
        .into_iter()
        .map(|(kind, _)| format!("{:?}", kind).to_lowercase())
        .collect();

    Ok(supported)
}

#[tauri::command]
#[specta::specta]
pub async fn diarize_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
    max_speakers: usize,
) -> Result<Vec<DiarizationSegment>, String> {
    app.listener2()
        .diarize_session(session_id, max_speakers)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn list_documented_language_codes_batch<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    Ok(owhisper_client::documented_language_codes_batch())
}
