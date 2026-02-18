use std::ffi::CString;
use std::path::Path;
use std::ptr::NonNull;

use crate::error::{Error, Result};

pub struct Model {
    handle: NonNull<std::ffi::c_void>,
}

unsafe impl Send for Model {}
unsafe impl Sync for Model {}

impl Model {
    pub fn new(model_path: impl AsRef<Path>) -> Result<Self> {
        let path = CString::new(model_path.as_ref().to_string_lossy().into_owned())?;

        let raw = unsafe { cactus_sys::cactus_init(path.as_ptr(), std::ptr::null(), false) };

        let handle =
            NonNull::new(raw).ok_or_else(|| Error::from_ffi_or("cactus_init returned null"))?;

        Ok(Self { handle })
    }

    pub fn stop(&self) {
        unsafe {
            cactus_sys::cactus_stop(self.handle.as_ptr());
        }
    }

    pub fn reset(&self) {
        unsafe {
            cactus_sys::cactus_reset(self.handle.as_ptr());
        }
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
