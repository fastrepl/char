use hypr_template_support::AccountInfo;
use tauri_plugin_store2::Store2PluginExt;

pub(crate) fn parse_account_info(scope_str: &str) -> Result<Option<AccountInfo>, crate::Error> {
    let entries: serde_json::Map<String, serde_json::Value> = serde_json::from_str(scope_str)?;

    // Supabase SDK stores the session under a key matching `sb-{ref}-auth-token`
    let session_str = entries
        .iter()
        .find_map(|(k, v)| k.ends_with("-auth-token").then(|| v.as_str()).flatten());

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

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AuthPluginExt<R> for T {
    fn get_item(&self, key: String) -> Result<Option<String>, crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        store.get::<String>(key).map_err(Into::into)
    }

    fn set_item(&self, key: String, value: String) -> Result<(), crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        store.set(key, value)?;
        store.save()?;
        Ok(())
    }

    fn remove_item(&self, key: String) -> Result<(), crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        store.delete(key)?;
        store.save()?;
        Ok(())
    }

    fn clear_auth(&self) -> Result<(), crate::Error> {
        let store = self.store2().scoped_store::<String>(crate::PLUGIN_NAME)?;
        store.clear()?;
        store.save()?;
        Ok(())
    }

    fn get_account_info(&self) -> Result<Option<AccountInfo>, crate::Error> {
        let raw_store = self.store2().store()?;

        let scope_str = match raw_store
            .get(crate::PLUGIN_NAME)
            .and_then(|v| v.as_str().map(String::from))
        {
            Some(s) => s,
            None => return Ok(None),
        };

        parse_account_info(&scope_str)
    }
}
