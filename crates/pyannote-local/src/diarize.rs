use crate::embedding::EmbeddingExtractor;
use crate::identify::EmbeddingManager;
use crate::segmentation::Segmenter;

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct DiarizationSegment {
    pub start: f64,
    pub end: f64,
    pub speaker: usize,
}

pub struct DiarizeOptions {
    pub max_speakers: usize,
    pub threshold: f32,
    pub min_segment_duration: f64,
}

impl Default for DiarizeOptions {
    fn default() -> Self {
        Self {
            max_speakers: 6,
            threshold: 0.5,
            min_segment_duration: 0.5,
        }
    }
}

pub fn diarize(
    samples: &[i16],
    sample_rate: u32,
    options: Option<DiarizeOptions>,
) -> Result<Vec<DiarizationSegment>, crate::Error> {
    let options = options.unwrap_or_default();

    let mut segmenter = Segmenter::new(sample_rate)?;
    let segments = segmenter.process(samples, sample_rate)?;

    let mut extractor = EmbeddingExtractor::new();
    let mut manager = EmbeddingManager::new(options.max_speakers, options.threshold);

    let mut result = Vec::with_capacity(segments.len());

    for segment in &segments {
        if segment.end - segment.start < options.min_segment_duration {
            continue;
        }
        let embedding = extractor.compute(segment.samples.iter().copied())?;
        let speaker = manager.identify(&embedding);
        result.push(DiarizationSegment {
            start: segment.start,
            end: segment.end,
            speaker,
        });
    }

    smooth_speakers(&mut result);

    Ok(result)
}

