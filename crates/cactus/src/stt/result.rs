#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct TranscriptionResult {
    #[serde(default, rename = "response")]
    pub text: String,
    #[serde(default)]
    pub confidence: f32,
    #[serde(default)]
    pub total_time_ms: f64,
}
