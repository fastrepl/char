use std::path::Path;

use hypr_version::Version;

use super::{Migration, all_migrations};
use crate::Result;
use crate::version::{DetectedVersion, InferredVersion, detect_version, write_version};

fn inferred_to_equivalent_version(inferred: InferredVersion) -> Version {
    match inferred {
        InferredVersion::V0_0_84 => "0.0.84".parse().unwrap(),
        InferredVersion::V1_0_1 => "1.0.1".parse().unwrap(),
        InferredVersion::V1_0_2NightlyEarly => "1.0.2-nightly.5".parse().unwrap(),
        InferredVersion::V1_0_2NightlyLate => "1.0.2-nightly.13".parse().unwrap(),
    }
}

fn migrations_to_apply(detected: &DetectedVersion, to: &Version) -> Vec<&'static dyn Migration> {
    let current = match detected {
        DetectedVersion::Fresh => return vec![],
        DetectedVersion::FromFile(v) => v.clone(),
        DetectedVersion::Inferred(inferred) => inferred_to_equivalent_version(*inferred),
    };

    let mut migrations = all_migrations();
    migrations.sort_by(|a, b| a.introduced_in().cmp(b.introduced_in()));

    migrations
        .into_iter()
        .filter(|m| m.applies_to(detected))
        .filter(|m| current < *m.introduced_in() && *m.introduced_in() <= *to)
        .collect()
}

pub async fn run(base_dir: &Path, app_version: &Version) -> Result<()> {
    let detected = detect_version(base_dir).await;

    if matches!(detected, DetectedVersion::Fresh) {
        write_version(base_dir, app_version)?;
        return Ok(());
    }

    for migration in migrations_to_apply(&detected, app_version) {
        let version = migration.introduced_in();
        let base_dir_owned = base_dir.to_path_buf();

        let result = tokio::task::spawn_blocking(move || {
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("failed to create migration runtime");
                rt.block_on(migration.run(&base_dir_owned))
            }))
        })
        .await;

        match result {
            Ok(Ok(Ok(()))) => {
                write_version(base_dir, version)?;
            }
            Ok(Ok(Err(e))) => {
                tracing::error!(version = %version, error = %e, "migration failed");
            }
            Ok(Err(_)) => {
                tracing::error!(version = %version, "migration panicked");
            }
            Err(e) => {
                tracing::error!(version = %version, error = %e, "migration task failed");
            }
        }
    }

    write_version(base_dir, app_version)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn v(s: &str) -> Version {
        s.parse().unwrap()
    }

    #[test]
    fn test_migrations_to_apply() {
        let v0_migrate = super::super::v1_0_2_nightly_15_from_v0::Migrate.introduced_in();
        let to_uuid_folder =
            super::super::v1_0_2_nightly_6_move_uuid_folders::Migrate.introduced_in();
        let rename_transcript =
            super::super::v1_0_2_nightly_6_rename_transcript::Migrate.introduced_in();
        let v1_sqlite =
            super::super::v1_0_2_nightly_14_extract_from_sqlite::Migrate.introduced_in();
        let repair_transcripts =
            super::super::v1_0_4_nightly_2_repair_transcripts::Migrate.introduced_in();
        let event_sync_from_sqlite =
            super::super::v1_0_7_nightly_1_events_sync::Migrate.introduced_in();

        struct Case {
            from: DetectedVersion,
            to: &'static str,
            expected: Vec<&'static Version>,
        }

        let cases: &[Case] = &[
            Case {
                from: DetectedVersion::Inferred(InferredVersion::V0_0_84),
                to: "1.0.2",
                expected: vec![v0_migrate],
            },
            Case {
                from: DetectedVersion::Inferred(InferredVersion::V1_0_1),
                to: "1.0.2",
                expected: vec![v1_sqlite],
            },
            Case {
                from: DetectedVersion::Inferred(InferredVersion::V1_0_2NightlyEarly),
                to: "1.0.2-nightly.15",
                expected: vec![to_uuid_folder, rename_transcript, v1_sqlite],
            },
            Case {
                from: DetectedVersion::Inferred(InferredVersion::V1_0_2NightlyLate),
                to: "1.0.2-nightly.15",
                expected: vec![v1_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.2-nightly.15")),
                to: "1.0.2-nightly.16",
                expected: vec![],
            },
            Case {
                from: DetectedVersion::Fresh,
                to: "1.0.2-nightly.15",
                expected: vec![],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.4-nightly.1")),
                to: "1.0.4-nightly.2",
                expected: vec![repair_transcripts],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.3")),
                to: "1.0.4",
                expected: vec![repair_transcripts],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.2")),
                to: "1.0.4",
                expected: vec![repair_transcripts],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.2-nightly.15")),
                to: "1.0.4-nightly.2",
                expected: vec![repair_transcripts],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.6-nightly.1")),
                to: "1.0.7-nightly.1",
                expected: vec![event_sync_from_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.6")),
                to: "1.0.7-nightly.1",
                expected: vec![event_sync_from_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.6")),
                to: "1.0.7",
                expected: vec![event_sync_from_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.6-nightly.1")),
                to: "1.0.7",
                expected: vec![event_sync_from_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.3")),
                to: "1.0.7-nightly.1",
                expected: vec![repair_transcripts, event_sync_from_sqlite],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.7-nightly.1")),
                to: "1.0.7",
                expected: vec![],
            },
            Case {
                from: DetectedVersion::FromFile(v("1.0.5")),
                to: "1.0.6",
                expected: vec![],
            },
        ];

        for Case { from, to, expected } in cases {
            let result: Vec<_> = migrations_to_apply(from, &v(to))
                .iter()
                .map(|m| m.introduced_in())
                .collect();
            assert_eq!(result, *expected, "from {from:?} to {to}");
        }
    }
}
