use std::path::{Path, PathBuf};
use std::sync::Arc;

use hypr_storage::vault::audio::{
    AUDIO_MP3, AUDIO_POSTPROCESS_WAV, SESSION_ORIGINAL_AUDIO_FORMATS,
};

use crate::DenoiseEvent;
use crate::runtime::DenoiseRuntime;
use hypr_audio_utils::Source;

const DENOISE_SAMPLE_RATE: u32 = 16000;
const CHUNK_SIZE: usize = 16000;

#[derive(Debug, Clone, serde::Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub struct DenoiseParams {
    pub session_id: String,
    pub input_path: PathBuf,
    pub output_path: PathBuf,
}

pub async fn run_denoise(
    runtime: Arc<dyn DenoiseRuntime>,
    params: DenoiseParams,
) -> crate::Result<()> {
    let rt = runtime.clone();
    let session_id = params.session_id.clone();

    let result = tokio::task::spawn_blocking(move || run_denoise_blocking(&runtime, &params))
        .await
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;

    if let Err(e) = &result {
        rt.emit(DenoiseEvent::DenoiseFailed {
            session_id,
            error: e.to_string(),
        });
    }

    result
}

fn run_denoise_blocking(
    runtime: &Arc<dyn DenoiseRuntime>,
    params: &DenoiseParams,
) -> crate::Result<()> {
    runtime.emit(DenoiseEvent::DenoiseStarted {
        session_id: params.session_id.clone(),
    });

    let source = hypr_audio_utils::source_from_path(&params.input_path)
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;

    let channels = source.channels() as usize;

    let samples = hypr_audio_utils::resample_audio(source, DENOISE_SAMPLE_RATE)
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;

    let channel_data = hypr_audio_utils::deinterleave(&samples, channels);

    let total_chunks_per_channel = channel_data[0].len().div_ceil(CHUNK_SIZE);
    let total_chunks = total_chunks_per_channel * channels;
    let mut chunks_done = 0;

    let mut denoised_channels: Vec<Vec<f32>> = Vec::with_capacity(channels);

    for ch_samples in &channel_data {
        let mut denoiser = hypr_denoise::onnx::Denoiser::new()
            .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;

        let mut ch_output = Vec::with_capacity(ch_samples.len());

        for chunk in ch_samples.chunks(CHUNK_SIZE) {
            let denoised = denoiser
                .process_streaming(chunk)
                .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;
            ch_output.extend_from_slice(&denoised);

            chunks_done += 1;
            let percentage = (chunks_done as f64 / total_chunks as f64) * 100.0;
            runtime.emit(DenoiseEvent::DenoiseProgress {
                session_id: params.session_id.clone(),
                percentage,
            });
        }

        denoised_channels.push(ch_output);
    }

    let output = hypr_audio_utils::interleave(&denoised_channels);

    let spec = hound::WavSpec {
        channels: channels as u16,
        sample_rate: DENOISE_SAMPLE_RATE,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = hound::WavWriter::create(&params.output_path, spec)
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;
    for &sample in &output {
        writer
            .write_sample(sample)
            .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;
    }
    writer
        .finalize()
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;

    runtime.emit(DenoiseEvent::DenoiseCompleted {
        session_id: params.session_id.clone(),
    });

    Ok(())
}

pub fn confirm_denoise(runtime: &dyn DenoiseRuntime, session_id: &str) -> crate::Result<PathBuf> {
    let session_dir = resolve_session_dir(runtime, session_id)?;
    let postprocess_path = session_dir.join(AUDIO_POSTPROCESS_WAV);

    if !postprocess_path.exists() {
        return Err(crate::Error::DenoiseError(format!(
            "{AUDIO_POSTPROCESS_WAV} not found"
        )));
    }

    let target_path = session_dir.join(AUDIO_MP3);
    let tmp_target_path = target_path.with_extension("mp3.tmp");

    if tmp_target_path.exists() {
        std::fs::remove_file(&tmp_target_path)?;
    }

    if let Err(error) = hypr_mp3::encode_wav(&postprocess_path, &tmp_target_path) {
        let _ = std::fs::remove_file(&tmp_target_path);
        return Err(crate::Error::DenoiseError(error.to_string()));
    }

    replace_file_atomically(&tmp_target_path, &target_path)?;

    for format in SESSION_ORIGINAL_AUDIO_FORMATS {
        if format == AUDIO_MP3 {
            continue;
        }
        let p = session_dir.join(format);
        if p.exists() {
            std::fs::remove_file(&p)?;
        }
    }

    std::fs::remove_file(&postprocess_path)?;

    Ok(target_path)
}

pub fn revert_denoise(runtime: &dyn DenoiseRuntime, session_id: &str) -> crate::Result<()> {
    let session_dir = resolve_session_dir(runtime, session_id)?;
    let postprocess_path = session_dir.join(AUDIO_POSTPROCESS_WAV);

    if postprocess_path.exists() {
        std::fs::remove_file(&postprocess_path)?;
    }

    Ok(())
}

fn resolve_session_dir(runtime: &dyn DenoiseRuntime, session_id: &str) -> crate::Result<PathBuf> {
    let vault_base = runtime
        .vault_base()
        .map_err(|e| crate::Error::DenoiseError(e.to_string()))?;
    let sessions_base = vault_base.join("sessions");
    Ok(find_session_dir(&sessions_base, session_id))
}

fn find_session_dir(sessions_base: &Path, session_id: &str) -> PathBuf {
    find_session_dir_recursive(sessions_base, session_id)
        .unwrap_or_else(|| sessions_base.join(session_id))
}

fn find_session_dir_recursive(dir: &Path, session_id: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = path.file_name()?.to_str()?;

        if name == session_id {
            return Some(path);
        }

        if uuid::Uuid::try_parse(name).is_err() {
            if let Some(found) = find_session_dir_recursive(&path, session_id) {
                return Some(found);
            }
        }
    }

    None
}

fn replace_file_atomically(tmp_path: &Path, target_path: &Path) -> std::io::Result<()> {
    let backup_path = target_path.with_extension("mp3.bak");

    if backup_path.exists() {
        std::fs::remove_file(&backup_path)?;
    }

    let had_target = target_path.exists();
    if had_target {
        std::fs::rename(target_path, &backup_path)?;
    }

    if let Err(error) = std::fs::rename(tmp_path, target_path) {
        if had_target {
            let _ = std::fs::rename(&backup_path, target_path);
        }
        return Err(error);
    }

    if had_target {
        std::fs::remove_file(backup_path)?;
    }

    Ok(())
}
