// swift-tools-version:6.1

import PackageDescription

let package = Package(
  name: "speech-analyzer-swift",
  platforms: [.macOS("26.0")],
  products: [
    .library(
      name: "speech-analyzer-swift",
      type: .static,
      targets: ["swift-lib"])
  ],
  dependencies: [
    .package(
      url: "https://github.com/yujonglee/swift-rs",
      revision: "41a1605")
  ],
  targets: [
    .target(
      name: "swift-lib",
      dependencies: [
        .product(name: "SwiftRs", package: "swift-rs")
      ],
      path: "src"
    )
  ]
)
