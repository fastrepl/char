use owhisper_interface::batch;

pub(super) fn build_batch_words(
    transcript: &str,
    total_duration: f64,
    confidence: f64,
) -> Vec<batch::Word> {
    let word_strs: Vec<&str> = transcript.split_whitespace().collect();
    if word_strs.is_empty() || total_duration <= 0.0 {
        return vec![];
    }

    let word_duration = total_duration / word_strs.len() as f64;
    word_strs
        .iter()
        .enumerate()
        .map(|(i, w)| batch::Word {
            word: w.to_string(),
            start: i as f64 * word_duration,
            end: (i + 1) as f64 * word_duration,
            confidence,
            speaker: None,
            punctuated_word: Some(w.to_string()),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use owhisper_interface::batch;
    use owhisper_interface::stream::{Extra, Metadata, ModelInfo};

    use super::*;

    #[test]
    fn batch_words_evenly_distributed() {
        let words = build_batch_words("hello beautiful world", 3.0, 0.9);
        assert_eq!(words.len(), 3);

        assert_eq!(words[0].word, "hello");
        assert!((words[0].start - 0.0).abs() < f64::EPSILON);
        assert!((words[0].end - 1.0).abs() < f64::EPSILON);
        assert_eq!(words[0].punctuated_word, Some("hello".to_string()));

        assert_eq!(words[1].word, "beautiful");
        assert!((words[1].start - 1.0).abs() < f64::EPSILON);
        assert!((words[1].end - 2.0).abs() < f64::EPSILON);

        assert_eq!(words[2].word, "world");
        assert!((words[2].start - 2.0).abs() < f64::EPSILON);
        assert!((words[2].end - 3.0).abs() < f64::EPSILON);

        for w in &words {
            assert!((w.confidence - 0.9).abs() < f64::EPSILON);
            assert_eq!(w.speaker, None);
        }
    }

    #[test]
    fn batch_words_empty_transcript() {
        let words = build_batch_words("", 5.0, 0.9);
        assert!(words.is_empty());
    }

    #[test]
    fn batch_words_zero_duration() {
        let words = build_batch_words("hello world", 0.0, 0.9);
        assert!(words.is_empty());
    }

    #[test]
    fn batch_response_deepgram_shape() {
        let words = build_batch_words("hello world", 2.0, 0.95);
        let meta = Metadata {
            model_info: ModelInfo {
                name: "test".to_string(),
                version: "1.0".to_string(),
                arch: "cactus".to_string(),
            },
            extra: Some(Extra::default().into()),
            ..Default::default()
        };

        let mut metadata = serde_json::to_value(&meta).unwrap();
        if let Some(obj) = metadata.as_object_mut() {
            obj.insert("duration".to_string(), serde_json::json!(2.0));
            obj.insert("channels".to_string(), serde_json::json!(1));
        }

        let response = batch::Response {
            metadata: metadata.clone(),
            results: batch::Results {
                channels: vec![batch::Channel {
                    alternatives: vec![batch::Alternatives {
                        transcript: "hello world".to_string(),
                        confidence: 0.95,
                        words,
                    }],
                }],
            },
        };

        let json = serde_json::to_string(&response).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert!(v["metadata"]["request_id"].as_str().is_some());
        assert_eq!(v["metadata"]["duration"], 2.0);
        assert_eq!(v["metadata"]["channels"], 1);
        assert_eq!(v["results"]["channels"].as_array().unwrap().len(), 1);
        assert_eq!(
            v["results"]["channels"][0]["alternatives"][0]["transcript"],
            "hello world"
        );
        assert_eq!(
            v["results"]["channels"][0]["alternatives"][0]["words"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
    }
}
