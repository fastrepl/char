use swift_rs::{Bool, SRString, swift};

swift!(fn _apple_stt_is_available() -> Bool);
swift!(fn _apple_stt_supports_on_device() -> Bool);
swift!(fn _apple_stt_create_session(locale: SRString, sample_rate: f64) -> u64);
swift!(fn _apple_stt_append_audio(session_id: u64, samples: *const f32, count: isize));
swift!(fn _apple_stt_end_audio(session_id: u64));
swift!(fn _apple_stt_poll_result(session_id: u64) -> Option<SRString>);
swift!(fn _apple_stt_is_finished(session_id: u64) -> Bool);
swift!(fn _apple_stt_get_error(session_id: u64) -> Option<SRString>);
swift!(fn _apple_stt_destroy_session(session_id: u64));

pub fn is_available() -> bool {
    unsafe { _apple_stt_is_available() }
}

pub fn supports_on_device() -> bool {
    unsafe { _apple_stt_supports_on_device() }
}

pub(crate) fn create_session(locale: &str, sample_rate: f64) -> u64 {
    let locale_str: SRString = locale.into();
    unsafe { _apple_stt_create_session(locale_str, sample_rate) }
}

pub(crate) fn append_audio(session_id: u64, samples: &[f32]) {
    unsafe {
        _apple_stt_append_audio(session_id, samples.as_ptr(), samples.len() as isize);
    }
}

pub(crate) fn end_audio(session_id: u64) {
    unsafe { _apple_stt_end_audio(session_id) }
}

pub(crate) fn poll_result(session_id: u64) -> Option<String> {
    unsafe { _apple_stt_poll_result(session_id).map(|s| s.to_string()) }
}

pub(crate) fn is_finished(session_id: u64) -> bool {
    unsafe { _apple_stt_is_finished(session_id) }
}

pub(crate) fn get_error(session_id: u64) -> Option<String> {
    unsafe { _apple_stt_get_error(session_id).map(|s| s.to_string()) }
}

pub(crate) fn destroy_session(session_id: u64) {
    unsafe { _apple_stt_destroy_session(session_id) }
}
