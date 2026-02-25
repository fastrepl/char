use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use owhisper_interface::stream::{Metadata, StreamResponse};
use owhisper_interface::{ControlMessage, ListenParams};

use hypr_ws_utils::ConnectionGuard;

use super::message::{AudioExtract, IncomingMessage, process_incoming_message};
use super::response::{
    WsSender, build_session_metadata, build_transcript_response, format_timestamp_now, send_ws,
    send_ws_best_effort,
};

use crate::bridge::SpeechAnalyzerSession;

const POLL_INTERVAL_MS: u64 = 100;

#[derive(Default)]
struct ChannelState {
    last_confirmed_sent: String,
    last_pending_sent: String,
    audio_offset: f64,
    segment_start: f64,
    speech_started: bool,
}

enum LoopAction {
    Continue,
    Break,
}

pub(super) async fn handle_websocket(
    socket: WebSocket,
    params: ListenParams,
    guard: ConnectionGuard,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    let metadata = build_session_metadata();
    let total_channels = (params.channels as i32).max(1) as usize;

    // Determine locale from params
    let locale = params
        .languages
        .first()
        .map(|l| l.to_string())
        .unwrap_or_else(|| "en-US".to_string());

    let sample_rate = params.sample_rate;

    // For SpeechAnalyzer, we only support single-channel (mono) input.
    // If dual-channel, we mix down to mono.
    let session = match SpeechAnalyzerSession::new(&locale, sample_rate) {
        Some(s) => s,
        None => {
            tracing::error!(locale, "failed to create SpeechAnalyzer session");
            send_ws_best_effort(
                &mut ws_sender,
                &StreamResponse::ErrorResponse {
                    error_code: None,
                    error_message: "Failed to create SpeechAnalyzer session. macOS 26+ required."
                        .to_string(),
                    provider: "apple-speech-analyzer".to_string(),
                },
            )
            .await;
            let _ = ws_sender.close().await;
            return;
        }
    };

    let mut channel_states: Vec<ChannelState> = (0..total_channels)
        .map(|_| ChannelState::default())
        .collect();

    let mut poll_interval =
        tokio::time::interval(std::time::Duration::from_millis(POLL_INTERVAL_MS));
    poll_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        let action = tokio::select! {
            _ = guard.cancelled() => {
                tracing::info!("speech_analyzer_websocket_cancelled_by_new_connection");
                LoopAction::Break
            }
            _ = poll_interval.tick() => {
                handle_poll_results(
                    &mut ws_sender, &session, &mut channel_states, total_channels, &metadata,
                ).await
            }
            msg = ws_receiver.next() => {
                handle_ws_message(
                    &mut ws_sender,
                    msg,
                    params.channels,
                    sample_rate,
                    &session,
                    &mut channel_states,
                    total_channels,
                    &metadata,
                )
                .await
            }
        };
        if matches!(action, LoopAction::Break) {
            break;
        }
    }

    // Signal the session to finalize
    session.finish();

    // Wait a bit for final results to arrive
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Drain any remaining results
    let _ = handle_poll_results(
        &mut ws_sender,
        &session,
        &mut channel_states,
        total_channels,
        &metadata,
    )
    .await;

    let total_audio_offset = channel_states.first().map_or(0.0, |s| s.audio_offset);

    send_ws_best_effort(
        &mut ws_sender,
        &StreamResponse::TerminalResponse {
            request_id: metadata.request_id.clone(),
            created: format_timestamp_now(),
            duration: total_audio_offset,
            channels: total_channels as u32,
        },
    )
    .await;

    let _ = ws_sender.close().await;
}

async fn handle_poll_results(
    ws_sender: &mut WsSender,
    session: &SpeechAnalyzerSession,
    channel_states: &mut [ChannelState],
    total_channels: usize,
    metadata: &Metadata,
) -> LoopAction {
    let results = session.get_results();
    if results.is_empty() {
        return LoopAction::Continue;
    }

    // All results go to channel 0 since SpeechAnalyzer is mono
    let ch_idx = 0;
    let channel_index = vec![ch_idx as i32, total_channels as i32];
    let channel_u8 = vec![ch_idx as u8];
    let state = &mut channel_states[ch_idx];

    for result in results {
        let text = result.text.trim();
        if text.is_empty() {
            continue;
        }

        let start = result.start_time;
        let duration = result.duration.max(0.01);
        let confidence = 0.95; // SpeechAnalyzer doesn't expose per-result confidence
        let language = result.language.as_deref();

        if result.is_final {
            if text == state.last_confirmed_sent {
                continue;
            }

            if !state.speech_started {
                if !send_ws(
                    ws_sender,
                    &StreamResponse::SpeechStartedResponse {
                        channel: channel_u8.clone(),
                        timestamp: start,
                    },
                )
                .await
                {
                    return LoopAction::Break;
                }
            }

            tracing::info!(text, "speech_analyzer_confirmed_text");
            if !send_ws(
                ws_sender,
                &build_transcript_response(
                    text,
                    start,
                    duration,
                    confidence,
                    language,
                    true,
                    true,
                    false,
                    metadata,
                    &channel_index,
                ),
            )
            .await
            {
                return LoopAction::Break;
            }
            if !send_ws(
                ws_sender,
                &StreamResponse::UtteranceEndResponse {
                    channel: channel_u8.clone(),
                    last_word_end: start + duration,
                },
            )
            .await
            {
                return LoopAction::Break;
            }

            state.last_confirmed_sent.clear();
            state.last_confirmed_sent.push_str(text);
            state.last_pending_sent.clear();
            state.segment_start = start + duration;
            state.speech_started = false;
        } else {
            // Volatile / pending result
            if text == state.last_pending_sent || text == state.last_confirmed_sent {
                continue;
            }

            if !state.speech_started {
                state.speech_started = true;
                if !send_ws(
                    ws_sender,
                    &StreamResponse::SpeechStartedResponse {
                        channel: channel_u8.clone(),
                        timestamp: start,
                    },
                )
                .await
                {
                    return LoopAction::Break;
                }
            }

            if !send_ws(
                ws_sender,
                &build_transcript_response(
                    text,
                    start,
                    duration,
                    confidence,
                    language,
                    false,
                    false,
                    false,
                    metadata,
                    &channel_index,
                ),
            )
            .await
            {
                return LoopAction::Break;
            }
            state.last_pending_sent.clear();
            state.last_pending_sent.push_str(text);
        }
    }

    LoopAction::Continue
}

