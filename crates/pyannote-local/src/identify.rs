use std::collections::HashMap;

use simsimd::SpatialSimilarity;

pub struct EmbeddingManager {
    max_speakers: usize,
    speakers: HashMap<usize, Vec<f32>>,
    speaker_counts: HashMap<usize, usize>,
    next_speaker_id: usize,
    threshold: f32,
}

impl EmbeddingManager {
    pub fn new(max_speakers: usize, threshold: f32) -> Self {
        Self {
            max_speakers,
            speakers: HashMap::new(),
            speaker_counts: HashMap::new(),
            next_speaker_id: 0,
            threshold,
        }
    }

    pub fn identify(&mut self, embedding: &[f32]) -> usize {
        let (best_id, best_similarity) = self.find_best_match(embedding);

        if let Some(id) = best_id {
            if best_similarity > self.threshold {
                self.update_centroid(id, embedding);
                return id;
            }
        }

        if self.speakers.len() < self.max_speakers {
            let id = self.next_speaker_id;
            self.next_speaker_id += 1;
            self.speakers.insert(id, embedding.to_vec());
            self.speaker_counts.insert(id, 1);
            return id;
        }

        if let Some(id) = best_id {
            self.update_centroid(id, embedding);
            id
        } else {
            0
        }
    }

    fn update_centroid(&mut self, id: usize, embedding: &[f32]) {
        let count = self.speaker_counts.entry(id).or_insert(1);
        if let Some(centroid) = self.speakers.get_mut(&id) {
            let n = *count as f32;
            for (c, &e) in centroid.iter_mut().zip(embedding.iter()) {
                *c = (*c * n + e) / (n + 1.0);
            }
            *count += 1;
        }
    }

    fn find_best_match(&self, embedding: &[f32]) -> (Option<usize>, f32) {
        let mut best_id = None;
        let mut best_similarity = f32::NEG_INFINITY;

        for (&id, known) in &self.speakers {
            let distance = f32::cosine(embedding, known).unwrap_or(1.0);
            let similarity = 1.0 - distance as f32;
            if similarity > best_similarity {
                best_similarity = similarity;
                best_id = Some(id);
            }
        }

        (best_id, best_similarity)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_embedding(dim: usize, dominant_axis: usize) -> Vec<f32> {
        let mut emb = vec![0.0f32; dim];
        emb[dominant_axis] = 1.0;
        emb
    }

    #[test]
    fn test_identify_matches_similar() {
        let mut manager = EmbeddingManager::new(6, 0.5);

        let emb1 = make_embedding(128, 0);
        let mut emb2 = make_embedding(128, 0);
        emb2[1] = 0.1;

        let id1 = manager.identify(&emb1);
        let id2 = manager.identify(&emb2);
        assert_eq!(id1, id2, "similar embeddings should match");
    }

    #[test]
    fn test_identify_separates_different() {
        let mut manager = EmbeddingManager::new(6, 0.5);

        let emb1 = make_embedding(128, 0);
        let emb2 = make_embedding(128, 64);

        let id1 = manager.identify(&emb1);
        let id2 = manager.identify(&emb2);
        assert_ne!(id1, id2, "orthogonal embeddings should get different IDs");
    }

    #[test]
    fn test_max_speakers_limit() {
        let mut manager = EmbeddingManager::new(2, 0.5);

        let emb1 = make_embedding(128, 0);
        let emb2 = make_embedding(128, 64);
        let emb3 = make_embedding(128, 127);

        let id1 = manager.identify(&emb1);
        let id2 = manager.identify(&emb2);
        let id3 = manager.identify(&emb3);

        assert_ne!(id1, id2);
        let unique: std::collections::HashSet<_> = [id1, id2, id3].into_iter().collect();
        assert!(
            unique.len() <= 2,
            "should not exceed max_speakers=2, got {unique:?}"
        );
    }

    #[test]
    #[ignore]
    fn test_identify_same_speaker_real_audio() {
        use crate::embedding::EmbeddingExtractor;
        use dasp::sample::{FromSample, Sample};

        fn get_audio<T: FromSample<f32>>(path: &str) -> Vec<T> {
            let base = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
            let p = base.join("src/data").join(path);
            let f32_samples = rodio::Decoder::try_from(std::fs::File::open(p).unwrap())
                .unwrap()
                .collect::<Vec<f32>>();
            f32_samples
                .iter()
                .map(|s| s.to_sample())
                .collect::<Vec<_>>()
        }

        let mut extractor = EmbeddingExtractor::new();
        let mut manager = EmbeddingManager::new(6, 0.5);

        let emb1 = extractor
            .compute(get_audio::<i16>("male_welcome_1.mp3").into_iter())
            .unwrap();
        let emb2 = extractor
            .compute(get_audio::<i16>("male_welcome_2.mp3").into_iter())
            .unwrap();

        let id1 = manager.identify(&emb1);
        let id2 = manager.identify(&emb2);
        assert_eq!(id1, id2, "same speaker should get same ID");
    }
}
