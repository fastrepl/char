use serde::{Serialize, ser::Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("failed to initialize model: {0}")]
    Init(String),
    #[error("inference failed: {0}")]
    Inference(String),
    #[error("null pointer from cactus FFI")]
    NullPointer,
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Nul(#[from] std::ffi::NulError),
}

impl Error {
    pub(crate) fn from_ffi_or(fallback: impl Into<String>) -> Self {
        last_cactus_error()
            .map(Self::Inference)
            .unwrap_or_else(|| Self::Inference(fallback.into()))
    }
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

fn last_cactus_error() -> Option<String> {
    unsafe {
        let ptr = cactus_sys::cactus_get_last_error();
        if ptr.is_null() {
            return None;
        }
        // SAFETY: `cactus_get_last_error` returns a pointer to a valid,
        // null-terminated C string owned by the C library. The null check
        // above guards against null pointers.
        let s = std::ffi::CStr::from_ptr(ptr).to_string_lossy().into_owned();
        if s.is_empty() { None } else { Some(s) }
    }
}
