use std::time::Duration;

use futures_util::{Stream, StreamExt};
use hypr_audio_utils::AudioFormatExt;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};

pub enum Source {
    Fixture {
        responses: Vec<StreamResponse>,
    },
    Cactus {
        rx: std::sync::mpsc::Receiver<StreamResponse>,
        collected: Vec<StreamResponse>,
    },
}

impl Source {
    pub fn from_fixture(json: &str) -> Self {
        let responses: Vec<StreamResponse> =
            serde_json::from_str(json).expect("fixture must parse as StreamResponse[]");
        Self::Fixture { responses }
    }

    pub fn from_cactus_file(api_base: &str, audio_path: &str, api_key: Option<String>) -> Self {
        let audio_path = audio_path.to_string();
        let make_stream = move || {
            let source =
                hypr_audio_utils::source_from_path(&audio_path).expect("failed to open audio file");
            throttled_audio_stream(source)
        };

        Self::Cactus {
            rx: spawn_cactus_session(api_base.to_string(), api_key, make_stream),
            collected: Vec::new(),
        }
    }

    pub fn from_cactus_mic(api_base: &str, api_key: Option<String>) -> (Self, String) {
        use hypr_audio::MicInput;

        let mic = MicInput::new(None).expect("failed to open microphone");
        let device_name = mic.device_name();
        let make_stream = move || throttled_audio_stream(mic.stream());

        let source = Self::Cactus {
            rx: spawn_cactus_session(api_base.to_string(), api_key, make_stream),
            collected: Vec::new(),
        };
        (source, device_name)
    }

    pub fn total(&self) -> usize {
        match self {
            Self::Fixture { responses } => responses.len(),
            Self::Cactus { collected, .. } => collected.len(),
        }
    }

    pub fn get(&self, index: usize) -> Option<&StreamResponse> {
        match self {
            Self::Fixture { responses } => responses.get(index),
            Self::Cactus { collected, .. } => collected.get(index),
        }
    }

    pub fn poll_next(&mut self) -> Option<&StreamResponse> {
        match self {
            Self::Fixture { .. } => None,
            Self::Cactus { rx, collected } => {
                if let Ok(sr) = rx.try_recv() {
                    collected.push(sr);
                    collected.last()
                } else {
                    None
                }
            }
        }
    }

    pub fn is_live(&self) -> bool {
        matches!(self, Self::Cactus { .. })
    }
}

fn throttled_audio_stream<S>(
    source: S,
) -> impl Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static
where
    S: AudioFormatExt + Send + Unpin + 'static,
{
    let chunks = source.to_i16_le_chunks(16000, 1600);
    Box::pin(tokio_stream::StreamExt::throttle(
        chunks.map(MixedMessage::Audio),
        Duration::from_millis(100),
    ))
}

fn spawn_cactus_session<F, S>(
    api_base: String,
    api_key: Option<String>,
    make_stream: F,
) -> std::sync::mpsc::Receiver<StreamResponse>
where
    F: FnOnce() -> S + Send + 'static,
    S: Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static,
{
    use owhisper_client::{CactusAdapter, FinalizeHandle, ListenClient};

    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("tokio runtime");

        rt.block_on(async {
            let mut builder = ListenClient::builder()
                .adapter::<CactusAdapter>()
                .api_base(&api_base)
                .params(owhisper_interface::ListenParams::default());
            if let Some(key) = api_key {
                builder = builder.api_key(key);
            }
            let client = builder.build_single().await;

            let audio_stream = make_stream();

            let (response_stream, handle) = client
                .from_realtime_audio(audio_stream)
                .await
                .expect("failed to connect to cactus");

            futures_util::pin_mut!(response_stream);

            while let Some(result) = response_stream.next().await {
                match result {
                    Ok(sr) => {
                        if tx.send(sr).is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("cactus stream error: {e}");
                        break;
                    }
                }
            }

            handle.finalize().await;
        });
    });

    rx
}
