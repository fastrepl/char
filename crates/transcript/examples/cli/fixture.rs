#[derive(Clone, clap::ValueEnum, strum::Display)]
#[strum(serialize_all = "kebab-case")]
pub enum Fixture {
    #[strum(serialize = "deepgram-english")]
    #[value(name = "deepgram-english")]
    Deepgram,
    #[strum(serialize = "soniox-english")]
    #[value(name = "soniox-english")]
    Soniox,
    #[strum(serialize = "soniox-korean")]
    #[value(name = "soniox-korean")]
    SonioxKorean,
}

impl Fixture {
    pub fn json(&self) -> &'static str {
        match self {
            Self::Deepgram => hypr_data::english_1::DEEPGRAM_JSON,
            Self::Soniox => hypr_data::english_1::SONIOX_JSON,
            Self::SonioxKorean => hypr_data::korean_1::SONIOX_JSON,
        }
    }
}
