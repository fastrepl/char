mod common;

use axum::error_handling::HandleError;
use axum::{Router, http::StatusCode};

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

        let wav_bytes = std::fs::read(hypr_data::english_1::AUDIO_PATH)
            .unwrap_or_else(|e| panic!("failed to read fixture wav: {e}"));

        let url = format!("http://{}/v1/listen?channels=1&sample_rate=16000", addr);
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

        assert!(
            !transcript.trim().is_empty(),
            "expected non-empty transcript"
        );
        assert!(
            v["metadata"]["duration"].as_f64().unwrap_or_default() > 0.0,
            "expected positive duration in metadata"
        );
        assert_eq!(v["metadata"]["channels"], 1);

        let _ = shutdown_tx.send(());
    });
}
