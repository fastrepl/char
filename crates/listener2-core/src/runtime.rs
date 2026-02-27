use crate::BatchEvent;
use crate::DenoiseEvent;

pub trait BatchRuntime: Send + Sync + 'static {
    fn emit(&self, event: BatchEvent);
}

pub trait DenoiseRuntime: hypr_storage::StorageRuntime {
    fn emit(&self, event: DenoiseEvent);
}
