#[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
mod ffi {
    use swift_rs::{Bool, Int, SRString, swift};

    swift!(fn _speech_analyzer_is_available() -> Bool);
    swift!(fn _speech_analyzer_supported_locales() -> SRString);
    swift!(fn _speech_analyzer_create(locale_id: SRString, sample_rate: Int) -> Int);
    swift!(fn _speech_analyzer_feed_audio(handle: Int, samples: *const f32, count: Int) -> Bool);
    swift!(fn _speech_analyzer_get_results(handle: Int) -> SRString);
    swift!(fn _speech_analyzer_finish(handle: Int));
    swift!(fn _speech_analyzer_destroy(handle: Int));
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SpeechAnalyzerResult {
    pub text: String,
    pub is_final: bool,
    pub start_time: f64,
    pub duration: f64,
    pub language: Option<String>,
}

/// Check if SpeechAnalyzer is available on the current system (macOS 26+).
pub fn is_available() -> bool {
    #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
    {
        unsafe { ffi::_speech_analyzer_is_available() }
    }
    #[cfg(not(all(target_os = "macos", feature = "speech-analyzer")))]
    {
        false
    }
}

/// Get the list of supported locale identifiers.
pub fn supported_locales() -> Vec<String> {
    #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
    {
        let json: String = unsafe { ffi::_speech_analyzer_supported_locales() }.to_string();
        serde_json::from_str(&json).unwrap_or_default()
    }
    #[cfg(not(all(target_os = "macos", feature = "speech-analyzer")))]
    {
        vec![]
    }
}

/// A handle to a SpeechAnalyzer session.
#[derive(Debug)]
pub struct SpeechAnalyzerSession {
    handle: i64,
}

impl SpeechAnalyzerSession {
    /// Create a new SpeechAnalyzer session for the given locale and sample rate.
    /// Returns `None` if the locale is unsupported or SpeechAnalyzer is not available.
    pub fn new(locale: &str, sample_rate: u32) -> Option<Self> {
        #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
        {
            use swift_rs::SRString;
            let locale_str: SRString = locale.into();
            let handle = unsafe { ffi::_speech_analyzer_create(locale_str, sample_rate as i64) };
            if handle > 0 {
                Some(Self { handle })
            } else {
                tracing::warn!(handle, locale, "failed to create SpeechAnalyzer session");
                None
            }
        }
        #[cfg(not(all(target_os = "macos", feature = "speech-analyzer")))]
        {
            let _ = (locale, sample_rate);
            None
        }
    }

    /// Feed f32 audio samples to the analyzer.
    pub fn feed_audio(&self, samples: &[f32]) -> bool {
        #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
        {
            unsafe {
                ffi::_speech_analyzer_feed_audio(
                    self.handle,
                    samples.as_ptr(),
                    samples.len() as i64,
                )
            }
        }
        #[cfg(not(all(target_os = "macos", feature = "speech-analyzer")))]
        {
            let _ = samples;
            false
        }
    }

    /// Drain pending transcription results.
    pub fn get_results(&self) -> Vec<SpeechAnalyzerResult> {
        #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
        {
            let json: String =
                unsafe { ffi::_speech_analyzer_get_results(self.handle) }.to_string();
            serde_json::from_str(&json).unwrap_or_default()
        }
        #[cfg(not(all(target_os = "macos", feature = "speech-analyzer")))]
        {
            vec![]
        }
    }

    /// Signal that no more audio will be provided; finalize remaining results.
    pub fn finish(&self) {
        #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
        {
            unsafe { ffi::_speech_analyzer_finish(self.handle) }
        }
    }
}

impl Drop for SpeechAnalyzerSession {
    fn drop(&mut self) {
        #[cfg(all(target_os = "macos", feature = "speech-analyzer"))]
        {
            unsafe { ffi::_speech_analyzer_destroy(self.handle) }
        }
    }
}

// SpeechAnalyzerSession is Send because the Swift side uses locks for thread safety
// and the handle is just an integer identifier.
unsafe impl Send for SpeechAnalyzerSession {}
unsafe impl Sync for SpeechAnalyzerSession {}
