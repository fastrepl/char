use std::{
    collections::VecDeque,
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures_util::{Stream, StreamExt, future};
use hypr_audio_interface::AsyncSource;
use pin_project::pin_project;
use silero_rs::{VadConfig, VadSession, VadTransition};

#[derive(Debug, Clone)]
pub enum VadStreamItem {
    AudioSamples(Vec<f32>),
    SpeechStart {
        timestamp_ms: usize,
    },
    SpeechEnd {
        start_timestamp_ms: usize,
        end_timestamp_ms: usize,
        samples: Vec<f32>,
    },
}

#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub samples: Vec<f32>,
    pub start_timestamp_ms: usize,
    pub end_timestamp_ms: usize,
}

#[pin_project]
pub struct ContinuousVadStream<S: AsyncSource> {
    source: S,
    vad_session: VadSession,
    chunk_samples: usize,
    buffer: Vec<f32>,
    pending_items: VecDeque<VadStreamItem>,
}

impl<S: AsyncSource> ContinuousVadStream<S> {
    pub fn new(source: S, mut config: VadConfig) -> Result<Self, crate::Error> {
        config.sample_rate = source.sample_rate() as usize;

        // https://github.com/emotechlab/silero-rs/blob/26a6460/src/lib.rs#L775
        let chunk_duration = Duration::from_millis(30);
        let chunk_samples = (chunk_duration.as_secs_f64() * config.sample_rate as f64) as usize;

        Ok(Self {
            source,
            vad_session: VadSession::new(config)
                .map_err(|_| crate::Error::VadSessionCreationFailed)?,
            chunk_samples,
            buffer: Vec::with_capacity(chunk_samples),
            pending_items: VecDeque::new(),
        })
    }
}

impl<S: AsyncSource> Stream for ContinuousVadStream<S> {
    type Item = Result<VadStreamItem, crate::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        if let Some(item) = this.pending_items.pop_front() {
            return Poll::Ready(Some(Ok(item)));
        }

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < this.chunk_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Pending => {
                    return Poll::Pending;
                }
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);
                }
                Poll::Ready(None) => {
                    if !this.buffer.is_empty() {
                        let chunk = std::mem::take(&mut this.buffer);

                        match this.vad_session.process(&chunk) {
                            Ok(transitions) => {
                                this.pending_items
                                    .push_back(VadStreamItem::AudioSamples(chunk));

                                for transition in transitions {
                                    let item = match transition {
                                        VadTransition::SpeechStart { timestamp_ms } => {
                                            VadStreamItem::SpeechStart { timestamp_ms }
                                        }
                                        VadTransition::SpeechEnd {
                                            start_timestamp_ms,
                                            end_timestamp_ms,
                                            samples,
                                        } => VadStreamItem::SpeechEnd {
                                            start_timestamp_ms,
                                            end_timestamp_ms,
                                            samples,
                                        },
                                    };
                                    this.pending_items.push_back(item);
                                }

                                if let Some(item) = this.pending_items.pop_front() {
                                    return Poll::Ready(Some(Ok(item)));
                                }
                            }
                            Err(e) => {
                                return Poll::Ready(Some(Err(crate::Error::VadProcessingFailed(
                                    e.to_string(),
                                ))));
                            }
                        }
                    }
                    return Poll::Ready(None);
                }
            }
        }

        let mut chunk = Vec::with_capacity(this.chunk_samples);
        chunk.extend(this.buffer.drain(..this.chunk_samples));

        match this.vad_session.process(&chunk) {
            Ok(transitions) => {
                this.pending_items
                    .push_back(VadStreamItem::AudioSamples(chunk));

                for transition in transitions {
                    let item = match transition {
                        VadTransition::SpeechStart { timestamp_ms } => {
                            VadStreamItem::SpeechStart { timestamp_ms }
                        }
                        VadTransition::SpeechEnd {
                            start_timestamp_ms,
                            end_timestamp_ms,
                            samples,
                        } => VadStreamItem::SpeechEnd {
                            start_timestamp_ms,
                            end_timestamp_ms,
                            samples,
                        },
                    };
                    this.pending_items.push_back(item);
                }

                if let Some(item) = this.pending_items.pop_front() {
                    Poll::Ready(Some(Ok(item)))
                } else {
                    // Should never happen since we always push audio
                    Poll::Pending
                }
            }
            Err(e) => Poll::Ready(Some(Err(crate::Error::VadProcessingFailed(e.to_string())))),
        }
    }
}

pub trait VadExt: AsyncSource + Sized {
    fn with_vad(self, config: VadConfig) -> ContinuousVadStream<Self> {
        ContinuousVadStream::new(self, config).unwrap()
    }

    fn speech_chunks(
        self,
        redemption_time: Duration,
    ) -> impl Stream<Item = Result<AudioChunk, crate::Error>>
    where
        Self: 'static,
    {
        let config = VadConfig {
            redemption_time,
            pre_speech_pad: redemption_time,
            post_speech_pad: Duration::from_millis(0),
            min_speech_time: Duration::from_millis(50),
            ..Default::default()
        };

        self.with_vad(config).filter_map(|item| {
            future::ready(match item {
                Ok(VadStreamItem::SpeechEnd {
                    samples,
                    start_timestamp_ms,
                    end_timestamp_ms,
                }) => Some(Ok(AudioChunk {
                    samples,
                    start_timestamp_ms,
                    end_timestamp_ms,
                })),
                Ok(_) => None,
                Err(e) => Some(Err(e)),
            })
        })
    }
}

impl<T: AsyncSource> VadExt for T {}
