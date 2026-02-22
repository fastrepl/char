use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Content {
    Text(String),
    Parts(Vec<ContentPart>),
}

impl Content {
    pub fn as_text(&self) -> Option<&str> {
        match self {
            Content::Text(s) => Some(s),
            _ => None,
        }
    }
}

impl From<String> for Content {
    fn from(s: String) -> Self {
        Content::Text(s)
    }
}

impl From<&str> for Content {
    fn from(s: &str) -> Self {
        Content::Text(s.to_string())
    }
}

impl From<Vec<ContentPart>> for Content {
    fn from(parts: Vec<ContentPart>) -> Self {
        Content::Parts(parts)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "text")]
    Text {
        text: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        cache_control: Option<CacheControl>,
    },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrlContent },
    #[serde(rename = "input_audio")]
    InputAudio { input_audio: InputAudioContent },
    #[serde(rename = "input_video")]
    InputVideo { video_url: VideoUrlContent },
    #[serde(rename = "video_url")]
    VideoUrl { video_url: VideoUrlContent },
}

impl ContentPart {
    pub fn text(text: impl Into<String>) -> Self {
        Self::Text {
            text: text.into(),
            cache_control: None,
        }
    }

    pub fn image_url(url: impl Into<String>) -> Self {
        Self::ImageUrl {
            image_url: ImageUrlContent {
                url: url.into(),
                detail: None,
            },
        }
    }

    pub fn image_url_with_detail(url: impl Into<String>, detail: ImageDetail) -> Self {
        Self::ImageUrl {
            image_url: ImageUrlContent {
                url: url.into(),
                detail: Some(detail),
            },
        }
    }

    pub fn input_audio(data: impl Into<String>, format: impl Into<String>) -> Self {
        Self::InputAudio {
            input_audio: InputAudioContent {
                data: data.into(),
                format: format.into(),
            },
        }
    }

    pub fn input_video(url: impl Into<String>) -> Self {
        Self::InputVideo {
            video_url: VideoUrlContent { url: url.into() },
        }
    }

    pub fn video_url(url: impl Into<String>) -> Self {
        Self::VideoUrl {
            video_url: VideoUrlContent { url: url.into() },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CacheControlTtl {
    #[serde(rename = "5m")]
    FiveMinutes,
    #[serde(rename = "1h")]
    OneHour,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheControl {
    #[serde(rename = "type")]
    pub r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl: Option<CacheControlTtl>,
}

impl CacheControl {
    pub fn ephemeral() -> Self {
        Self {
            r#type: "ephemeral".into(),
            ttl: None,
        }
    }

    pub fn ephemeral_with_ttl(ttl: CacheControlTtl) -> Self {
        Self {
            r#type: "ephemeral".into(),
            ttl: Some(ttl),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUrlContent {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<ImageDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageDetail {
    Auto,
    Low,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputAudioContent {
    pub data: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoUrlContent {
    pub url: String,
}
