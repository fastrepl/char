use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, exit};

fn main() {
    let task = env::args().nth(1).unwrap_or_default();
    match task.as_str() {
        "prepare-binaries" => prepare_binaries(),
        _ => {
            eprintln!("usage: cargo xtask <task>");
            eprintln!("tasks: prepare-binaries");
            exit(1);
        }
    }
}

// CARGO_MANIFEST_DIR is crates/xtask/ at compile time.
fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .to_path_buf()
}

fn prepare_binaries() {
    let src_tauri = workspace_root().join("apps/desktop/src-tauri");
    let binaries_dir = src_tauri.join("binaries");

    // TAURI_ENV_TARGET_TRIPLE is always set by Tauri during beforeBundleCommand.
    // It reflects the actual build target, not the host — necessary for
    // cross-compilation (e.g. x86_64-apple-darwin built on an ARM runner).
    // Fall back to rustc host triple only when invoking the task directly.
    let triple = env::var("TAURI_ENV_TARGET_TRIPLE").unwrap_or_else(|_| rustc_host_triple());
    let ext = if triple.contains("windows") { ".exe" } else { "" };

    let cargo = env::var("CARGO").unwrap_or_else(|_| "cargo".into());

    // Run from src-tauri/ so its .cargo/config.toml (target-dir = "target")
    // is in effect. Binary lands at src-tauri/target/{triple}/release/.
    let status = Command::new(&cargo)
        .args(["build", "--release", "--target", &triple, "-p", "chrome-native-host"])
        .current_dir(&src_tauri)
        .status()
        .expect("failed to spawn cargo");

    if !status.success() {
        eprintln!("cargo build failed");
        exit(1);
    }

    fs::create_dir_all(&binaries_dir).expect("failed to create binaries/");

    let src = src_tauri
        .join("target")
        .join(&triple)
        .join("release")
        .join(format!("char-chrome-native-host{ext}"));

    let dst = binaries_dir.join(format!("char-chrome-native-host-{triple}{ext}"));

    fs::copy(&src, &dst).expect("failed to copy binary");

    println!("prepare-binaries: binaries/char-chrome-native-host-{triple}{ext}");
}

fn rustc_host_triple() -> String {
    let out = Command::new("rustc")
        .arg("-vV")
        .output()
        .expect("failed to run rustc");
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .find(|l| l.starts_with("host:"))
        .expect("no host line in rustc -vV")
        .split_whitespace()
        .nth(1)
        .expect("malformed host line")
        .to_string()
}
