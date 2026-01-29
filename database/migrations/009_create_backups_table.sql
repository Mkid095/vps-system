-- Migration: Create backups table
-- Description: Creates the backups table in the control_plane schema for tracking backup history (database, storage, logs)
-- Created: 2026-01-29
-- US-003: Create Backup History Table

-- Create backups table
CREATE TABLE control_plane.backups (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project association
    project_id TEXT NOT NULL,

    -- Backup type (enum: database, storage, logs)
    type TEXT NOT NULL CHECK (type IN ('database', 'storage', 'logs')),

    -- File reference (e.g., Telegram file ID, storage path)
    file_id TEXT NOT NULL,

    -- Backup size in bytes
    size BIGINT NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

    -- Constraints
    CONSTRAINT backups_size_not_negative CHECK (size >= 0),
    CONSTRAINT backups_expires_after_created CHECK (expires_at > created_at)
);

-- Create index on project_id for efficient querying by project
CREATE INDEX idx_backups_project_id ON control_plane.backups(project_id);

-- Create index on created_at for date range queries
CREATE INDEX idx_backups_created_at ON control_plane.backups(created_at DESC);

-- Create composite index on (project_id, created_at) for common queries
CREATE INDEX idx_backups_project_created ON control_plane.backups(project_id, created_at DESC);

-- Create index on type for filtering by backup type
CREATE INDEX idx_backups_type ON control_plane.backups(type);

-- Create index on expires_at for cleanup queries
CREATE INDEX idx_backups_expires_at ON control_plane.backups(expires_at);

-- Add comment to table
COMMENT ON TABLE control_plane.backups IS 'Backup history table tracking all backups (database, storage, logs) with retention policy';

-- Add comments to columns
COMMENT ON COLUMN control_plane.backups.id IS 'Unique identifier for the backup record';
COMMENT ON COLUMN control_plane.backups.project_id IS 'Project ID that owns this backup';
COMMENT ON COLUMN control_plane.backups.type IS 'Backup type: database (SQL dumps), storage (large files), or logs (archived logs)';
COMMENT ON COLUMN control_plane.backups.file_id IS 'File reference identifier (e.g., Telegram file ID, storage path)';
COMMENT ON COLUMN control_plane.backups.size IS 'Backup size in bytes';
COMMENT ON COLUMN control_plane.backups.created_at IS 'Timestamp when the backup was created';
COMMENT ON COLUMN control_plane.backups.expires_at IS 'Timestamp when the backup should be deleted (default: 30 days)';
