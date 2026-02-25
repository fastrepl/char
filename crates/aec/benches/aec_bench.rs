use std::{hint::black_box, path::PathBuf};

use criterion::{Criterion, criterion_group, criterion_main};
use hound::WavReader;

use aec::AEC;

fn load_test_data() -> (Vec<f32>, Vec<f32>) {
    let data_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("data")
        .join("inputs");

    let lpb_sample = WavReader::open(data_dir.join("doubletalk_lpb_sample.wav")).unwrap();
    let mic_sample = WavReader::open(data_dir.join("doubletalk_mic_sample.wav")).unwrap();

    let lpb_samples: Vec<f32> = lpb_sample
        .into_samples::<i16>()
        .map(|s| s.unwrap() as f32 / 32768.0)
        .collect();

    let mic_samples: Vec<f32> = mic_sample
        .into_samples::<i16>()
        .map(|s| s.unwrap() as f32 / 32768.0)
        .collect();

    (mic_samples, lpb_samples)
}

fn bench_aec_initialization(c: &mut Criterion) {
    c.bench_function("aec_initialization", |b| {
        b.iter(|| black_box(AEC::new().unwrap()))
    });
}

fn bench_aec_process(c: &mut Criterion) {
    let (mic_samples, lpb_samples) = load_test_data();
    let mut aec = AEC::new().unwrap();

    c.bench_function("aec_process_full", |b| {
        b.iter(|| {
            black_box(
                aec.process(black_box(&mic_samples), black_box(&lpb_samples))
                    .unwrap(),
            )
        })
    });
}

fn bench_aec_process_chunks(c: &mut Criterion) {
    let (mic_samples, lpb_samples) = load_test_data();
    let mut aec = AEC::new().unwrap();

    let chunk_sizes = [1024, 4096, 16384];

    for &chunk_size in &chunk_sizes {
        let mic_chunk = &mic_samples[..chunk_size.min(mic_samples.len())];
        let lpb_chunk = &lpb_samples[..chunk_size.min(lpb_samples.len())];

        c.bench_function(&format!("aec_process_chunk_{}", chunk_size), |b| {
            b.iter(|| {
                black_box(
                    aec.process(black_box(mic_chunk), black_box(lpb_chunk))
                        .unwrap(),
                )
            })
        });
    }
}

fn bench_aec_throughput(c: &mut Criterion) {
    let (mic_samples, lpb_samples) = load_test_data();
    let mut aec = AEC::new().unwrap();

    let mut group = c.benchmark_group("aec_throughput");
    group.throughput(criterion::Throughput::Elements(mic_samples.len() as u64));

    group.bench_function("samples_per_second", |b| {
        b.iter(|| {
            black_box(
                aec.process(black_box(&mic_samples), black_box(&lpb_samples))
                    .unwrap(),
            )
        })
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_aec_initialization,
    bench_aec_process,
    bench_aec_process_chunks,
    bench_aec_throughput
);
criterion_main!(benches);
