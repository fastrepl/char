use std::sync::OnceLock;

use swift_rs::SRString;

pub mod diarization;
mod ffi;
pub mod transcribe;

use ffi::initialize_am2_sdk;

static SDK_INITIALIZED: OnceLock<()> = OnceLock::new();

pub fn init() {
    SDK_INITIALIZED.get_or_init(|| {
        let api_key = std::env::var("AM_API_KEY").unwrap_or_default();
        let api_key = SRString::from(api_key.as_str());
        unsafe {
            initialize_am2_sdk(&api_key);
        }
    });
}

pub fn is_ready() -> bool {
    SDK_INITIALIZED.get().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sdk_init() {
        init();
        assert!(is_ready());
    }
}
