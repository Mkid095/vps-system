-- Migration: Create audit_logs table
-- Description: Creates the audit_logs table in the control_plane schema for tracking all governance operations
-- Created: 2026-01-28
-- US-001: Create Audit Logs Table

-- Create control_plane schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS control_plane;

-- Create audit_logs table
CREATE TABLE control_plane.audit_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor information (who performed the action)
    actor_id TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key')),

    -- Action information (what was done)
    action TEXT NOT NULL,

    -- Target information (what was affected)
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,

    -- Additional context (JSONB for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Request context (for forensics)
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT audit_logs_actor_required CHECK (
        (actor_type = 'system' AND actor_id = 'system') OR
        (actor_type IN ('user', 'api_key') AND actor_id IS NOT NULL AND actor_id != 'system')
    )
);

-- Create index on actor_id for querying by user
CREATE INDEX idx_audit_logs_actor_id ON control_plane.audit_logs(actor_id);

-- Create index on target_id for querying by resource
CREATE INDEX idx_audit_logs_target_id ON control_plane.audit_logs(target_id);

-- Create index on created_at for date range queries
CREATE INDEX idx_audit_logs_created_at ON control_plane.audit_logs(created_at DESC);

-- Create composite index for common queries (actor + date range)
CREATE INDEX idx_audit_logs_actor_created ON control_plane.audit_logs(actor_id, created_at DESC);

-- Create composite index for target queries (target + date range)
CREATE INDEX idx_audit_logs_target_created ON control_plane.audit_logs(target_id, created_at DESC);

-- Create index on action type for filtering by action
CREATE INDEX idx_audit_logs_action ON control_plane.audit_logs(action);

-- Add comment to table
COMMENT ON TABLE control_plane.audit_logs IS 'Audit log table tracking all governance operations for compliance and forensics';

-- Add comments to columns
COMMENT ON COLUMN control_plane.audit_logs.id IS 'Unique identifier for the audit log entry';
COMMENT ON COLUMN control_plane.audit_logs.actor_id IS 'ID of the entity that performed the action (user ID, system, or API key ID)';
COMMENT ON COLUMN control_plane.audit_logs.actor_type IS 'Type of actor: user, system, or api_key';
COMMENT ON COLUMN control_plane.audit_logs.action IS 'Action performed (e.g., project.created, user.invited, key.rotated)';
COMMENT ON COLUMN control_plane.audit_logs.target_type IS 'Type of resource affected (e.g., project, user, api_key, secret)';
COMMENT ON COLUMN control_plane.audit_logs.target_id IS 'ID of the affected resource';
COMMENT ON COLUMN control_plane.audit_logs.metadata IS 'Additional contextual information in JSONB format';
COMMENT ON COLUMN control_plane.audit_logs.ip_address IS 'IP address of the request source';
COMMENT ON COLUMN control_plane.audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN control_plane.audit_logs.created_at IS 'Timestamp of when the action occurred';
