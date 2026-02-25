use std::net::{Ipv4Addr, SocketAddr};

use axum::{Router, error_handling::HandleError};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use reqwest::StatusCode;
use tower_http::cors::{self, CorsLayer};

use super::{ServerInfo, ServerStatus};

pub enum Internal3STTMessage {
    GetHealth(RpcReplyPort<ServerInfo>),
    ServerError(String),
}

#[derive(Clone)]
pub struct Internal3STTArgs {
    pub locale: String,
    pub sample_rate: u32,
}

pub struct Internal3STTState {
    base_url: String,
    shutdown: tokio::sync::watch::Sender<()>,
    server_task: tokio::task::JoinHandle<()>,
}

pub struct Internal3STTActor;

impl Internal3STTActor {
    pub fn name() -> ActorName {
        "internal3_stt".into()
    }
}

#[ractor::async_trait]
impl Actor for Internal3STTActor {
    type Msg = Internal3STTMessage;
    type State = Internal3STTState;
    type Arguments = Internal3STTArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let Internal3STTArgs {
            locale: _,
            sample_rate: _,
        } = args;

        tracing::info!("starting internal3 STT server (SpeechAnalyzer)");

        let speech_analyzer_service = HandleError::new(
            hypr_transcribe_speech_analyzer::TranscribeService::builder().build(),
            move |err: String| async move {
                let _ = myself.send_message(Internal3STTMessage::ServerError(err.clone()));
                (StatusCode::INTERNAL_SERVER_ERROR, err)
            },
        );

        let router = Router::new()
            .route_service("/v1/listen", speech_analyzer_service)
            .layer(
                CorsLayer::new()
                    .allow_origin(cors::Any)
                    .allow_methods(cors::Any)
                    .allow_headers(cors::Any),
            );

        let listener =
            tokio::net::TcpListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, 0))).await?;

        let server_addr = listener.local_addr()?;
        let base_url = format!("http://{}/v1", server_addr);

        let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());

        let server_task = tokio::spawn(async move {
            axum::serve(listener, router)
                .with_graceful_shutdown(async move {
                    shutdown_rx.changed().await.ok();
                })
                .await
                .unwrap();
        });

        Ok(Internal3STTState {
            base_url,
            shutdown: shutdown_tx,
            server_task,
        })
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        let _ = state.shutdown.send(());
        state.server_task.abort();
        Ok(())
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            Internal3STTMessage::ServerError(e) => Err(e.into()),
            Internal3STTMessage::GetHealth(reply_port) => {
                let info = ServerInfo {
                    url: Some(state.base_url.clone()),
                    status: ServerStatus::Ready,
                    model: Some(crate::SupportedSttModel::SpeechAnalyzer),
                };

                if let Err(e) = reply_port.send(info) {
                    return Err(e.into());
                }

                Ok(())
            }
        }
    }
}
