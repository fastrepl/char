uniffi::setup_scaffolding!();

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum BridgeError {
    #[error("Conversion failed: {reason}")]
    ConversionError { reason: String },
}

#[uniffi::export]
pub fn tiptap_json_to_markdown(json: String) -> Result<String, BridgeError> {
    let value: serde_json::Value =
        serde_json::from_str(&json).map_err(|e| BridgeError::ConversionError {
            reason: format!("Invalid JSON: {e}"),
        })?;

    hypr_tiptap::tiptap_json_to_md(&value).map_err(|e| BridgeError::ConversionError { reason: e })
}

#[uniffi::export]
pub fn markdown_to_tiptap_json(md: String) -> Result<String, BridgeError> {
    let value = hypr_tiptap::md_to_tiptap_json(&md)
        .map_err(|e| BridgeError::ConversionError { reason: e })?;

    serde_json::to_string_pretty(&value).map_err(|e| BridgeError::ConversionError {
        reason: format!("JSON serialization failed: {e}"),
    })
}
