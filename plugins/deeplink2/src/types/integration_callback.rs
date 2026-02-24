use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct IntegrationCallbackSearch {
    pub integration_id: String,
    pub status: String,
    pub return_to: Option<String>,
}

impl IntegrationCallbackSearch {
    pub fn from_query_params(query_params: &HashMap<String, String>) -> crate::Result<Self> {
        let integration_id =
            query_params
                .get("integration_id")
                .ok_or(crate::Error::MissingQueryParam(
                    "integration_id".to_string(),
                ))?;

        let status = query_params
            .get("status")
            .ok_or(crate::Error::MissingQueryParam("status".to_string()))?;

        Ok(Self {
            integration_id: integration_id.to_string(),
            status: status.to_string(),
            return_to: query_params.get("return_to").cloned(),
        })
    }
}
