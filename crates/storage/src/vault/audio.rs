pub const AUDIO_POSTPROCESS_WAV: &str = "audio-postprocess.wav";
pub const AUDIO_MP3: &str = "audio.mp3";
pub const AUDIO_WAV: &str = "audio.wav";
pub const AUDIO_OGG: &str = "audio.ogg";

/// All session audio filenames in lookup precedence order.
/// Postprocessed output takes priority over originals.
pub const SESSION_AUDIO_CANDIDATES: [&str; 4] =
    [AUDIO_POSTPROCESS_WAV, AUDIO_MP3, AUDIO_WAV, AUDIO_OGG];

/// Original (non-postprocessed) audio formats.
pub const SESSION_ORIGINAL_AUDIO_FORMATS: [&str; 3] = [AUDIO_MP3, AUDIO_WAV, AUDIO_OGG];
