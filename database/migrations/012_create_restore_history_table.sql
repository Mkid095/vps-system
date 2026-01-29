-- Migration: Create restore_history table
-- Description: Creates the restore_history table in the control_plane schema for tracking restore operations
-- Created: 2026-01-29
-- US-006: Implement Restore from Backup - Step 7: Data Layer

-- Create restore_history table
CREATE TABLE control_plane.restore_history (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project association
    project_id TEXT NOT NULL,

    -- Backup reference (optional - restore can be done with just file_id)
    backup_id UUID REFERENCES control_plane.backups(id) ON DELETE SET NULL,

    -- File reference (Telegram file ID)
    file_id TEXT NOT NULL,

    -- Restore status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

    -- Error message if restore failed
    error_message TEXT,

    -- Restore metrics
    tables_restored INTEGER DEFAULT 0,
    duration_ms BIGINT,
    backup_size BIGINT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT restore_history_tables_not_negative CHECK (tables_restored >= 0),
    CONSTRAINT restore_history_duration_not_negative CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT restore_history_size_not_negative CHECK (backup_size IS NULL OR backup_size >= 0),
    CONSTRAINT restore_history_completed_after_started CHECK (
        completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
    ),
    CONSTRAINT restore_history_started_after_created CHECK (
        started_at IS NULL OR started_at >= created_at
    )
);

-- Create index on project_id for efficient querying by project
CREATE INDEX idx_restore_history_project_id ON control_plane.restore_history(project_id);

-- Create index on backup_id for finding restore history for a specific backup
CREATE INDEX idx_restore_history_backup_id ON control_plane.restore_history(backup_id);

-- Create index on status for filtering by restore status
CREATE INDEX idx_restore_history_status ON control_plane.restore_history(status);

-- Create index on created_at for date range queries
CREATE INDEX idx_restore_history_created_at ON control_plane.restore_history(created_at DESC);

-- Create composite index on (project_id, created_at) for project restore history queries
CREATE INDEX idx_restore_history_project_created ON control_plane.restore_history(project_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE control_plane.restore_history IS 'Restore history table tracking all database restore operations with status tracking';

-- Add comments to columns
COMMENT ON COLUMN control_plane.restore_history.id IS 'Unique identifier for the restore history record';
COMMENT ON COLUMN control_plane.restore_history.project_id IS 'Project ID that owns this restore';
COMMENT ON COLUMN control_plane.restore_history.backup_id IS 'Reference to the backup record (if restored from tracked backup)';
COMMENT ON COLUMN control_plane.restore_history.file_id IS 'Telegram file ID that was restored';
COMMENT ON COLUMN control_plane.restore_history.status IS 'Restore status: pending, in_progress, completed, or failed';
COMMENT ON COLUMN control_plane.restore_history.error_message IS 'Error message if restore failed';
COMMENT ON COLUMN control_plane.restore_history.tables_restored IS 'Number of tables restored';
COMMENT ON COLUMN control_plane.restore_history.duration_ms IS 'Restore duration in milliseconds';
COMMENT ON COLUMN control_plane.restore_history.backup_size IS 'Size of the backup in bytes';
COMMENT ON COLUMN control_plane.restore_history.created_at IS 'Timestamp when the restore was requested';
COMMENT ON COLUMN control_plane.restore_history.started_at IS 'Timestamp when the restore operation started';
COMMENT ON COLUMN control_plane.restore_history.completed_at IS 'Timestamp when the restore operation completed (success or failure)';
