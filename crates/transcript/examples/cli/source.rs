use std::time::Duration;

use futures_util::{Stream, StreamExt};
use hypr_audio_utils::AudioFormatExt;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::{ControlMessage, MixedMessage};

use crate::feed::TranscriptFeed;
use crate::renderer::debug::DebugSection;

pub struct FixtureSource {
    name: String,
    responses: Vec<StreamResponse>,
}

impl FixtureSource {
    pub fn from_json(name: impl Into<String>, json: &str) -> Self {
        let responses: Vec<StreamResponse> =
            serde_json::from_str(json).expect("fixture must parse as StreamResponse[]");
        Self {
            name: name.into(),
            responses,
        }
    }
}

impl TranscriptFeed for FixtureSource {
    fn total(&self) -> usize {
        self.responses.len()
    }

    fn get(&self, index: usize) -> Option<&StreamResponse> {
        self.responses.get(index)
    }

    fn poll_next(&mut self) -> Option<&StreamResponse> {
        None
    }

    fn is_live(&self) -> bool {
        false
    }

    fn debug_sections(&self) -> Vec<DebugSection> {
        vec![DebugSection {
            title: "fixture",
            entries: vec![
                ("name", self.name.clone()),
                ("events", self.responses.len().to_string()),
            ],
        }]
    }
}

pub fn throttled_audio_stream<S>(
    source: S,
) -> impl Stream<Item = MixedMessage<bytes::Bytes, ControlMessage>> + Send + Unpin + 'static
where
    S: AudioFormatExt + Send + Unpin + 'static,
{
    let chunks = source.to_i16_le_chunks(16000, 1600);
    Box::pin(tokio_stream::StreamExt::throttle(
        chunks.map(MixedMessage::Audio),
        Duration::from_millis(100),
    ))
}
