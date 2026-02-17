use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize)]
pub struct FlagOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub groups: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub person_properties: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_properties: Option<HashMap<String, HashMap<String, serde_json::Value>>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FlagMetadata {
    pub id: Option<i64>,
    pub version: Option<i64>,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RawFlagValue {
    pub key: String,
    pub enabled: bool,
    pub variant: Option<String>,
    pub metadata: Option<FlagMetadata>,
}

#[derive(Debug, Clone)]
pub struct FlagValue {
    pub key: String,
    pub enabled: bool,
    pub variant: Option<String>,
    pub payload: Option<serde_json::Value>,
}

impl From<RawFlagValue> for FlagValue {
    fn from(raw: RawFlagValue) -> Self {
        let payload = raw
            .metadata
            .and_then(|m| m.payload)
            .and_then(|p| serde_json::from_str(&p).ok());

        Self {
            key: raw.key,
            enabled: raw.enabled,
            variant: raw.variant,
            payload,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawFlagsResponse {
    pub flags: HashMap<String, RawFlagValue>,
    pub errors_while_computing_flags: bool,
}

#[derive(Debug, Clone)]
pub struct FlagsResponse {
    flags: HashMap<String, FlagValue>,
}

impl FlagsResponse {
    pub fn new(raw: RawFlagsResponse) -> Self {
        let flags = raw
            .flags
            .into_iter()
            .map(|(k, v)| (k, FlagValue::from(v)))
            .collect();
        Self { flags }
    }

    pub fn is_enabled(&self, key: &str) -> bool {
        self.flags.get(key).map(|f| f.enabled).unwrap_or(false)
    }

    pub fn get_variant(&self, key: &str) -> Option<&str> {
        self.flags.get(key).and_then(|f| f.variant.as_deref())
    }

    pub fn get_payload(&self, key: &str) -> Option<&serde_json::Value> {
        self.flags.get(key).and_then(|f| f.payload.as_ref())
    }

    pub fn get(&self, key: &str) -> Option<&FlagValue> {
        self.flags.get(key)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &FlagValue)> {
        self.flags.iter()
    }
}
