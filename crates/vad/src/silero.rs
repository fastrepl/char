pub use ::silero_rs::{VadConfig, VadSession, VadTransition};

pub const CHUNK_30MS_16KHZ: usize = 480;

pub fn pcm_i16_to_f32(samples: &[i16]) -> Vec<f32> {
    samples.iter().map(|&s| s as f32 / 32768.0).collect()
}
