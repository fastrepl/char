const AUTH_URL: &str = "https://char.com/auth";

pub fn run() {
    if let Err(e) = open::that(AUTH_URL) {
        eprintln!("Failed to open browser: {e}");
        eprintln!("Please visit: {AUTH_URL}");
        std::process::exit(1);
    }
}
