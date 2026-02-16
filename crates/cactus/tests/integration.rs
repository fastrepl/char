use std::sync::atomic::{AtomicUsize, Ordering};

use cactus::{CompleteOptions, Language, Message, Model, TranscribeOptions, Transcriber};

fn llm_model() -> Model {
    let path = std::env::var("CACTUS_LLM_MODEL")
        .unwrap_or_else(|_| "/tmp/cactus-models/gemma-3-270m-it".into());
    Model::new(&path).unwrap()
}

fn stt_model() -> Model {
    let path = std::env::var("CACTUS_STT_MODEL")
        .unwrap_or_else(|_| "/tmp/cactus-models/whisper-small".into());
    Model::new(&path).unwrap()
}

// ---- LLM ----

// cargo test -p cactus --test integration test_complete -- --ignored --nocapture
#[ignore]
#[test]
fn test_complete() {
    let model = llm_model();
    let messages = vec![
        Message::system("Answer in one word only."),
        Message::user("What is 2+2?"),
    ];
    let options = CompleteOptions {
        max_tokens: Some(20),
        temperature: Some(0.0),
        ..Default::default()
    };

    let r = model.complete(&messages, &options).unwrap();

    assert!(!r.response.is_empty());
    assert!(r.total_tokens > 0);
    println!("response: {:?}", r.response);
}

// cargo test -p cactus --test integration test_complete_streaming -- --ignored --nocapture
#[ignore]
#[test]
fn test_complete_streaming() {
    let model = llm_model();
    let messages = vec![Message::user("Say hello")];
    let options = CompleteOptions {
        max_tokens: Some(20),
        temperature: Some(0.0),
        ..Default::default()
    };

    let token_count = AtomicUsize::new(0);

    let r = model
        .complete_streaming(&messages, &options, |token| {
            assert!(!token.is_empty());
            token_count.fetch_add(1, Ordering::Relaxed);
            true
        })
        .unwrap();

    assert!(token_count.load(Ordering::Relaxed) > 0);
    assert!(!r.response.is_empty());
    println!(
        "streamed {} tokens: {:?}",
        token_count.load(Ordering::Relaxed),
        r.response
    );
}

// cargo test -p cactus --test integration test_complete_streaming_early_stop -- --ignored --nocapture
#[ignore]
#[test]
fn test_complete_streaming_early_stop() {
    let model = llm_model();
    let messages = vec![Message::user("Count from 1 to 100")];
    let options = CompleteOptions {
        max_tokens: Some(200),
        ..Default::default()
    };

    let token_count = AtomicUsize::new(0);

    let _ = model.complete_streaming(&messages, &options, |_token| {
        let n = token_count.fetch_add(1, Ordering::Relaxed) + 1;
        if n >= 3 {
            model.stop();
            return false;
        }
        true
    });

    let final_count = token_count.load(Ordering::Relaxed);
    assert!(
        final_count < 200,
        "should have stopped early, got {final_count} tokens"
    );
    println!("stopped after {final_count} tokens");
}

// cargo test -p cactus --test integration test_complete_multi_turn -- --ignored --nocapture
#[ignore]
#[test]
fn test_complete_multi_turn() {
    let model = llm_model();
    let options = CompleteOptions {
        max_tokens: Some(30),
        temperature: Some(0.0),
        ..Default::default()
    };

    let r1 = model
        .complete(&[Message::user("Say exactly: pineapple")], &options)
        .unwrap();

    model.reset();

    let r2 = model
        .complete(
            &[
                Message::user("Say exactly: pineapple"),
                Message::assistant(&r1.response),
                Message::user("What fruit did I just ask you to say?"),
            ],
            &options,
        )
        .unwrap();

    assert!(!r1.response.is_empty());
    assert!(!r2.response.is_empty());
    println!("turn1: {:?}", r1.response);
    println!("turn2: {:?}", r2.response);
}

// ---- STT ----

// cargo test -p cactus --test integration test_transcribe_file -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_file() {
    let model = stt_model();
    let options = TranscribeOptions::default();

    let r = model
        .transcribe_file(data::english_1::AUDIO_PATH, &options)
        .unwrap();

    assert!(!r.response.is_empty());
    assert!(r.total_tokens > 0);
    println!("transcription: {:?}", r.response);
}

// cargo test -p cactus --test integration test_transcribe_pcm -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_pcm() {
    let model = stt_model();
    let options = TranscribeOptions::default();

    let r = model
        .transcribe_pcm(data::english_1::AUDIO, &options)
        .unwrap();

    assert!(!r.response.is_empty());
    assert!(r.total_tokens > 0);
    println!("pcm transcription: {:?}", r.response);
}

// cargo test -p cactus --test integration test_transcribe_with_language -- --ignored --nocapture
#[ignore]
#[test]
fn test_transcribe_with_language() {
    let model = stt_model();
    let options = TranscribeOptions {
        language: Some(Language::En),
        temperature: Some(0.0),
        ..Default::default()
    };

    let r = model
        .transcribe_file(data::english_1::AUDIO_PATH, &options)
        .unwrap();
    assert!(!r.response.is_empty());
    println!("en transcription: {:?}", r.response);
}

// ---- Streaming STT ----

// cargo test -p cactus --test integration test_stream_transcriber -- --ignored --nocapture
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

// cargo test -p cactus --test integration test_stream_transcriber_drop -- --ignored --nocapture
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

// cargo test -p cactus --test integration test_stream_transcriber_process_samples -- --ignored --nocapture
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

// cargo test -p cactus --test integration test_stream_transcriber_process_f32 -- --ignored --nocapture
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

// ---- Error cases ----

// cargo test -p cactus --test integration test_invalid_model_path -- --nocapture
#[test]
fn test_invalid_model_path() {
    let r = Model::new("/nonexistent/path/to/model");
    assert!(r.is_err());
}
