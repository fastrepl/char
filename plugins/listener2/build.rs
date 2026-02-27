const COMMANDS: &[&str] = &[
    "run_batch",
    "run_denoise",
    "audio_confirm_denoise",
    "audio_revert_denoise",
    "parse_subtitle",
    "export_to_vtt",
    "is_supported_languages_batch",
    "suggest_providers_for_languages_batch",
    "list_documented_language_codes_batch",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
