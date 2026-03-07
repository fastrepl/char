mod common;

use common::{
    TestIO, TestMessage, collect_messages, http_error_server, single_message_stream, test_client,
};
use futures_util::{SinkExt, StreamExt};
use std::{
    sync::{
        Arc,
        atomic::{AtomicU32, AtomicUsize, Ordering},
    },
    time::Duration,
};
use tokio::net::TcpListener;
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use ws_client::client::WebSocketConnectPolicy;

#[tokio::test]
async fn test_retry() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    let attempt_count = Arc::new(AtomicU32::new(0));
    let attempt_count_clone = attempt_count.clone();

    tokio::spawn(async move {
        loop {
            if let Ok((stream, _)) = listener.accept().await {
                let current = attempt_count_clone.fetch_add(1, Ordering::SeqCst);
                if current == 0 {
                    drop(stream);
                    continue;
                }
                let ws_stream = accept_async(stream).await.unwrap();
                let (mut tx, mut rx) = ws_stream.split();
                while let Some(Ok(msg)) = rx.next().await {
                    if matches!(msg, Message::Text(_) | Message::Binary(_)) {
                        if tx.send(msg).await.is_err() {
                            break;
                        }
                    }
                }
                break;
            }
        }
    });

    tokio::time::sleep(Duration::from_millis(50)).await;

    let client = test_client(addr);

    let stream = futures_util::stream::iter(vec![TestMessage {
        text: "retry_test".to_string(),
        count: 1,
    }]);
    let (output, _handle) = client.from_audio::<TestIO, _>(None, stream).await.unwrap();

    let received = collect_messages::<TestIO>(output, 1).await;
    assert_eq!(received[0].text, "retry_test");
    assert!(attempt_count.load(Ordering::SeqCst) >= 2);
}

#[tokio::test]
async fn test_retry_exhausted_returns_explicit_error() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            drop(stream);
        }
    });

    tokio::time::sleep(Duration::from_millis(50)).await;

    let client = test_client(addr).with_connect_policy(WebSocketConnectPolicy {
        connect_timeout: Duration::from_secs(1),
        max_attempts: 2,
        retry_delay: Duration::from_millis(10),
        overall_budget: Some(Duration::from_secs(3)),
    });

    let stream = futures_util::stream::iter(vec![TestMessage {
        text: "nope".to_string(),
        count: 1,
    }]);
    let error = match client.from_audio::<TestIO, _>(None, stream).await {
        Ok(_) => panic!("expected connect retries to be exhausted"),
        Err(error) => error,
    };

    match error {
        ws_client::Error::ConnectRetriesExhausted {
            attempts,
            last_error,
        } => {
            assert_eq!(attempts, 2);
            assert!(!last_error.is_empty());
        }
        other => panic!("expected explicit retries exhausted error, got {other:?}"),
    }
}

#[tokio::test]
async fn test_retry_exhausted_reports_actual_attempts_when_budget_stops_retries() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let attempts = Arc::new(AtomicUsize::new(0));
    let attempts_for_task = attempts.clone();

    tokio::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            attempts_for_task.fetch_add(1, Ordering::SeqCst);
            drop(stream);
        }
    });

    let client = test_client(addr).with_connect_policy(WebSocketConnectPolicy {
        connect_timeout: Duration::from_secs(1),
        max_attempts: 5,
        retry_delay: Duration::from_millis(250),
        overall_budget: Some(Duration::from_millis(100)),
    });

    let error = client
        .from_audio::<TestIO, _>(None, single_message_stream("budget"))
        .await;
    let error = match error {
        Ok(_) => panic!("budget-limited connection should fail"),
        Err(error) => error,
    };

    match error {
        ws_client::Error::ConnectRetriesExhausted { attempts, .. } => {
            assert_eq!(attempts, 1);
        }
        other => panic!("expected retries exhausted error, got {other:?}"),
    }

    assert_eq!(attempts.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn test_non_retryable_http_handshake_error_fails_fast() {
    let (addr, attempts) = http_error_server("400 Bad Request", "bad request").await;
    let client = test_client(addr).with_connect_policy(WebSocketConnectPolicy {
        connect_timeout: Duration::from_secs(1),
        max_attempts: 3,
        retry_delay: Duration::from_millis(10),
        overall_budget: Some(Duration::from_secs(1)),
    });

    let error = client
        .from_audio::<TestIO, _>(None, single_message_stream("bad-http"))
        .await;
    let error = match error {
        Ok(_) => panic!("http 400 should fail fast"),
        Err(error) => error,
    };

    match error {
        ws_client::Error::ConnectFailed {
            attempt,
            max_attempts,
            ..
        } => {
            assert_eq!(attempt, 1);
            assert_eq!(max_attempts, 3);
        }
        other => panic!("expected connect failure, got {other:?}"),
    }

    assert_eq!(attempts.load(Ordering::SeqCst), 1);
}
