use std::path::PathBuf;
use std::str::FromStr;

use hypr_frontmatter::Document;
use tauri_plugin_settings::SettingsPluginExt;

use crate::Error;
use crate::types::{
    self, EnhancedNoteData, EnhancedNoteFrontmatterWrite, MemoFrontmatter, MemoFrontmatterWrite,
    SessionContent, SessionEnhancedNotes, SessionTranscript, TranscriptData, TranscriptEntryWrite,
    TranscriptFileWrite,
};

pub struct FsDb<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> FsDb<'a, R, M> {
    pub fn ensure_version_file(&self) -> crate::Result<()> {
        let base_dir = self.manager.app_handle().settings().fresh_vault_base()?;

        if crate::version::known::exists(&base_dir) {
            return Ok(());
        }

        let app_version = self
            .manager
            .app_handle()
            .config()
            .version
            .as_ref()
            .map_or_else(
                || hypr_version::Version::new(0, 0, 0),
                |v| {
                    v.parse::<hypr_version::Version>()
                        .expect("version must be semver")
                },
            );

        crate::version::write_version(&base_dir, &app_version)?;
        Ok(())
    }

    fn resolve_session_dir(&self, session_id: &str) -> crate::Result<PathBuf> {
        let base = self.manager.app_handle().settings().cached_vault_base()?;
        Ok(find_session_dir(
            &base.join("sessions").into_std_path_buf(),
            session_id,
        ))
    }

    async fn ensure_session_dir(&self, session_dir: &PathBuf) -> crate::Result<()> {
        if !session_dir.exists() {
            tokio::fs::create_dir_all(session_dir).await?;
        }
        Ok(())
    }

    pub async fn load_session_content(&self, session_id: &str) -> crate::Result<SessionContent> {
        let memo_path = self
            .resolve_session_dir(session_id)?
            .join(types::files::MEMO);

        if !memo_path.exists() {
            return Ok(SessionContent { raw_md: None });
        }

        let content = tokio::fs::read_to_string(&memo_path).await?;
        let doc: Document<MemoFrontmatter> = Document::from_str(&content)?;
        let tiptap_json = hypr_tiptap::md_to_tiptap_json(&doc.content).map_err(Error::Tiptap)?;

        Ok(SessionContent {
            raw_md: Some(tiptap_json.to_string()),
        })
    }

    pub async fn load_session_transcript(
        &self,
        session_id: &str,
    ) -> crate::Result<SessionTranscript> {
        let transcript_path = self
            .resolve_session_dir(session_id)?
            .join(types::files::TRANSCRIPT);

        if !transcript_path.exists() {
            return Ok(SessionTranscript {
                transcripts: vec![],
            });
        }

        let content = tokio::fs::read_to_string(&transcript_path).await?;
        let file: types::TranscriptFile = serde_json::from_str(&content)?;
        let transcripts = file.transcripts.into_iter().map(Into::into).collect();

        Ok(SessionTranscript { transcripts })
    }

    pub async fn load_session_enhanced_notes(
        &self,
        session_id: &str,
    ) -> crate::Result<SessionEnhancedNotes> {
        let session_dir = self.resolve_session_dir(session_id)?;

        if !session_dir.exists() {
            return Ok(SessionEnhancedNotes { notes: vec![] });
        }

        let mut notes = Vec::new();
        let mut entries = tokio::fs::read_dir(&session_dir).await?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

            if !filename.ends_with(".md") || filename == types::files::MEMO {
                continue;
            }

            if let Some(note) = types::load_enhanced_note(&path, session_id).await {
                notes.push(note);
            }
        }

        notes.sort_by_key(|n| n.position);

        Ok(SessionEnhancedNotes { notes })
    }

    pub async fn save_session_content(&self, session_id: &str, raw_md: &str) -> crate::Result<()> {
        let session_dir = self.resolve_session_dir(session_id)?;
        self.ensure_session_dir(&session_dir).await?;

        let tiptap_value: serde_json::Value = serde_json::from_str(raw_md)?;
        let markdown = hypr_tiptap::tiptap_json_to_md(&tiptap_value).map_err(Error::Tiptap)?;

        let frontmatter = MemoFrontmatterWrite {
            id: session_id.to_string(),
            session_id: session_id.to_string(),
        };

        let doc = Document::new(frontmatter, markdown);
        tokio::fs::write(session_dir.join(types::files::MEMO), doc.render()?).await?;

        Ok(())
    }

    pub async fn save_session_transcript(
        &self,
        session_id: &str,
        transcript: TranscriptData,
    ) -> crate::Result<()> {
        let session_dir = self.resolve_session_dir(session_id)?;
        let transcript_path = session_dir.join(types::files::TRANSCRIPT);

        self.ensure_session_dir(&session_dir).await?;

        let mut existing = types::load_transcript_file(&transcript_path).await;
        let transcript_id = transcript.id.clone();

        existing.transcripts.retain(|t| t.id != transcript_id);

        let mut transcripts_write: Vec<TranscriptEntryWrite> =
            existing.transcripts.into_iter().map(Into::into).collect();
        transcripts_write.push(transcript.into());

        let file = TranscriptFileWrite {
            transcripts: transcripts_write,
        };

        let content = serde_json::to_string_pretty(&file)?;
        tokio::fs::write(&transcript_path, content).await?;

        Ok(())
    }

    pub async fn save_session_enhanced_note(
        &self,
        session_id: &str,
        note: EnhancedNoteData,
        filename: &str,
    ) -> crate::Result<()> {
        let session_dir = self.resolve_session_dir(session_id)?;
        self.ensure_session_dir(&session_dir).await?;

        let tiptap_value: serde_json::Value = serde_json::from_str(&note.content)?;
        let markdown = hypr_tiptap::tiptap_json_to_md(&tiptap_value).map_err(Error::Tiptap)?;

        let frontmatter = EnhancedNoteFrontmatterWrite {
            id: note.id,
            session_id: note.session_id,
            template_id: note.template_id,
            position: note.position,
            title: note.title,
        };

        let doc = Document::new(frontmatter, markdown);
        tokio::fs::write(session_dir.join(filename), doc.render()?).await?;

        Ok(())
    }
}

pub trait FsDbPluginExt<R: tauri::Runtime> {
    fn fs_db(&self) -> FsDb<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> FsDbPluginExt<R> for T {
    fn fs_db(&self) -> FsDb<'_, R, Self>
    where
        Self: Sized,
    {
        FsDb {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}

fn find_session_dir(sessions_dir: &std::path::Path, session_id: &str) -> PathBuf {
    let direct = sessions_dir.join(session_id);
    if direct.exists() {
        return direct;
    }

    if let Ok(entries) = std::fs::read_dir(sessions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let nested = path.join(session_id);
                if nested.exists() {
                    return nested;
                }
            }
        }
    }

    direct
}
