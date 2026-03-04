const COMMANDS: &[&str] = &[
    "available_providers",
    "list_calendars",
    "list_events",
    "open_calendar",
    "create_event",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
