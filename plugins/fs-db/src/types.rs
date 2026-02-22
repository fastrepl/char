use std::path::Path;
use std::str::FromStr;

use hypr_frontmatter::Document;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Word {
    pub id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SpeakerHint {
    pub id: String,
    pub word_id: String,
    #[serde(rename = "type")]
    pub hint_type: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptData {
    pub id: String,
    pub user_id: String,
    pub created_at: String,
    pub session_id: String,
    pub started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<i64>,
    pub words: Vec<Word>,
    pub speaker_hints: Vec<SpeakerHint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionContent {
    pub raw_md: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionTranscript {
    pub transcripts: Vec<TranscriptData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EnhancedNoteData {
    pub id: String,
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template_id: Option<String>,
    pub position: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionEnhancedNotes {
    pub notes: Vec<EnhancedNoteData>,
}

pub(crate) mod files {
    pub const MEMO: &str = "_memo.md";
    pub const TRANSCRIPT: &str = "transcript.json";
}

#[derive(Debug, Deserialize)]
pub(crate) struct MemoFrontmatter {
    #[allow(dead_code)]
    pub id: Option<String>,
    #[allow(dead_code)]
    pub session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct MemoFrontmatterWrite {
    pub id: String,
    pub session_id: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TranscriptFile {
    pub transcripts: Vec<TranscriptFileEntry>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct TranscriptFileEntry {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub created_at: String,
    pub session_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    #[serde(default)]
    pub words: Vec<WordEntry>,
    #[serde(default)]
    pub speaker_hints: Vec<SpeakerHintEntry>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct WordEntry {
    pub id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    pub speaker: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct SpeakerHintEntry {
    pub id: String,
    pub word_id: String,
    #[serde(rename = "type")]
    pub hint_type: String,
    #[serde(default)]
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub(crate) struct TranscriptFileWrite {
    pub transcripts: Vec<TranscriptEntryWrite>,
}

#[derive(Debug, Serialize)]
pub(crate) struct TranscriptEntryWrite {
    pub id: String,
    pub user_id: String,
    pub created_at: String,
    pub session_id: String,
    pub started_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<i64>,
    pub words: Vec<WordEntryWrite>,
    pub speaker_hints: Vec<SpeakerHintEntryWrite>,
}

#[derive(Debug, Serialize)]
pub(crate) struct WordEntryWrite {
    pub id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speaker: Option<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct SpeakerHintEntryWrite {
    pub id: String,
    pub word_id: String,
    #[serde(rename = "type")]
    pub hint_type: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub(crate) struct EnhancedNoteFrontmatter {
    pub id: String,
    pub session_id: String,
    #[serde(default)]
    pub template_id: Option<String>,
    #[serde(default)]
    pub position: i32,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Serialize)]
pub(crate) struct EnhancedNoteFrontmatterWrite {
    pub id: String,
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template_id: Option<String>,
    #[serde(skip_serializing_if = "is_zero")]
    pub position: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

fn is_zero(n: &i32) -> bool {
    *n == 0
}

impl From<WordEntry> for Word {
    fn from(w: WordEntry) -> Self {
        Self {
            id: w.id,
            text: w.text,
            start_ms: w.start_ms,
            end_ms: w.end_ms,
            channel: w.channel,
            speaker: w.speaker,
        }
    }
}

impl From<Word> for WordEntryWrite {
    fn from(w: Word) -> Self {
        Self {
            id: w.id,
            text: w.text,
            start_ms: w.start_ms,
            end_ms: w.end_ms,
            channel: w.channel,
            speaker: w.speaker,
        }
    }
}

impl From<SpeakerHintEntry> for SpeakerHint {
    fn from(h: SpeakerHintEntry) -> Self {
        Self {
            id: h.id,
            word_id: h.word_id,
            hint_type: h.hint_type,
            value: h.value,
        }
    }
}

impl From<SpeakerHint> for SpeakerHintEntryWrite {
    fn from(h: SpeakerHint) -> Self {
        Self {
            id: h.id,
            word_id: h.word_id,
            hint_type: h.hint_type,
            value: h.value,
        }
    }
}

impl From<TranscriptFileEntry> for TranscriptData {
    fn from(t: TranscriptFileEntry) -> Self {
        Self {
            id: t.id,
            user_id: t.user_id,
            created_at: t.created_at,
            session_id: t.session_id,
            started_at: t.started_at,
            ended_at: t.ended_at,
            words: t.words.into_iter().map(Into::into).collect(),
            speaker_hints: t.speaker_hints.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<TranscriptData> for TranscriptEntryWrite {
    fn from(t: TranscriptData) -> Self {
        Self {
            id: t.id,
            user_id: t.user_id,
            created_at: t.created_at,
            session_id: t.session_id,
            started_at: t.started_at,
            ended_at: t.ended_at,
            words: t.words.into_iter().map(Into::into).collect(),
            speaker_hints: t.speaker_hints.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<TranscriptFileEntry> for TranscriptEntryWrite {
    fn from(t: TranscriptFileEntry) -> Self {
        Self {
            id: t.id,
            user_id: t.user_id,
            created_at: t.created_at,
            session_id: t.session_id,
            started_at: t.started_at,
            ended_at: t.ended_at,
            words: t.words.into_iter().map(|w| Word::from(w).into()).collect(),
            speaker_hints: t
                .speaker_hints
                .into_iter()
                .map(|h| SpeakerHint::from(h).into())
                .collect(),
        }
    }
}

pub(crate) async fn load_transcript_file(path: &Path) -> TranscriptFile {
    if !path.exists() {
        return TranscriptFile {
            transcripts: vec![],
        };
    }

    match tokio::fs::read_to_string(path).await {
        Ok(content) => serde_json::from_str(&content).unwrap_or(TranscriptFile {
            transcripts: vec![],
        }),
        Err(_) => TranscriptFile {
            transcripts: vec![],
        },
    }
}

pub(crate) async fn load_enhanced_note(path: &Path, session_id: &str) -> Option<EnhancedNoteData> {
    let content = tokio::fs::read_to_string(path).await.ok()?;
    let doc: Document<EnhancedNoteFrontmatter> = Document::from_str(&content).ok()?;

    if doc.frontmatter.session_id != session_id {
        return None;
    }

    let tiptap_json = hypr_tiptap::md_to_tiptap_json(&doc.content).ok()?;

    Some(EnhancedNoteData {
        id: doc.frontmatter.id,
        session_id: doc.frontmatter.session_id,
        template_id: doc.frontmatter.template_id,
        position: doc.frontmatter.position,
        title: doc.frontmatter.title,
        content: tiptap_json.to_string(),
    })
}
