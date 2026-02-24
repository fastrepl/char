use std::path::Path;

use super::AudioEncoder;

pub struct Mp3Encoder;

impl AudioEncoder for Mp3Encoder {
    fn extension(&self) -> &str {
        "mp3"
    }

    fn encode_wav(
        &self,
        wav_path: &Path,
        output_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        hypr_mp3::encode_wav(wav_path, output_path)
    }

    fn decode_to_wav(
        &self,
        encoded_path: &Path,
        wav_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error>> {
        hypr_mp3::decode_to_wav(encoded_path, wav_path)
    }
}
