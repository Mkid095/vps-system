-- Migration: Add restore_count to backups table
-- Description: Adds restore_count column to track how many times a backup has been restored
-- Created: 2026-01-29
-- US-006: Implement Restore from Backup - Step 7: Data Layer

-- Add restore_count column to backups table
ALTER TABLE control_plane.backups
ADD COLUMN restore_count INTEGER DEFAULT 0 NOT NULL;

-- Add constraint to ensure restore_count is non-negative
ALTER TABLE control_plane.backups
ADD CONSTRAINT backups_restore_count_not_negative CHECK (restore_count >= 0);

-- Add comment to the new column
COMMENT ON COLUMN control_plane.backups.restore_count IS 'Number of times this backup has been restored';

-- Create index on restore_count for finding most/least restored backups
CREATE INDEX idx_backups_restore_count ON control_plane.backups(restore_count);
