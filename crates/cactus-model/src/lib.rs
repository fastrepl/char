#[derive(
    Debug,
    Clone,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
    Eq,
    Hash,
    PartialEq,
    strum::EnumString,
    strum::Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "kebab-case")]
pub enum CactusSttModel {
    WhisperSmallInt4,
    WhisperSmallInt8,
    WhisperSmallInt8Apple,
    WhisperMediumInt4,
    WhisperMediumInt4Apple,
    WhisperMediumInt8,
    WhisperMediumInt8Apple,
}

impl CactusSttModel {
    pub fn all() -> &'static [CactusSttModel] {
        &[
            CactusSttModel::WhisperSmallInt4,
            CactusSttModel::WhisperSmallInt8,
            CactusSttModel::WhisperSmallInt8Apple,
            CactusSttModel::WhisperMediumInt4,
            CactusSttModel::WhisperMediumInt4Apple,
            CactusSttModel::WhisperMediumInt8,
            CactusSttModel::WhisperMediumInt8Apple,
        ]
    }

    pub fn is_apple(&self) -> bool {
        matches!(
            self,
            CactusSttModel::WhisperSmallInt8Apple
                | CactusSttModel::WhisperMediumInt4Apple
                | CactusSttModel::WhisperMediumInt8Apple
        )
    }

    pub fn asset_id(&self) -> &str {
        match self {
            CactusSttModel::WhisperSmallInt4 => "cactus-whisper-small-int4",
            CactusSttModel::WhisperSmallInt8 => "cactus-whisper-small-int8",
            CactusSttModel::WhisperSmallInt8Apple => "cactus-whisper-small-int8-apple",
            CactusSttModel::WhisperMediumInt4 => "cactus-whisper-medium-int4",
            CactusSttModel::WhisperMediumInt4Apple => "cactus-whisper-medium-int4-apple",
            CactusSttModel::WhisperMediumInt8 => "cactus-whisper-medium-int8",
            CactusSttModel::WhisperMediumInt8Apple => "cactus-whisper-medium-int8-apple",
        }
    }

    pub fn dir_name(&self) -> &str {
        match self {
            CactusSttModel::WhisperSmallInt4 => "whisper-small-int4",
            CactusSttModel::WhisperSmallInt8 => "whisper-small-int8",
            CactusSttModel::WhisperSmallInt8Apple => "whisper-small-int8-apple",
            CactusSttModel::WhisperMediumInt4 => "whisper-medium-int4",
            CactusSttModel::WhisperMediumInt4Apple => "whisper-medium-int4-apple",
            CactusSttModel::WhisperMediumInt8 => "whisper-medium-int8",
            CactusSttModel::WhisperMediumInt8Apple => "whisper-medium-int8-apple",
        }
    }

    pub fn zip_name(&self) -> String {
        format!("{}.zip", self.dir_name())
    }

    pub fn model_url(&self) -> Option<&str> {
        match self {
            CactusSttModel::WhisperSmallInt8 => Some(
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/Cactus-Compute/weights/whisper-small-int8.zip",
            ),
            CactusSttModel::WhisperSmallInt8Apple => Some(
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/Cactus-Compute/weights/whisper-small-int8-apple.zip",
            ),
            CactusSttModel::WhisperMediumInt8 => Some(
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/Cactus-Compute/weights/whisper-medium-int8.zip",
            ),
            CactusSttModel::WhisperMediumInt8Apple => Some(
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/Cactus-Compute/weights/whisper-medium-int8-apple.zip",
            ),
            _ => None,
        }
    }

    pub fn description(&self) -> &str {
        match self {
            CactusSttModel::WhisperSmallInt8Apple
            | CactusSttModel::WhisperMediumInt4Apple
            | CactusSttModel::WhisperMediumInt8Apple => "Apple Neural Engine",
            _ => "",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            CactusSttModel::WhisperSmallInt4 => "Whisper Small (INT4)",
            CactusSttModel::WhisperSmallInt8 => "Whisper Small (INT8)",
            CactusSttModel::WhisperSmallInt8Apple => "Whisper Small (INT8, Apple NPU)",
            CactusSttModel::WhisperMediumInt4 => "Whisper Medium (INT4)",
            CactusSttModel::WhisperMediumInt4Apple => "Whisper Medium (INT4, Apple NPU)",
            CactusSttModel::WhisperMediumInt8 => "Whisper Medium (INT8)",
            CactusSttModel::WhisperMediumInt8Apple => "Whisper Medium (INT8, Apple NPU)",
        }
    }

    pub fn supported_languages(&self) -> Vec<hypr_language::Language> {
        hypr_language::whisper_multilingual()
    }
}

#[derive(
    Debug,
    Clone,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
    Eq,
    Hash,
    PartialEq,
    strum::EnumString,
    strum::Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "kebab-case")]
pub enum CactusLlmModel {
    Gemma3_270m,
    Lfm2_350m,
    Qwen3_0_6b,
    Lfm2_700m,
    Gemma3_1b,
    Lfm2_5_1_2bInstruct,
    Qwen3_1_7b,
    Lfm2Vl450mApple,
    Lfm2_5Vl1_6bApple,
}

