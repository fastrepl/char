use std::io::{self, Read, Write};
use std::path::PathBuf;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub name: String,
    pub is_self: bool,
}

#[derive(Serialize)]
struct ChromeState {
    version: u32,
    timestamp_ms: u64,
    meeting: Option<MeetingState>,
}

#[derive(Serialize)]
struct MeetingState {
    url: String,
    is_active: bool,
    muted: bool,
    participants: Vec<Participant>,
}

fn state_file_path() -> PathBuf {
    let data_dir = dirs::data_dir().expect("failed to resolve data directory");
    data_dir.join("hyprnote").join("chrome_state.json")
}

fn read_message(stdin: &mut impl Read) -> io::Result<Option<Vec<u8>>> {
    let mut len_buf = [0u8; 4];
    match stdin.read_exact(&mut len_buf) {
        Ok(()) => {}
        Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(e) => return Err(e),
    }
    let len = u32::from_le_bytes(len_buf) as usize;
    let mut buf = vec![0u8; len];
    stdin.read_exact(&mut buf)?;
    Ok(Some(buf))
}

fn write_state(state: &ChromeState) -> io::Result<()> {
    let path = state_file_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let dir = path.parent().unwrap();
    let mut tmp = tempfile::NamedTempFile::new_in(dir)?;
    serde_json::to_writer(&mut tmp, state)?;
    tmp.as_file_mut().flush()?;
    tmp.persist(&path).map_err(|e| e.error)?;
    Ok(())
}

fn timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

fn main() {
    let mut stdin = io::stdin().lock();

    loop {
        match read_message(&mut stdin) {
            Ok(Some(data)) => {
                let msg: IncomingMessage = match serde_json::from_slice(&data) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let meeting = if msg.msg_type == "meeting_state" && msg.is_active.unwrap_or(false) {
                    Some(MeetingState {
                        url: msg.url.unwrap_or_default(),
                        is_active: true,
                        muted: msg.muted.unwrap_or(false),
                        participants: msg.participants.unwrap_or_default(),
                    })
                } else {
                    None
                };

                let state = ChromeState {
                    version: 1,
                    timestamp_ms: timestamp_ms(),
                    meeting,
                };

                if let Err(e) = write_state(&state) {
                    eprintln!("failed to write state: {e}");
                }
            }
            Ok(None) => break,
            Err(_) => break,
        }
    }

    let state = ChromeState {
        version: 1,
        timestamp_ms: timestamp_ms(),
        meeting: None,
    };
    let _ = write_state(&state);
}
