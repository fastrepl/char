use std::path::Path;

use mp3lame_encoder::{Builder as LameBuilder, DualPcm, FlushNoGap, MonoPcm};

use super::AudioEncoder;

pub struct Mp3Encoder;

impl AudioEncoder for Mp3Encoder {
    fn extension(&self) -> &str {
        "mp3"
    }

    fn encode_wav(
        &self,
        wav_path: &Path,
        mp3_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut reader = hound::WavReader::open(wav_path)?;
        let spec = reader.spec();
        let num_channels = spec.channels as u8;
        let sample_rate = spec.sample_rate;

        let mut mp3_builder = LameBuilder::new().ok_or("Failed to create LAME builder")?;
        mp3_builder
            .set_num_channels(num_channels)
            .map_err(|e| format!("set channels error: {:?}", e))?;
        mp3_builder
            .set_sample_rate(sample_rate)
            .map_err(|e| format!("set sample rate error: {:?}", e))?;
        mp3_builder
            .set_brate(mp3lame_encoder::Bitrate::Kbps128)
            .map_err(|e| format!("set bitrate error: {:?}", e))?;
        mp3_builder
            .set_quality(mp3lame_encoder::Quality::Best)
            .map_err(|e| format!("set quality error: {:?}", e))?;
        let mut encoder = mp3_builder
            .build()
            .map_err(|e| format!("LAME build error: {:?}", e))?;

        let samples: Vec<f32> = reader.samples::<f32>().collect::<Result<Vec<_>, _>>()?;
        let mut mp3_out = Vec::new();

        const CHUNK_SAMPLES: usize = 4096;

        if num_channels == 1 {
            for chunk in samples.chunks(CHUNK_SAMPLES) {
                let pcm_i16: Vec<i16> = chunk.iter().map(|&s| f32_to_i16(s)).collect();
                let input = MonoPcm(&pcm_i16);
                mp3_out.reserve(mp3lame_encoder::max_required_buffer_size(pcm_i16.len()));
                let encoded_size = encoder
                    .encode(input, mp3_out.spare_capacity_mut())
                    .map_err(|e| format!("encode error: {:?}", e))?;
                unsafe {
                    mp3_out.set_len(mp3_out.len().wrapping_add(encoded_size));
                }
            }
        } else {
            let mut left = Vec::with_capacity(samples.len() / 2);
            let mut right = Vec::with_capacity(samples.len() / 2);
            for pair in samples.chunks(2) {
                left.push(f32_to_i16(pair[0]));
                right.push(if pair.len() > 1 {
                    f32_to_i16(pair[1])
                } else {
                    0i16
                });
            }

            for (l_chunk, r_chunk) in
                left.chunks(CHUNK_SAMPLES).zip(right.chunks(CHUNK_SAMPLES))
            {
                let input = DualPcm {
                    left: l_chunk,
                    right: r_chunk,
                };
                mp3_out.reserve(mp3lame_encoder::max_required_buffer_size(l_chunk.len()));
                let encoded_size = encoder
                    .encode(input, mp3_out.spare_capacity_mut())
                    .map_err(|e| format!("encode error: {:?}", e))?;
                unsafe {
                    mp3_out.set_len(mp3_out.len().wrapping_add(encoded_size));
                }
            }
        }

        mp3_out.reserve(mp3lame_encoder::max_required_buffer_size(0));
        let encoded_size = encoder
            .flush::<FlushNoGap>(mp3_out.spare_capacity_mut())
            .map_err(|e| format!("flush error: {:?}", e))?;
        unsafe {
            mp3_out.set_len(mp3_out.len().wrapping_add(encoded_size));
        }

        std::fs::write(mp3_path, &mp3_out)?;
        Ok(())
    }

    fn decode_to_wav(
        &self,
        mp3_path: &Path,
        wav_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        use hypr_audio_utils::Source;

        let source = hypr_audio_utils::source_from_path(mp3_path)?;
        let channels = source.channels();
        let sample_rate = source.sample_rate();
        let samples: Vec<f32> = source.collect();

        let spec = hound::WavSpec {
            channels,
            sample_rate,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut writer = hound::WavWriter::create(wav_path, spec)?;
        for s in &samples {
            writer.write_sample(*s)?;
        }
        writer.finalize()?;
        Ok(())
    }
}

fn f32_to_i16(sample: f32) -> i16 {
    let clamped = sample.clamp(-1.0, 1.0);
    (clamped * i16::MAX as f32) as i16
}
