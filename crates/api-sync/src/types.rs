use std::fmt;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// --- Newtypes ---

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct VaultId(pub Uuid);

impl fmt::Display for VaultId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FileId(pub Uuid);

impl fmt::Display for FileId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DeviceId(pub Uuid);

impl fmt::Display for DeviceId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BlobHash(pub String);

impl fmt::Display for BlobHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// --- OpType ---

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OpType {
    Create,
    Modify,
    Move,
    Delete,
}

// --- OperationPayload ---

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OperationPayload {
    /// Small content (< 256KB) -- stored inline in Postgres
    Inline { content: Vec<u8> },
    /// Large content -- stored in S3, referenced by hash
    BlobRef { hash: BlobHash, size_bytes: u64 },
    /// Move operation -- new path
    MoveTo { new_path: String },
    /// Delete -- tombstone, no content
    Tombstone,
}

// --- Operation ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub id: Uuid,
    pub vault_id: VaultId,
    pub file_id: FileId,
    pub author_user_id: Uuid,
    pub author_device_id: DeviceId,
    pub base_version: i64,
    pub op_type: OpType,
    pub payload: OperationPayload,
    pub created_at: DateTime<Utc>,
    /// Monotonic ordering for cursor-based pull
    pub seq: i64,
}

// --- FileEntry ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: FileId,
    pub vault_id: VaultId,
    pub path: String,
    pub version: i64,
    pub content_hash: Option<BlobHash>,
    pub is_deleted: bool,
}

// --- Request/Response types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushOperation {
    pub file_id: FileId,
    pub base_version: i64,
    pub op_type: OpType,
    pub payload: OperationPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushOpsRequest {
    pub ops: Vec<PushOperation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushOpsResponse {
    pub accepted: Vec<Uuid>,
    pub rejected: Vec<RejectedOp>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectedOp {
    pub file_id: FileId,
    pub reason: String,
    pub current_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullOpsResponse {
    pub ops: Vec<Operation>,
    pub next_cursor: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVaultRequest {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVaultResponse {
    pub vault_id: VaultId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub id: VaultId,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListVaultsResponse {
    pub vaults: Vec<VaultInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDeviceRequest {
    pub device_id: DeviceId,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterDeviceResponse {
    pub device_id: DeviceId,
}
