use std::ffi::CString;
use std::ptr::NonNull;

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, read_cstr_from_buf};
use crate::model::Model;

use super::TranscribeOptions;

pub struct Transcriber<'a> {
    pub(super) handle: Option<NonNull<std::ffi::c_void>>,
    pub(super) model: &'a Model,
}

// SAFETY: The C stream handle has no thread-affinity requirements.
// All model-state access during process/stop is serialized through
// the parent Model's inference_lock.
unsafe impl Send for Transcriber<'_> {}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct StreamResult {
    #[serde(default)]
    pub confirmed: String,
    #[serde(default)]
    pub pending: String,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub confidence: f32,
}

impl std::str::FromStr for StreamResult {
    type Err = std::convert::Infallible;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        Ok(serde_json::from_str(s).unwrap_or_else(|e| {
            tracing::warn!(error = %e, raw = s, "cactus_stream_result_parse_failed");
            Self {
                confirmed: s.to_string(),
                ..Default::default()
            }
        }))
    }
}

impl<'a> Transcriber<'a> {
    pub fn new(model: &'a Model, options: &TranscribeOptions) -> Result<Self> {
        let _guard = model.lock_inference();
        let options_c = CString::new(serde_json::to_string(options)?)?;

        let raw = unsafe {
            cactus_sys::cactus_stream_transcribe_start(model.raw_handle(), options_c.as_ptr())
        };

        let handle = NonNull::new(raw).ok_or_else(|| {
            Error::Inference("cactus_stream_transcribe_start returned null".into())
        })?;

        Ok(Self {
            handle: Some(handle),
            model,
        })
    }

    pub fn process(&mut self, pcm: &[u8]) -> Result<StreamResult> {
        let _guard = self.model.lock_inference();
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_process(
                self.raw_handle()?,
                pcm.as_ptr(),
                pcm.len(),
                buf.as_mut_ptr() as *mut std::ffi::c_char,
                buf.len(),
            )
        };

        if rc < 0 {
            return Err(Error::Inference(format!(
                "cactus_stream_transcribe_process failed ({rc})"
            )));
        }

        Ok(parse_stream_result(&buf))
    }

    pub fn process_samples(&mut self, samples: &[i16]) -> Result<StreamResult> {
        let bytes: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        self.process(&bytes)
    }

    pub fn process_f32(&mut self, samples: &[f32]) -> Result<StreamResult> {
        let converted: Vec<i16> = samples
            .iter()
            .map(|&s| (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
            .collect();
        self.process_samples(&converted)
    }

    pub fn stop(mut self) -> Result<StreamResult> {
        let result = self.call_stop();
        self.handle = None;
        result
    }

    fn call_stop(&self) -> Result<StreamResult> {
        let _guard = self.model.lock_inference();
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_stop(
                self.raw_handle()?,
                buf.as_mut_ptr() as *mut std::ffi::c_char,
                buf.len(),
            )
        };

        if rc < 0 {
            return Err(Error::Inference(format!(
                "cactus_stream_transcribe_stop failed ({rc})"
            )));
        }

        Ok(parse_stream_result(&buf))
    }

    pub(super) fn raw_handle(&self) -> Result<*mut std::ffi::c_void> {
        self.handle
            .map(NonNull::as_ptr)
            .ok_or_else(|| Error::Inference("transcriber has already been stopped".to_string()))
    }
}

impl Drop for Transcriber<'_> {
    fn drop(&mut self) {
        let Some(handle) = self.handle.take() else {
            return;
        };
        let _guard = self.model.lock_inference();
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];
        unsafe {
            cactus_sys::cactus_stream_transcribe_stop(
                handle.as_ptr(),
                buf.as_mut_ptr() as *mut std::ffi::c_char,
                buf.len(),
            );
        }
    }
}

pub fn parse_stream_result(buf: &[u8]) -> StreamResult {
    read_cstr_from_buf(buf).parse().unwrap()
}
