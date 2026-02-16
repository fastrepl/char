use swift_rs::{SRArray, SRObject, SRString, swift};

swift!(pub(crate) fn initialize_am2_sdk(api_key: &SRString));
swift!(pub(crate) fn am2_transcribe_init(model: &SRString) -> bool);
swift!(pub(crate) fn am2_transcribe_file(audio_path: &SRString) -> SRObject<TranscribeResultFFI>);
swift!(pub(crate) fn am2_transcribe_file_with_progress(audio_path: &SRString) -> SRObject<TranscribeResultFFI>);
swift!(pub(crate) fn am2_diarization_init() -> bool);
swift!(pub(crate) fn am2_diarization_process(samples_ptr: *const f32, samples_len: i64, num_speakers: i32) -> SRObject<DiarizationResultArray>);
swift!(pub(crate) fn am2_diarization_deinit());

#[repr(C)]
pub struct TranscribeResultFFI {
    pub text: SRString,
    pub success: bool,
}

#[repr(C)]
pub struct DiarizationResultArray {
    pub starts: SRArray<f64>,
    pub ends: SRArray<f64>,
    pub speakers: SRArray<i32>,
    pub count: i32,
}
