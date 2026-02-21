use owhisper_interface::stream::StreamResponse;

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

    pub fn from_cactus(api_base: &str, audio_path: &str) -> Self {
        use std::time::Duration;

        use futures_util::StreamExt;
        use hypr_audio_utils::AudioFormatExt;
        use owhisper_client::{CactusAdapter, FinalizeHandle, ListenClient};
        use owhisper_interface::MixedMessage;

        let (tx, rx) = std::sync::mpsc::channel();
        let api_base = api_base.to_string();
        let audio_path = audio_path.to_string();

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("tokio runtime");

            rt.block_on(async {
                let client = ListenClient::builder()
                    .adapter::<CactusAdapter>()
                    .api_base(&api_base)
                    .params(owhisper_interface::ListenParams::default())
                    .build_single()
                    .await;

                let audio = rodio::Decoder::new(std::io::BufReader::new(
                    std::fs::File::open(&audio_path).expect("audio file not found"),
                ))
                .expect("failed to decode audio");

                let audio_stream = audio.to_i16_le_chunks(16000, 1600);
                let throttled = tokio_stream::StreamExt::throttle(
                    audio_stream.map(|chunk| MixedMessage::Audio(chunk)),
                    Duration::from_millis(100),
                );

                let (response_stream, handle) = client
                    .from_realtime_audio(Box::pin(throttled))
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

        Self::Cactus {
            rx,
            collected: Vec::new(),
        }
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
