pub static SUPPORTED_MODELS: &[SupportedModel] = &[
    SupportedModel::Llama3p2_3bQ4,
    SupportedModel::HyprLLM,
    SupportedModel::Gemma3_4bQ4,
];

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ModelInfo {
    pub key: SupportedModel,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct CustomModelInfo {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(tag = "type", content = "content")]
pub enum ModelSelection {
    Predefined { key: SupportedModel },
    Custom { path: String },
}

impl ModelSelection {
    pub fn file_path(&self, models_dir: &std::path::Path) -> std::path::PathBuf {
        match self {
            ModelSelection::Predefined { key } => models_dir.join(key.file_name()),
            ModelSelection::Custom { path } => std::path::PathBuf::from(path),
        }
    }

    pub fn display_name(&self) -> String {
        match self {
            ModelSelection::Predefined { key } => match key {
                SupportedModel::Llama3p2_3bQ4 => "Llama 3.2 3B Q4".to_string(),
                SupportedModel::HyprLLM => "HyprLLM".to_string(),
                SupportedModel::Gemma3_4bQ4 => "Gemma 3 4B Q4".to_string(),
            },
            ModelSelection::Custom { path } => std::path::Path::new(path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Custom Model")
                .to_string(),
        }
    }
}

#[derive(
    Debug,
    Eq,
    Hash,
    PartialEq,
    Clone,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
    strum::Display,
)]
pub enum SupportedModel {
    Llama3p2_3bQ4,
    Gemma3_4bQ4,
    HyprLLM,
}

impl SupportedModel {
    pub fn file_name(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => "llm.gguf",
            SupportedModel::HyprLLM => "hypr-llm.gguf",
            SupportedModel::Gemma3_4bQ4 => "gemma-3-4b-it-Q4_K_M.gguf",
        }
    }

    pub fn model_url(&self) -> &str {
        match self {
            SupportedModel::Llama3p2_3bQ4 => {
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
            }
            SupportedModel::HyprLLM => {
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/yujonglee/hypr-llm-sm/model_q4_k_m.gguf"
            }
            SupportedModel::Gemma3_4bQ4 => {
                "https://hyprnote.s3.us-east-1.amazonaws.com/v0/unsloth/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_M.gguf"
            }
        }
    }

    pub fn model_size(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2019377440,
            SupportedModel::HyprLLM => 1107409056,
            SupportedModel::Gemma3_4bQ4 => 2489894016,
        }
    }

    pub fn model_checksum(&self) -> u64 {
        match self {
            SupportedModel::Llama3p2_3bQ4 => 2831308098,
            SupportedModel::HyprLLM => 4037351144,
            SupportedModel::Gemma3_4bQ4 => 2760830291,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub enum ModelIdentifier {
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "mock-onboarding")]
    MockOnboarding,
}
