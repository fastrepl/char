use cpal::{
    SizedSample,
    traits::{DeviceTrait, HostTrait, StreamTrait},
};
use dasp::sample::ToSample;
use futures_channel::mpsc;
use futures_util::{Stream, StreamExt};
use pin_project::pin_project;
use std::pin::Pin;

use crate::AsyncSource;

fn is_tap_device(name: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        name.contains(crate::TAP_DEVICE_NAME)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = name;
        false
    }
}

pub struct MicInput {
    #[allow(dead_code)]
    host: cpal::Host,
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
}

impl MicInput {
    pub fn device_name(&self) -> String {
        self.device
            .description()
            .map(|d| d.name().to_string())
            .unwrap_or("Unknown Microphone".to_string())
    }

    pub fn list_devices() -> Vec<String> {
        cpal::default_host()
            .input_devices()
            .unwrap()
            .filter_map(|d| {
                let name = d
                    .description()
                    .map(|desc| desc.name().to_string())
                    .unwrap_or("Unknown Microphone".to_string());
                if is_tap_device(&name) {
                    None
                } else {
                    Some(name)
                }
            })
            .collect()
    }

    pub fn new(device_name: Option<String>) -> Result<Self, crate::Error> {
        let host = cpal::default_host();

        let get_device_name = |d: &cpal::Device| {
            d.description()
                .map(|desc| desc.name().to_string())
                .unwrap_or_default()
        };

        let default_input_device = host
            .default_input_device()
            .filter(|d| !is_tap_device(&get_device_name(d)));

        let input_devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| {
                devices
                    .filter(|d| !is_tap_device(&get_device_name(d)))
                    .collect()
            })
            .unwrap_or_else(|_| Vec::new());

        let device = match device_name {
            None => default_input_device
                .or_else(|| input_devices.into_iter().next())
                .ok_or(crate::Error::NoInputDevice)?,
            Some(name) => input_devices
                .into_iter()
                .find(|d| get_device_name(d) == name)
                .or(default_input_device)
                .or_else(|| {
                    host.input_devices().ok().and_then(|mut devices| {
                        devices.find(|d| !is_tap_device(&get_device_name(d)))
                    })
                })
                .ok_or(crate::Error::NoInputDevice)?,
        };

        let config = device.default_input_config().unwrap();
        tracing::info!(sample_rate = ?config.sample_rate());

        Ok(Self {
            host,
            device,
            config,
        })
    }

    pub fn sample_rate(&self) -> u32 {
        self.config.sample_rate()
    }
}

impl MicInput {
    pub fn stream(&self) -> MicStream {
        let (tx, rx) = mpsc::unbounded::<Vec<f32>>();

        let config = self.config.clone();
        let device = self.device.clone();
        let (drop_tx, drop_rx) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            fn build_stream<S: ToSample<f32> + SizedSample>(
                device: &cpal::Device,
                config: &cpal::SupportedStreamConfig,
                mut tx: mpsc::UnboundedSender<Vec<f32>>,
            ) -> Result<cpal::Stream, cpal::BuildStreamError> {
                let channels = config.channels() as usize;
                device.build_input_stream::<S, _, _>(
                    &config.config(),
                    move |data: &[S], _input_callback_info: &_| {
                        let _ = tx.start_send(
                            data.iter()
                                .step_by(channels)
                                .map(|&x| x.to_sample())
                                .collect(),
                        );
                    },
                    |err| {
                        tracing::error!("an error occurred on stream: {}", err);
                    },
                    None,
                )
            }

            let start_stream = || {
                let stream = match config.sample_format() {
                    cpal::SampleFormat::I8 => build_stream::<i8>(&device, &config, tx),
                    cpal::SampleFormat::I16 => build_stream::<i16>(&device, &config, tx),
                    cpal::SampleFormat::I32 => build_stream::<i32>(&device, &config, tx),
                    cpal::SampleFormat::F32 => build_stream::<f32>(&device, &config, tx),
                    sample_format => {
                        tracing::error!(sample_format = ?sample_format, "unsupported");
                        return None;
                    }
                };

                let stream = match stream {
                    Ok(stream) => stream,
                    Err(err) => {
                        tracing::error!("Error starting stream: {}", err);
                        return None;
                    }
                };

                if let Err(err) = stream.play() {
                    tracing::error!("Error playing stream: {}", err);
                }

                Some(stream)
            };

            let stream = match start_stream() {
                Some(stream) => stream,
                None => {
                    return;
                }
            };

            // Wait for the stream to be dropped
            drop_rx.recv().unwrap();

            // Then drop the stream
            drop(stream);
        });

        let receiver = rx.map(futures_util::stream::iter).flatten();
        MicStream {
            drop_tx,
            config: self.config.clone(),
            receiver: Box::pin(receiver),
        }
    }
}

#[pin_project(PinnedDrop)]
pub struct MicStream {
    drop_tx: std::sync::mpsc::Sender<()>,
    config: cpal::SupportedStreamConfig,
    #[pin]
    receiver: Pin<Box<dyn Stream<Item = f32> + Send + Sync>>,
}

#[pin_project::pinned_drop]
impl PinnedDrop for MicStream {
    fn drop(self: std::pin::Pin<&mut Self>) {
        let this = self.project();
        this.drop_tx.send(()).unwrap();
    }
}

impl Stream for MicStream {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.project().receiver.poll_next(cx)
    }
}

impl AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.config.sample_rate()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::new(None).unwrap();
        let mut stream = mic.stream();

        let mut buffer = Vec::new();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if buffer.len() > 6000 {
                break;
            }
        }

        assert!(buffer.iter().any(|x| *x != 0.0));
    }

    #[tokio::test]
    async fn test_mic_stream_with_resampling() {
        use hypr_audio_utils::{ResampleExtDynamicNew, chunk_size_for_stt};

        let mic = MicInput::new(None).unwrap();
        println!("mic device: {}", mic.device_name());
        println!("mic sample_rate: {}", mic.sample_rate());

        let target_rate = 16000;
        let chunk_size = chunk_size_for_stt(target_rate);
        println!("target_rate: {}, chunk_size: {}", target_rate, chunk_size);

        let stream = mic.stream();
        let mut resampled = stream.resampled_chunks(target_rate, chunk_size).unwrap();

        let mut chunks_received = 0;
        let mut total_samples = 0;

        let timeout = tokio::time::Duration::from_secs(3);
        let start = tokio::time::Instant::now();

        while start.elapsed() < timeout {
            tokio::select! {
                chunk = resampled.next() => {
                    match chunk {
                        Some(Ok(data)) => {
                            chunks_received += 1;
                            total_samples += data.len();
                            let has_nonzero = data.iter().any(|&x| x != 0.0);
                            println!(
                                "chunk {}: {} samples, has_nonzero={}",
                                chunks_received, data.len(), has_nonzero
                            );
                            if chunks_received >= 10 {
                                break;
                            }
                        }
                        Some(Err(e)) => {
                            panic!("resampling error: {:?}", e);
                        }
                        None => {
                            panic!("stream ended unexpectedly");
                        }
                    }
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(500)) => {
                    println!("timeout waiting for chunk, chunks_received={}", chunks_received);
                }
            }
        }

        println!(
            "total: {} chunks, {} samples in {:?}",
            chunks_received,
            total_samples,
            start.elapsed()
        );
        assert!(chunks_received > 0, "should receive at least one chunk");
        assert!(total_samples > 0, "should receive samples");
    }
}
