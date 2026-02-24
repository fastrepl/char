mod common;

use axum::error_handling::HandleError;
use axum::{Router, http::StatusCode};

fn audio_wav_bytes() -> Vec<u8> {
    let max_secs = std::env::var("E2E_AUDIO_SECS")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(usize::MAX);
    let full = hypr_data::english_1::AUDIO;
    let pcm = &full[..full.len().min(max_secs.saturating_mul(16000 * 2))];
    let data_len = pcm.len() as u32;
    let mut w = Vec::with_capacity(44 + pcm.len());
    w.extend_from_slice(b"RIFF");
    w.extend_from_slice(&(36 + data_len).to_le_bytes());
    w.extend_from_slice(b"WAVE");
    w.extend_from_slice(b"fmt ");
    w.extend_from_slice(&16u32.to_le_bytes());
    w.extend_from_slice(&1u16.to_le_bytes());
    w.extend_from_slice(&1u16.to_le_bytes());
    w.extend_from_slice(&16000u32.to_le_bytes());
    w.extend_from_slice(&32000u32.to_le_bytes());
    w.extend_from_slice(&2u16.to_le_bytes());
    w.extend_from_slice(&16u16.to_le_bytes());
    w.extend_from_slice(b"data");
    w.extend_from_slice(&data_len.to_le_bytes());
    w.extend_from_slice(pcm);
    w
}

use transcribe_cactus::TranscribeService;

use common::model_path;

#[ignore = "requires local cactus model files"]
#[test]
fn e2e_batch() {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    rt.block_on(async {
        let app = Router::new().route_service(
            "/v1/listen",
            HandleError::new(
                TranscribeService::builder()
                    .model_path(model_path())
                    .build(),
                |err: String| async move { (StatusCode::INTERNAL_SERVER_ERROR, err) },
            ),
        );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .unwrap();
        });

        let wav_bytes = audio_wav_bytes();

        let url = format!(
            "http://{}/v1/listen?channels=1&sample_rate=16000&language=en",
            addr
        );
        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .header("content-type", "audio/wav")
            .body(wav_bytes)
            .send()
            .await
            .expect("request failed");

        assert_eq!(response.status(), 200);
        let v: serde_json::Value = response.json().await.expect("response is not JSON");

        let transcript = v
            .pointer("/results/channels/0/alternatives/0/transcript")
            .and_then(|t| t.as_str())
            .unwrap_or("");

        let transcript_lower = transcript.trim().to_lowercase();
        assert!(
            !transcript_lower.is_empty(),
            "expected non-empty transcript"
        );
        assert!(
            transcript_lower.contains("maybe")
                || transcript_lower.contains("this")
                || transcript_lower.contains("talking"),
            "transcript looks like a hallucination (got: {:?})",
            transcript_lower
        );
        assert!(
            v["metadata"]["duration"].as_f64().unwrap_or_default() > 0.0,
            "expected positive duration in metadata"
        );
        assert_eq!(v["metadata"]["channels"], 1);

        let _ = shutdown_tx.send(());
    });
}
