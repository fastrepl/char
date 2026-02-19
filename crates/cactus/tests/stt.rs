use cactus::{Model, TranscribeOptions, Transcriber};

fn stt_model() -> Model {
    let path = std::env::var("CACTUS_STT_MODEL")
        .unwrap_or_else(|_| "/tmp/cactus-model/moonshine-base-cactus".into());
    Model::new(&path).unwrap()
}

// cargo test -p cactus --test stt test_transcribe_file -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_file() {
    let model = stt_model();
    let options = TranscribeOptions::default();

    let r = model
        .transcribe_file(data::english_1::AUDIO_PATH, &options)
        .unwrap();

    assert!(!r.text.is_empty());
    println!("transcription: {:?}", r.text);
}

// cargo test -p cactus --test stt test_transcribe_pcm -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_pcm() {
    let model = stt_model();
    let options = TranscribeOptions::default();

    let r = model
        .transcribe_pcm(data::english_1::AUDIO, &options)
        .unwrap();

    assert!(!r.text.is_empty());
    println!("pcm transcription: {:?}", r.text);
}

// cargo test -p cactus --test stt test_transcribe_with_language -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_with_language() {
    let model = stt_model();
    let options = TranscribeOptions {
        language: Some("en".parse().unwrap()),
        temperature: Some(0.0),
        ..Default::default()
    };

    let r = model
        .transcribe_file(data::english_1::AUDIO_PATH, &options)
        .unwrap();
    assert!(!r.text.is_empty());
    println!("en transcription: {:?}", r.text);
}

// cargo test -p cactus --test stt test_stream_transcriber -- --ignored --nocapture
#[ignore]
#[test]
fn test_stream_transcriber() {
    let model = stt_model();
    let pcm = data::english_1::AUDIO;
    let options = TranscribeOptions::default();

    let mut transcriber = Transcriber::new(&model, &options).unwrap();

    let chunk_size = 32000; // 1 second at 16kHz 16-bit mono
    let mut had_confirmed = false;

    for chunk in pcm.chunks(chunk_size).take(10) {
        let r = transcriber.process(chunk).unwrap();
        if !r.confirmed.is_empty() {
            had_confirmed = true;
        }
        println!("confirmed={:?} pending={:?}", r.confirmed, r.pending);
    }

    let final_result = transcriber.stop().unwrap();
    println!("final: {:?}", final_result.confirmed);

    assert!(had_confirmed, "expected at least one confirmed segment");
}

// cargo test -p cactus --test stt test_stream_transcriber_drop -- --ignored --nocapture
#[ignore]
#[test]
fn test_stream_transcriber_drop() {
    let model = stt_model();
    let options = TranscribeOptions::default();

    {
        let mut transcriber = Transcriber::new(&model, &options).unwrap();
        let silence = vec![0u8; 32000];
        let _ = transcriber.process(&silence);
    }
}

// cargo test -p cactus --test stt test_stream_transcriber_process_samples -- --ignored --nocapture
#[ignore]
#[test]
fn test_stream_transcriber_process_samples() {
    let model = stt_model();
    let options = TranscribeOptions::default();
    let mut transcriber = Transcriber::new(&model, &options).unwrap();

    let samples = vec![0i16; 16000];
    let r = transcriber.process_samples(&samples).unwrap();
    println!(
        "silence result: confirmed={:?} pending={:?}",
        r.confirmed, r.pending
    );

    let _ = transcriber.stop().unwrap();
}

// cargo test -p cactus --test stt test_stream_transcriber_process_f32 -- --ignored --nocapture
#[ignore]
#[test]
fn test_stream_transcriber_process_f32() {
    let model = stt_model();
    let options = TranscribeOptions::default();
    let mut transcriber = Transcriber::new(&model, &options).unwrap();

    let samples = vec![0.0f32; 16000];
    let r = transcriber.process_f32(&samples).unwrap();
    println!(
        "f32 silence result: confirmed={:?} pending={:?}",
        r.confirmed, r.pending
    );

    let _ = transcriber.stop().unwrap();
}
