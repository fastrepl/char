use futures_util::{Stream, StreamExt};
use owhisper_client::{
    AssemblyAIAdapter, DashScopeAdapter, DeepgramAdapter, ElevenLabsAdapter, FinalizeHandle,
    FireworksAdapter, GladiaAdapter, ListenClient, MistralAdapter, OpenAIAdapter, Provider,
    RealtimeSttAdapter, SonioxAdapter,
};
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, ListenParams, MixedMessage};

use crate::feed::{LiveCollector, TranscriptFeed};
use crate::renderer::debug::DebugSection;

pub struct CloudProvider {
    collector: LiveCollector,
    provider: Provider,
}

impl CloudProvider {
    pub fn spawn<F, S>(provider: Provider, api_key: Option<String>, make_stream: F) -> Self
    where
        F: FnOnce() -> S + Send + 'static,
        S: Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static,
    {
        Self {
            collector: LiveCollector::new(dispatch(provider, api_key, make_stream)),
            provider,
        }
    }
}

impl TranscriptFeed for CloudProvider {
    fn total(&self) -> usize {
        self.collector.total()
    }

    fn get(&self, index: usize) -> Option<&StreamResponse> {
        self.collector.get(index)
    }

    fn poll_next(&mut self) -> Option<&StreamResponse> {
        self.collector.poll_next()
    }

    fn is_live(&self) -> bool {
        true
    }

    fn debug_sections(&self) -> Vec<DebugSection> {
        vec![DebugSection {
            title: "cloud",
            entries: vec![("provider", self.provider.to_string())],
        }]
    }
}

fn spawn_session<A, F, S>(
    api_base: String,
    api_key: Option<String>,
    make_stream: F,
) -> std::sync::mpsc::Receiver<StreamResponse>
where
    A: RealtimeSttAdapter,
    F: FnOnce() -> S + Send + 'static,
    S: Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static,
{
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("tokio runtime");

        rt.block_on(async {
            let mut builder = ListenClient::builder()
                .adapter::<A>()
                .api_base(&api_base)
                .params(ListenParams::default());

            if let Some(key) = &api_key {
                builder = builder.api_key(key);
            }

            let client = builder.build_single().await;
            let audio_stream = make_stream();

            let (response_stream, handle) = client
                .from_realtime_audio(audio_stream)
                .await
                .expect("failed to connect to cloud provider");

            futures_util::pin_mut!(response_stream);

            while let Some(result) = response_stream.next().await {
                match result {
                    Ok(sr) => {
                        if tx.send(sr).is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        eprintln!("cloud stream error: {e}");
                        break;
                    }
                }
            }

            handle.finalize().await;
        });
    });

    rx
}

fn dispatch<F, S>(
    provider: Provider,
    api_key: Option<String>,
    make_stream: F,
) -> std::sync::mpsc::Receiver<StreamResponse>
where
    F: FnOnce() -> S + Send + 'static,
    S: Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static,
{
    let api_base = provider.default_api_base().to_string();
    let resolved_key = api_key.or_else(|| std::env::var(provider.env_key_name()).ok());

    match provider {
        Provider::Deepgram => {
            spawn_session::<DeepgramAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::AssemblyAI => {
            spawn_session::<AssemblyAIAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::Soniox => {
            spawn_session::<SonioxAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::Fireworks => {
            spawn_session::<FireworksAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::OpenAI => {
            spawn_session::<OpenAIAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::Gladia => {
            spawn_session::<GladiaAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::ElevenLabs => {
            spawn_session::<ElevenLabsAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::DashScope => {
            spawn_session::<DashScopeAdapter, _, _>(api_base, resolved_key, make_stream)
        }
        Provider::Mistral => {
            spawn_session::<MistralAdapter, _, _>(api_base, resolved_key, make_stream)
        }
    }
}
