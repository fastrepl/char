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

pub(super) fn content_type_to_extension(content_type: &str) -> &'static str {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or(content_type)
        .trim();
    match mime {
        "audio/wav" | "audio/wave" | "audio/x-wav" => "wav",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/ogg" => "ogg",
        "audio/flac" => "flac",
        "audio/mp4" | "audio/m4a" | "audio/x-m4a" => "m4a",
        "audio/webm" => "webm",
        "audio/aac" => "aac",
        _ => "wav",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_type_mapping() {
        assert_eq!(content_type_to_extension("audio/wav"), "wav");
        assert_eq!(content_type_to_extension("audio/wave"), "wav");
        assert_eq!(content_type_to_extension("audio/mpeg"), "mp3");
        assert_eq!(content_type_to_extension("audio/mp3"), "mp3");
        assert_eq!(content_type_to_extension("audio/ogg"), "ogg");
        assert_eq!(content_type_to_extension("audio/flac"), "flac");
        assert_eq!(content_type_to_extension("audio/m4a"), "m4a");
        assert_eq!(content_type_to_extension("audio/webm"), "webm");
        assert_eq!(content_type_to_extension("audio/aac"), "aac");
        assert_eq!(content_type_to_extension("application/octet-stream"), "wav");
    }

    #[test]
    fn content_type_with_charset() {
        assert_eq!(content_type_to_extension("audio/wav; charset=utf-8"), "wav");
        assert_eq!(content_type_to_extension("audio/mpeg; bitrate=128"), "mp3");
    }
}
