#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelKind {
    Stt,
    Llm,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, Eq, Hash, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum CactusModel {
    // STT
    WhisperSmallInt4,
    WhisperSmallInt8,
    WhisperSmallInt8Apple,
    WhisperMediumInt4,
    WhisperMediumInt4Apple,
    WhisperMediumInt8,
    WhisperMediumInt8Apple,
    // LLM
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

impl CactusModel {
    pub fn all() -> &'static [CactusModel] {
        &[
            CactusModel::WhisperSmallInt4,
            CactusModel::WhisperSmallInt8,
            CactusModel::WhisperSmallInt8Apple,
            CactusModel::WhisperMediumInt4,
            CactusModel::WhisperMediumInt4Apple,
            CactusModel::WhisperMediumInt8,
            CactusModel::WhisperMediumInt8Apple,
            CactusModel::Gemma3_270m,
            CactusModel::Lfm2_350m,
            CactusModel::Qwen3_0_6b,
            CactusModel::Lfm2_700m,
            CactusModel::Gemma3_1b,
            CactusModel::Lfm2_5_1_2bInstruct,
            CactusModel::Qwen3_1_7b,
            CactusModel::Lfm2Vl450mApple,
            CactusModel::Lfm2_5Vl1_6bApple,
        ]
    }

    pub fn kind(&self) -> ModelKind {
        match self {
            CactusModel::WhisperSmallInt4
            | CactusModel::WhisperSmallInt8
            | CactusModel::WhisperSmallInt8Apple
            | CactusModel::WhisperMediumInt4
            | CactusModel::WhisperMediumInt4Apple
            | CactusModel::WhisperMediumInt8
            | CactusModel::WhisperMediumInt8Apple => ModelKind::Stt,
            CactusModel::Gemma3_270m
            | CactusModel::Lfm2_350m
            | CactusModel::Qwen3_0_6b
            | CactusModel::Lfm2_700m
            | CactusModel::Gemma3_1b
            | CactusModel::Lfm2_5_1_2bInstruct
            | CactusModel::Qwen3_1_7b
            | CactusModel::Lfm2Vl450mApple
            | CactusModel::Lfm2_5Vl1_6bApple => ModelKind::Llm,
        }
    }

    pub fn is_apple(&self) -> bool {
        matches!(
            self,
            CactusModel::WhisperSmallInt8Apple
                | CactusModel::WhisperMediumInt4Apple
                | CactusModel::WhisperMediumInt8Apple
                | CactusModel::Lfm2Vl450mApple
                | CactusModel::Lfm2_5Vl1_6bApple
        )
    }

    pub fn stt() -> Vec<CactusModel> {
        Self::all()
            .iter()
            .filter(|m| m.kind() == ModelKind::Stt)
            .cloned()
            .collect()
    }

    pub fn llm() -> Vec<CactusModel> {
        Self::all()
            .iter()
            .filter(|m| m.kind() == ModelKind::Llm)
            .cloned()
            .collect()
    }

    pub fn apple() -> Vec<CactusModel> {
        Self::all()
            .iter()
            .filter(|m| m.is_apple())
            .cloned()
            .collect()
    }

    pub fn non_apple() -> Vec<CactusModel> {
        Self::all()
            .iter()
            .filter(|m| !m.is_apple())
            .cloned()
            .collect()
    }

    pub fn asset_id(&self) -> &str {
        match self {
            CactusModel::WhisperSmallInt4 => "cactus-whisper-small-int4",
            CactusModel::WhisperSmallInt8 => "cactus-whisper-small-int8",
            CactusModel::WhisperSmallInt8Apple => "cactus-whisper-small-int8-apple",
            CactusModel::WhisperMediumInt4 => "cactus-whisper-medium-int4",
            CactusModel::WhisperMediumInt4Apple => "cactus-whisper-medium-int4-apple",
            CactusModel::WhisperMediumInt8 => "cactus-whisper-medium-int8",
            CactusModel::WhisperMediumInt8Apple => "cactus-whisper-medium-int8-apple",
            CactusModel::Gemma3_270m => "cactus-gemma3-270m",
            CactusModel::Lfm2_350m => "cactus-lfm2-350m",
            CactusModel::Qwen3_0_6b => "cactus-qwen3-0.6b",
            CactusModel::Lfm2_700m => "cactus-lfm2-700m",
            CactusModel::Gemma3_1b => "cactus-gemma3-1b",
            CactusModel::Lfm2_5_1_2bInstruct => "cactus-lfm2.5-1.2b-instruct",
            CactusModel::Qwen3_1_7b => "cactus-qwen3-1.7b",
            CactusModel::Lfm2Vl450mApple => "cactus-lfm2-vl-450m-apple",
            CactusModel::Lfm2_5Vl1_6bApple => "cactus-lfm2.5-vl-1.6b-apple",
        }
    }

    pub fn dir_name(&self) -> &str {
        match self {
            CactusModel::WhisperSmallInt4 => "whisper-small-int4",
            CactusModel::WhisperSmallInt8 => "whisper-small-int8",
            CactusModel::WhisperSmallInt8Apple => "whisper-small-int8-apple",
            CactusModel::WhisperMediumInt4 => "whisper-medium-int4",
            CactusModel::WhisperMediumInt4Apple => "whisper-medium-int4-apple",
            CactusModel::WhisperMediumInt8 => "whisper-medium-int8",
            CactusModel::WhisperMediumInt8Apple => "whisper-medium-int8-apple",
            CactusModel::Gemma3_270m => "gemma3-270m",
            CactusModel::Lfm2_350m => "lfm2-350m",
            CactusModel::Qwen3_0_6b => "qwen3-0.6b",
            CactusModel::Lfm2_700m => "lfm2-700m",
            CactusModel::Gemma3_1b => "gemma3-1b",
            CactusModel::Lfm2_5_1_2bInstruct => "lfm2.5-1.2b-instruct",
            CactusModel::Qwen3_1_7b => "qwen3-1.7b",
            CactusModel::Lfm2Vl450mApple => "lfm2-vl-450m-apple",
            CactusModel::Lfm2_5Vl1_6bApple => "lfm2.5-vl-1.6b-apple",
        }
    }

    pub fn zip_name(&self) -> String {
        format!("{}.zip", self.dir_name())
    }

    pub fn description(&self) -> &str {
        match self {
            CactusModel::WhisperSmallInt8Apple
            | CactusModel::WhisperMediumInt4Apple
            | CactusModel::WhisperMediumInt8Apple => "Apple Neural Engine",
            _ => "",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            CactusModel::WhisperSmallInt4 => "Whisper Small (INT4)",
            CactusModel::WhisperSmallInt8 => "Whisper Small (INT8)",
            CactusModel::WhisperSmallInt8Apple => "Whisper Small (INT8, Apple NPU)",
            CactusModel::WhisperMediumInt4 => "Whisper Medium (INT4)",
            CactusModel::WhisperMediumInt4Apple => "Whisper Medium (INT4, Apple NPU)",
            CactusModel::WhisperMediumInt8 => "Whisper Medium (INT8)",
            CactusModel::WhisperMediumInt8Apple => "Whisper Medium (INT8, Apple NPU)",
            CactusModel::Gemma3_270m => "Gemma 3 (270M)",
            CactusModel::Lfm2_350m => "LFM2 (350M)",
            CactusModel::Qwen3_0_6b => "Qwen3 (0.6B)",
            CactusModel::Lfm2_700m => "LFM2 (700M)",
            CactusModel::Gemma3_1b => "Gemma 3 (1B)",
            CactusModel::Lfm2_5_1_2bInstruct => "LFM2.5 Instruct (1.2B)",
            CactusModel::Qwen3_1_7b => "Qwen3 (1.7B)",
            CactusModel::Lfm2Vl450mApple => "LFM2 VL (450M, Apple NPU)",
            CactusModel::Lfm2_5Vl1_6bApple => "LFM2.5 VL (1.6B, Apple NPU)",
        }
    }
}
