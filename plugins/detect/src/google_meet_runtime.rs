use std::path::PathBuf;

pub(crate) struct TauriGoogleMeetRuntime;

impl hypr_detect::GoogleMeetRuntime for TauriGoogleMeetRuntime {
    fn chrome_state_path(&self) -> PathBuf {
        dirs::data_dir()
            .unwrap()
            .join("hyprnote")
            .join("chrome_state.json")
    }

    fn native_host_binary_path(&self) -> Option<PathBuf> {
        if cfg!(debug_assertions) {
            let workspace_dir = std::env::var("CARGO_MANIFEST_DIR").ok()?;
            let workspace_root = PathBuf::from(workspace_dir)
                .parent()?
                .parent()?
                .to_path_buf();
            Some(workspace_root.join("target/debug/hyprnote-chrome-native-host"))
        } else {
            #[cfg(target_os = "macos")]
            {
                let exe = std::env::current_exe().ok()?;
                let macos_dir = exe.parent()?;
                Some(macos_dir.join("hyprnote-chrome-native-host"))
            }

            #[cfg(not(target_os = "macos"))]
            {
                let exe = std::env::current_exe().ok()?;
                let bin_dir = exe.parent()?;
                Some(bin_dir.join("hyprnote-chrome-native-host"))
            }
        }
    }

    fn chrome_native_messaging_hosts_dir(&self) -> Option<PathBuf> {
        #[cfg(target_os = "macos")]
        {
            let home = dirs::home_dir()?;
            Some(home.join("Library/Application Support/Google/Chrome/NativeMessagingHosts"))
        }

        #[cfg(target_os = "linux")]
        {
            let home = dirs::home_dir()?;
            Some(home.join(".config/google-chrome/NativeMessagingHosts"))
        }

        #[cfg(not(any(target_os = "macos", target_os = "linux")))]
        {
            None
        }
    }
}