async fn handle_ws_message(
    ws_sender: &mut WsSender,
    msg: Option<Result<Message, axum::Error>>,
    channels: u8,
    sample_rate: u32,
    session: &SpeechAnalyzerSession,
    channel_states: &mut [ChannelState],
    total_channels: usize,
    metadata: &Metadata,
) -> LoopAction {
    let Some(msg) = msg else {
        tracing::info!("websocket_stream_ended");
        return LoopAction::Break;
    };
    let msg = match msg {
        Ok(msg) => msg,
        Err(e) => {
            tracing::warn!("websocket_receive_error: {}", e);
            return LoopAction::Break;
        }
    };

    match process_incoming_message(&msg, channels) {
        IncomingMessage::Audio(AudioExtract::Mono(samples)) if !samples.is_empty() => {
            let state = &mut channel_states[0];
            state.audio_offset += samples.len() as f64 / sample_rate as f64;
            session.feed_audio(&samples);
        }
        IncomingMessage::Audio(AudioExtract::Dual { ch0, ch1 }) => {
            // Mix down to mono for SpeechAnalyzer
            let mixed = hypr_audio_utils::mix_audio_f32(&ch0, &ch1);
            if !mixed.is_empty() {
                let state = &mut channel_states[0];
                state.audio_offset += mixed.len() as f64 / sample_rate as f64;
                session.feed_audio(&mixed);
            }
        }
        IncomingMessage::Audio(AudioExtract::End) => return LoopAction::Break,
        IncomingMessage::Control(ControlMessage::KeepAlive) => {}
        IncomingMessage::Control(ControlMessage::Finalize) => {
            if handle_finalize(ws_sender, session, channel_states, total_channels, metadata).await {
                return LoopAction::Break;
            }
        }
        IncomingMessage::Control(ControlMessage::CloseStream) => return LoopAction::Break,
        _ => {}
    }

    LoopAction::Continue
}

async fn handle_finalize(
    ws_sender: &mut WsSender,
    session: &SpeechAnalyzerSession,
    channel_states: &mut [ChannelState],
    total_channels: usize,
    metadata: &Metadata,
) -> bool {
    // Drain any pending results and emit them as final
    let results = session.get_results();

    for ch_idx in 0..total_channels {
        let state = &channel_states[ch_idx];
        let pending_text = state.last_pending_sent.trim().to_string();

        if pending_text.is_empty() {
            continue;
        }

        let channel_index = vec![ch_idx as i32, total_channels as i32];
        let channel_u8 = vec![ch_idx as u8];
        let segment_start = state.segment_start;
        let audio_offset = state.audio_offset;
        let duration = audio_offset - segment_start;

        if !send_ws(
            ws_sender,
            &build_transcript_response(
                &pending_text,
                segment_start,
                duration,
                0.95,
                None,
                true,
                true,
                true,
                metadata,
                &channel_index,
            ),
        )
        .await
        {
            return true;
        }
        if !send_ws(
            ws_sender,
            &StreamResponse::UtteranceEndResponse {
                channel: channel_u8,
                last_word_end: segment_start + duration,
            },
        )
        .await
        {
            return true;
        }
    }

    // Also process any results that came through
    if !results.is_empty() {
        let ch_idx = 0;
        let channel_index = vec![ch_idx as i32, total_channels as i32];
        let channel_u8 = vec![ch_idx as u8];

        for result in results {
            let text = result.text.trim();
            if text.is_empty() {
                continue;
            }
            if !send_ws(
                ws_sender,
                &build_transcript_response(
                    text,
                    result.start_time,
                    result.duration.max(0.01),
                    0.95,
                    result.language.as_deref(),
                    true,
                    true,
                    true,
                    metadata,
                    &channel_index,
                ),
            )
            .await
            {
                return true;
            }
            if !send_ws(
                ws_sender,
                &StreamResponse::UtteranceEndResponse {
                    channel: channel_u8.clone(),
                    last_word_end: result.start_time + result.duration,
                },
            )
            .await
            {
                return true;
            }
        }
    }

    for state in channel_states.iter_mut() {
        state.segment_start = state.audio_offset;
        state.speech_started = false;
        state.last_confirmed_sent.clear();
        state.last_pending_sent.clear();
    }

    false
}