impl CactusLlmModel {
    pub fn all() -> &'static [CactusLlmModel] {
        &[
            CactusLlmModel::Gemma3_270m,
            CactusLlmModel::Lfm2_350m,
            CactusLlmModel::Qwen3_0_6b,
            CactusLlmModel::Lfm2_700m,
            CactusLlmModel::Gemma3_1b,
            CactusLlmModel::Lfm2_5_1_2bInstruct,
            CactusLlmModel::Qwen3_1_7b,
            CactusLlmModel::Lfm2Vl450mApple,
            CactusLlmModel::Lfm2_5Vl1_6bApple,
        ]
    }

    pub fn is_apple(&self) -> bool {
        matches!(
            self,
            CactusLlmModel::Lfm2Vl450mApple | CactusLlmModel::Lfm2_5Vl1_6bApple
        )
    }

    pub fn asset_id(&self) -> &str {
        match self {
            CactusLlmModel::Gemma3_270m => "cactus-gemma3-270m",
            CactusLlmModel::Lfm2_350m => "cactus-lfm2-350m",
            CactusLlmModel::Qwen3_0_6b => "cactus-qwen3-0.6b",
            CactusLlmModel::Lfm2_700m => "cactus-lfm2-700m",
            CactusLlmModel::Gemma3_1b => "cactus-gemma3-1b",
            CactusLlmModel::Lfm2_5_1_2bInstruct => "cactus-lfm2.5-1.2b-instruct",
            CactusLlmModel::Qwen3_1_7b => "cactus-qwen3-1.7b",
            CactusLlmModel::Lfm2Vl450mApple => "cactus-lfm2-vl-450m-apple",
            CactusLlmModel::Lfm2_5Vl1_6bApple => "cactus-lfm2.5-vl-1.6b-apple",
        }
    }

    pub fn dir_name(&self) -> &str {
        match self {
            CactusLlmModel::Gemma3_270m => "gemma3-270m",
            CactusLlmModel::Lfm2_350m => "lfm2-350m",
            CactusLlmModel::Qwen3_0_6b => "qwen3-0.6b",
            CactusLlmModel::Lfm2_700m => "lfm2-700m",
            CactusLlmModel::Gemma3_1b => "gemma3-1b",
            CactusLlmModel::Lfm2_5_1_2bInstruct => "lfm2.5-1.2b-instruct",
            CactusLlmModel::Qwen3_1_7b => "qwen3-1.7b",
            CactusLlmModel::Lfm2Vl450mApple => "lfm2-vl-450m-apple",
            CactusLlmModel::Lfm2_5Vl1_6bApple => "lfm2.5-vl-1.6b-apple",
        }
    }

    pub fn zip_name(&self) -> String {
        format!("{}.zip", self.dir_name())
    }

    pub fn model_url(&self) -> Option<&str> {
        None
    }

    pub fn description(&self) -> &str {
        ""
    }

    pub fn display_name(&self) -> &str {
        match self {
            CactusLlmModel::Gemma3_270m => "Gemma 3 (270M)",
            CactusLlmModel::Lfm2_350m => "LFM2 (350M)",
            CactusLlmModel::Qwen3_0_6b => "Qwen3 (0.6B)",
            CactusLlmModel::Lfm2_700m => "LFM2 (700M)",
            CactusLlmModel::Gemma3_1b => "Gemma 3 (1B)",
            CactusLlmModel::Lfm2_5_1_2bInstruct => "LFM2.5 Instruct (1.2B)",
            CactusLlmModel::Qwen3_1_7b => "Qwen3 (1.7B)",
            CactusLlmModel::Lfm2Vl450mApple => "LFM2 VL (450M, Apple NPU)",
            CactusLlmModel::Lfm2_5Vl1_6bApple => "LFM2.5 VL (1.6B, Apple NPU)",
        }
    }
}

/// Unified enum for code that handles both STT and LLM Cactus models together.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Eq, Hash, PartialEq)]
#[serde(untagged)]
pub enum CactusModel {
    Stt(CactusSttModel),
    Llm(CactusLlmModel),
}

impl CactusModel {
    pub fn all() -> Vec<CactusModel> {
        CactusSttModel::all()
            .iter()
            .cloned()
            .map(CactusModel::Stt)
            .chain(CactusLlmModel::all().iter().cloned().map(CactusModel::Llm))
            .collect()
    }

    pub fn stt() -> &'static [CactusSttModel] {
        CactusSttModel::all()
    }

    pub fn llm() -> &'static [CactusLlmModel] {
        CactusLlmModel::all()
    }

    pub fn is_apple(&self) -> bool {
        match self {
            CactusModel::Stt(m) => m.is_apple(),
            CactusModel::Llm(m) => m.is_apple(),
        }
    }

    pub fn asset_id(&self) -> &str {
        match self {
            CactusModel::Stt(m) => m.asset_id(),
            CactusModel::Llm(m) => m.asset_id(),
        }
    }

    pub fn dir_name(&self) -> &str {
        match self {
            CactusModel::Stt(m) => m.dir_name(),
            CactusModel::Llm(m) => m.dir_name(),
        }
    }

    pub fn zip_name(&self) -> String {
        match self {
            CactusModel::Stt(m) => m.zip_name(),
            CactusModel::Llm(m) => m.zip_name(),
        }
    }

    pub fn model_url(&self) -> Option<&str> {
        match self {
            CactusModel::Stt(m) => m.model_url(),
            CactusModel::Llm(m) => m.model_url(),
        }
    }

    pub fn description(&self) -> &str {
        match self {
            CactusModel::Stt(m) => m.description(),
            CactusModel::Llm(m) => m.description(),
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            CactusModel::Stt(m) => m.display_name(),
            CactusModel::Llm(m) => m.display_name(),
        }
    }
}
