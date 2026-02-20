mod error;
mod service;

pub use error::*;
pub use service::*;

#[cfg(test)]
// cargo test -p transcribe-whisper-local test_service -- --nocapture
mod tests {
    use super::*;
    use axum::{error_handling::HandleError, http::StatusCode};
    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;

    #[tokio::test]
    async fn test_service() -> Result<(), Box<dyn std::error::Error>> {
        let model_path = dirs::data_dir()
            .unwrap()
            .join("char")
            .join("models/stt/ggml-small-q8_0.bin");

        let service = HandleError::new(
            TranscribeService::builder().model_path(model_path).build(),
            move |err: String| async move { (StatusCode::INTERNAL_SERVER_ERROR, err) },
        );

        let app = axum::Router::new().route_service("/v1/listen", service);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;

        let server = axum::serve(listener, app);
        let server_handle = tokio::spawn(async move {
            if let Err(e) = server.await {
                println!("Server error: {}", e);
            }
        });

        let client = owhisper_client::ListenClient::builder()
            .api_base(format!("http://{}/v1", addr))
            .build_single()
            .await;

        let audio = rodio::Decoder::try_from(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        )
        .unwrap()
        .to_i16_le_chunks(16000, 512);
        let input = audio.map(|chunk| owhisper_interface::MixedMessage::Audio(chunk));

        let _ = client.from_realtime_audio(input).await.unwrap();

        server_handle.abort();
        Ok(())
    }
}
