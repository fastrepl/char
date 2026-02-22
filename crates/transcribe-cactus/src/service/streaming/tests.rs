use std::path::{Path, PathBuf};
use std::time::Duration;

use axum::extract::ws::Message;
use axum::{Router, error_handling::HandleError, http::StatusCode};
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

use hypr_audio_utils::bytes_to_f32_samples;
use owhisper_interface::ControlMessage;
use owhisper_interface::stream::StreamResponse;

use super::TranscribeService;
use super::message::{AudioExtract, IncomingMessage, process_incoming_message};
use super::response::{build_session_metadata, build_transcript_response, format_timestamp_now};
use super::session::SAMPLE_RATE;

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
fn binary_single_channel_yields_mono() {
    let samples: Vec<i16> = vec![1000, 2000, 3000];
    let data: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
    let msg = Message::Binary(data.into());
    match process_incoming_message(&msg, 1) {
        IncomingMessage::Audio(AudioExtract::Mono(s)) => assert!(!s.is_empty()),
        other => panic!(
            "expected Audio(Mono), got {:?}",
            std::mem::discriminant(&other)
        ),
    }
}

#[test]
fn binary_dual_channel_yields_dual() {
    // 2 interleaved i16 samples (4 bytes per frame: ch0, ch1)
    let samples: Vec<i16> = vec![1000, -1000, 2000, -2000];
    let data: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
    let msg = Message::Binary(data.into());
    match process_incoming_message(&msg, 2) {
        IncomingMessage::Audio(AudioExtract::Dual { ch0, ch1 }) => {
            assert_eq!(ch0.len(), 2);
            assert_eq!(ch1.len(), 2);
            assert!(ch0[0] > 0.0);
            assert!(ch1[0] < 0.0);
        }
        other => panic!(
            "expected Audio(Dual), got {:?}",
            std::mem::discriminant(&other)
        ),
    }
}

