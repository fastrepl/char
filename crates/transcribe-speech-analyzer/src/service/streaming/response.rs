use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, stream::SplitSink};
use owhisper_interface::stream::{
    Alternatives, Channel, Extra, Metadata, ModelInfo, StreamResponse, Word,
};

pub(super) type WsSender = SplitSink<WebSocket, Message>;

pub(super) async fn send_ws(sender: &mut WsSender, value: &StreamResponse) -> bool {
    let payload = match serde_json::to_string(value) {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!("failed to serialize ws response: {error}");
            return false;
        }
    };

    sender.send(Message::Text(payload.into())).await.is_ok()
}

pub(super) async fn send_ws_best_effort(sender: &mut WsSender, value: &StreamResponse) {
    let payload = match serde_json::to_string(value) {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!("failed to serialize ws response: {error}");
            return;
        }
    };

    let _ = sender.send(Message::Text(payload.into())).await;
}

pub(super) fn build_session_metadata() -> Metadata {
    Metadata {
        model_info: ModelInfo {
            name: "speech-analyzer".to_string(),
            version: "1.0".to_string(),
            arch: "apple-speech-analyzer".to_string(),
        },
        extra: Some(Extra::default().into()),
        ..Default::default()
    }
}

pub(super) fn build_transcript_response(
    text: &str,
    start: f64,
    duration: f64,
    confidence: f64,
    language: Option<&str>,
    is_final: bool,
    speech_final: bool,
    from_finalize: bool,
    metadata: &Metadata,
    channel_index: &[i32],
) -> StreamResponse {
    let languages = language.map(|l| vec![l.to_string()]).unwrap_or_default();

    let word_strs: Vec<&str> = text.split_whitespace().filter(|w| !w.is_empty()).collect();
    let n = word_strs.len();
    let words: Vec<Word> = word_strs
        .into_iter()
        .enumerate()
        .map(|(i, w)| {
            let word_start = start + (i as f64 / n as f64) * duration;
            let word_end = if i + 1 == n {
                (start + duration - 0.1_f64).max(word_start + 0.05_f64)
            } else {
                start + ((i + 1) as f64 / n as f64) * duration
            };
            Word {
                word: w.to_string(),
                start: word_start,
                end: word_end,
                confidence,
                speaker: None,
                punctuated_word: None,
                language: None,
            }
        })
        .collect();

    StreamResponse::TranscriptResponse {
        start,
        duration,
        is_final,
        speech_final,
        from_finalize,
        channel: Channel {
            alternatives: vec![Alternatives {
                transcript: text.to_string(),
                languages,
                words,
                confidence,
            }],
        },
        metadata: metadata.clone(),
        channel_index: channel_index.to_vec(),
    }
}

pub(super) fn format_timestamp_now() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let total_secs = d.as_secs();
    let millis = d.subsec_millis();

    let mut days = total_secs / 86400;
    let day_secs = (total_secs % 86400) as u32;
    let hours = day_secs / 3600;
    let minutes = (day_secs % 3600) / 60;
    let seconds = day_secs % 60;

    let mut year = 1970i32;
    loop {
        let ydays = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
            366u64
        } else {
            365
        };
        if days < ydays {
            break;
        }
        days -= ydays;
        year += 1;
    }

    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let mdays = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 1u32;
    for &md in &mdays {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    let day = days + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hours, minutes, seconds, millis
    )
}
