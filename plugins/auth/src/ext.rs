use std::collections::HashMap;

use hypr_template_support::AccountInfo;

pub(crate) fn parse_account_info(
    data: &HashMap<String, String>,
) -> Result<Option<AccountInfo>, crate::Error> {
    let session_str = data
        .iter()
        .find_map(|(k, v)| k.ends_with("-auth-token").then_some(v.as_str()));

    let Some(session_str) = session_str else {
        return Ok(None);
    };

    #[derive(serde::Deserialize)]
    struct Session {
        user: SessionUser,
    }
    #[derive(serde::Deserialize)]
    struct SessionUser {
        id: String,
        email: Option<String>,
        user_metadata: Option<UserMetadata>,
    }
    #[derive(serde::Deserialize)]
    struct UserMetadata {
        full_name: Option<String>,
        avatar_url: Option<String>,
        stripe_customer_id: Option<String>,
    }

    let session: Session = serde_json::from_str(session_str)?;
    let metadata = session.user.user_metadata;
    Ok(Some(AccountInfo {
        user_id: session.user.id,
        email: session.user.email,
        full_name: metadata.as_ref().and_then(|m| m.full_name.clone()),
        avatar_url: metadata.as_ref().and_then(|m| m.avatar_url.clone()),
        stripe_customer_id: metadata.as_ref().and_then(|m| m.stripe_customer_id.clone()),
    }))
}

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn get_item(&self, key: String) -> Result<Option<String>, crate::Error>;
    fn set_item(&self, key: String, value: String) -> Result<(), crate::Error>;
    fn remove_item(&self, key: String) -> Result<(), crate::Error>;
    fn clear_auth(&self) -> Result<(), crate::Error>;
    fn get_account_info(&self) -> Result<Option<AccountInfo>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AuthPluginExt<R> for T {
    fn get_item(&self, key: String) -> Result<Option<String>, crate::Error> {
        Ok(self.state::<crate::store::AuthStore>().get(&key))
    }

    fn set_item(&self, key: String, value: String) -> Result<(), crate::Error> {
        self.state::<crate::store::AuthStore>().set(key, value)
    }

    fn remove_item(&self, key: String) -> Result<(), crate::Error> {
        self.state::<crate::store::AuthStore>().remove(&key)
    }

    fn clear_auth(&self) -> Result<(), crate::Error> {
        self.state::<crate::store::AuthStore>().clear()
    }

    fn get_account_info(&self) -> Result<Option<AccountInfo>, crate::Error> {
        let data = self.state::<crate::store::AuthStore>().snapshot();
        parse_account_info(&data)
    }
}
