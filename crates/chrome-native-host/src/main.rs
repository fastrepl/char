use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct IncomingMessage {
    #[serde(rename = "type")]
    msg_type: String,
    url: Option<String>,
    is_active: Option<bool>,
    muted: Option<bool>,
    participants: Option<Vec<Participant>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Participant {
    pub name: String,
    pub is_self: bool,
}

#[derive(Serialize, Deserialize)]
struct ChromeState {
    version: u32,
    timestamp_ms: u64,
    meeting: Option<MeetingState>,
}

#[derive(Serialize, Deserialize)]
struct MeetingState {
    url: String,
    is_active: bool,
    muted: bool,
    participants: Vec<Participant>,
}

fn default_state_path() -> PathBuf {
    dirs::data_dir()
        .expect("failed to resolve data directory")
        .join("char")
        .join("chrome_state.json")
}

fn read_message(reader: &mut impl Read) -> io::Result<Option<Vec<u8>>> {
    let mut len_buf = [0u8; 4];
    match reader.read_exact(&mut len_buf) {
        Ok(()) => {}
        Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let len = u32::from_le_bytes(len_buf) as usize;
    let mut buf = vec![0u8; len];
    reader.read_exact(&mut buf)?;
    Ok(Some(buf))
}

fn process_message(msg: IncomingMessage) -> Option<MeetingState> {
    if msg.msg_type == "meeting_state" && msg.is_active.unwrap_or(false) {
        Some(MeetingState {
            url: msg.url.unwrap_or_default(),
            is_active: true,
            muted: msg.muted.unwrap_or(false),
            participants: msg.participants.unwrap_or_default(),
        })
    } else {
        None
    }
}

fn write_state(state: &ChromeState, path: &Path) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let dir = path.parent().unwrap();
    let mut tmp = tempfile::NamedTempFile::new_in(dir)?;
    serde_json::to_writer(&mut tmp, state)?;
    tmp.as_file_mut().flush()?;
    tmp.persist(path).map_err(|e| e.error)?;
    Ok(())
}

fn timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn run(reader: &mut impl Read, state_path: &Path) {
    loop {
        match read_message(reader) {
            Ok(Some(data)) => {
                let msg: IncomingMessage = match serde_json::from_slice(&data) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let state = ChromeState {
                    version: 1,
                    timestamp_ms: timestamp_ms(),
                    meeting: process_message(msg),
                };

                if let Err(e) = write_state(&state, state_path) {
                    eprintln!("failed to write state: {e}");
                }
            }
            Ok(None) => break,
            Err(e) => {
                eprintln!("error reading message: {e}");
                break;
            }
        }
    }
}

fn main() {
    let mut stdin = io::stdin().lock();
    run(&mut stdin, &default_state_path());
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn encode_message(json: &str) -> Vec<u8> {
        let bytes = json.as_bytes();
        let len = bytes.len() as u32;
        let mut buf = Vec::with_capacity(4 + bytes.len());
        buf.extend_from_slice(&len.to_le_bytes());
        buf.extend_from_slice(bytes);
        buf
    }

    // --- read_message ---

    #[test]
    fn test_read_message_valid() {
        let payload = r#"{"type":"meeting_state"}"#;
        let encoded = encode_message(payload);
        let mut cursor = Cursor::new(encoded);
        let result = read_message(&mut cursor).unwrap();
        assert_eq!(result, Some(payload.as_bytes().to_vec()));
    }

    #[test]
    fn test_read_message_eof_returns_none() {
        let mut cursor = Cursor::new(vec![]);
        let result = read_message(&mut cursor).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_read_message_truncated_body_errors() {
        // 4-byte header says 10 bytes but body has only 3
        let mut buf = vec![];
        buf.extend_from_slice(&10u32.to_le_bytes());
        buf.extend_from_slice(b"abc");
        let mut cursor = Cursor::new(buf);
        assert!(read_message(&mut cursor).is_err());
    }

    // --- process_message ---

    #[test]
    fn test_process_meeting_state_active() {
        let msg = IncomingMessage {
            msg_type: "meeting_state".into(),
            url: Some("https://meet.google.com/abc".into()),
            is_active: Some(true),
            muted: Some(true),
            participants: Some(vec![Participant { name: "Alice".into(), is_self: true }]),
        };
        let result = process_message(msg).unwrap();
        assert!(result.is_active);
        assert!(result.muted);
        assert_eq!(result.participants.len(), 1);
        assert_eq!(result.url, "https://meet.google.com/abc");
    }

    #[test]
    fn test_process_meeting_ended() {
        let msg = IncomingMessage {
            msg_type: "meeting_ended".into(),
            url: None,
            is_active: Some(false),
            muted: None,
            participants: None,
        };
        assert!(process_message(msg).is_none());
    }

    #[test]
    fn test_process_meeting_state_inactive_flag() {
        let msg = IncomingMessage {
            msg_type: "meeting_state".into(),
            url: Some("https://meet.google.com/abc".into()),
            is_active: Some(false),
            muted: Some(false),
            participants: None,
        };
        assert!(process_message(msg).is_none());
    }

    #[test]
    fn test_process_defaults_muted_false() {
        let msg = IncomingMessage {
            msg_type: "meeting_state".into(),
            url: None,
            is_active: Some(true),
            muted: None,
            participants: None,
        };
        let result = process_message(msg).unwrap();
        assert!(!result.muted);
    }

    // --- write_state + full round-trip ---

    #[test]
    fn test_write_state_creates_valid_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");

        let state = ChromeState {
            version: 1,
            timestamp_ms: 1000,
            meeting: Some(MeetingState {
                url: "https://meet.google.com/test".into(),
                is_active: true,
                muted: false,
                participants: vec![],
            }),
        };

        write_state(&state, &path).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["version"], 1);
        assert_eq!(parsed["meeting"]["is_active"], true);
    }

    #[test]
    fn test_write_state_creates_parent_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("dirs").join("state.json");

        let state = ChromeState { version: 1, timestamp_ms: 0, meeting: None };
        write_state(&state, &path).unwrap();

        assert!(path.exists());
    }

    #[test]
    fn test_run_meeting_state_message() {
        let dir = tempfile::tempdir().unwrap();
        let state_path = dir.path().join("chrome_state.json");

        let msg = r#"{"type":"meeting_state","url":"https://meet.google.com/xyz","is_active":true,"muted":false,"participants":[{"name":"Bob","is_self":false}]}"#;
        let input = encode_message(msg);
        let mut cursor = Cursor::new(input);

        run(&mut cursor, &state_path);

        let contents = std::fs::read_to_string(&state_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["meeting"]["url"], "https://meet.google.com/xyz");
        assert_eq!(parsed["meeting"]["participants"][0]["name"], "Bob");
    }

    #[test]
    fn test_run_meeting_ended_clears_meeting() {
        let dir = tempfile::tempdir().unwrap();
        let state_path = dir.path().join("chrome_state.json");

        let active = r#"{"type":"meeting_state","is_active":true,"muted":false}"#;
        let ended = r#"{"type":"meeting_ended","is_active":false}"#;

        let mut input = encode_message(active);
        input.extend(encode_message(ended));

        let mut cursor = Cursor::new(input);
        run(&mut cursor, &state_path);

        let contents = std::fs::read_to_string(&state_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert!(parsed["meeting"].is_null());
    }

    #[test]
    fn test_run_invalid_json_is_skipped() {
        let dir = tempfile::tempdir().unwrap();
        let state_path = dir.path().join("chrome_state.json");

        let bad = b"not json at all";
        let len = bad.len() as u32;
        let mut input = len.to_le_bytes().to_vec();
        input.extend_from_slice(bad);

        let valid = r#"{"type":"meeting_state","is_active":true,"muted":true}"#;
        input.extend(encode_message(valid));

        let mut cursor = Cursor::new(input);
        run(&mut cursor, &state_path);

        // second (valid) message should still produce output
        assert!(state_path.exists());
    }
}
