use std::ffi::CString;
use std::marker::PhantomData;
use std::path::Path;
use std::ptr::NonNull;

use hypr_language::Language;

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, parse_response_buf, read_cstr_from_buf};
use crate::model::Model;
use crate::response::CactusResponse;

/// Returns the single language to force, or `None` to let the model auto-detect.
///
/// Cactus FFI doesn't expose per-language probability scores, so multi-language
/// constraints fall back to unconstrained auto-detection.
pub fn constrain_to(languages: &[Language]) -> Option<Language> {
    match languages {
        [] => None,
        [single] => Some(single.clone()),
        _ => None,
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct TranscribeOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<Language>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial_prompt: Option<String>,
}

fn build_whisper_prompt(options: &TranscribeOptions) -> String {
    let lang = options
        .language
        .as_ref()
        .map(|l| l.iso639_code())
        .unwrap_or("en");
    match &options.initial_prompt {
        Some(p) => {
            format!(
                "<|startofprev|>{p}<|startoftranscript|><|{lang}|><|transcribe|><|notimestamps|>"
            )
        }
        None => format!("<|startoftranscript|><|{lang}|><|transcribe|><|notimestamps|>"),
    }
}

impl Model {
    fn call_transcribe(
        &self,
        path: Option<&CString>,
        pcm: Option<&[u8]>,
        options: &TranscribeOptions,
    ) -> Result<CactusResponse> {
        let prompt_c = CString::new(build_whisper_prompt(options))?;
        let options_c = CString::new(serde_json::to_string(options)?)?;
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let (pcm_ptr, pcm_len) = pcm
            .map(|p| (p.as_ptr(), p.len()))
            .unwrap_or((std::ptr::null(), 0));

        let rc = unsafe {
            cactus_sys::cactus_transcribe(
                self.raw_handle(),
                path.map_or(std::ptr::null(), |p| p.as_ptr()),
                prompt_c.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
                options_c.as_ptr(),
                None,
                std::ptr::null_mut(),
                pcm_ptr,
                pcm_len,
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_transcribe failed ({rc})"
            )));
        }

        parse_response_buf(&buf)
    }

    pub fn transcribe_file(
        &self,
        audio_path: impl AsRef<Path>,
        options: &TranscribeOptions,
    ) -> Result<CactusResponse> {
        let path_c = CString::new(audio_path.as_ref().to_string_lossy().into_owned())?;
        self.call_transcribe(Some(&path_c), None, options)
    }

    pub fn transcribe_pcm(
        &self,
        pcm: &[u8],
        options: &TranscribeOptions,
    ) -> Result<CactusResponse> {
        self.call_transcribe(None, Some(pcm), options)
    }
}

// -- Streaming transcriber --

pub struct Transcriber<'a> {
    handle: Option<NonNull<std::ffi::c_void>>,
    _model: PhantomData<&'a Model>,
}

unsafe impl Send for Transcriber<'_> {}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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

impl<'a> Transcriber<'a> {
    pub fn new(model: &'a Model, options: &TranscribeOptions) -> Result<Self> {
        let options_c = CString::new(serde_json::to_string(options)?)?;

        let raw = unsafe {
            cactus_sys::cactus_stream_transcribe_start(model.raw_handle(), options_c.as_ptr())
        };

        let handle = NonNull::new(raw)
            .ok_or_else(|| Error::from_ffi_or("cactus_stream_transcribe_start returned null"))?;

        Ok(Self {
            handle: Some(handle),
            _model: PhantomData,
        })
    }

    pub fn process(&mut self, pcm: &[u8]) -> Result<StreamResult> {
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_process(
                self.raw_handle()?,
                pcm.as_ptr(),
                pcm.len(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_stream_transcribe_process failed ({rc})"
            )));
        }

        Ok(parse_stream_result(&buf))
    }

    pub fn process_samples(&mut self, samples: &[i16]) -> Result<StreamResult> {
        let bytes = unsafe {
            std::slice::from_raw_parts(
                samples.as_ptr() as *const u8,
                samples.len() * std::mem::size_of::<i16>(),
            )
        };
        self.process(bytes)
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
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_stop(
                self.raw_handle()?,
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_stream_transcribe_stop failed ({rc})"
            )));
        }

        Ok(parse_stream_result(&buf))
    }

    fn raw_handle(&self) -> Result<*mut std::ffi::c_void> {
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
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];
        unsafe {
            cactus_sys::cactus_stream_transcribe_stop(
                handle.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
            );
        }
    }
}

fn parse_stream_result(buf: &[u8]) -> StreamResult {
    let raw = read_cstr_from_buf(buf);
    serde_json::from_str(&raw).unwrap_or_else(|_| StreamResult {
        confirmed: raw,
        pending: String::new(),
        language: None,
        confidence: 0.0,
    })
}
