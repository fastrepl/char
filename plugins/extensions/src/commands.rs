use std::path::PathBuf;

use tauri_plugin_settings::SettingsPluginExt;

use crate::{Error, ExtensionInfo, ExtensionsPluginExt, PanelInfo};

#[tauri::command]
#[specta::specta]
pub async fn load_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<(), Error> {
    app.extensions().load_extension(PathBuf::from(path)).await
}

#[tauri::command]
#[specta::specta]
pub async fn call_function<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    function_name: String,
    args_json: String,
) -> Result<String, Error> {
    app.extensions()
        .call_function(extension_id, function_name, args_json)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn execute_code<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
    code: String,
) -> Result<String, Error> {
    app.extensions().execute_code(extension_id, code).await
}

#[tauri::command]
#[specta::specta]
pub async fn list_extensions<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ExtensionInfo>, Error> {
    let extensions_dir = app
        .settings()
        .global_base()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions")
        .into_std_path_buf();

    let extensions = hypr_extensions_runtime::discover_extensions(&extensions_dir);

    Ok(extensions
        .into_iter()
        .map(|ext| {
            let panels = ext
                .panels()
                .iter()
                .map(|p| PanelInfo {
                    id: p.id.clone(),
                    title: p.title.clone(),
                    entry: p.entry.clone(),
                    entry_path: ext
                        .panel_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                    styles_path: ext
                        .panel_styles_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                })
                .collect();
            ExtensionInfo {
                id: ext.manifest.id.clone(),
                name: ext.manifest.name.clone(),
                version: ext.manifest.version.clone(),
                api_version: ext.manifest.api_version.clone(),
                description: ext.manifest.description.clone(),
                path: ext.path.to_string_lossy().to_string(),
                panels,
            }
        })
        .collect())
}

#[tauri::command]
#[specta::specta]
pub async fn get_extensions_dir<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, Error> {
    let extensions_dir = app
        .settings()
        .global_base()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions");

    if !extensions_dir.exists() {
        std::fs::create_dir_all(extensions_dir.as_std_path()).map_err(|e| Error::Io(e.to_string()))?;
    }

    Ok(extensions_dir.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_extension<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    extension_id: String,
) -> Result<ExtensionInfo, Error> {
    let extensions_dir = app
        .settings()
        .global_base()
        .map_err(|e| Error::Io(e.to_string()))?
        .join("extensions")
        .into_std_path_buf();

    let extensions = hypr_extensions_runtime::discover_extensions(&extensions_dir);

    extensions
        .into_iter()
        .find(|ext| ext.manifest.id == extension_id)
        .map(|ext| {
            let panels = ext
                .panels()
                .iter()
                .map(|p| PanelInfo {
                    id: p.id.clone(),
                    title: p.title.clone(),
                    entry: p.entry.clone(),
                    entry_path: ext
                        .panel_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                    styles_path: ext
                        .panel_styles_path(&p.id)
                        .map(|p| p.to_string_lossy().to_string()),
                })
                .collect();
            ExtensionInfo {
                id: ext.manifest.id.clone(),
                name: ext.manifest.name.clone(),
                version: ext.manifest.version.clone(),
                api_version: ext.manifest.api_version.clone(),
                description: ext.manifest.description.clone(),
                path: ext.path.to_string_lossy().to_string(),
                panels,
            }
        })
        .ok_or(Error::ExtensionNotFound(extension_id))
}
