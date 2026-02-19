#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CactusResponse {
    #[serde(default)]
    pub response: String,
    #[serde(default)]
    pub confidence: f32,
    #[serde(default)]
    pub time_to_first_token_ms: f64,
    #[serde(default)]
    pub total_time_ms: f64,
    #[serde(default)]
    pub prefill_tps: f64,
    #[serde(default)]
    pub decode_tps: f64,
    #[serde(default)]
    pub prefill_tokens: u32,
    #[serde(default)]
    pub decode_tokens: u32,
    #[serde(default)]
    pub total_tokens: u32,
}
