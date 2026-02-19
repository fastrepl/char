const COMMANDS: &[&str] = &[
    "load_session_content",
    "load_session_transcript",
    "load_session_enhanced_notes",
    "save_session_content",
    "save_session_transcript",
    "save_session_enhanced_note",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
