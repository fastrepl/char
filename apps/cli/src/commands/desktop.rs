use crate::error::{CliError, CliResult};

const DOWNLOAD_URL: &str = "https://char.com/download";
const DESKTOP_DEEPLINKS: &[&str] = &[
    "hyprnote://focus",
    "hyprnote-nightly://focus",
    "hyprnote-staging://focus",
    "hypr://focus",
];

pub enum DesktopAction {
    OpenedApp,
    OpenedDownloadPage,
}

pub fn run() -> CliResult<DesktopAction> {
    for deeplink in DESKTOP_DEEPLINKS {
        if open::that(deeplink).is_ok() {
            return Ok(DesktopAction::OpenedApp);
        }
    }

    if let Err(e) = open::that(DOWNLOAD_URL) {
        return Err(CliError::external_action_failed(
            "open desktop app or download page",
            format!("{e}\nPlease visit: {DOWNLOAD_URL}"),
        ));
    }

    Ok(DesktopAction::OpenedDownloadPage)
}
