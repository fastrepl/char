use axum::{Router, routing::get};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelAsset {
    pub id: String,
    pub url: String,
    pub checksum: u32,
    pub size_bytes: u64,
}

fn model_assets() -> Vec<ModelAsset> {
    vec![
        // AmModel
        ModelAsset {
            id: "am-parakeet-v2".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/nvidia_parakeet-v2_476MB.tar".into(),
            checksum: 1906983049,
            size_bytes: 476134400,
        },
        ModelAsset {
            id: "am-parakeet-v3".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/nvidia_parakeet-v3_494MB.tar".into(),
            checksum: 3016060540,
            size_bytes: 494141440,
        },
        ModelAsset {
            id: "am-whisper-large-v3".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/openai_whisper-large-v3-v20240930_626MB.tar".into(),
            checksum: 1964673816,
            size_bytes: 625990656,
        },
        // WhisperModel
        ModelAsset {
            id: "QuantizedTiny".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin".into(),
            checksum: 1235175537,
            size_bytes: 43537433,
        },
        ModelAsset {
            id: "QuantizedTinyEn".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-tiny.en-q8_0.bin".into(),
            checksum: 230334082,
            size_bytes: 43550795,
        },
        ModelAsset {
            id: "QuantizedBase".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-base-q8_0.bin".into(),
            checksum: 4019564439,
            size_bytes: 81768585,
        },
        ModelAsset {
            id: "QuantizedBaseEn".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-base.en-q8_0.bin".into(),
            checksum: 2554759952,
            size_bytes: 81781811,
        },
        ModelAsset {
            id: "QuantizedSmall".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-small-q8_0.bin".into(),
            checksum: 3764849512,
            size_bytes: 264464607,
        },
        ModelAsset {
            id: "QuantizedSmallEn".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-small.en-q8_0.bin".into(),
            checksum: 3958576310,
            size_bytes: 264477561,
        },
        ModelAsset {
            id: "QuantizedLargeTurbo".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/ggerganov/whisper.cpp/main/ggml-large-v3-turbo-q8_0.bin".into(),
            checksum: 3055274469,
            size_bytes: 874188075,
        },
        // SupportedModel (local-llm)
        ModelAsset {
            id: "Llama3p2_3bQ4".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf".into(),
            checksum: 2831308098,
            size_bytes: 2019377440,
        },
        ModelAsset {
            id: "Gemma3_4bQ4".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/unsloth/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_M.gguf".into(),
            checksum: 2760830291,
            size_bytes: 2489894016,
        },
        ModelAsset {
            id: "HyprLLM".into(),
            url: "https://hyprnote.s3.us-east-1.amazonaws.com/v0/yujonglee/hypr-llm-sm/model_q4_k_m.gguf".into(),
            checksum: 4037351144,
            size_bytes: 1107409056,
        },
    ]
}

async fn get_models() -> axum::Json<Vec<ModelAsset>> {
    axum::Json(model_assets())
}

pub fn router() -> Router {
    Router::new().route("/models", get(get_models))
}
