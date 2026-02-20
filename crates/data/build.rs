fn main() {
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        panic!(
            "\n\nhypr-data is a test-only crate.\nDo not add it to [dependencies]; use [dev-dependencies] instead.\n"
        );
    }
}
