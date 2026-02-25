mod message;
mod response;
mod session;

use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};

use axum::{
    body::Body,
    extract::{FromRequestParts, ws::WebSocketUpgrade},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use tower::Service;

use hypr_ws_utils::ConnectionManager;
use owhisper_interface::ListenParams;

#[derive(Clone)]
pub struct TranscribeService {
    connection_manager: ConnectionManager,
}

impl TranscribeService {
    pub fn builder() -> TranscribeServiceBuilder {
        TranscribeServiceBuilder::default()
    }
}

#[derive(Default)]
pub struct TranscribeServiceBuilder {
    connection_manager: Option<ConnectionManager>,
}

impl TranscribeServiceBuilder {
    pub fn build(self) -> TranscribeService {
        TranscribeService {
            connection_manager: self.connection_manager.unwrap_or_default(),
        }
    }
}

impl Service<Request<Body>> for TranscribeService {
    type Response = Response;
    type Error = String;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, _cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        Poll::Ready(Ok(()))
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        let connection_manager = self.connection_manager.clone();

        Box::pin(async move {
            let is_ws = req
                .headers()
                .get("upgrade")
                .and_then(|v| v.to_str().ok())
                .map(|v| v.eq_ignore_ascii_case("websocket"))
                .unwrap_or(false);

            let query_string = req.uri().query().unwrap_or("").to_string();
            let params: ListenParams = match serde_qs::from_str(&query_string) {
                Ok(p) => p,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            if !is_ws {
                return Ok((
                    StatusCode::BAD_REQUEST,
                    "SpeechAnalyzer only supports WebSocket connections",
                )
                    .into_response());
            }

            let (mut parts, _body) = req.into_parts();
            let ws_upgrade = match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
                Ok(ws) => ws,
                Err(e) => {
                    return Ok((StatusCode::BAD_REQUEST, e.to_string()).into_response());
                }
            };

            let guard = connection_manager.acquire_connection();

            Ok(ws_upgrade
                .on_upgrade(move |socket| async move {
                    session::handle_websocket(socket, params, guard).await;
                })
                .into_response())
        })
    }
}