#[test]
fn dual_audio_json_yields_dual() {
    let chunk = owhisper_interface::ListenInputChunk::DualAudio {
        mic: vec![0x00, 0x10],
        speaker: vec![0x00, 0x20],
    };
    let json = serde_json::to_string(&chunk).unwrap();
    let msg = Message::Text(json.into());
    match process_incoming_message(&msg, 1) {
        IncomingMessage::Audio(AudioExtract::Dual { .. }) => {}
        other => panic!(
            "expected Audio(Dual), got {:?}",
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
        None,
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
        None,
    );

    let json = serde_json::to_string(&resp).unwrap();
    let v: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_eq!(v["from_finalize"], true);
    assert_eq!(v["channel_index"], serde_json::json!([0, 2]));
}

#[test]
fn transcript_response_channel_1_of_2() {
    let meta = build_session_metadata(Path::new("/models/test"));
    let resp = build_transcript_response(
        "speaker text",
        0.0,
        1.0,
        0.8,
        None,
        true,
        true,
        false,
        &meta,
        &[1, 2],
        None,
    );

    let json = serde_json::to_string(&resp).unwrap();
    let v: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert_eq!(v["channel_index"], serde_json::json!([1, 2]));
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

    let model = std::sync::Arc::new(hypr_cactus::Model::new(&model_path).unwrap());
    let options = hypr_cactus::TranscribeOptions::default();
    let chunk_size_ms = 300u32;

    let (audio_tx, mut event_stream, _cancel, _worker_handle) = hypr_cactus::transcribe_stream(
        model,
        options,
        hypr_cactus::CloudConfig::default(),
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

// cargo test -p transcribe-cactus e2e_streaming_dual_channel -- --ignored --nocapture
#[ignore = "requires local cactus model files"]
#[test]
fn e2e_streaming_dual_channel() {
    let model_path = std::env::var("CACTUS_STT_MODEL")
        .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".to_string());
    let model_path = PathBuf::from(model_path);
    assert!(
        model_path.exists(),
        "model not found: {}",
        model_path.display()
    );

    let model = std::sync::Arc::new(hypr_cactus::Model::new(&model_path).unwrap());
    let options = hypr_cactus::TranscribeOptions::default();
    let chunk_size_ms = 300u32;

    let (audio_tx_0, mut event_stream_0, _cancel_0, _handle_0) = hypr_cactus::transcribe_stream(
        model.clone(),
        options.clone(),
        hypr_cactus::CloudConfig::default(),
        chunk_size_ms,
        SAMPLE_RATE,
    );
    let (audio_tx_1, mut event_stream_1, _cancel_1, _handle_1) = hypr_cactus::transcribe_stream(
        model,
        options,
        hypr_cactus::CloudConfig::default(),
        chunk_size_ms,
        SAMPLE_RATE,
    );

    let samples_ch0 = bytes_to_f32_samples(hypr_data::english_1::AUDIO);
    let samples_ch1 = bytes_to_f32_samples(hypr_data::english_2::AUDIO);
    let chunk_size = 8_000;

    println!(
        "\n--- dual channel: ch0={:.1}s ch1={:.1}s ---",
        samples_ch0.len() as f64 / 16_000.0,
        samples_ch1.len() as f64 / 16_000.0,
    );

    let t0 = std::time::Instant::now();

    let sender = std::thread::spawn(move || {
        let max_chunks = samples_ch0
            .chunks(chunk_size)
            .count()
            .max(samples_ch1.chunks(chunk_size).count());
        let mut ch0_iter = samples_ch0.chunks(chunk_size);
        let mut ch1_iter = samples_ch1.chunks(chunk_size);

        for i in 0..max_chunks {
            if let Some(chunk) = ch0_iter.next() {
                audio_tx_0.blocking_send(chunk.to_vec()).expect("ch0 send");
            }
            if let Some(chunk) = ch1_iter.next() {
                audio_tx_1.blocking_send(chunk.to_vec()).expect("ch1 send");
            }
            if i % 20 == 0 {
                println!("[{:>6.1}s] sent chunk {}", t0.elapsed().as_secs_f64(), i,);
            }
        }
        println!("[{:>6.1}s] all chunks sent", t0.elapsed().as_secs_f64(),);
    });

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("failed to create tokio runtime");

    let t0 = std::time::Instant::now();
    let mut transcript_0 = String::new();
    let mut transcript_1 = String::new();
    let mut events_0 = 0u32;
    let mut events_1 = 0u32;

    loop {
        let event = rt.block_on(async {
            tokio::select! {
                e = event_stream_0.next() => e.map(|e| (0, e)),
                e = event_stream_1.next() => e.map(|e| (1, e)),
            }
        });

        let Some((ch, event)) = event else { break };
        match event {
            Ok(hypr_cactus::TranscribeEvent { result: r, .. }) => {
                let confirmed = r.confirmed.trim();
                let pending = r.pending.trim();
                if !confirmed.is_empty() || !pending.is_empty() {
                    println!(
                        "[{:>6.1}s] ch{ch} confirmed={:?} pending={:?}",
                        t0.elapsed().as_secs_f64(),
                        confirmed,
                        pending,
                    );
                }
                if !confirmed.is_empty() {
                    let transcript = if ch == 0 {
                        &mut transcript_0
                    } else {
                        &mut transcript_1
                    };
                    if !transcript.is_empty() {
                        transcript.push(' ');
                    }
                    transcript.push_str(confirmed);
                }
                if ch == 0 {
                    events_0 += 1;
                } else {
                    events_1 += 1;
                }
            }
            Err(e) => panic!("streaming error ch{ch}: {e}"),
        }
    }

    sender.join().expect("sender thread panicked");

    println!("\n--- DUAL CHANNEL RESULTS ---");
    println!("ch0 ({events_0} events): {transcript_0}");
    println!("ch1 ({events_1} events): {transcript_1}");
    println!("---\n");

    assert!(events_0 > 0, "expected events from channel 0");
    assert!(events_1 > 0, "expected events from channel 1");
}

// cargo test -p transcribe-cactus e2e_websocket_dual_channel -- --ignored --nocapture
#[ignore = "requires local cactus model files"]
#[test]
fn e2e_websocket_dual_channel() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .expect("failed to create tokio runtime");
    rt.block_on(async {
        let model_path = std::env::var("CACTUS_STT_MODEL")
            .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".to_string());
        let model_path = PathBuf::from(model_path);
        assert!(
            model_path.exists(),
            "model not found: {}",
            model_path.display()
        );

        let service = HandleError::new(
            TranscribeService::builder().model_path(model_path).build(),
            |err: String| async move { (StatusCode::INTERNAL_SERVER_ERROR, err) },
        );
        let app = Router::new().route_service("/v1/listen", service);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        tokio::spawn(async move {
            let _ = axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await;
        });

        let ws_url = format!(
            "ws://{}/v1/listen?channels=2&sample_rate=16000&chunk_size_ms=300",
            addr
        );
        let (ws_stream, _) = connect_async(&ws_url).await.expect("ws connect failed");
        let (mut ws_tx, mut ws_rx) = ws_stream.split();

        // Build interleaved stereo PCM: ch0=english_1, ch1=english_2
        let audio_ch0 = hypr_data::english_1::AUDIO;
        let audio_ch1 = hypr_data::english_2::AUDIO;
        let frames_ch0 = audio_ch0.len() / 2; // i16 = 2 bytes
        let frames_ch1 = audio_ch1.len() / 2;
        let num_frames = frames_ch0.min(frames_ch1);

        let mut interleaved = Vec::with_capacity(num_frames * 4);
        for i in 0..num_frames {
            // ch0 sample (i16 LE)
            interleaved.push(audio_ch0[i * 2]);
            interleaved.push(audio_ch0[i * 2 + 1]);
            // ch1 sample (i16 LE)
            interleaved.push(audio_ch1[i * 2]);
            interleaved.push(audio_ch1[i * 2 + 1]);
        }

        let t0 = std::time::Instant::now();
        let chunk_bytes = 64_000; // 1s of stereo 16kHz i16 PCM (4 bytes per frame)
        let num_chunks = 5;
        println!(
            "\n--- ws dual: sending {} chunks of {}B ({:.1}s each) ---",
            num_chunks,
            chunk_bytes,
            chunk_bytes as f64 / 64_000.0,
        );

        let (close_tx, close_rx) = tokio::sync::oneshot::channel::<()>();
        let close_tx = std::cell::Cell::new(Some(close_tx));

        let writer = tokio::spawn(async move {
            for (i, chunk) in interleaved.chunks(chunk_bytes).take(num_chunks).enumerate() {
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
        let mut channels_seen = std::collections::HashSet::new();

        while let Ok(Some(Ok(msg))) =
            tokio::time::timeout(Duration::from_secs(120), ws_rx.next()).await
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
                            let ch_idx = v
                                .pointer("/channel_index/0")
                                .and_then(|c| c.as_i64())
                                .unwrap_or(-1);
                            channels_seen.insert(ch_idx);
                            println!(
                                "[{:>5.1}s] ws recv Results ch={} {:?}",
                                t0.elapsed().as_secs_f64(),
                                ch_idx,
                                transcript,
                            );
                            results_count += 1;

                            if results_count >= 6 && !close_sent {
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
                            println!("[{:>5.1}s] ws recv {other}", t0.elapsed().as_secs_f64());
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
            "[{:>5.1}s] done ({} Results, terminal={}, channels_seen={:?})\n",
            t0.elapsed().as_secs_f64(),
            results_count,
            saw_terminal,
            channels_seen,
        );

        assert!(saw_error.is_none(), "ws error: {:?}", saw_error);
        assert!(results_count > 0, "expected at least one Results message");
        assert!(saw_terminal, "expected terminal Metadata message");
        assert!(
            channels_seen.contains(&0) && channels_seen.contains(&1),
            "expected results from both channels, got {:?}",
            channels_seen,
        );
    });
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
        assert!(
            model_path.exists(),
            "model not found: {}",
            model_path.display()
        );

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
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
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
            num_chunks,
            chunk_bytes,
            chunk_bytes as f64 / 32_000.0,
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
