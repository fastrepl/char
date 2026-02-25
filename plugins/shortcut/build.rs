const COMMANDS: &[&str] = &["get_all_shortcuts"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
