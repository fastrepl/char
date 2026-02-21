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

    pub fn from_cactus(url: &str) -> Self {
        let (tx, rx) = std::sync::mpsc::channel();
        let url = url.to_string();

        std::thread::spawn(move || {
            let rt = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("tokio runtime");

            rt.block_on(async {
                use tokio_tungstenite::tungstenite::Message;

                let (ws, _) = tokio_tungstenite::connect_async(&url)
                    .await
                    .expect("ws connect failed");

                let (mut _ws_tx, mut ws_rx) = futures_util::StreamExt::split(ws);

                while let Some(Ok(msg)) = futures_util::StreamExt::next(&mut ws_rx).await {
                    if let Message::Text(text) = msg {
                        if let Ok(sr) = serde_json::from_str::<StreamResponse>(&text) {
                            if tx.send(sr).is_err() {
                                break;
                            }
                        }
                    }
                }
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
