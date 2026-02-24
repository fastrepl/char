import Foundation

@_silgen_name("rust_on_collapsed_confirm")
private func rustOnCollapsedConfirm(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_expanded_accept")
private func rustOnExpandedAccept(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_dismiss")
private func rustOnDismiss(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_collapsed_timeout")
private func rustOnCollapsedTimeout(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_expanded_start_time_reached")
private func rustOnExpandedStartTimeReached(_ keyPtr: UnsafePointer<CChar>)

enum RustBridge {
  static func onCollapsedConfirm(key: String) {
    key.withCString { keyPtr in
      rustOnCollapsedConfirm(keyPtr)
    }
  }

  static func onExpandedAccept(key: String) {
    key.withCString { keyPtr in
      rustOnExpandedAccept(keyPtr)
    }
  }

  static func onDismiss(key: String) {
    key.withCString { keyPtr in
      rustOnDismiss(keyPtr)
    }
  }

  static func onCollapsedTimeout(key: String) {
    key.withCString { keyPtr in
      rustOnCollapsedTimeout(keyPtr)
    }
  }

  static func onExpandedStartTimeReached(key: String) {
    key.withCString { keyPtr in
      rustOnExpandedStartTimeReached(keyPtr)
    }
  }
}
