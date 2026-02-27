const COMMANDS: &[&str] = &["list_calendars", "list_events"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
