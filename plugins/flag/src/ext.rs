use crate::{Feature, FlagStrategy, ManagedState};

pub struct Flag<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Flag<'a, R, M> {
    pub async fn is_enabled(&self, feature: Feature) -> bool {
        match feature.strategy() {
            FlagStrategy::Debug => cfg!(debug_assertions),
            FlagStrategy::Hardcoded(v) => v,
            FlagStrategy::Posthog(key) => self.get_posthog_flag(key).await,
        }
    }

    async fn get_posthog_flag(&self, key: &str) -> bool {
        let state = self.manager.state::<ManagedState>();

        let client = match &state.client {
            Some(c) => c,
            None => return false,
        };

        {
            let cache = state.cache.read().await;
            if let Some(ref flags) = *cache {
                return flags.is_enabled(key);
            }
        }

        let distinct_id = hypr_host::fingerprint();
        match client.get_flags(&distinct_id, None).await {
            Ok(flags) => {
                let enabled = flags.is_enabled(key);
                let mut cache = state.cache.write().await;
                *cache = Some(flags);
                enabled
            }
            Err(_) => false,
        }
    }
}

pub trait FlagPluginExt<R: tauri::Runtime> {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FlagPluginExt<R> for T {
    fn flag(&self) -> Flag<'_, R, Self>
    where
        Self: Sized,
    {
        Flag {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
