use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};
#[cfg(target_os = "macos")]
use std::time::Duration;

use axum::{
    extract::{
        FromRequestParts,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use futures_util::{SinkExt, StreamExt};
use tower::Service;

#[cfg(not(target_os = "macos"))]
use owhisper_interface::stream::StreamResponse;
#[cfg(target_os = "macos")]
use owhisper_interface::stream::{Alternatives, Channel, Metadata, StreamResponse, Word};
use owhisper_interface::ListenParams;

#[derive(Clone)]
pub struct TranscribeService {
    locale: String,
}

impl TranscribeService {
    pub fn builder() -> TranscribeServiceBuilder {
        TranscribeServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct TranscribeServiceBuilder {
    locale: Option<String>,
}

impl TranscribeServiceBuilder {
    pub fn locale(mut self, locale: String) -> Self {
        self.locale = Some(locale);
        self
    }

    pub fn build(self) -> TranscribeService {
        TranscribeService {
            locale: self.locale.unwrap_or_else(|| "en-US".to_string()),
        }
    }
}

impl<B> Service<Request<B>> for TranscribeService
where
    B: Send + 'static,
{
    type Response = Response;
    type Error = String;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<B>) -> Self::Future {
        let locale = self.locale.clone();

        Box::pin(async move {
            let uri = req.uri();
            let query_string = uri.query().unwrap_or("");

            let params: ListenParams = match serde_qs::from_str(query_string) {
                Ok(p) => p,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let (mut parts, _body) = req.into_parts();
            let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(ws) => ws,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            Ok(ws_upgrade
                .on_upgrade(move |socket| async move {
                    handle_websocket_connection(socket, params, locale).await;
                })
                .into_response())
        })
    }
}

#[cfg(target_os = "macos")]
async fn handle_websocket_connection(socket: WebSocket, params: ListenParams, locale: String) {
    let sample_rate = params.sample_rate as f64;

    let effective_locale = params
        .languages
        .first()
        .map(|lang| lang.bcp47_code())
        .unwrap_or(locale);

    let (ws_sender, ws_receiver) = socket.split();

    match params.channels {
        1 => {
            handle_single_channel(ws_sender, ws_receiver, &effective_locale, sample_rate).await;
        }
        _ => {
            handle_dual_channel(ws_sender, ws_receiver, &effective_locale, sample_rate).await;
        }
    }
}

#[cfg(not(target_os = "macos"))]
async fn handle_websocket_connection(socket: WebSocket, _params: ListenParams, _locale: String) {
    let (mut ws_sender, _ws_receiver) = socket.split();
    let response = StreamResponse::ErrorResponse {
        error_code: None,
        error_message: "Apple Speech Recognition is only available on macOS".to_string(),
        provider: "apple".to_string(),
    };
    let msg = Message::Text(serde_json::to_string(&response).unwrap().into());
    let _ = ws_sender.send(msg).await;
    let _ = ws_sender.close().await;
}

#[cfg(target_os = "macos")]
async fn handle_single_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    locale: &str,
    sample_rate: f64,
) {
    let session_id = crate::bridge::create_session(locale, sample_rate);
    let audio_source = hypr_ws_utils::WebSocketAudioSource::new(ws_receiver, sample_rate as u32);

    process_audio_stream(ws_sender, audio_source, session_id, None).await;
}

#[cfg(target_os = "macos")]
async fn handle_dual_channel(
    ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    ws_receiver: futures_util::stream::SplitStream<WebSocket>,
    locale: &str,
    sample_rate: f64,
) {
    let (mic_source, _speaker_source) =
        hypr_ws_utils::split_dual_audio_sources(ws_receiver, sample_rate as u32);

    let session_id = crate::bridge::create_session(locale, sample_rate);

    process_audio_stream(ws_sender, mic_source, session_id, Some(0)).await;
}

#[cfg(target_os = "macos")]
async fn process_audio_stream<S>(
    mut ws_sender: futures_util::stream::SplitSink<WebSocket, Message>,
    mut audio_source: S,
    session_id: u64,
    speaker: Option<i32>,
) where
    S: futures_util::Stream<Item = f32> + Unpin,
{
    let poll_interval = Duration::from_millis(100);
    let mut global_time: f64 = 0.0;
    let mut sample_buffer: Vec<f32> = Vec::with_capacity(4096);

    loop {
        tokio::select! {
            chunk_opt = audio_source.next() => {
                match chunk_opt {
                    Some(sample) => {
                        sample_buffer.push(sample);
                        if sample_buffer.len() >= 1600 {
                            crate::bridge::append_audio(session_id, &sample_buffer);
                            sample_buffer.clear();
                        }
                    }
                    None => {
                        if !sample_buffer.is_empty() {
                            crate::bridge::append_audio(session_id, &sample_buffer);
                            sample_buffer.clear();
                        }
                        crate::bridge::end_audio(session_id);
                        break;
                    }
                }
            }
            _ = tokio::time::sleep(poll_interval) => {
                if !sample_buffer.is_empty() {
                    crate::bridge::append_audio(session_id, &sample_buffer);
                    sample_buffer.clear();
                }
            }
        }

        while let Some(result_json) = crate::bridge::poll_result(session_id) {
            if let Some(response) = parse_result_to_stream_response(&result_json, &mut global_time, speaker) {
                let msg = Message::Text(serde_json::to_string(&response).unwrap().into());
                if let Err(e) = ws_sender.send(msg).await {
                    tracing::warn!("websocket_send_error: {}", e);
                    crate::bridge::destroy_session(session_id);
                    return;
                }
            }
        }

        if crate::bridge::is_finished(session_id) {
            break;
        }
    }

    for _ in 0..50 {
        if crate::bridge::is_finished(session_id) {
            while let Some(result_json) = crate::bridge::poll_result(session_id) {
                if let Some(response) = parse_result_to_stream_response(&result_json, &mut global_time, speaker) {
                    let msg = Message::Text(serde_json::to_string(&response).unwrap().into());
                    let _ = ws_sender.send(msg).await;
                }
            }
            break;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    if let Some(error) = crate::bridge::get_error(session_id) {
        tracing::error!("apple_stt_error: {}", error);
    }

    crate::bridge::destroy_session(session_id);
    let _ = ws_sender.close().await;
}

#[cfg(target_os = "macos")]
#[derive(serde::Deserialize)]
struct BridgeResult {
    text: String,
    is_final: bool,
    words: Vec<BridgeWord>,
}

#[cfg(target_os = "macos")]
#[derive(serde::Deserialize)]
struct BridgeWord {
    word: String,
    start: f64,
    end: f64,
    confidence: f32,
}

#[cfg(target_os = "macos")]
fn parse_result_to_stream_response(
    json: &str,
    global_time: &mut f64,
    speaker: Option<i32>,
) -> Option<StreamResponse> {
    let result: BridgeResult = serde_json::from_str(json).ok()?;

    if result.text.trim().is_empty() {
        return None;
    }

    let words: Vec<Word> = result
        .words
        .iter()
        .map(|w| Word {
            word: w.word.clone(),
            start: w.start,
            end: w.end,
            confidence: w.confidence as f64,
            speaker,
            punctuated_word: Some(w.word.clone()),
            language: None,
        })
        .collect();

    let duration = result.words.last().map(|w| w.end).unwrap_or(0.0);

    let start = *global_time;
    *global_time = duration;

    let channel_index = match speaker {
        Some(s) => vec![s, 2],
        None => vec![0, 1],
    };

    Some(StreamResponse::TranscriptResponse {
        start,
        duration: duration - start,
        is_final: result.is_final,
        speech_final: result.is_final,
        from_finalize: false,
        channel: Channel {
            alternatives: vec![Alternatives {
                transcript: result.text,
                languages: vec![],
                words,
                confidence: result
                    .words
                    .first()
                    .map(|w| w.confidence as f64)
                    .unwrap_or(1.0),
            }],
        },
        metadata: Metadata::default(),
        channel_index,
    })
}
