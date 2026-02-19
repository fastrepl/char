use std::ffi::{CStr, CString};

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, parse_buf};
use crate::model::Model;

use super::{CompleteOptions, CompletionResult, Message};

type TokenCallback = unsafe extern "C" fn(*const std::ffi::c_char, u32, *mut std::ffi::c_void);

struct CallbackState<'a, F: FnMut(&str) -> bool> {
    on_token: &'a mut F,
    model: &'a Model,
    stopped: bool,
}

unsafe extern "C" fn token_trampoline<F: FnMut(&str) -> bool>(
    token: *const std::ffi::c_char,
    _token_id: u32,
    user_data: *mut std::ffi::c_void,
) {
    if token.is_null() || user_data.is_null() {
        return;
    }

    let state = unsafe { &mut *(user_data as *mut CallbackState<F>) };
    if state.stopped {
        return;
    }

    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let chunk = unsafe { CStr::from_ptr(token) }.to_string_lossy();
        if !(state.on_token)(&chunk) {
            state.stopped = true;
            state.model.stop();
        }
    }));

    if result.is_err() {
        state.stopped = true;
        state.model.stop();
    }
}

pub(super) fn serialize_complete_request(
    messages: &[Message],
    options: &CompleteOptions,
) -> Result<(CString, CString)> {
    let messages_c = CString::new(serde_json::to_string(messages)?)?;
    let options_c = CString::new(serde_json::to_string(options)?)?;
    Ok((messages_c, options_c))
}

pub(super) fn complete_error(rc: i32) -> Error {
    Error::Inference(format!("cactus_complete failed ({rc})"))
}

impl Model {
    fn call_complete(
        &self,
        messages_c: &CString,
        options_c: &CString,
        callback: Option<TokenCallback>,
        user_data: *mut std::ffi::c_void,
    ) -> (i32, Vec<u8>) {
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_complete(
                self.raw_handle(),
                messages_c.as_ptr(),
                buf.as_mut_ptr().cast::<std::ffi::c_char>(),
                buf.len(),
                options_c.as_ptr(),
                std::ptr::null(),
                callback,
                user_data,
            )
        };

        (rc, buf)
    }

    pub fn complete(
        &self,
        messages: &[Message],
        options: &CompleteOptions,
    ) -> Result<CompletionResult> {
        let _guard = self.lock_inference();
        let (messages_c, options_c) = serialize_complete_request(messages, options)?;
        let (rc, buf) = self.call_complete(&messages_c, &options_c, None, std::ptr::null_mut());

        if rc < 0 {
            return Err(complete_error(rc));
        }

        Ok(parse_buf(&buf)?)
    }

    pub fn complete_streaming<F>(
        &self,
        messages: &[Message],
        options: &CompleteOptions,
        mut on_token: F,
    ) -> Result<CompletionResult>
    where
        F: FnMut(&str) -> bool,
    {
        let _guard = self.lock_inference();
        let (messages_c, options_c) = serialize_complete_request(messages, options)?;

        let mut state = CallbackState {
            on_token: &mut on_token,
            model: self,
            stopped: false,
        };

        let (rc, buf) = self.call_complete(
            &messages_c,
            &options_c,
            Some(token_trampoline::<F>),
            (&mut state as *mut CallbackState<F>).cast::<std::ffi::c_void>(),
        );

        if rc < 0 && !state.stopped {
            return Err(complete_error(rc));
        }

        Ok(parse_buf(&buf)?)
    }
}
