#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CRATE_DIR="$ROOT_DIR/crates/mobile-bridge"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
XCFRAMEWORK_DIR="$OUT_DIR/HyprMobile/MobileBridge.xcframework"
GENERATED_DIR="$OUT_DIR/HyprMobile/Generated"

echo "==> Building for aarch64-apple-ios (device)..."
cargo build --manifest-path "$CRATE_DIR/Cargo.toml" --target aarch64-apple-ios --release

echo "==> Building for aarch64-apple-ios-sim (simulator)..."
cargo build --manifest-path "$CRATE_DIR/Cargo.toml" --target aarch64-apple-ios-sim --release

echo "==> Generating Swift bindings..."
mkdir -p "$GENERATED_DIR"
cargo run --manifest-path "$CRATE_DIR/Cargo.toml" --bin uniffi-bindgen generate \
  --library "$ROOT_DIR/target/aarch64-apple-ios/release/libmobile_bridge.a" \
  --language swift \
  --out-dir "$GENERATED_DIR"

echo "==> Creating XCFramework..."
rm -rf "$XCFRAMEWORK_DIR"

DEVICE_LIB="$ROOT_DIR/target/aarch64-apple-ios/release/libmobile_bridge.a"
SIM_LIB="$ROOT_DIR/target/aarch64-apple-ios-sim/release/libmobile_bridge.a"

# Create temp dirs with headers for xcodebuild
DEVICE_HEADER_DIR=$(mktemp -d)
SIM_HEADER_DIR=$(mktemp -d)

# UniFFI generates a C header: mobile_bridgeFFI.h
cp "$GENERATED_DIR/mobile_bridgeFFI.h" "$DEVICE_HEADER_DIR/"
cp "$GENERATED_DIR/mobile_bridgeFFI.h" "$SIM_HEADER_DIR/"

# Create module maps
cat > "$DEVICE_HEADER_DIR/module.modulemap" <<'MODULEMAP'
module mobile_bridgeFFI {
    header "mobile_bridgeFFI.h"
    export *
}
MODULEMAP
cp "$DEVICE_HEADER_DIR/module.modulemap" "$SIM_HEADER_DIR/module.modulemap"

xcodebuild -create-xcframework \
  -library "$DEVICE_LIB" -headers "$DEVICE_HEADER_DIR" \
  -library "$SIM_LIB" -headers "$SIM_HEADER_DIR" \
  -output "$XCFRAMEWORK_DIR"

rm -rf "$DEVICE_HEADER_DIR" "$SIM_HEADER_DIR"

echo "==> Done!"
echo "    XCFramework: $XCFRAMEWORK_DIR"
echo "    Swift bindings: $GENERATED_DIR/mobile_bridge.swift"
