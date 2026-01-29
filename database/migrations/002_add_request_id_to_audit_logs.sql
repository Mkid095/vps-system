-- Migration: Add request_id to audit_logs table
-- Description: Adds correlation ID support to trace requests across services
-- Created: 2026-01-29
-- US-010: Add Correlation ID to Audit Logs

-- Add request_id column for correlation/tracking
ALTER TABLE control_plane.audit_logs
ADD COLUMN request_id VARCHAR(255);

-- Create index on request_id for efficient correlation queries
CREATE INDEX idx_audit_logs_request_id ON control_plane.audit_logs(request_id);

-- Add comment to the new column
COMMENT ON COLUMN control_plane.audit_logs.request_id IS 'Correlation ID from x-request-id header for tracing requests across services';

-- Create composite index for common queries (request_id + created_at)
CREATE INDEX idx_audit_logs_request_created ON control_plane.audit_logs(request_id, created_at DESC);
