use std::path::Path;

use super::AudioEncoder;

pub struct Mp3Encoder;

impl AudioEncoder for Mp3Encoder {
    fn extension(&self) -> &str {
        "mp3"
    }

    fn encode(&self, input: &Path, output: &Path) -> Result<(), Box<dyn std::error::Error>> {
        hypr_mp3::encode_wav(input, output)
    }

    fn decode(&self, input: &Path, output: &Path) -> Result<(), Box<dyn std::error::Error>> {
        hypr_mp3::decode_to_wav(input, output)
    }
}
