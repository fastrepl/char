use std::ffi::CString;
use std::path::{Path, PathBuf};
use std::ptr::NonNull;
use std::sync::{Mutex, MutexGuard};

use crate::error::{Error, Result};

pub struct Model {
    handle: NonNull<std::ffi::c_void>,
    inference_lock: Mutex<()>,
}

unsafe impl Send for Model {}
// SAFETY: All FFI methods that touch model state are serialized by `inference_lock`,
// which is enforced at compile time via `InferenceGuard` — the model's raw handle is
// only accessible through the guard returned by `lock_inference()`.
// The sole exception is `stop()`, which only sets a `std::atomic<bool>` on the C++ side.
unsafe impl Sync for Model {}

pub(crate) struct InferenceGuard<'a> {
    handle: NonNull<std::ffi::c_void>,
    _guard: MutexGuard<'a, ()>,
}

impl InferenceGuard<'_> {
    pub(crate) fn raw_handle(&self) -> *mut std::ffi::c_void {
        self.handle.as_ptr()
    }
}

pub struct ModelBuilder {
    model_path: PathBuf,
}

impl ModelBuilder {
    pub fn build(self) -> Result<Model> {
        let path = CString::new(self.model_path.to_string_lossy().into_owned())?;
        let raw = unsafe { cactus_sys::cactus_init(path.as_ptr(), std::ptr::null(), false) };
        let handle =
            NonNull::new(raw).ok_or_else(|| Error::Init("cactus_init returned null".into()))?;

        Ok(Model {
            handle,
            inference_lock: Mutex::new(()),
        })
    }
}

impl Model {
    pub fn builder(model_path: impl AsRef<Path>) -> ModelBuilder {
        ModelBuilder {
            model_path: model_path.as_ref().to_path_buf(),
        }
    }

    pub fn new(model_path: impl AsRef<Path>) -> Result<Self> {
        Self::builder(model_path).build()
    }

    /// Cancel an in-progress inference. Safe to call concurrently — only sets an
    /// atomic flag on the C++ side.
    pub fn stop(&self) {
        unsafe {
            cactus_sys::cactus_stop(self.handle.as_ptr());
        }
    }

    pub fn reset(&mut self) {
        let guard = self.lock_inference();
        unsafe {
            cactus_sys::cactus_reset(guard.raw_handle());
        }
    }

    pub(crate) fn lock_inference(&self) -> InferenceGuard<'_> {
        let guard = self.inference_lock
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        InferenceGuard {
            handle: self.handle,
            _guard: guard,
        }
    }
}

impl Drop for Model {
    fn drop(&mut self) {
        let guard = self.lock_inference();
        unsafe {
            cactus_sys::cactus_destroy(guard.raw_handle());
        }
    }
}
