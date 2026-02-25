fn main() {
    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let feature_enabled = std::env::var("CARGO_FEATURE_SPEECH_ANALYZER").is_ok();

    #[cfg(target_os = "macos")]
    {
        if target_os == "macos" && feature_enabled {
            swift_rs::SwiftLinker::new("26.0")
                .with_package("speech-analyzer-swift", "./swift-lib/")
                .link();
            return;
        }
    }

    if target_os == "macos" {
        println!(
            "cargo:warning=SpeechAnalyzer Swift bridge disabled (enable feature 'speech-analyzer')"
        );
    } else {
        println!("cargo:warning=Speech Analyzer is only available on macOS 26+");
    }
}
