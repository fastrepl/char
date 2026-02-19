use std::{
    pin::Pin,
    task::{Context, Poll},
};

use futures_util::Stream;
use pin_project::pin_project;

use crate::{StreamingVad, VadConfig};

#[pin_project]
pub struct ContinuousVadMaskStream<S> {
    #[pin]
    inner: S,
    vad: Option<StreamingVad>,
    cfg: VadConfig,
}

impl<S> ContinuousVadMaskStream<S> {
    pub fn new(inner: S) -> Self {
        Self {
            inner,
            vad: None,
            cfg: VadConfig::default(),
        }
    }

    pub fn with_hangover_frames(mut self, frames: usize) -> Self {
        self.cfg.hangover_frames = frames;
        self
    }

    pub fn with_amplitude_floor(mut self, floor: f32) -> Self {
        self.cfg.amplitude_floor = floor;
        self
    }
}

fn process_chunk(vad: &mut Option<StreamingVad>, cfg: &VadConfig, chunk: &mut [f32]) {
    if chunk.is_empty() {
        return;
    }

    let vad = vad.get_or_insert_with(|| StreamingVad::with_config(chunk.len(), cfg.clone()));

    vad.process_in_place(chunk, |frame, is_speech| {
        if !is_speech {
            frame.fill(0.0);
        }
    });
}

impl<S, E> Stream for ContinuousVadMaskStream<S>
where
    S: Stream<Item = Result<Vec<f32>, E>>,
{
    type Item = Result<Vec<f32>, E>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.project();

        match this.inner.poll_next(cx) {
            Poll::Ready(Some(Ok(mut chunk))) => {
                process_chunk(this.vad, this.cfg, &mut chunk);
                Poll::Ready(Some(Ok(chunk)))
            }
            other => other,
        }
    }
}

pub trait VadMaskExt: Sized {
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self>;
}

impl<S, E> VadMaskExt for S
where
    S: Stream<Item = Result<Vec<f32>, E>> + Sized,
{
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self> {
        ContinuousVadMaskStream::new(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{StreamExt, stream};

    #[tokio::test]
    async fn test_continuous_stream_preserves_length() {
        let input_audio = rodio::Decoder::try_from(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        )
        .unwrap();

        let original_samples: Vec<f32> = input_audio.collect();
        let original_len = original_samples.len();

        let chunk_size = 512;
        let chunks_iter = original_samples
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        assert_eq!(
            original_len,
            masked_samples.len(),
            "VAD masking should preserve stream length"
        );
    }

    #[tokio::test]
    async fn test_vad_masks_silence() {
        let silence: Vec<f32> = vec![0.0; 16000];

        let chunk_size = 512;
        let chunks_iter = silence
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        let non_zero_count = masked_samples.iter().filter(|&&s| s != 0.0).count();
        assert!(
            non_zero_count < 100,
            "Silence should be mostly masked (found {} non-zero samples)",
            non_zero_count
        );
    }

    #[tokio::test]
    async fn test_different_chunk_sizes() {
        let input_audio = rodio::Decoder::try_from(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        )
        .unwrap();

        let original_samples: Vec<f32> = input_audio.collect();

        for chunk_size in [160, 320, 480, 512, 1024] {
            let chunks_iter = original_samples
                .chunks(chunk_size)
                .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

            let base_stream = stream::iter(chunks_iter);
            let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

            let mut masked_samples = Vec::new();
            while let Some(item) = vad_stream.next().await {
                if let Ok(chunk) = item {
                    masked_samples.extend_from_slice(&chunk);
                }
            }

            assert_eq!(
                original_samples.len(),
                masked_samples.len(),
                "Chunk size {} should preserve stream length",
                chunk_size
            );
        }
    }

    #[tokio::test]
    async fn test_vad_preserves_speech() {
        let input_audio = rodio::Decoder::try_from(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        )
        .unwrap();

        let original_samples: Vec<f32> = input_audio.collect();

        let chunk_size = 512;
        let chunks_iter = original_samples
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        let original_non_zero = original_samples.iter().filter(|&&s| s.abs() > 0.01).count();
        let masked_non_zero = masked_samples.iter().filter(|&&s| s.abs() > 0.01).count();

        let preservation_ratio = masked_non_zero as f64 / original_non_zero as f64;
        assert!(
            preservation_ratio > 0.5,
            "VAD should preserve at least 50% of speech samples (preserved {}%)",
            preservation_ratio * 100.0
        );
    }

    #[test]
    fn test_frame_size_selection() {
        assert_eq!(hypr_vad3::choose_optimal_frame_size(160), 160);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(320), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(480), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(960), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(640), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(512), 320);
    }
}
