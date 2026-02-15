const API_HOST: &str = "https://api.deepgram.com";

#[derive(Debug)]
pub struct DeepgramError {
    pub message: String,
    pub is_retryable: bool,
}

impl std::fmt::Display for DeepgramError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for DeepgramError {}

fn build_url(callback_url: &str, options: Option<&serde_json::Value>) -> String {
    let mut params: Vec<(String, String)> = vec![
        ("callback".to_string(), callback_url.to_string()),
        ("model".to_string(), "nova-3".to_string()),
        ("diarize".to_string(), "true".to_string()),
        ("detect_language".to_string(), "true".to_string()),
        ("punctuate".to_string(), "true".to_string()),
        ("smart_format".to_string(), "true".to_string()),
        ("utterances".to_string(), "true".to_string()),
    ];

    if let Some(overrides) = options {
        if let Some(obj) = overrides.as_object() {
            for (k, v) in obj {
                let val = match v {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Number(n) => n.to_string(),
                    other => other.to_string(),
                };
                params.retain(|(existing_k, _)| existing_k != k);
                params.push((k.clone(), val));
            }
        }
    }

    let qs: String = params
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    format!("{API_HOST}/v1/listen?{qs}")
}

pub async fn transcribe_with_callback(
    client: &reqwest::Client,
    audio_url: &str,
    callback_url: &str,
    api_key: &str,
    options: Option<&serde_json::Value>,
) -> Result<String, DeepgramError> {
    let url = build_url(callback_url, options);

    let response = client
        .post(&url)
        .header("Authorization", format!("Token {api_key}"))
        .json(&serde_json::json!({ "url": audio_url }))
        .send()
        .await
        .map_err(|e| DeepgramError {
            message: format!("request failed: {e}"),
            is_retryable: true,
        })?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(DeepgramError {
            message: format!("{status} - {error_text}"),
            is_retryable: matches!(status, 429 | 500..),
        });
    }

    let body: serde_json::Value = response.json().await.map_err(|e| DeepgramError {
        message: format!("failed to parse response: {e}"),
        is_retryable: false,
    })?;

    let request_id = body
        .get("request_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| DeepgramError {
            message: "missing request_id in response".to_string(),
            is_retryable: false,
        })?
        .to_string();

    Ok(request_id)
}
