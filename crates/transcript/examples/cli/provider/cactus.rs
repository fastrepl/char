use std::collections::HashMap;

use futures_util::{Stream, StreamExt};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};
use ratatui::style::Style;

use crate::feed::{LiveCollector, TranscriptFeed};
use crate::renderer::debug::DebugSection;
use crate::theme::THEME;

#[derive(Clone, Default)]
struct CactusMetrics {
    decode_tps: f64,
    prefill_tps: f64,
    time_to_first_token_ms: f64,
    total_time_ms: f64,
}

impl CactusMetrics {
    fn from_stream_response(sr: &StreamResponse) -> Option<Self> {
        let extra = match sr {
            StreamResponse::TranscriptResponse { metadata, .. } => metadata.extra.as_ref()?,
            _ => return None,
        };
        let f = |key: &str| -> f64 { extra.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0) };
        Some(Self {
            decode_tps: f("decode_tps"),
            prefill_tps: f("prefill_tps"),
            time_to_first_token_ms: f("time_to_first_token_ms"),
            total_time_ms: f("total_time_ms"),
        })
    }
}

struct PendingHandoff {
    channel: i32,
    start_ms: i64,
    end_ms: i64,
}

pub struct CactusProvider {
    collector: LiveCollector,
    metrics: Option<CactusMetrics>,
    pending_handoffs: HashMap<u64, PendingHandoff>,
}

impl CactusProvider {
    pub fn spawn<F, S>(model: &str, make_stream: F) -> Self
    where
        F: FnOnce() -> S + Send + 'static,
        S: Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static,
    {
        let api_base = spawn_local_stt_server(model);
        Self {
            collector: LiveCollector::new(spawn_cactus_session(api_base, make_stream)),
            metrics: None,
            pending_handoffs: HashMap::new(),
        }
    }
}

impl TranscriptFeed for CactusProvider {
    fn total(&self) -> usize {
        self.collector.total()
    }

    fn get(&self, index: usize) -> Option<&StreamResponse> {
        self.collector.get(index)
    }

    fn poll_next(&mut self) -> Option<&StreamResponse> {
        let sr = self.collector.try_recv()?;
        if let Some(m) = CactusMetrics::from_stream_response(&sr) {
            self.metrics = Some(m);
        }
        update_pending_handoffs(&sr, &mut self.pending_handoffs);
        self.collector.push(sr);
        self.collector.last()
    }

    fn is_live(&self) -> bool {
        true
    }

    fn word_style(&self, channel: i32, start_ms: i64, end_ms: i64) -> Option<Style> {
        let overlaps = self
            .pending_handoffs
            .values()
            .any(|h| h.channel == channel && h.start_ms < end_ms && h.end_ms > start_ms);
        overlaps.then_some(THEME.transcript_pending_correction)
    }

    fn debug_sections(&self) -> Vec<DebugSection> {
        let Some(m) = &self.metrics else {
            return vec![];
        };
        vec![DebugSection {
            title: "cactus",
            entries: vec![
                ("decode", format!("{:.0} tok/s", m.decode_tps)),
                ("prefill", format!("{:.0} tok/s", m.prefill_tps)),
                ("ttft", format!("{:.0}ms", m.time_to_first_token_ms)),
                ("total", format!("{:.0}ms", m.total_time_ms)),
            ],
        }]
    }
}

fn update_pending_handoffs(sr: &StreamResponse, pending: &mut HashMap<u64, PendingHandoff>) {
    let (channel, channel_index, metadata) = match sr {
        StreamResponse::TranscriptResponse {
            channel,
            channel_index,
            metadata,
            ..
        } => (channel, channel_index, metadata),
        _ => return,
    };

    let extra = match &metadata.extra {
        Some(e) => e,
        None => return,
    };

    let get_bool =
        |key: &str| -> bool { extra.get(key).and_then(|v| v.as_bool()).unwrap_or(false) };
    let get_u64 = |key: &str| -> u64 { extra.get(key).and_then(|v| v.as_u64()).unwrap_or(0) };

    let ch = channel_index.first().copied().unwrap_or(0);

    if get_bool("cloud_corrected") {
        let job_id = get_u64("cloud_job_id");
        if job_id != 0 {
            pending.remove(&job_id);
        }
        return;
    }

    if get_bool("cloud_handoff") {
        let job_id = get_u64("cloud_job_id");
        if job_id == 0 {
            return;
        }
        if let Some(alt) = channel.alternatives.first() {
            let words = &alt.words;
            if !words.is_empty() {
                let start_ms = (words.first().map(|w| w.start).unwrap_or(0.0) * 1000.0) as i64;
                let end_ms = (words.last().map(|w| w.end).unwrap_or(0.0) * 1000.0) as i64;
                pending.insert(
                    job_id,
                    PendingHandoff {
                        channel: ch,
                        start_ms,
                        end_ms,
                    },
                );
            }
        }
    }
}

fn spawn_local_stt_server(model_path: &str) -> String {
    use axum::error_handling::HandleError;
    use axum::{Router, http::StatusCode};
    use hypr_transcribe_cactus::{CactusConfig, TranscribeService};

    let model_path = model_path.to_string();

    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("tokio runtime");

        rt.block_on(async move {
            let service = TranscribeService::builder()
                .model_path(model_path.into())
                .cactus_config(CactusConfig::default())
                .build();

            let app = Router::new().route_service(
                "/v1/listen",
                HandleError::new(service, |e: String| async move {
                    (StatusCode::INTERNAL_SERVER_ERROR, e)
                }),
            );

            let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                .await
                .expect("failed to bind STT server");
            let addr = listener.local_addr().expect("failed to get local addr");
            tx.send(format!("http://{}/v1", addr))
                .expect("channel send");
            axum::serve(listener, app).await.expect("STT server error");
        });
    });

    rx.recv().expect("STT server failed to start")
}

fn spawn_cactus_session<F, S>(
    api_base: String,
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
            let client = ListenClient::builder()
                .adapter::<CactusAdapter>()
                .api_base(&api_base)
                .params(owhisper_interface::ListenParams::default())
                .build_single()
                .await;

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