fn smooth_speakers(segments: &mut [DiarizationSegment]) {
    if segments.len() < 3 {
        return;
    }
    for i in 1..segments.len() - 1 {
        let prev = segments[i - 1].speaker;
        let next = segments[i + 1].speaker;
        if prev == next && segments[i].speaker != prev {
            segments[i].speaker = prev;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn audio_from_bytes(bytes: &[u8]) -> Vec<i16> {
        bytes
            .chunks_exact(2)
            .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
            .collect()
    }

    #[test]
    fn test_diarize_english_1() {
        let audio = audio_from_bytes(hypr_data::english_1::AUDIO);
        let segments = diarize(&audio, 16000, None).unwrap();

        assert!(!segments.is_empty(), "should produce at least one segment");
        for seg in &segments {
            assert!(seg.end > seg.start);
            println!(
                "{:.2} - {:.2} [Speaker {}]",
                seg.start, seg.end, seg.speaker
            );
        }
    }

    #[test]
    fn test_diarize_english_2() {
        let audio = audio_from_bytes(hypr_data::english_2::AUDIO);
        let segments = diarize(&audio, 16000, None).unwrap();

        assert!(!segments.is_empty(), "should produce at least one segment");
        for seg in &segments {
            assert!(seg.end > seg.start);
            println!(
                "{:.2} - {:.2} [Speaker {}]",
                seg.start, seg.end, seg.speaker
            );
        }
    }

    #[test]
    #[ignore]
    fn test_diarize_real_session() {
        use dasp::sample::Sample;

        let path = std::path::PathBuf::from(env!("HOME"))
            .join("Library/Application Support/hyprnote/sessions")
            .join("ee73358b-c65e-4b62-9506-df14404d937b/audio.wav");

        let f32_samples: Vec<f32> = rodio::Decoder::try_from(std::fs::File::open(&path).unwrap())
            .unwrap()
            .collect();

        let i16_samples: Vec<i16> = f32_samples.iter().map(|s| s.to_sample()).collect();

        println!(
            "Audio: {:.1}s, {} samples",
            i16_samples.len() as f64 / 16000.0,
            i16_samples.len()
        );

        let segments = diarize(&i16_samples, 16000, None).unwrap();

        println!("\n{} segments found:\n", segments.len());
        let mut speakers = std::collections::HashSet::new();
        for seg in &segments {
            speakers.insert(seg.speaker);
            let dur = seg.end - seg.start;
            println!(
                "  {:>6.2}s - {:>6.2}s  ({:>5.2}s)  Speaker {}",
                seg.start, seg.end, dur, seg.speaker
            );
        }
        println!("\nUnique speakers: {}", speakers.len());
    }

    #[test]
    #[ignore]
    fn test_diarize_real_session_stereo() {
        use dasp::sample::Sample;
        use rodio::Source;

        let path = std::path::PathBuf::from(env!("HOME"))
            .join("Library/Application Support/hyprnote/sessions")
            .join("72cf1b45-e63d-40d2-b931-8980ad88734b/audio.wav");

        let decoder = rodio::Decoder::try_from(std::fs::File::open(&path).unwrap()).unwrap();
        let channels = decoder.channels() as usize;
        let f32_samples: Vec<f32> = decoder.collect();

        let mono: Vec<f32> = if channels > 1 {
            f32_samples
                .chunks_exact(channels)
                .map(|frame| frame.iter().sum::<f32>() / channels as f32)
                .collect()
        } else {
            f32_samples
        };

        let i16_samples: Vec<i16> = mono.iter().map(|s| s.to_sample()).collect();

        println!(
            "Audio: {:.1}s, {} samples (mixed from {} ch)",
            i16_samples.len() as f64 / 16000.0,
            i16_samples.len(),
            channels
        );

        let segments = diarize(&i16_samples, 16000, None).unwrap();

        println!("\n{} segments found:\n", segments.len());
        let mut speakers = std::collections::HashSet::new();
        for seg in &segments {
            speakers.insert(seg.speaker);
            let dur = seg.end - seg.start;
            println!(
                "  {:>6.2}s - {:>6.2}s  ({:>5.2}s)  Speaker {}",
                seg.start, seg.end, dur, seg.speaker
            );
        }
        println!("\nUnique speakers: {}", speakers.len());
    }

    #[test]
    #[ignore]
    fn test_diarize_real_session_stereo_2speakers() {
        use dasp::sample::Sample;
        use rodio::Source;

        let path = std::path::PathBuf::from(env!("HOME"))
            .join("Library/Application Support/hyprnote/sessions")
            .join("72cf1b45-e63d-40d2-b931-8980ad88734b/audio.wav");

        let decoder = rodio::Decoder::try_from(std::fs::File::open(&path).unwrap()).unwrap();
        let channels = decoder.channels() as usize;
        let f32_samples: Vec<f32> = decoder.collect();

        let mono: Vec<f32> = if channels > 1 {
            f32_samples
                .chunks_exact(channels)
                .map(|frame| frame.iter().sum::<f32>() / channels as f32)
                .collect()
        } else {
            f32_samples
        };

        let i16_samples: Vec<i16> = mono.iter().map(|s| s.to_sample()).collect();

        println!(
            "Audio: {:.1}s, {} samples (mixed from {} ch, max_speakers=2)",
            i16_samples.len() as f64 / 16000.0,
            i16_samples.len(),
            channels
        );

        let opts = DiarizeOptions {
            max_speakers: 2,
            ..Default::default()
        };
        let segments = diarize(&i16_samples, 16000, Some(opts)).unwrap();

        println!("\n{} segments found:\n", segments.len());
        let mut speaker_time: std::collections::HashMap<usize, f64> =
            std::collections::HashMap::new();
        for seg in &segments {
            *speaker_time.entry(seg.speaker).or_default() += seg.end - seg.start;
            let dur = seg.end - seg.start;
            println!(
                "  {:>6.2}s - {:>6.2}s  ({:>5.2}s)  Speaker {}",
                seg.start, seg.end, dur, seg.speaker
            );
        }
        println!();
        for (spk, time) in &speaker_time {
            println!("Speaker {}: {:.1}s total", spk, time);
        }
    }
}
