use crate::{AnalyticsPayload, Error};

pub trait AnalyticsRuntime: Send + Sync + 'static {
    fn enrich(&self, payload: &mut AnalyticsPayload);
    fn distinct_id(&self) -> String;
    fn is_disabled(&self) -> bool;
    fn set_disabled(&self, disabled: bool) -> Result<(), Error>;
}
