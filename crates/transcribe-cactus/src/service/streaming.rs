use std::{
    future::Future,
    path::{Path, PathBuf},
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use axum::{
    body::Body,
    extract::{
        FromRequestParts,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use futures_util::{SinkExt, StreamExt, stream::SplitSink};
use tower::Service;

use hypr_audio_utils::bytes_to_f32_samples;
use hypr_ws_utils::{ConnectionGuard, ConnectionManager};
use owhisper_interface::stream::{
    Alternatives, Channel, Extra, Metadata, ModelInfo, StreamResponse, Word,
};
use owhisper_interface::{ControlMessage, ListenParams};

use super::batch;

const SAMPLE_RATE: u32 = 16_000;

type WsSender = SplitSink<WebSocket, Message>;

async fn send_ws(sender: &mut WsSender, value: &StreamResponse) -> bool {
    let payload = match serde_json::to_string(value) {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!("failed to serialize ws response: {error}");
            return false;
        }
    };

    sender.send(Message::Text(payload.into())).await.is_ok()
}

async fn send_ws_best_effort(sender: &mut WsSender, value: &StreamResponse) {
    let payload = match serde_json::to_string(value) {
        Ok(payload) => payload,
        Err(error) => {
            tracing::warn!("failed to serialize ws response: {error}");
            return;
        }
    };

    let _ = sender.send(Message::Text(payload.into())).await;
}

#[derive(Clone)]
pub struct TranscribeService {
    model_path: PathBuf,
    connection_manager: ConnectionManager,
}

impl TranscribeService {
    pub fn builder() -> TranscribeServiceBuilder {
        TranscribeServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct TranscribeServiceBuilder {
    model_path: Option<PathBuf>,
    connection_manager: Option<ConnectionManager>,
}

impl TranscribeServiceBuilder {
    pub fn model_path(mut self, model_path: PathBuf) -> Self {
        self.model_path = Some(model_path);
        self
    }

    pub fn build(self) -> TranscribeService {
        TranscribeService {
            model_path: self
                .model_path
                .expect("TranscribeServiceBuilder requires model_path"),
            connection_manager: self.connection_manager.unwrap_or_default(),
        }
    }
}

impl Service<Request<Body>> for TranscribeService {
    type Response = Response;
    type Error = String;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let model_path = self.model_path.clone();
        let connection_manager = self.connection_manager.clone();

        Box::pin(async move {
            let is_ws = req
                .headers()
                .get("upgrade")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.eq_ignore_ascii_case("websocket"))
                .unwrap_or(false);

            let query_string = req.uri().query().unwrap_or("").to_string();
            let params: ListenParams = match serde_qs::from_str(&query_string) {
                Ok(p) => p,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            if is_ws {
                let (mut parts, _body) = req.into_parts();
                let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                    Ok(ws) => ws,
                    Err(e) => {
                        return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                    }
                };

                let guard = connection_manager.acquire_connection();

                Ok(ws_upgrade
                    .on_upgrade(move |socket| async move {
                        handle_websocket(socket, params, model_path, guard).await;
                    })
                    .into_response())
            } else {
                let content_type = req
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("application/octet-stream")
                    .to_string();

                let body_bytes =
                    match axum::body::to_bytes(req.into_body(), 100 * 1024 * 1024).await {
                        Ok(b) => b,
                        Err(e) => {
                            return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                        }
                    };

                if body_bytes.is_empty() {
                    return Ok((StatusCode::BAD_REQUEST, "request body is empty").into_response());
                }

                Ok(batch::handle_batch(body_bytes, &content_type, &params, &model_path).await)
            }
        })
    }
}

async fn handle_websocket(
    socket: WebSocket,
    params: ListenParams,
    model_path: PathBuf,
    guard: ConnectionGuard,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    let metadata = build_session_metadata(&model_path);
    let total_channels = (params.channels as i32).max(1);
    let channel_index = vec![0, total_channels];

    let chunk_size_ms = 300;

    let model = match hypr_cactus::Model::new(&model_path) {
        Ok(m) => m,
        Err(e) => {
            send_ws_best_effort(
                &mut ws_sender,
                &StreamResponse::ErrorResponse {
                    error_code: None,
                    error_message: format!("failed to load model: {e}"),
                    provider: "cactus".to_string(),
                },
            )
            .await;
            return;
        }
    };

    let options = hypr_cactus::TranscribeOptions {
        language: hypr_cactus::constrain_to(&params.languages),
        ..Default::default()
    };

    let (audio_tx, mut event_rx, _cancel_token) = hypr_cactus::transcribe_stream(
        Arc::new(model),
        options,
        chunk_size_ms,
        SAMPLE_RATE,
    );

    let mut last_confirmed_sent = String::new();
    let mut last_pending_sent = String::new();
    let mut audio_offset = 0.0f64;
    let mut segment_start = 0.0f64;
    let mut speech_started = false;

    struct Pending {
        text: String,
        language: Option<String>,
        confidence: f64,
    }
    let mut pending = Pending {
        text: String::new(),
        language: None,
        confidence: 0.0,
    };

    loop {
        tokio::select! {
            _ = guard.cancelled() => {
                tracing::info!("cactus_websocket_cancelled_by_new_connection");
                break;
            }
            event = event_rx.next() => {
                let Some(event) = event else { break };

                match event {
                    Err(e) => {
                        send_ws_best_effort(&mut ws_sender, &StreamResponse::ErrorResponse {
                            error_code: None,
                            error_message: e.to_string(),
                            provider: "cactus".to_string(),
                        })
                        .await;
                        break;
                    }
                    Ok(hypr_cactus::TranscribeEvent { result, chunk_duration_secs }) => {
                        audio_offset += chunk_duration_secs;

                        let duration = audio_offset - segment_start;
                        let confidence = result.confidence as f64;
                        let confirmed_text = result.confirmed.trim();

                        pending.text = result.pending.clone();
                        pending.language = result.language.clone();
                        pending.confidence = confidence;

                        if !confirmed_text.is_empty() && confirmed_text != last_confirmed_sent {
                            if !speech_started {
                                if !send_ws(
                                    &mut ws_sender,
                                    &StreamResponse::SpeechStartedResponse {
                                    channel: vec![0],
                                    timestamp: segment_start,
                                    },
                                )
                                .await
                                {
                                    break;
                                }
                            }

                            tracing::info!(text = confirmed_text, "cactus_confirmed_text");
                            if !send_ws(
                                &mut ws_sender,
                                &build_transcript_response(
                                confirmed_text, segment_start, duration, confidence,
                                result.language.as_deref(), true, true, false,
                                &metadata, &channel_index,
                                ),
                            )
                            .await
                            {
                                break;
                            }
                            if !send_ws(
                                &mut ws_sender,
                                &StreamResponse::UtteranceEndResponse {
                                channel: vec![0],
                                last_word_end: segment_start + duration,
                                },
                            )
                            .await
                            {
                                break;
                            }

                            last_confirmed_sent.clear();
                            last_confirmed_sent.push_str(confirmed_text);
                            last_pending_sent.clear();
                            segment_start = audio_offset;
                            speech_started = false;
                            continue;
                        }

                        let pending_text = result.pending.trim();
                        if pending_text.is_empty()
                            || pending_text == last_pending_sent
                            || pending_text == last_confirmed_sent
                        {
                            continue;
                        }

                        if !speech_started {
                            speech_started = true;
                            if !send_ws(
                                &mut ws_sender,
                                &StreamResponse::SpeechStartedResponse {
                                channel: vec![0],
                                timestamp: segment_start,
                                },
                            )
                            .await
                            {
                                break;
                            }
                        }

                        if !send_ws(
                            &mut ws_sender,
                            &build_transcript_response(
                            pending_text, segment_start, duration, confidence,
                            result.language.as_deref(), false, false, false,
                            &metadata, &channel_index,
                            ),
                        )
                        .await
                        {
                            break;
                        }
                        last_pending_sent.clear();
                        last_pending_sent.push_str(pending_text);
                    }
                }
            }
            msg = ws_receiver.next() => {
                let Some(msg) = msg else {
                    tracing::info!("websocket_stream_ended");
                    break;
                };
                let msg = match msg {
                    Ok(msg) => msg,
                    Err(e) => {
                        tracing::warn!("websocket_receive_error: {}", e);
                        break;
                    }
                };

                match process_incoming_message(&msg, params.channels) {
                    IncomingMessage::Audio(AudioExtract::Samples(s)) if !s.is_empty() => {
                        if audio_tx.send(s).await.is_err() {
                            break;
                        }
                    }
                    IncomingMessage::Audio(AudioExtract::End) => break,
                    IncomingMessage::Control(ControlMessage::KeepAlive) => {}
                    IncomingMessage::Control(ControlMessage::Finalize) => {
                        let pending_text = pending.text.trim().to_string();
                        if !pending_text.is_empty() {
                            let duration = audio_offset - segment_start;
                            if !send_ws(
                                &mut ws_sender,
                                &build_transcript_response(
                                &pending_text, segment_start, duration, pending.confidence,
                                pending.language.as_deref(), true, true, true,
                                &metadata, &channel_index,
                                ),
                            )
                            .await
                            {
                                break;
                            }
                            if !send_ws(
                                &mut ws_sender,
                                &StreamResponse::UtteranceEndResponse {
                                channel: vec![0],
                                last_word_end: segment_start + duration,
                                },
                            )
                            .await
                            {
                                break;
                            }
                            segment_start = audio_offset;
                            speech_started = false;
                            last_confirmed_sent.clear();
                            last_pending_sent.clear();
                            pending.text.clear();
                        }
                    }
                    IncomingMessage::Control(ControlMessage::CloseStream) => break,
                    _ => continue,
                }
            }
        }
    }

    drop(audio_tx);
    drop(event_rx);

    send_ws_best_effort(
        &mut ws_sender,
        &StreamResponse::TerminalResponse {
            request_id: metadata.request_id.clone(),
            created: format_timestamp_now(),
            duration: audio_offset,
            channels: total_channels as u32,
        },
    )
    .await;

    let _ = ws_sender.close().await;
}


enum IncomingMessage {
    Audio(AudioExtract),
    Control(ControlMessage),
}

enum AudioExtract {
    Samples(Vec<f32>),
    Empty,
    End,
}

fn deinterleave_and_mix(data: &[u8]) -> Vec<f32> {
    let samples: Vec<i16> = data
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let mut mic = Vec::with_capacity(samples.len() / 2);
    let mut speaker = Vec::with_capacity(samples.len() / 2);

    for chunk in samples.chunks_exact(2) {
        mic.push(chunk[0] as f32 / 32768.0);
        speaker.push(chunk[1] as f32 / 32768.0);
    }

    hypr_audio_utils::mix_audio_f32(&mic, &speaker)
}

fn process_incoming_message(msg: &Message, channels: u8) -> IncomingMessage {
    match msg {
        Message::Binary(data) => {
            if data.is_empty() {
                return IncomingMessage::Audio(AudioExtract::Empty);
            }
            if channels >= 2 {
                IncomingMessage::Audio(AudioExtract::Samples(deinterleave_and_mix(data)))
            } else {
                IncomingMessage::Audio(AudioExtract::Samples(bytes_to_f32_samples(data)))
            }
        }
        Message::Text(data) => {
            if let Ok(ctrl) = serde_json::from_str::<ControlMessage>(data) {
                return IncomingMessage::Control(ctrl);
            }

            match serde_json::from_str::<owhisper_interface::ListenInputChunk>(data) {
                Ok(owhisper_interface::ListenInputChunk::Audio { data }) => {
                    if data.is_empty() {
                        IncomingMessage::Audio(AudioExtract::Empty)
                    } else {
                        IncomingMessage::Audio(AudioExtract::Samples(bytes_to_f32_samples(&data)))
                    }
                }
                Ok(owhisper_interface::ListenInputChunk::DualAudio { mic, speaker }) => {
                    let mic_samples = bytes_to_f32_samples(&mic);
                    let speaker_samples = bytes_to_f32_samples(&speaker);
                    IncomingMessage::Audio(AudioExtract::Samples(hypr_audio_utils::mix_audio_f32(
                        &mic_samples,
                        &speaker_samples,
                    )))
                }
                Ok(owhisper_interface::ListenInputChunk::End) => {
                    IncomingMessage::Audio(AudioExtract::End)
                }
                Err(_) => IncomingMessage::Audio(AudioExtract::Empty),
            }
        }
        Message::Close(_) => IncomingMessage::Audio(AudioExtract::End),
        _ => IncomingMessage::Audio(AudioExtract::Empty),
    }
}

fn build_session_metadata(model_path: &Path) -> Metadata {
    let model_name = model_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cactus")
        .to_string();

    Metadata {
        model_info: ModelInfo {
            name: model_name,
            version: "1.0".to_string(),
            arch: "cactus".to_string(),
        },
        extra: Some(Extra::default().into()),
        ..Default::default()
    }
}

fn build_transcript_response(
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

    let words: Vec<Word> = text
        .split_whitespace()
        .filter(|w| !w.is_empty())
        .map(|w| Word {
            word: w.to_string(),
            start,
            end: start + duration,
            confidence,
            speaker: None,
            punctuated_word: None,
            language: None,
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

fn format_timestamp_now() -> String {
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

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;
    use axum::extract::ws::Message;
    use axum::{Router, error_handling::HandleError, http::StatusCode};
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

    #[test]
    fn control_message_finalize_parsed() {
        let msg = Message::Text(r#"{"type":"Finalize"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::Finalize) => {}
            other => panic!(
                "expected Finalize, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn control_message_keep_alive_parsed() {
        let msg = Message::Text(r#"{"type":"KeepAlive"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::KeepAlive) => {}
            other => panic!(
                "expected KeepAlive, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn control_message_close_stream_parsed() {
        let msg = Message::Text(r#"{"type":"CloseStream"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::CloseStream) => {}
            other => panic!(
                "expected CloseStream, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn audio_chunk_parsed_over_control() {
        let chunk = owhisper_interface::ListenInputChunk::End;
        let json = serde_json::to_string(&chunk).unwrap();
        let msg = Message::Text(json.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::End) => {}
            other => panic!(
                "expected Audio(End), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn close_frame_yields_end() {
        let msg = Message::Close(None);
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::End) => {}
            other => panic!(
                "expected Audio(End), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn transcript_response_serializes_as_results() {
        let meta = build_session_metadata(Path::new("/models/whisper-small"));
        let resp = build_transcript_response(
            "hello world",
            0.0,
            1.5,
            0.95,
            Some("en"),
            true,
            true,
            false,
            &meta,
            &[0, 1],
        );

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["type"], "Results");
        assert_eq!(v["is_final"], true);
        assert_eq!(v["speech_final"], true);
        assert_eq!(v["from_finalize"], false);
        assert_eq!(v["start"], 0.0);
        assert_eq!(v["duration"], 1.5);
        assert_eq!(v["channel"]["alternatives"][0]["transcript"], "hello world");
        assert_eq!(
            v["channel"]["alternatives"][0]["words"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        assert_eq!(v["channel"]["alternatives"][0]["languages"][0], "en");
        assert!(!v["metadata"]["request_id"].as_str().unwrap().is_empty());
        assert_eq!(v["metadata"]["model_info"]["name"], "whisper-small");
        assert_eq!(v["metadata"]["model_info"]["arch"], "cactus");
        assert!(
            v["metadata"]["extra"]["started_unix_millis"]
                .as_u64()
                .is_some()
        );
        assert_eq!(v["channel_index"], serde_json::json!([0, 1]));
    }

    #[test]
    fn transcript_response_from_finalize_flag() {
        let meta = build_session_metadata(Path::new("/models/test"));
        let resp = build_transcript_response(
            "test",
            1.0,
            0.5,
            0.9,
            None,
            true,
            true,
            true,
            &meta,
            &[0, 2],
        );

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["from_finalize"], true);
        assert_eq!(v["channel_index"], serde_json::json!([0, 2]));
    }

    #[test]
    fn terminal_response_serializes_as_metadata() {
        let resp = StreamResponse::TerminalResponse {
            request_id: "test-id".to_string(),
            created: "2026-01-01T00:00:00.000Z".to_string(),
            duration: 10.5,
            channels: 1,
        };

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["type"], "Metadata");
        assert_eq!(v["request_id"], "test-id");
        assert_eq!(v["duration"], 10.5);
        assert_eq!(v["channels"], 1);
    }

    #[test]
    fn error_response_serializes() {
        let resp = StreamResponse::ErrorResponse {
            error_code: None,
            error_message: "model failed".to_string(),
            provider: "cactus".to_string(),
        };

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["type"], "Error");
        assert_eq!(v["error_message"], "model failed");
        assert_eq!(v["provider"], "cactus");
    }

    #[test]
    fn speech_started_response_serializes() {
        let resp = StreamResponse::SpeechStartedResponse {
            channel: vec![0],
            timestamp: 1.23,
        };

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["type"], "SpeechStarted");
        assert_eq!(v["timestamp"], 1.23);
    }

    #[test]
    fn utterance_end_response_serializes() {
        let resp = StreamResponse::UtteranceEndResponse {
            channel: vec![0],
            last_word_end: 5.67,
        };

        let json = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(v["type"], "UtteranceEnd");
        assert_eq!(v["last_word_end"], 5.67);
    }

    #[test]
    fn session_metadata_has_required_fields() {
        let meta = build_session_metadata(Path::new("/some/path/whisper-large-v3"));
        assert!(!meta.request_id.is_empty());
        assert!(!meta.model_uuid.is_empty());
        assert_eq!(meta.model_info.name, "whisper-large-v3");
        assert_eq!(meta.model_info.arch, "cactus");
        assert!(meta.extra.is_some());
    }

    #[test]
    fn format_timestamp_produces_iso8601() {
        let ts = format_timestamp_now();
        assert!(ts.ends_with('Z'));
        assert!(ts.contains('T'));
        assert_eq!(ts.len(), 24);
    }

    // cargo test -p transcribe-cactus e2e_streaming -- --ignored --nocapture
    #[ignore = "requires local cactus model files"]
    #[test]
    fn e2e_streaming() {
        let model_path = std::env::var("CACTUS_STT_MODEL")
            .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".to_string());
        let model_path = PathBuf::from(model_path);
        assert!(
            model_path.exists(),
            "model not found: {}",
            model_path.display()
        );

        let model = hypr_cactus::Model::new(&model_path).expect("failed to load model");
        let options = hypr_cactus::TranscribeOptions::default();
        let chunk_size_ms = 300u32;

        let (audio_tx, mut event_stream, _cancel) = hypr_cactus::transcribe_stream(
            Arc::new(model),
            options,
            chunk_size_ms,
            SAMPLE_RATE,
        );

        let samples = bytes_to_f32_samples(hypr_data::english_1::AUDIO);
        let chunk_size = 8_000;
        let total_chunks = (samples.len() + chunk_size - 1) / chunk_size;
        let audio_duration = samples.len() as f64 / 16_000.0;
        println!(
            "\n--- feeding ALL audio: {:.1}s ({} chunks of {:.1}s) ---",
            audio_duration,
            total_chunks,
            chunk_size as f64 / 16_000.0,
        );

        let t0 = std::time::Instant::now();

        let sender = std::thread::spawn(move || {
            for (i, chunk) in samples.chunks(chunk_size).enumerate() {
                audio_tx.blocking_send(chunk.to_vec()).expect("send failed");
                if i % 20 == 0 {
                    println!(
                        "[{:>6.1}s] sent chunk {}/{}",
                        t0.elapsed().as_secs_f64(),
                        i,
                        total_chunks
                    );
                }
            }
            println!(
                "[{:>6.1}s] all {} chunks sent",
                t0.elapsed().as_secs_f64(),
                total_chunks
            );
        });

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("failed to create tokio runtime");

        let t0 = std::time::Instant::now();
        let mut full_transcript = String::new();
        let mut event_count = 0u32;
        while let Some(event) = rt.block_on(event_stream.next()) {
            match event {
                Ok(hypr_cactus::TranscribeEvent { result: r, .. }) => {
                    let confirmed = r.confirmed.trim();
                    let pending = r.pending.trim();
                    if !confirmed.is_empty() || !pending.is_empty() {
                        println!(
                            "[{:>6.1}s] confirmed={:?}  pending={:?}",
                            t0.elapsed().as_secs_f64(),
                            confirmed,
                            pending,
                        );
                    }
                    if !confirmed.is_empty() {
                        if !full_transcript.is_empty() {
                            full_transcript.push(' ');
                        }
                        full_transcript.push_str(confirmed);
                    }
                    event_count += 1;
                }
                Err(e) => panic!("streaming error: {e}"),
            }
        }

        sender.join().expect("sender thread panicked");
        let elapsed = t0.elapsed().as_secs_f64();
        println!(
            "\n--- FULL TRANSCRIPT ({:.1}s audio, {:.1}s wall, {:.1}x realtime) ---",
            audio_duration,
            elapsed,
            elapsed / audio_duration
        );
        println!("{full_transcript}");
        println!("--- END ({event_count} events) ---\n");
        assert!(!full_transcript.is_empty(), "expected non-empty transcript");
    }

    // cargo test -p transcribe-cactus e2e_websocket -- --ignored --nocapture
    #[ignore = "requires local cactus model files"]
    #[test]
    fn e2e_websocket_listen_with_real_model_inference() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("failed to create tokio runtime");
        rt.block_on(async {
            let model_path = std::env::var("CACTUS_STT_MODEL")
                .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".to_string());
            let model_path = PathBuf::from(model_path);
            assert!(model_path.exists(), "model not found: {}", model_path.display());

            let service = HandleError::new(
                TranscribeService::builder().model_path(model_path).build(),
                |err: String| async move { (StatusCode::INTERNAL_SERVER_ERROR, err) },
            );
            let app = Router::new().route_service("/v1/listen", service);

            let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                .await
                .unwrap();
            let addr = listener.local_addr().unwrap();

            let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
            tokio::spawn(async move {
                let _ = axum::serve(listener, app)
                    .with_graceful_shutdown(async { let _ = shutdown_rx.await; })
                    .await;
            });

            let ws_url = format!(
                "ws://{}/v1/listen?channels=1&sample_rate=16000&chunk_size_ms=300",
                addr
            );
            let (ws_stream, _) = connect_async(&ws_url).await.expect("ws connect failed");
            let (mut ws_tx, mut ws_rx) = ws_stream.split();

            let t0 = std::time::Instant::now();
            let chunk_bytes = 32_000; // 1s of 16kHz i16 PCM per chunk
            let num_chunks = 5;
            println!(
                "\n--- ws: sending {} chunks of {}B ({:.1}s each) ---",
                num_chunks, chunk_bytes, chunk_bytes as f64 / 32_000.0,
            );

            let (close_tx, close_rx) = tokio::sync::oneshot::channel::<()>();
            let close_tx = std::cell::Cell::new(Some(close_tx));

            let writer = tokio::spawn(async move {
                for (i, chunk) in hypr_data::english_1::AUDIO
                    .chunks(chunk_bytes)
                    .take(num_chunks)
                    .enumerate()
                {
                    ws_tx
                        .send(WsMessage::Binary(chunk.to_vec().into()))
                        .await
                        .unwrap();
                    println!("[{:>5.1}s] ws sent chunk {}", t0.elapsed().as_secs_f64(), i);
                }

                let _ = close_rx.await;
                println!(
                    "[{:>5.1}s] ws sending CloseStream",
                    t0.elapsed().as_secs_f64()
                );
                let _ = ws_tx
                    .send(WsMessage::Text(
                        r#"{"type":"CloseStream"}"#.to_string().into(),
                    ))
                    .await;
            });

            let mut results_count = 0u32;
            let mut saw_terminal = false;
            let mut saw_error: Option<String> = None;
            let mut close_sent = false;

            while let Ok(Some(Ok(msg))) =
                tokio::time::timeout(Duration::from_secs(60), ws_rx.next()).await
            {
                match msg {
                    WsMessage::Text(text) => {
                        let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else {
                            continue;
                        };
                        let msg_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("?");
                        match msg_type {
                            "Results" => {
                                let transcript = v
                                    .pointer("/channel/alternatives/0/transcript")
                                    .and_then(|t| t.as_str())
                                    .unwrap_or("");
                                let is_final =
                                    v.get("is_final").and_then(|f| f.as_bool()).unwrap_or(false);
                                let speech_final = v
                                    .get("speech_final")
                                    .and_then(|f| f.as_bool())
                                    .unwrap_or(false);
                                println!(
                                    "[{:>5.1}s] ws recv Results  is_final={:<5} speech_final={:<5} {:?}",
                                    t0.elapsed().as_secs_f64(),
                                    is_final,
                                    speech_final,
                                    transcript,
                                );
                                results_count += 1;

                                if results_count >= 3 && !close_sent {
                                    close_sent = true;
                                    if let Some(tx) = close_tx.take() {
                                        let _ = tx.send(());
                                    }
                                }
                            }
                            "Metadata" => {
                                println!(
                                    "[{:>5.1}s] ws recv Metadata (terminal)",
                                    t0.elapsed().as_secs_f64()
                                );
                                saw_terminal = true;
                                break;
                            }
                            "SpeechStarted" => {
                                println!(
                                    "[{:>5.1}s] ws recv SpeechStarted",
                                    t0.elapsed().as_secs_f64()
                                );
                            }
                            "UtteranceEnd" => {
                                println!(
                                    "[{:>5.1}s] ws recv UtteranceEnd",
                                    t0.elapsed().as_secs_f64()
                                );
                            }
                            "Error" => {
                                saw_error = v
                                    .get("error_message")
                                    .and_then(|m| m.as_str())
                                    .map(str::to_owned);
                                println!(
                                    "[{:>5.1}s] ws recv Error: {:?}",
                                    t0.elapsed().as_secs_f64(),
                                    saw_error
                                );
                                break;
                            }
                            other => {
                                println!(
                                    "[{:>5.1}s] ws recv {other}",
                                    t0.elapsed().as_secs_f64()
                                );
                            }
                        }
                    }
                    WsMessage::Close(_) => break,
                    _ => {}
                }
            }

            let _ = writer.await;
            let _ = shutdown_tx.send(());
            println!(
                "[{:>5.1}s] done ({} Results, terminal={})\n",
                t0.elapsed().as_secs_f64(),
                results_count,
                saw_terminal,
            );

            assert!(saw_error.is_none(), "ws error: {:?}", saw_error);
            assert!(results_count > 0, "expected at least one Results message");
            assert!(saw_terminal, "expected terminal Metadata message");
        });
    }
}
