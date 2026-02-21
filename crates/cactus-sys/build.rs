use std::env;
use std::path::{Path, PathBuf};

fn main() {
    let cactus_src = locate_cactus_source();
    set_rebuild_triggers(&cactus_src);
    apply_linux_compiler_workaround();

    let build_dir = build_native_library(&cactus_src);
    link_native_library(&build_dir);
    link_platform_dependencies();

    generate_bindings(&cactus_src);
}

fn locate_cactus_source() -> PathBuf {
    let path = env::var("CACTUS_SOURCE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| char_workspace_fallback());

    assert!(
        path.exists(),
        "Cactus source not found at {path:?}. Set CACTUS_SOURCE_DIR or run: git submodule update --init --recursive"
    );

    path
}

fn char_workspace_fallback() -> PathBuf {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    manifest_dir
        .ancestors()
        .nth(2)
        .unwrap()
        .join("vendor/cactus/cactus")
}

fn set_rebuild_triggers(cactus_src: &Path) {
    println!("cargo:rerun-if-env-changed=CACTUS_SOURCE_DIR");
    println!("cargo:rerun-if-changed=wrapper.h");
    println!(
        "cargo:rerun-if-changed={}",
        cactus_src.join("ffi/cactus_ffi.h").display()
    );
}

#[cfg(target_os = "linux")]
fn apply_linux_compiler_workaround() {
    // GCC requires explicit <iomanip>; upstream telemetry.cpp omits it.
    let existing = env::var("CXXFLAGS").unwrap_or_default();
    let cxxflags = if existing.is_empty() {
        "-include iomanip".to_string()
    } else {
        format!("-include iomanip {existing}")
    };
    unsafe { env::set_var("CXXFLAGS", cxxflags) };
}

#[cfg(not(target_os = "linux"))]
fn apply_linux_compiler_workaround() {}

fn build_native_library(cactus_src: &Path) -> PathBuf {
    cmake::Config::new(cactus_src)
        .define("BUILD_SHARED_LIBS", "OFF")
        .define("CMAKE_BUILD_TYPE", "Release")
        .build_target("cactus")
        .build()
        .join("build")
}

fn link_native_library(build_dir: &Path) {
    println!("cargo:rustc-link-search=native={}", build_dir.display());
    println!("cargo:rustc-link-lib=static=cactus");
}

#[cfg(target_os = "macos")]
fn link_platform_dependencies() {
    for framework in [
        "Metal",
        "MetalPerformanceShaders",
        "Accelerate",
        "Foundation",
        "CoreML",
    ] {
        println!("cargo:rustc-link-lib=framework={framework}");
    }
    println!("cargo:rustc-link-lib=curl");
    println!("cargo:rustc-link-lib=c++");
}

#[cfg(target_os = "linux")]
fn link_platform_dependencies() {
    println!("cargo:rustc-link-lib=stdc++");
    println!("cargo:rustc-link-lib=m");
    println!("cargo:rustc-link-lib=pthread");
    println!("cargo:rustc-link-lib=curl");
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn link_platform_dependencies() {}

fn generate_bindings(cactus_src: &Path) {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());

    bindgen::Builder::default()
        .header(manifest_dir.join("wrapper.h").to_str().unwrap())
        .clang_arg(format!("-I{}", cactus_src.display()))
        .clang_arg("-x")
        .clang_arg("c++")
        .clang_arg("-std=c++20")
        .allowlist_function("cactus_.*")
        .allowlist_type("cactus_.*")
        .allowlist_var("CACTUS_.*")
        .derive_debug(true)
        .derive_default(true)
        .generate()
        .expect("failed to generate bindings")
        .write_to_file(out_dir.join("bindings.rs"))
        .expect("failed to write bindings");
}
