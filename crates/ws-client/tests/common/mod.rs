#![allow(dead_code)]

use futures_util::{SinkExt, Stream, StreamExt, pin_mut};
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
};
use tokio::{io::AsyncWriteExt, net::TcpListener};
use tokio_tungstenite::{
    accept_async,
    tungstenite::{
        ClientRequestBuilder,
        protocol::{CloseFrame, Message, frame::coding::CloseCode},
    },
};
use ws_client::client::{WebSocketClient, WebSocketIO};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub(crate) struct TestMessage {
    pub(crate) text: String,
    pub(crate) count: u32,
}

pub(crate) struct TestIO;

impl WebSocketIO for TestIO {
    type Data = TestMessage;
    type Input = TestMessage;
    type Output = TestMessage;

    fn to_input(data: Self::Data) -> Self::Input {
        data
    }

    fn to_message(input: Self::Input) -> Message {
        Message::Text(serde_json::to_string(&input).unwrap().into())
    }

    fn from_message(msg: Message) -> Result<Option<Self::Output>, ws_client::Error> {
        match msg {
            Message::Text(text) => serde_json::from_str(&text)
                .map(Some)
                .map_err(|error| ws_client::Error::parse_error(error.to_string())),
            _ => Ok(None),
        }
    }
}

pub(crate) fn test_client(addr: SocketAddr) -> WebSocketClient {
    WebSocketClient::new(ClientRequestBuilder::new(
        format!("ws://{}", addr).parse().unwrap(),
    ))
}

pub(crate) async fn echo_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            tokio::spawn(async move {
                let ws_stream = accept_async(stream).await.unwrap();
                let (mut tx, mut rx) = ws_stream.split();
                while let Some(Ok(msg)) = rx.next().await {
                    match msg {
                        Message::Text(_) | Message::Binary(_) => {
                            if tx.send(msg).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        _ => {}
                    }
                }
            });
        }
    });

    addr
}

pub(crate) async fn reset_without_close_server() -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let mut ws_stream = accept_async(stream).await.unwrap();
        let _ = ws_stream.next().await;
        drop(ws_stream);
    });

    addr
}

pub(crate) async fn http_error_server(
    status_line: &'static str,
    body: &'static str,
) -> (SocketAddr, Arc<AtomicUsize>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let attempts = Arc::new(AtomicUsize::new(0));
    let attempts_for_task = attempts.clone();

    tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            attempts_for_task.fetch_add(1, Ordering::SeqCst);
            let response = format!(
                "HTTP/1.1 {status_line}\r\nContent-Length: {}\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            let _ = stream.write_all(response.as_bytes()).await;
        }
    });

    (addr, attempts)
}

pub(crate) async fn invalid_message_server(message: &'static str) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let mut ws_stream = accept_async(stream).await.unwrap();
        ws_stream
            .send(Message::Text(message.to_string().into()))
            .await
            .unwrap();
    });

    addr
}

pub(crate) async fn close_frame_server(code: CloseCode, reason: &'static str) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let mut ws_stream = accept_async(stream).await.unwrap();
        ws_stream
            .send(Message::Close(Some(CloseFrame {
                code,
                reason: reason.into(),
            })))
            .await
            .unwrap();
    });

    addr
}

pub(crate) async fn collect_messages<T: WebSocketIO>(
    output: impl Stream<Item = Result<T::Output, ws_client::Error>>,
    max: usize,
) -> Vec<T::Output> {
    pin_mut!(output);
    let mut results = Vec::new();
    while let Some(Ok(msg)) = output.next().await {
        results.push(msg);
        if results.len() >= max {
            break;
        }
    }
    results
}

pub(crate) fn single_message_stream(text: &str) -> impl Stream<Item = TestMessage> {
    futures_util::stream::iter(vec![TestMessage {
        text: text.to_string(),
        count: 1,
    }])
}
