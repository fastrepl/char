-- sync_vaults: one per user (or team, later)
CREATE TABLE sync_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sync_devices: registered devices per vault
CREATE TABLE sync_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES sync_vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sync_files: file registry (server-side state)
CREATE TABLE sync_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES sync_vaults(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    content_hash TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vault_id, path)
);

-- sync_operations: append-only operation log
CREATE TABLE sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES sync_vaults(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES sync_files(id),
    author_user_id UUID NOT NULL REFERENCES auth.users(id),
    author_device_id UUID NOT NULL REFERENCES sync_devices(id),
    base_version BIGINT NOT NULL,
    op_type TEXT NOT NULL CHECK (op_type IN ('create', 'modify', 'move', 'delete')),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    seq BIGSERIAL NOT NULL
);
CREATE INDEX idx_sync_operations_vault_seq ON sync_operations (vault_id, seq);

-- sync_blobs: metadata for S3-stored blobs
CREATE TABLE sync_blobs (
    hash TEXT NOT NULL,
    vault_id UUID NOT NULL REFERENCES sync_vaults(id) ON DELETE CASCADE,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vault_id, hash)
);
