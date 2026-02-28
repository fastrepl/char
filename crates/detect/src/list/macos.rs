use std::path::{Path, PathBuf};

use cidre::core_audio as ca;
use hypr_bundle::{is_app_bundle, read_bundle_info};
use objc2_app_kit::NSRunningApplication;
use sysinfo::{Pid, System};

use super::InstalledApp;

#[cfg(target_os = "macos")]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    let app_dirs = [
        "/Applications".to_string(),
        format!("{}/Applications", std::env::var("HOME").unwrap_or_default()),
    ];

    let mut apps = Vec::new();

    for dir in app_dirs {
        let path = PathBuf::from(dir);
        if !path.exists() {
            continue;
        }

        let mut stack = vec![path];
        while let Some(current) = stack.pop() {
            let Ok(entries) = std::fs::read_dir(&current) else {
                continue;
            };

            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                if is_app_bundle(&path) {
                    if let Some(info) = read_bundle_info(&path) {
                        apps.push(InstalledApp {
                            id: info.id,
                            name: info.name,
                        });
                    }
                } else {
                    stack.push(path);
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.cmp(&b.name));
    apps
}

#[cfg(not(target_os = "macos"))]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    Vec::new()
}

#[cfg(target_os = "macos")]
pub fn list_mic_using_apps() -> Vec<InstalledApp> {
    let Ok(processes) = ca::System::processes() else {
        return Vec::new();
    };

    processes
        .into_iter()
        .filter(|p| p.is_running_input().unwrap_or(false))
        .filter_map(|p| p.pid().ok())
        .filter_map(resolve_to_app)
        .collect()
}

fn resolve_to_app(pid: i32) -> Option<InstalledApp> {
    resolve_via_nsrunningapp(pid).or_else(|| resolve_via_sysinfo(pid))
}

fn resolve_via_nsrunningapp(pid: i32) -> Option<InstalledApp> {
    std::panic::catch_unwind(|| resolve_via_nsrunningapp_inner(pid))
        .ok()
        .flatten()
}

fn resolve_via_nsrunningapp_inner(pid: i32) -> Option<InstalledApp> {
    let app = NSRunningApplication::runningApplicationWithProcessIdentifier(pid)?;

    let bundle_url = app.bundleURL()?;
    let path_ns = bundle_url.path()?;
    let path_str = path_ns.to_string();
    find_outermost_app(Path::new(&path_str))
}

fn resolve_via_sysinfo(pid: i32) -> Option<InstalledApp> {
    let mut sys = System::new();
    let pid = Pid::from_u32(pid as u32);
    sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid]), true);

    let exe_path = sys.process(pid)?.exe()?;
    find_outermost_app(exe_path)
}

fn find_outermost_app(path: &Path) -> Option<InstalledApp> {
    let mut outermost: Option<&Path> = None;
    let mut current = Some(path);

    while let Some(p) = current {
        if is_app_bundle(p) {
            outermost = Some(p);
        }
        current = p.parent();
    }

    outermost.and_then(|p| {
        read_bundle_info(p).map(|info| InstalledApp {
            id: info.id,
            name: info.name,
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_list_installed_apps() {
        let apps = list_installed_apps();
        println!("Got {} apps", apps.len());
        for app in &apps {
            println!("- {} ({})", app.name, app.id);
        }
    }

    // cargo test -p detect --features list test_list_mic_using_apps -- --ignored --nocapture
    #[test]
    #[ignore]
    fn test_list_mic_using_apps() {
        let apps = list_mic_using_apps();
        println!("Got {} apps", apps.len());
        for app in &apps {
            println!("- {} ({})", app.name, app.id);
        }
    }

    #[test]
    fn test_find_outermost_app_system_daemon_path() {
        let result = find_outermost_app(Path::new("/usr/libexec/avconferenced"));
        assert!(
            result.is_none(),
            "system daemon should not resolve to an app"
        );
    }

    #[test]
    fn test_find_outermost_app_system_library_path() {
        let result =
            find_outermost_app(Path::new("/System/Library/PrivateFrameworks/SomeFramework"));
        assert!(
            result.is_none(),
            "system framework should not resolve to an app"
        );
    }

    // cargo test -p detect --features list,mic,app test_resolve_to_app_filters_system_daemons -- --ignored --nocapture
    #[test]
    #[ignore]
    fn test_resolve_to_app_filters_system_daemons() {
        let result = resolve_to_app(1);
        println!("launchd (pid 1) resolved to: {:?}", result);
        assert!(
            result.is_none(),
            "launchd (pid 1) is a system daemon and should not resolve to an app"
        );
    }

    // cargo test -p detect --features list,mic,app test_mic_using_apps_no_system_daemons -- --ignored --nocapture
    #[test]
    #[ignore]
    fn test_mic_using_apps_no_system_daemons() {
        let apps = list_mic_using_apps();
        println!("Mic-using apps:");
        for app in &apps {
            println!("- {} ({})", app.name, app.id);
        }
        for app in &apps {
            assert!(
                !app.name.ends_with('d') || app.name.contains('.'),
                "detected app '{}' ({}) looks like a system daemon",
                app.name,
                app.id,
            );
        }
    }
}
