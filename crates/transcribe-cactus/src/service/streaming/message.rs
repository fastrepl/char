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

#[cfg(test)]
mod tests {
    use axum::extract::ws::Message;
    use owhisper_interface::ControlMessage;

    use super::*;

    #[test]
    fn control_message_finalize_parsed() {
        let msg = Message::Text(r#"{"type":"Finalize"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::Finalize) => {}
            other => panic!(
                "expected Finalize, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn control_message_keep_alive_parsed() {
        let msg = Message::Text(r#"{"type":"KeepAlive"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::KeepAlive) => {}
            other => panic!(
                "expected KeepAlive, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn control_message_close_stream_parsed() {
        let msg = Message::Text(r#"{"type":"CloseStream"}"#.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Control(ControlMessage::CloseStream) => {}
            other => panic!(
                "expected CloseStream, got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn audio_chunk_parsed_over_control() {
        let chunk = owhisper_interface::ListenInputChunk::End;
        let json = serde_json::to_string(&chunk).unwrap();
        let msg = Message::Text(json.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::End) => {}
            other => panic!(
                "expected Audio(End), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn close_frame_yields_end() {
        let msg = Message::Close(None);
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::End) => {}
            other => panic!(
                "expected Audio(End), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn binary_single_channel_yields_mono() {
        let samples: Vec<i16> = vec![1000, 2000, 3000];
        let data: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        let msg = Message::Binary(data.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::Mono(s)) => assert!(!s.is_empty()),
            other => panic!(
                "expected Audio(Mono), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn binary_dual_channel_yields_dual() {
        // 2 interleaved i16 samples (4 bytes per frame: ch0, ch1)
        let samples: Vec<i16> = vec![1000, -1000, 2000, -2000];
        let data: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        let msg = Message::Binary(data.into());
        match process_incoming_message(&msg, 2) {
            IncomingMessage::Audio(AudioExtract::Dual { ch0, ch1 }) => {
                assert_eq!(ch0.len(), 2);
                assert_eq!(ch1.len(), 2);
                assert!(ch0[0] > 0.0);
                assert!(ch1[0] < 0.0);
            }
            other => panic!(
                "expected Audio(Dual), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }

    #[test]
    fn dual_audio_json_yields_dual() {
        let chunk = owhisper_interface::ListenInputChunk::DualAudio {
            mic: vec![0x00, 0x10],
            speaker: vec![0x00, 0x20],
        };
        let json = serde_json::to_string(&chunk).unwrap();
        let msg = Message::Text(json.into());
        match process_incoming_message(&msg, 1) {
            IncomingMessage::Audio(AudioExtract::Dual { .. }) => {}
            other => panic!(
                "expected Audio(Dual), got {:?}",
                std::mem::discriminant(&other)
            ),
        }
    }
}
