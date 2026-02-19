use std::ffi::CString;
use std::path::Path;
use std::ptr::NonNull;
use std::sync::{Mutex, MutexGuard};

use crate::error::{Error, Result};

pub struct Model {
    handle: NonNull<std::ffi::c_void>,
    inference_lock: Mutex<()>,
}

unsafe impl Send for Model {}
// SAFETY: All FFI methods that touch model state are serialized by `inference_lock`.
// The sole exception is `stop()`, which only sets a `std::atomic<bool>` on the C++ side.
unsafe impl Sync for Model {}

impl Model {
    pub fn new(model_path: impl AsRef<Path>) -> Result<Self> {
        let path = CString::new(model_path.as_ref().to_string_lossy().into_owned())?;

        let raw = unsafe { cactus_sys::cactus_init(path.as_ptr(), std::ptr::null(), false) };

        let handle =
            NonNull::new(raw).ok_or_else(|| Error::Init("cactus_init returned null".into()))?;

        Ok(Self {
            handle,
            inference_lock: Mutex::new(()),
        })
    }

    /// Cancel an in-progress inference. Safe to call concurrently — only sets an
    /// atomic flag on the C++ side.
    pub fn stop(&self) {
        unsafe {
            cactus_sys::cactus_stop(self.handle.as_ptr());
        }
    }

    pub fn reset(&mut self) {
        let _guard = self.lock_inference();
        unsafe {
            cactus_sys::cactus_reset(self.handle.as_ptr());
        }
    }

    pub(crate) fn lock_inference(&self) -> MutexGuard<'_, ()> {
        self.inference_lock
            .lock()
            .unwrap_or_else(|e| e.into_inner())
    }

    pub(crate) fn raw_handle(&self) -> *mut std::ffi::c_void {
        self.handle.as_ptr()
    }
}

impl Drop for Model {
    fn drop(&mut self) {
        unsafe {
            cactus_sys::cactus_destroy(self.handle.as_ptr());
        }
    }
}
