use std::path::Path;

use hypr_audio_utils::Source;

pub(super) fn audio_duration_secs(path: &Path) -> f64 {
    let Ok(source) = hypr_audio_utils::source_from_path(path) else {
        return 0.0;
    };
    if let Some(d) = source.total_duration() {
        return d.as_secs_f64();
    }
    let sample_rate = source.sample_rate() as f64;
    let channels = source.channels().max(1) as f64;
    let count = source.count() as f64;
    count / channels / sample_rate
}

pub(super) use hypr_audio_utils::content_type_to_extension;
