mod auth_callback;
mod billing_refresh;
mod integration_callback;

pub use auth_callback::*;
pub use billing_refresh::*;
pub use integration_callback::*;

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::str::FromStr;

#[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
pub struct DeepLinkEvent(pub DeepLink);

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "to", content = "search")]
pub enum DeepLink {
    #[serde(rename = "/auth/callback")]
    AuthCallback(AuthCallbackSearch),
    #[serde(rename = "/billing/refresh")]
    BillingRefresh(BillingRefreshSearch),
    #[serde(rename = "/integration/callback")]
    IntegrationCallback(IntegrationCallbackSearch),
}

impl DeepLink {
    pub fn path(&self) -> &'static str {
        match self {
            DeepLink::AuthCallback(_) => "/auth/callback",
            DeepLink::BillingRefresh(_) => "/billing/refresh",
            DeepLink::IntegrationCallback(_) => "/integration/callback",
        }
    }
}

impl FromStr for DeepLink {
    type Err = crate::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parsed = url::Url::parse(s)?;

        let host = parsed.host_str().unwrap_or("");
        let path = parsed.path().trim_start_matches('/');
        let full_path = if path.is_empty() {
            host.to_string()
        } else {
            format!("{}/{}", host, path)
        };

        let query_params: HashMap<String, String> = parsed.query_pairs().into_owned().collect();

        match full_path.as_str() {
            "auth/callback" => Ok(DeepLink::AuthCallback(
                AuthCallbackSearch::from_query_params(&query_params)?,
            )),
            "billing/refresh" => Ok(DeepLink::BillingRefresh(
                BillingRefreshSearch::from_query_params(&query_params)?,
            )),
            "integration/callback" => Ok(DeepLink::IntegrationCallback(
                IntegrationCallbackSearch::from_query_params(&query_params)?,
            )),
            _ => Err(crate::Error::UnknownPath(full_path)),
        }
    }
}
