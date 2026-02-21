use std::sync::Arc;

use axum::{Extension, Json};
use hypr_recall::{BotStatusCode, BotStatusWebhook, RecallClient, TranscriptWebhook};

use crate::error::Result;

pub async fn status_change(
    Extension(client): Extension<Arc<RecallClient>>,
    Json(event): Json<BotStatusWebhook>,
) -> Result<()> {
    let bot_id = &event.data.bot_id;
    let code = &event.data.status.code;

    tracing::info!(bot_id = %bot_id, status = ?code, "bot_status_change");

    match code {
        BotStatusCode::CallEnded => {
            tracing::info!(bot_id = %bot_id, "bot_call_ended");
        }
        BotStatusCode::Fatal => {
            let message = event.data.status.message.as_deref().unwrap_or("unknown");
            tracing::error!(bot_id = %bot_id, message = %message, "bot_fatal");
            sentry::capture_message(
                &format!("Recall bot {bot_id} fatal: {message}"),
                sentry::Level::Error,
            );
            // Best-effort removal — the bot may already be gone, but this ensures cleanup
            // if it somehow got stuck in a recoverable state.
            let _ = client.remove_bot(bot_id).await;
        }
        _ => {}
    }

    Ok(())
}

pub async fn transcript(Json(payload): Json<TranscriptWebhook>) -> Result<()> {
    let text = payload
        .transcript
        .words
        .iter()
        .map(|w| w.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    tracing::info!(
        bot_id = %payload.bot_id,
        speaker = %payload.transcript.speaker,
        is_final = payload.transcript.is_final,
        text = %text,
        "transcript_received"
    );

    Ok(())
}
