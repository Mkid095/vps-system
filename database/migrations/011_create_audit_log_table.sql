-- Migration: Create audit_log table
-- Description: Creates audit_log table for security compliance and incident response
-- Created: 2026-01-29
-- Security Audit: US-004 Step 10
-- Related: STEP-10-US-004-SECURITY-AUDIT.md

-- This table is required for the security fixes implemented in
-- database/src/jobs/backup-history.security-fixes.ts

-- Create audit_log table
CREATE TABLE IF NOT EXISTS control_plane.audit_log (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation details
  operation VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  backup_id UUID,

  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  success BOOLEAN NOT NULL,

  -- Additional details (JSON)
  details JSONB NOT NULL DEFAULT '{}',

  -- Constraints
  CONSTRAINT audit_log_operation_check CHECK (operation IN (
    'record_backup',
    'query_history',
    'mark_expired',
    'mark_deleted',
    'cleanup_expired'
  ))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON control_plane.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON control_plane.audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON control_plane.audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON control_plane.audit_log(operation);

-- Create composite index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp
  ON control_plane.audit_log(user_id, timestamp DESC);

-- Create composite index for project activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_project_timestamp
  ON control_plane.audit_log(project_id, timestamp DESC);

-- Create composite index for security investigations
CREATE INDEX IF NOT EXISTS idx_audit_log_operation_timestamp
  ON control_plane.audit_log(operation, timestamp DESC);

-- Add comment to table
COMMENT ON TABLE control_plane.audit_log IS 'Audit log for backup operations - security compliance and incident response. Tracks all backup-related operations with user context for security monitoring.';

-- Add comments to columns
COMMENT ON COLUMN control_plane.audit_log.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN control_plane.audit_log.operation IS 'Type of operation performed: record_backup, query_history, mark_expired, mark_deleted, cleanup_expired';
COMMENT ON COLUMN control_plane.audit_log.user_id IS 'ID of the user who performed the operation';
COMMENT ON COLUMN control_plane.audit_log.project_id IS 'ID of the project the operation was performed on';
COMMENT ON COLUMN control_plane.audit_log.backup_id IS 'ID of the backup record (if applicable)';
COMMENT ON COLUMN control_plane.audit_log.timestamp IS 'Timestamp when the operation occurred';
COMMENT ON COLUMN control_plane.audit_log.success IS 'Whether the operation succeeded (true) or failed (false)';
COMMENT ON COLUMN control_plane.audit_log.details IS 'Additional details about the operation (JSONB) - sanitized, no sensitive data';

-- Enable Row Level Security for additional security layer
ALTER TABLE control_plane.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy: Admins can view all audit logs
CREATE POLICY audit_log_admin_view_all ON control_plane.audit_log
  FOR SELECT
  TO authenticated_role  -- Replace with actual admin role
  USING (
    EXISTS (
      SELECT 1 FROM control_plane.users
      WHERE users.id = current_user_id()
      AND users.role = 'admin'
    )
  );

-- Create policy: Users can view their own audit logs
CREATE POLICY audit_log_user_view_own ON control_plane.audit_log
  FOR SELECT
  TO authenticated_role  -- Replace with actual authenticated role
  USING (user_id = current_user_id());

-- Create policy: Application can insert audit logs
CREATE POLICY audit_log_app_insert ON control_plane.audit_log
  FOR INSERT
  TO application_role  -- Replace with actual application role
  WITH CHECK (true);

-- Prevent any deletions from audit log (immutable history)
CREATE POLICY audit_log_no_delete ON control_plane.audit_log
  FOR DELETE
  TO ALL
  USING (false);

-- Note: The roles above (authenticated_role, application_role) should be replaced
-- with your actual database roles. This is a template that demonstrates the
-- Row Level Security structure.

-- Retention policy: Create a function to clean up old audit logs
-- This function should be called periodically (e.g., via cron job)
CREATE OR REPLACE FUNCTION control_plane.cleanup_old_audit_logs()
RETURNS TABLE(deleted_count BIGINT) AS $$
BEGIN
  DELETE FROM control_plane.audit_log
  WHERE timestamp < NOW() - INTERVAL '1 year';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for the cleanup function
COMMENT ON FUNCTION control_plane.cleanup_old_audit_logs() IS 'Cleans up audit log entries older than 1 year. Returns the count of deleted entries. Should be called periodically via cron job or scheduled task.';
