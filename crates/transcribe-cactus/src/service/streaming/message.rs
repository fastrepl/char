use axum::extract::ws::Message;
use hypr_audio_utils::{bytes_to_f32_samples, deinterleave_stereo_bytes};
use owhisper_interface::ControlMessage;

pub(super) enum IncomingMessage {
    Audio(AudioExtract),
    Control(ControlMessage),
}

pub(super) enum AudioExtract {
    Mono(Vec<f32>),
    Dual { ch0: Vec<f32>, ch1: Vec<f32> },
    Empty,
    End,
}

pub(super) fn process_incoming_message(msg: &Message, channels: u8) -> IncomingMessage {
    match msg {
        Message::Binary(data) => {
            if data.is_empty() {
                return IncomingMessage::Audio(AudioExtract::Empty);
            }
            if channels >= 2 {
                let (ch0, ch1) = deinterleave_stereo_bytes(data);
                IncomingMessage::Audio(AudioExtract::Dual { ch0, ch1 })
            } else {
                IncomingMessage::Audio(AudioExtract::Mono(bytes_to_f32_samples(data)))
            }
        }
        Message::Text(data) => {
            if let Ok(ctrl) = serde_json::from_str::<ControlMessage>(data) {
                return IncomingMessage::Control(ctrl);
            }

            match serde_json::from_str::<owhisper_interface::ListenInputChunk>(data) {
                Ok(owhisper_interface::ListenInputChunk::Audio { data }) => {
                    if data.is_empty() {
                        IncomingMessage::Audio(AudioExtract::Empty)
                    } else {
                        IncomingMessage::Audio(AudioExtract::Mono(bytes_to_f32_samples(&data)))
                    }
                }
                Ok(owhisper_interface::ListenInputChunk::DualAudio { mic, speaker }) => {
                    IncomingMessage::Audio(AudioExtract::Dual {
                        ch0: bytes_to_f32_samples(&mic),
                        ch1: bytes_to_f32_samples(&speaker),
                    })
                }
                Ok(owhisper_interface::ListenInputChunk::End) => {
                    IncomingMessage::Audio(AudioExtract::End)
                }
                Err(_) => IncomingMessage::Audio(AudioExtract::Empty),
            }
        }
        Message::Close(_) => IncomingMessage::Audio(AudioExtract::End),
        _ => IncomingMessage::Audio(AudioExtract::Empty),
    }
}
