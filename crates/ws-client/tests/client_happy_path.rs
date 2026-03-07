mod common;

use common::{TestIO, TestMessage, collect_messages, echo_server, test_client};
use futures_util::{SinkExt, StreamExt, pin_mut};
use tokio::{net::TcpListener, sync::oneshot};
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};

#[tokio::test]
async fn test_basic_echo() {
    let addr = echo_server().await;
    let client = test_client(addr);

    let messages = vec![
        TestMessage {
            text: "hello".to_string(),
            count: 1,
        },
        TestMessage {
            text: "world".to_string(),
            count: 2,
        },
    ];

    let stream = futures_util::stream::iter(messages.clone());
    let (output, _handle) = client.from_audio::<TestIO, _>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 2).await;
    assert_eq!(received, messages);
}

#[tokio::test]
async fn test_finalize() {
    let addr = echo_server().await;
    let client = test_client(addr);

    let stream = futures_util::stream::iter(vec![TestMessage {
        text: "initial".to_string(),
        count: 1,
    }]);
    let (output, handle) = client.from_audio::<TestIO, _>(None, stream).await.unwrap();

    let final_msg = TestMessage {
        text: "final".to_string(),
        count: 999,
    };
    handle
        .finalize_with_text(serde_json::to_string(&final_msg).unwrap().into())
        .await;

    let received = collect_messages::<TestIO>(output, 2).await;
    assert_eq!(received.len(), 2);
    assert_eq!(received[1], final_msg);
}

#[tokio::test]
async fn test_keep_alive() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (mut tx, mut rx) = ws_stream.split();

        let mut ping_count = 0;
        while let Some(Ok(msg)) = rx.next().await {
            if matches!(msg, Message::Ping(_)) {
                ping_count += 1;
                if ping_count >= 2 {
                    let response = TestMessage {
                        text: "done".to_string(),
                        count: ping_count,
                    };
                    tx.send(Message::Text(
                        serde_json::to_string(&response).unwrap().into(),
                    ))
                    .await
                    .unwrap();
                    break;
                }
            }
        }
    });

    let client = test_client(addr).with_keep_alive_message(
        std::time::Duration::from_millis(100),
        Message::Ping(vec![].into()),
    );

    let stream = futures_util::stream::pending::<TestMessage>();
    let (output, _handle) = client.from_audio::<TestIO, _>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 1).await;
    assert_eq!(received[0].text, "done");
    assert!(received[0].count >= 2);
}

#[tokio::test]
async fn test_dropping_output_cancels_background_send_task() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let (closed_tx, closed_rx) = oneshot::channel::<usize>();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (_tx, mut rx) = ws_stream.split();
        let mut messages_seen = 0usize;

        while let Some(result) = rx.next().await {
            match result {
                Ok(Message::Ping(_) | Message::Text(_) | Message::Binary(_)) => {
                    messages_seen += 1;
                }
                Ok(Message::Close(_)) => break,
                Ok(_) => {}
                Err(_) => break,
            }
        }

        let _ = closed_tx.send(messages_seen);
    });

    let client = test_client(addr).with_keep_alive_message(
        std::time::Duration::from_millis(50),
        Message::Ping(vec![].into()),
    );

    let (output, _handle) = client
        .from_audio::<TestIO, _>(None, futures_util::stream::pending::<TestMessage>())
        .await
        .unwrap();

    drop(output);

    let messages_seen = tokio::time::timeout(std::time::Duration::from_millis(300), closed_rx)
        .await
        .expect("connection should close promptly when the output stream is dropped")
        .expect("server should report closure");
    assert_eq!(messages_seen, 0, "unexpected outbound traffic after drop");
}

#[tokio::test]
async fn test_input_eof_closes_connection_without_finalize() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let (closed_tx, closed_rx) = oneshot::channel::<()>();

    tokio::spawn(async move {
        let (stream, _) = listener.accept().await.unwrap();
        let ws_stream = accept_async(stream).await.unwrap();
        let (_tx, mut rx) = ws_stream.split();

        while let Some(result) = rx.next().await {
            match result {
                Ok(Message::Close(_)) | Err(_) => break,
                Ok(_) => {}
            }
        }

        let _ = closed_tx.send(());
    });

    let client = test_client(addr).with_keep_alive_message(
        std::time::Duration::from_millis(50),
        Message::Ping(vec![].into()),
    );

    let (output, _handle) = client
        .from_audio::<TestIO, _>(None, futures_util::stream::empty::<TestMessage>())
        .await
        .unwrap();
    pin_mut!(output);

    assert!(
        tokio::time::timeout(std::time::Duration::from_secs(6), closed_rx)
            .await
            .is_ok(),
        "connection should close after input EOF without explicit finalize"
    );
}
