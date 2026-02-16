use std::env;
use std::path::PathBuf;

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let workspace_root = manifest_dir.parent().unwrap().parent().unwrap();
    let vendor_dir = workspace_root.join("vendor").join("cactus");
    let cactus_src_dir = vendor_dir.join("cactus");

    assert!(
        cactus_src_dir.exists(),
        "Cactus source not found at {cactus_src_dir:?}. Run: git submodule update --init --recursive"
    );

    println!("cargo:rerun-if-changed=wrapper.h");
    println!(
        "cargo:rerun-if-changed={}",
        cactus_src_dir.join("ffi").join("cactus_ffi.h").display()
    );

    let dst = cmake::Config::new(&cactus_src_dir)
        .define("BUILD_SHARED_LIBS", "OFF")
        .define("CMAKE_BUILD_TYPE", "Release")
        .build_target("cactus")
        .build();

    println!(
        "cargo:rustc-link-search=native={}",
        dst.join("build").display()
    );
    println!("cargo:rustc-link-lib=static=cactus");

    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-lib=framework=Metal");
        println!("cargo:rustc-link-lib=framework=MetalPerformanceShaders");
        println!("cargo:rustc-link-lib=framework=Accelerate");
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=CoreML");
        println!("cargo:rustc-link-lib=curl");
        println!("cargo:rustc-link-lib=c++");
    }

    #[cfg(target_os = "linux")]
    {
        println!("cargo:rustc-link-lib=stdc++");
        println!("cargo:rustc-link-lib=m");
        println!("cargo:rustc-link-lib=pthread");
        println!("cargo:rustc-link-lib=curl");
    }

    let wrapper_path = manifest_dir.join("wrapper.h");

    let bindings = bindgen::Builder::default()
        .header(wrapper_path.to_str().unwrap())
        .clang_arg(format!("-I{}", cactus_src_dir.display()))
        .clang_arg("-x")
        .clang_arg("c++")
        .clang_arg("-std=c++20")
        .allowlist_function("cactus_.*")
        .allowlist_type("cactus_.*")
        .allowlist_var("CACTUS_.*")
        .derive_debug(true)
        .derive_default(true)
        .generate()
        .expect("failed to generate bindings");

    bindings
        .write_to_file(out_dir.join("bindings.rs"))
        .expect("failed to write bindings");
}
