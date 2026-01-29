-- Migration: Add Retention Columns to Backups Table
-- Description: Adds columns needed for backup retention policy tracking
-- Created: 2026-01-29
-- US-010: Backup Retention Policy - Step 7: Integration

-- Add message_id column for Telegram message deletion
-- This stores the Telegram message_id (different from file_id)
-- Required for proper cleanup from Telegram
ALTER TABLE control_plane.backups
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Add notified_at column to track when expiration notification was sent
-- Used to prevent duplicate notifications and track notification status
ALTER TABLE control_plane.backups
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Add cleanup_status column to track cleanup lifecycle
-- Values: 'pending', 'notified', 'deleted', 'failed'
ALTER TABLE control_plane.backups
ADD COLUMN IF NOT EXISTS cleanup_status TEXT
CHECK (cleanup_status IN ('pending', 'notified', 'deleted', 'failed'));

-- Add cleanup_attempts column to track number of cleanup retries
-- Used for retry logic in cleanup jobs
ALTER TABLE control_plane.backups
ADD COLUMN IF NOT EXISTS cleanup_attempts INTEGER
DEFAULT 0
CHECK (cleanup_attempts >= 0);

-- Add cleanup_error column to store error messages if cleanup fails
-- Helps with debugging failed cleanups
ALTER TABLE control_plane.backups
ADD COLUMN IF NOT EXISTS cleanup_error TEXT;

-- Add index on cleanup_status for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_backups_cleanup_status
ON control_plane.backups(cleanup_status)
WHERE cleanup_status = 'failed';

-- Add index on notified_at for notification queries
CREATE INDEX IF NOT EXISTS idx_backups_notified_at
ON control_plane.backups(notified_at)
WHERE notified_at IS NOT NULL;

-- Set default cleanup_status to 'pending' for existing records
UPDATE control_plane.backups
SET cleanup_status = 'pending'
WHERE cleanup_status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN control_plane.backups.message_id IS 'Telegram message ID for deletion (different from file_id)';
COMMENT ON COLUMN control_plane.backups.notified_at IS 'Timestamp when user was notified about impending deletion';
COMMENT ON COLUMN control_plane.backups.cleanup_status IS 'Cleanup status: pending (default), notified (user warned), deleted (removed), failed (cleanup error)';
COMMENT ON COLUMN control_plane.backups.cleanup_attempts IS 'Number of cleanup attempts for retry logic';
COMMENT ON COLUMN control_plane.backups.cleanup_error IS 'Error message if cleanup failed, for debugging';

-- Add constraint to ensure message_id is provided if cleanup_status is not pending
ALTER TABLE control_plane.backups
ADD CONSTRAINT backups_message_id_when_notified
CHECK (
  (cleanup_status = 'pending' AND message_id IS NULL) OR
  (cleanup_status IN ('notified', 'deleted', 'failed') AND message_id IS NOT NULL) OR
  (cleanup_status IS NULL)
) DEFERRABLE INITIALLY DEFERRED;
