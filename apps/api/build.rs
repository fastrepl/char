fn main() {
    match vergen_gix::GixBuilder::all_git() {
        Ok(gitcl) => {
            vergen_gix::Emitter::default()
                .add_instructions(&gitcl)
                .unwrap()
                .emit()
                .unwrap();
        }
        Err(err) => {
            println!("cargo:warning=Failed to gather git metadata: {err}");
        }
    }
}
