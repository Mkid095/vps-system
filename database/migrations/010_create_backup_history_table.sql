-- Migration: Create backup_history table
-- Description: Creates the backup_history table in the control_plane schema for recording backup exports with status tracking
-- Created: 2026-01-29
-- US-004: Record Backup in History

-- Create backup_history table
CREATE TABLE control_plane.backup_history (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project association
    project_id UUID NOT NULL REFERENCES control_plane.projects(id) ON DELETE CASCADE,

    -- Backup type (enum: export, manual)
    type VARCHAR(50) NOT NULL CHECK (type IN ('export', 'manual')),

    -- File reference (Telegram file ID or storage path)
    file_id VARCHAR(500) NOT NULL,

    -- Backup size in bytes
    size BIGINT NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

    -- Constraints
    CONSTRAINT backup_history_size_not_negative CHECK (size >= 0),
    CONSTRAINT backup_history_expires_after_created CHECK (expires_at > created_at)
);

-- Create index on project_id for efficient querying by project
CREATE INDEX idx_backup_history_project_id ON control_plane.backup_history(project_id);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_backup_history_expires_at ON control_plane.backup_history(expires_at);

-- Create composite index on (project_id, created_at) for project backup history queries
CREATE INDEX idx_backup_history_project_created ON control_plane.backup_history(project_id, created_at DESC);

-- Create index on status for filtering active backups
CREATE INDEX idx_backup_history_status ON control_plane.backup_history(status);

-- Add comment to table
COMMENT ON TABLE control_plane.backup_history IS 'Backup history table tracking all backup exports with status tracking and 30-day retention';

-- Add comments to columns
COMMENT ON COLUMN control_plane.backup_history.id IS 'Unique identifier for the backup history record';
COMMENT ON COLUMN control_plane.backup_history.project_id IS 'Reference to the project that owns this backup';
COMMENT ON COLUMN control_plane.backup_history.type IS 'Backup type: export (automated export) or manual (user-initiated)';
COMMENT ON COLUMN control_plane.backup_history.file_id IS 'File reference identifier (Telegram file ID or storage path)';
COMMENT ON COLUMN control_plane.backup_history.size IS 'Backup size in bytes';
COMMENT ON COLUMN control_plane.backup_history.status IS 'Current status: active, expired, or deleted';
COMMENT ON COLUMN control_plane.backup_history.created_at IS 'Timestamp when the backup was created';
COMMENT ON COLUMN control_plane.backup_history.expires_at IS 'Timestamp when the backup expires (default: 30 days from creation)';
