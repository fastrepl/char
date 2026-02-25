use hypr_am::AmModel;
use hypr_whisper_local_model::WhisperModel;

pub use hypr_cactus_model::CactusSttModel;

pub static SUPPORTED_MODELS: [SupportedSttModel; 6] = [
    SupportedSttModel::Am(AmModel::ParakeetV2),
    SupportedSttModel::Am(AmModel::ParakeetV3),
    SupportedSttModel::Am(AmModel::WhisperLargeV3),
    SupportedSttModel::Cactus(CactusSttModel::WhisperSmallInt8),
    SupportedSttModel::Cactus(CactusSttModel::WhisperSmallInt8Apple),
    SupportedSttModel::SpeechAnalyzer,
];

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub enum SttModelType {
    Cactus,
    Whispercpp,
    Argmax,
    SpeechAnalyzer,
}

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SttModelInfo {
    pub key: SupportedSttModel,
    pub display_name: String,
    pub description: String,
    pub size_bytes: u64,
    pub model_type: SttModelType,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, Eq, Hash, PartialEq)]
#[serde(untagged)]
pub enum SupportedSttModel {
    Cactus(CactusSttModel),
    Whisper(WhisperModel),
    Am(AmModel),
    #[serde(rename = "speech-analyzer")]
    SpeechAnalyzer,
}

impl std::fmt::Display for SupportedSttModel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SupportedSttModel::Cactus(model) => write!(f, "{}", model),
            SupportedSttModel::Whisper(model) => write!(f, "whisper-{}", model),
            SupportedSttModel::Am(model) => write!(f, "am-{}", model),
            SupportedSttModel::SpeechAnalyzer => write!(f, "speech-analyzer"),
        }
    }
}

impl SupportedSttModel {
    pub fn is_available_on_current_platform(&self) -> bool {
        let is_apple_silicon = cfg!(target_arch = "aarch64") && cfg!(target_os = "macos");

        match self {
            SupportedSttModel::Whisper(_) | SupportedSttModel::Am(_) => is_apple_silicon,
            SupportedSttModel::Cactus(model) => {
                if model.is_apple() {
                    is_apple_silicon
                } else {
                    !is_apple_silicon
                }
            }
            SupportedSttModel::SpeechAnalyzer => {
                cfg!(target_os = "macos") && hypr_transcribe_speech_analyzer::is_available()
            }
        }
    }

    pub fn info(&self) -> SttModelInfo {
        match self {
            SupportedSttModel::Cactus(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                description: model.description().to_string(),
                size_bytes: 0,
                model_type: SttModelType::Cactus,
            },
            SupportedSttModel::Whisper(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                description: model.description(),
                size_bytes: model.model_size_bytes(),
                model_type: SttModelType::Whispercpp,
            },
            SupportedSttModel::Am(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                description: model.description().to_string(),
                size_bytes: model.model_size_bytes(),
                model_type: SttModelType::Argmax,
            },
            SupportedSttModel::SpeechAnalyzer => SttModelInfo {
                key: self.clone(),
                display_name: "Apple Speech Analyzer".to_string(),
                description: "Native macOS 26 on-device speech recognition. No download required."
                    .to_string(),
                size_bytes: 0,
                model_type: SttModelType::SpeechAnalyzer,
            },
        }
    }
}
