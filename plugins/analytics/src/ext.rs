pub struct Analytics<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Analytics<'a, R, M> {
    fn service(&self) -> tauri::State<'_, crate::ManagedState> {
        self.manager.state::<crate::ManagedState>()
    }

    pub async fn event(
        &self,
        payload: hypr_analytics::AnalyticsPayload,
    ) -> Result<(), crate::Error> {
        self.service()
            .event(payload)
            .await
            .map_err(crate::Error::HyprAnalytics)
    }

    pub fn event_fire_and_forget(&self, payload: hypr_analytics::AnalyticsPayload) {
        self.service().event_fire_and_forget(payload);
    }

    pub fn set_disabled(&self, disabled: bool) -> Result<(), crate::Error> {
        self.service()
            .set_disabled(disabled)
            .map_err(crate::Error::HyprAnalytics)
    }

    pub fn is_disabled(&self) -> Result<bool, crate::Error> {
        Ok(self.service().is_disabled())
    }

    pub async fn set_properties(
        &self,
        payload: hypr_analytics::PropertiesPayload,
    ) -> Result<(), crate::Error> {
        self.service()
            .set_properties(payload)
            .await
            .map_err(crate::Error::HyprAnalytics)
    }

    pub async fn identify(
        &self,
        user_id: impl Into<String>,
        payload: hypr_analytics::PropertiesPayload,
    ) -> Result<(), crate::Error> {
        self.service()
            .identify(user_id, payload)
            .await
            .map_err(crate::Error::HyprAnalytics)
    }
}

pub trait AnalyticsPluginExt<R: tauri::Runtime> {
    fn analytics(&self) -> Analytics<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AnalyticsPluginExt<R> for T {
    fn analytics(&self) -> Analytics<'_, R, Self>
    where
        Self: Sized,
    {
        Analytics {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
