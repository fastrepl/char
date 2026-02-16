use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FolderInfo {
    pub name: String,
    pub parent_folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ListFoldersResult {
    pub folders: HashMap<String, FolderInfo>,
    pub session_folder_map: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ScanResult {
    pub files: HashMap<String, String>,
    pub dirs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CleanupTarget {
    Files {
        subdir: String,
        extension: String,
    },
    Dirs {
        subdir: String,
        marker_file: String,
    },
    FilesRecursive {
        subdir: String,
        marker_file: String,
        extension: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentSaveResult {
    pub path: String,
    pub attachment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    pub attachment_id: String,
    pub path: String,
    pub extension: String,
    pub modified_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionMetaParticipant {
    pub id: String,
    pub user_id: String,
    pub session_id: String,
    pub human_id: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionMetaData {
    pub id: String,
    pub user_id: String,
    pub created_at: Option<String>,
    pub title: Option<String>,
    pub event: Option<serde_json::Value>,
    pub event_id: Option<String>,
    #[serde(default)]
    pub participants: Vec<SessionMetaParticipant>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptWord {
    pub id: Option<String>,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSpeakerHint {
    pub id: Option<String>,
    pub speaker_id: Option<String>,
    pub start_word_id: String,
    pub end_word_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptEntry {
    pub id: String,
    pub user_id: Option<String>,
    pub created_at: Option<String>,
    pub session_id: String,
    pub started_at: Option<i64>,
    pub ended_at: Option<i64>,
    pub words: Vec<TranscriptWord>,
    pub speaker_hints: Vec<TranscriptSpeakerHint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptData {
    pub transcripts: Vec<TranscriptEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionNoteData {
    pub id: String,
    pub session_id: String,
    pub template_id: Option<String>,
    pub position: Option<i64>,
    pub title: Option<String>,
    pub tiptap_json: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SessionContentData {
    pub session_id: String,
    pub meta: Option<SessionMetaData>,
    pub raw_memo_tiptap_json: Option<serde_json::Value>,
    pub transcript: Option<TranscriptData>,
    pub notes: Vec<SessionNoteData>,
}
