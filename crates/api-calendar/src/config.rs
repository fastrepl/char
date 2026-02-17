use hypr_api_env::NangoEnv;

#[derive(Clone)]
pub struct CalendarConfig {
    pub nango: NangoEnv,
}

impl CalendarConfig {
    pub fn new(nango: &NangoEnv) -> Self {
        Self {
            nango: nango.clone(),
        }
    }
}
