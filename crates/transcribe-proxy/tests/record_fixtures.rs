mod common;

use common::recording::{RecordingOptions, RecordingSession};
use common::*;

use futures_util::StreamExt;
use std::path::Path;
use std::time::Duration;

use owhisper_client::Provider;
use owhisper_client::{FinalizeHandle, ListenClient, RealtimeSttAdapter};
use owhisper_interface::stream::StreamResponse;

async fn record_live_fixture<A: RealtimeSttAdapter>(
    provider: Provider,
    audio_path: &str,
    languages: Vec<hypr_language::Language>,
    recording_opts: RecordingOptions,
    json_array_output: Option<&Path>,
) {
    let _ = tracing_subscriber::fmt::try_init();

    let sample_rate = provider.default_live_sample_rate();
    let api_key = std::env::var(provider.env_key_name())
        .unwrap_or_else(|_| panic!("{} must be set", provider.env_key_name()));
    let addr = start_server_with_provider(provider, api_key).await;

    let recording_session = if recording_opts.enabled {
        Some(RecordingSession::new(provider))
    } else {
        None
    };

    let client = ListenClient::builder()
        .adapter::<A>()
        .api_base(format!("http://{}", addr))
        .params(owhisper_interface::ListenParams {
            model: Some(provider.default_live_model().to_string()),
            languages,
            sample_rate,
            ..Default::default()
        })
        .build_single()
        .await;

    let provider_name = format!("record:{}", provider);
    let input = test_audio_stream_from_path(audio_path, sample_rate);
    let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
    futures_util::pin_mut!(stream);

    let mut responses: Vec<StreamResponse> = Vec::new();
    let mut saw_transcript = false;
    let timeout = Duration::from_secs(120);

    let test_future = async {
        while let Some(result) = stream.next().await {
            match result {
                Ok(response) => {
                    if let Some(ref session) = recording_session {
                        match serde_json::to_string(&response) {
                            Ok(json) => session.record_server_text(&json),
                            Err(e) => {
                                tracing::warn!("failed to serialize response for recording: {}", e)
                            }
                        }
                    }

                    if let StreamResponse::TranscriptResponse { channel, .. } = &response {
                        if let Some(alt) = channel.alternatives.first() {
                            if !alt.transcript.is_empty() {
                                println!("[{}] {}", provider_name, alt.transcript);
                                saw_transcript = true;
                            }
                        }
                    }

                    responses.push(response);
                }
                Err(e) => {
                    panic!("[{}] error: {:?}", provider_name, e);
                }
            }
        }
    };

    let _ = tokio::time::timeout(timeout, test_future).await;
    handle.finalize().await;

    if let Some(session) = recording_session {
        if let Some(ref output_dir) = recording_opts.output_dir {
            std::fs::create_dir_all(output_dir).expect("failed to create fixtures directory");
            session
                .save_to_file(output_dir, &recording_opts.suffix)
                .expect("failed to save recording");
            println!("[{}] Recording saved to {:?}", provider_name, output_dir);
        }
    }

    if let Some(output_path) = json_array_output {
        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent).expect("failed to create output directory");
        }
        let json = serde_json::to_string_pretty(&responses).expect("failed to serialize responses");
        std::fs::write(output_path, json).expect("failed to write fixture");
        println!("[{}] Fixture saved to {:?}", provider_name, output_path);
    }

    assert!(
        saw_transcript,
        "[{}] expected at least one non-empty transcript",
        provider_name
    );
}

macro_rules! record_fixture_test {
    ($name:ident, $adapter:ty, $provider:expr) => {
        record_fixture_test!(
            $name, $adapter, $provider,
            hypr_data::english_1::AUDIO_PATH,
            vec![hypr_language::ISO639::En.into()],
            @no_output
        );
    };
    ($name:ident, $adapter:ty, $provider:expr, $audio:expr, $langs:expr, $output:literal) => {
        #[ignore]
        #[tokio::test]
        async fn $name() {
            let output_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join($output);
            record_live_fixture::<$adapter>(
                $provider,
                $audio,
                $langs,
                RecordingOptions::from_env("normal"),
                Some(&output_path),
            )
            .await;
        }
    };
    ($name:ident, $adapter:ty, $provider:expr, $audio:expr, $langs:expr, @no_output) => {
        #[ignore]
        #[tokio::test]
        async fn $name() {
            record_live_fixture::<$adapter>(
                $provider,
                $audio,
                $langs,
                RecordingOptions::from_env("normal"),
                None,
            )
            .await;
        }
    };
}

mod record {
    use super::*;

    record_fixture_test!(
        deepgram,
        owhisper_client::DeepgramAdapter,
        Provider::Deepgram
    );
    record_fixture_test!(
        assemblyai,
        owhisper_client::AssemblyAIAdapter,
        Provider::AssemblyAI
    );
    record_fixture_test!(soniox, owhisper_client::SonioxAdapter, Provider::Soniox);
    record_fixture_test!(gladia, owhisper_client::GladiaAdapter, Provider::Gladia);
    record_fixture_test!(
        fireworks,
        owhisper_client::FireworksAdapter,
        Provider::Fireworks
    );
    record_fixture_test!(openai, owhisper_client::OpenAIAdapter, Provider::OpenAI);
    record_fixture_test!(
        elevenlabs,
        owhisper_client::ElevenLabsAdapter,
        Provider::ElevenLabs
    );

    record_fixture_test!(
        soniox_korean,
        owhisper_client::SonioxAdapter,
        Provider::Soniox,
        hypr_data::korean_1::AUDIO_PATH,
        vec![hypr_language::ISO639::Ko.into()],
        "../../crates/transcript/src/accumulator/fixtures/soniox_2.json"
    );
}
