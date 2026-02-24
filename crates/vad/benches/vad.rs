use std::hint::black_box;

use criterion::{BatchSize, Criterion, criterion_group, criterion_main};
use vad::{
    cactus::{Model, VadOptions},
    earshot::{VoiceActivityDetector as EarshotVad, choose_optimal_frame_size},
    silero::{CHUNK_30MS_16KHZ, VadConfig, VadSession},
};

fn pcm_bytes_to_i16(bytes: &[u8]) -> Vec<i16> {
    bytes
        .chunks_exact(2)
        .map(|c| i16::from_le_bytes([c[0], c[1]]))
        .collect()
}

fn cactus_model() -> Model {
    let path = std::env::var("CACTUS_VAD_MODEL").unwrap_or_else(|_| {
        let home = std::env::var("HOME").unwrap();
        format!(
            "{}/Library/Application Support/com.hyprnote.dev/models/cactus/whisper-medium-int8-apple/vad",
            home
        )
    });
    Model::new(&path).unwrap()
}

fn bench_earshot(c: &mut Criterion) {
    let pcm_bytes = hypr_data::english_1::AUDIO;
    let samples: Vec<i16> = pcm_bytes_to_i16(pcm_bytes);
    let frame_size = choose_optimal_frame_size(samples.len());

    c.bench_function("earshot english_1", |b| {
        // EarshotVad::new() is a trivial stack alloc, but kept in setup for symmetry
        b.iter_batched(
            EarshotVad::new,
            |mut detector| {
                let mut speech_count = 0usize;
                for frame in black_box(&samples).chunks(frame_size) {
                    if frame.len() == frame_size {
                        if detector.predict_16khz(frame).unwrap() {
                            speech_count += 1;
                        }
                    }
                }
                black_box(speech_count)
            },
            BatchSize::SmallInput,
        )
    });
}

fn bench_silero(c: &mut Criterion) {
    let pcm_bytes = hypr_data::english_1::AUDIO;
    let samples_f32: Vec<f32> = pcm_bytes_to_i16(pcm_bytes)
        .into_iter()
        .map(|s| s as f32 / 32768.0)
        .collect();

    c.bench_function("silero english_1", |b| {
        // Session creation (ONNX Runtime init + embedded model load) is excluded from timing
        b.iter_batched(
            || VadSession::new(VadConfig::default()).unwrap(),
            |mut session| {
                let mut transitions = Vec::new();
                for chunk in black_box(&samples_f32).chunks(CHUNK_30MS_16KHZ) {
                    if chunk.len() == CHUNK_30MS_16KHZ {
                        transitions.extend(session.process(chunk).unwrap());
                    }
                }
                black_box(transitions)
            },
            BatchSize::SmallInput,
        )
    });
}

fn bench_cactus(c: &mut Criterion) {
    let model = cactus_model();
    let options = VadOptions::default();
    let pcm = hypr_data::english_1::AUDIO;

    c.bench_function("cactus english_1", |b| {
        b.iter(|| model.vad_pcm(black_box(pcm), black_box(&options)).unwrap())
    });
}

criterion_group! {
    name = benches;
    config = Criterion::default()
        .sample_size(10)
        .noise_threshold(1.0);
    targets = bench_earshot, bench_silero, bench_cactus
}
criterion_main!(benches);
