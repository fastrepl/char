use std::io::Write;
use std::path::PathBuf;

use hypr_model_downloader::ModelDownloaderRuntime;

use super::CliModel;

pub(super) struct CliModelRuntime {
    pub(super) models_base: PathBuf,
}

impl ModelDownloaderRuntime<CliModel> for CliModelRuntime {
    fn models_base(&self) -> Result<PathBuf, hypr_model_downloader::Error> {
        Ok(self.models_base.clone())
    }

    fn emit_progress(&self, model: &CliModel, progress: i8) {
        if progress < 0 {
            let _ = writeln!(
                std::io::stderr(),
                "\r{}: failed                                ",
                model.cli_name()
            );
            return;
        }

        if progress >= 100 {
            let _ = writeln!(
                std::io::stderr(),
                "\r{}: 100%                                   ",
                model.cli_name()
            );
            return;
        }

        let _ = write!(
            std::io::stderr(),
            "\r{}: {:>3}%",
            model.cli_name(),
            progress
        );
        let _ = std::io::stderr().flush();
    }
}
