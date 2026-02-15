fn main() {
    #[cfg(target_os = "macos")]
    {
        swift_rs::SwiftLinker::new("14.2")
            .with_package("transcribe-apple-swift", "./swift-lib/")
            .link();
    }

    #[cfg(not(target_os = "macos"))]
    {
        println!("cargo:warning=Apple Speech Recognition is only available on macOS");
    }
}
