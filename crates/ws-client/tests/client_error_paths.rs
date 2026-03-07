mod common;

use common::{
    TestIO, close_frame_server, invalid_message_server, reset_without_close_server,
    single_message_stream, test_client,
};
use futures_util::{StreamExt, pin_mut};
use std::time::Duration;
use tokio_tungstenite::tungstenite::{
    ClientRequestBuilder, Error as TungsteniteError, error::ProtocolError,
    protocol::frame::coding::CloseCode,
};
use ws_client::client::WebSocketClient;

#[tokio::test]
async fn test_invalid_request_returns_error_instead_of_panicking() {
    let client = WebSocketClient::new(
        ClientRequestBuilder::new("ws://127.0.0.1:1".parse().unwrap())
            .with_header("x-invalid", "bad\nvalue"),
    );

    let task = tokio::spawn(async move {
        client
            .from_audio::<TestIO, _>(None, futures_util::stream::empty())
            .await
    });

    let result = task.await.expect("invalid request should not panic");
    let error = match result {
        Ok(_) => panic!("invalid request should return an error"),
        Err(error) => error,
    };
    assert!(
        error.to_string().contains("invalid request"),
        "unexpected error: {error:?}"
    );
}

#[tokio::test]
async fn test_reset_without_close_is_reported_as_error() {
    let addr = reset_without_close_server().await;
    let client = test_client(addr);

    let (output, _handle) = client
        .from_audio::<TestIO, _>(None, single_message_stream("boom"))
        .await
        .unwrap();
    pin_mut!(output);

    let first = tokio::time::timeout(Duration::from_secs(1), output.as_mut().next())
        .await
        .expect("stream should resolve")
        .expect("stream should yield an item");

    match first {
        Err(ws_client::Error::Connection(TungsteniteError::Protocol(
            ProtocolError::ResetWithoutClosingHandshake,
        ))) => {}
        other => panic!("expected reset protocol error, got {other:?}"),
    }
}

#[tokio::test]
async fn test_invalid_payload_is_reported_as_parse_error() {
    let addr = invalid_message_server("not-json").await;
    let client = test_client(addr);

    let (output, _handle) = client
        .from_audio::<TestIO, _>(None, futures_util::stream::pending())
        .await
        .unwrap();
    pin_mut!(output);

    let first = tokio::time::timeout(Duration::from_secs(1), output.as_mut().next())
        .await
        .expect("stream should resolve")
        .expect("stream should yield an item");

    match first {
        Err(ws_client::Error::ParseError { .. }) => {}
        other => panic!("expected parse error, got {other:?}"),
    }
}

#[tokio::test]
async fn test_remote_close_frame_is_reported_as_error() {
    let addr = close_frame_server(CloseCode::Policy, "policy").await;
    let client = test_client(addr);

    let (output, _handle) = client
        .from_audio::<TestIO, _>(None, futures_util::stream::pending())
        .await
        .unwrap();
    pin_mut!(output);

    let first = tokio::time::timeout(Duration::from_secs(1), output.as_mut().next())
        .await
        .expect("stream should resolve")
        .expect("stream should yield an item");

    match first {
        Err(ws_client::Error::RemoteClosed { code, reason, .. }) => {
            assert_eq!(code, Some(1008));
            assert_eq!(reason, "policy");
        }
        other => panic!("expected remote close error, got {other:?}"),
    }
}
