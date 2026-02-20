mod manager;
pub use manager::*;

use std::pin::Pin;
use std::task::{Context, Poll};

use axum::extract::ws::{Message, WebSocket};
use futures_util::{Stream, StreamExt, stream::SplitStream};
use pin_project::pin_project;
use tokio::sync::mpsc::{Receiver, channel};

use hypr_audio_utils::{bytes_to_f32_samples, deinterleave_stereo_bytes, mix_audio_f32};
use owhisper_interface::ListenInputChunk;

enum AudioProcessResult {
    Samples(Vec<f32>),
    DualSamples { mic: Vec<f32>, speaker: Vec<f32> },
    Empty,
    End,
}

fn process_ws_message(message: Message, channels: Option<u32>) -> AudioProcessResult {
    match message {
        Message::Binary(data) => {
            if data.is_empty() {
                return AudioProcessResult::Empty;
            }

            match channels {
                Some(2) => {
                    let (mic, speaker) = deinterleave_stereo_bytes(&data);
                    AudioProcessResult::DualSamples { mic, speaker }
                }
                _ => AudioProcessResult::Samples(bytes_to_f32_samples(&data)),
            }
        }
        Message::Text(data) => match serde_json::from_str::<ListenInputChunk>(&data) {
            Ok(ListenInputChunk::Audio { data }) => {
                if data.is_empty() {
                    AudioProcessResult::Empty
                } else {
                    AudioProcessResult::Samples(bytes_to_f32_samples(&data))
                }
            }
            Ok(ListenInputChunk::DualAudio { mic, speaker }) => AudioProcessResult::DualSamples {
                mic: bytes_to_f32_samples(&mic),
                speaker: bytes_to_f32_samples(&speaker),
            },
            Ok(ListenInputChunk::End) => AudioProcessResult::End,
            Err(_) => AudioProcessResult::Empty,
        },
        Message::Close(_) => AudioProcessResult::End,
        _ => AudioProcessResult::Empty,
    }
}

#[pin_project]
pub struct WebSocketAudioSource {
    receiver: Option<SplitStream<WebSocket>>,
    sample_rate: u32,
    buffer: Vec<f32>,
    buffer_idx: usize,
}

impl WebSocketAudioSource {
    pub fn new(receiver: SplitStream<WebSocket>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
            buffer: Vec::new(),
            buffer_idx: 0,
        }
    }
}

impl Stream for WebSocketAudioSource {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();

        loop {
            if *this.buffer_idx < this.buffer.len() {
                let sample = this.buffer[*this.buffer_idx];
                *this.buffer_idx += 1;
                return Poll::Ready(Some(sample));
            }

            this.buffer.clear();
            *this.buffer_idx = 0;

            let Some(receiver) = this.receiver.as_mut() else {
                return Poll::Ready(None);
            };

            match Pin::new(receiver).poll_next(cx) {
                Poll::Ready(Some(Ok(message))) => match process_ws_message(message, None) {
                    AudioProcessResult::Samples(mut samples) => {
                        if samples.is_empty() {
                            continue;
                        }
                        this.buffer.append(&mut samples);
                        *this.buffer_idx = 0;
                    }
                    AudioProcessResult::DualSamples { mic, speaker } => {
                        let mut mixed = mix_audio_f32(&mic, &speaker);
                        if mixed.is_empty() {
                            continue;
                        }
                        this.buffer.append(&mut mixed);
                        *this.buffer_idx = 0;
                    }
                    AudioProcessResult::Empty => continue,
                    AudioProcessResult::End => return Poll::Ready(None),
                },
                Poll::Ready(Some(Err(_))) => return Poll::Ready(None),
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl hypr_audio_interface::AsyncSource for WebSocketAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

const AUDIO_CHANNEL_CAPACITY: usize = 1024;

#[pin_project]
pub struct ChannelAudioSource {
    receiver: Option<Receiver<Vec<f32>>>,
    sample_rate: u32,
    buffer: Vec<f32>,
    buffer_idx: usize,
}

impl ChannelAudioSource {
    fn new(receiver: Receiver<Vec<f32>>, sample_rate: u32) -> Self {
        Self {
            receiver: Some(receiver),
            sample_rate,
            buffer: Vec::new(),
            buffer_idx: 0,
        }
    }
}

impl Stream for ChannelAudioSource {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();

        loop {
            if *this.buffer_idx < this.buffer.len() {
                let sample = this.buffer[*this.buffer_idx];
                *this.buffer_idx += 1;
                return Poll::Ready(Some(sample));
            }

            this.buffer.clear();
            *this.buffer_idx = 0;

            let Some(receiver) = this.receiver.as_mut() else {
                return Poll::Ready(None);
            };

            match receiver.poll_recv(cx) {
                Poll::Ready(Some(mut samples)) => {
                    if samples.is_empty() {
                        continue;
                    }
                    this.buffer.append(&mut samples);
                    *this.buffer_idx = 0;
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl hypr_audio_interface::AsyncSource for ChannelAudioSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

pub fn split_dual_audio_sources(
    mut ws_receiver: SplitStream<WebSocket>,
    sample_rate: u32,
) -> (ChannelAudioSource, ChannelAudioSource) {
    let (mic_tx, mic_rx) = channel::<Vec<f32>>(AUDIO_CHANNEL_CAPACITY);
    let (speaker_tx, speaker_rx) = channel::<Vec<f32>>(AUDIO_CHANNEL_CAPACITY);

    tokio::spawn(async move {
        while let Some(Ok(message)) = ws_receiver.next().await {
            match process_ws_message(message, Some(2)) {
                AudioProcessResult::Samples(samples) => {
                    if mic_tx.try_send(samples.clone()).is_err() {
                        tracing::warn!("mic_channel_full_dropping_audio");
                    }
                    if speaker_tx.try_send(samples).is_err() {
                        tracing::warn!("speaker_channel_full_dropping_audio");
                    }
                }
                AudioProcessResult::DualSamples { mic, speaker } => {
                    if mic_tx.try_send(mic).is_err() {
                        tracing::warn!("mic_channel_full_dropping_audio");
                    }
                    if speaker_tx.try_send(speaker).is_err() {
                        tracing::warn!("speaker_channel_full_dropping_audio");
                    }
                }
                AudioProcessResult::End => break,
                AudioProcessResult::Empty => continue,
            }
        }
    });

    (
        ChannelAudioSource::new(mic_rx, sample_rate),
        ChannelAudioSource::new(speaker_rx, sample_rate),
    )
}
