use std::ffi::CString;
use std::path::Path;

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, parse_buf};
use crate::model::Model;

use super::whisper::build_whisper_prompt;
use super::{TranscribeOptions, TranscriptionResult};

enum TranscribeInput<'a> {
    File(&'a CString),
    Pcm(&'a [u8]),
}

impl Model {
    fn call_transcribe(
        &self,
        input: TranscribeInput<'_>,
        options: &TranscribeOptions,
    ) -> Result<TranscriptionResult> {
        let guard = self.lock_inference();
        let prompt = if self.is_moonshine() {
            String::new()
        } else {
            build_whisper_prompt(options)
        };
        let prompt_c = CString::new(prompt)?;
        let options_c = CString::new(serde_json::to_string(options)?)?;
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let (path_ptr, pcm_ptr, pcm_len) = match &input {
            TranscribeInput::File(p) => (p.as_ptr(), std::ptr::null(), 0),
            TranscribeInput::Pcm(p) => (std::ptr::null(), p.as_ptr(), p.len()),
        };

        let rc = unsafe {
            cactus_sys::cactus_transcribe(
                guard.raw_handle(),
                path_ptr,
                prompt_c.as_ptr(),
                buf.as_mut_ptr() as *mut std::ffi::c_char,
                buf.len(),
                options_c.as_ptr(),
                None,
                std::ptr::null_mut(),
                pcm_ptr,
                pcm_len,
            )
        };

        if rc < 0 {
            return Err(Error::Inference(format!("cactus_transcribe failed ({rc})")));
        }

        Ok(parse_buf(&buf)?)
    }

    pub fn transcribe_file(
        &self,
        audio_path: impl AsRef<Path>,
        options: &TranscribeOptions,
    ) -> Result<TranscriptionResult> {
        let path_c = CString::new(audio_path.as_ref().to_string_lossy().into_owned())?;
        self.call_transcribe(TranscribeInput::File(&path_c), options)
    }

    pub fn transcribe_pcm(
        &self,
        pcm: &[u8],
        options: &TranscribeOptions,
    ) -> Result<TranscriptionResult> {
        self.call_transcribe(TranscribeInput::Pcm(pcm), options)
    }
}
