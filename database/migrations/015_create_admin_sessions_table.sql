-- Migration: Create admin_sessions table
-- Description: Creates the admin_sessions table in the control_plane schema for tracking break glass emergency access sessions
-- Created: 2026-01-29
-- US-001: Create Admin Sessions Table (Break Glass Mode)

-- Create admin_sessions table
CREATE TABLE control_plane.admin_sessions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Admin information (who initiated the break glass session)
    admin_id UUID NOT NULL,

    -- Reason for break glass access
    reason TEXT NOT NULL,

    -- Access method used
    access_method TEXT NOT NULL CHECK (access_method IN ('hardware_key', 'otp', 'emergency_code')),

    -- Who granted/approved the access (for multi-admin approval scenarios)
    granted_by UUID,

    -- Session expiration (default 1 hour from creation)
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on admin_id for querying by admin
CREATE INDEX idx_admin_sessions_admin_id ON control_plane.admin_sessions(admin_id);

-- Create index on expires_at for finding expired sessions
CREATE INDEX idx_admin_sessions_expires_at ON control_plane.admin_sessions(expires_at);

-- Create index on created_at for date range queries
CREATE INDEX idx_admin_sessions_created_at ON control_plane.admin_sessions(created_at DESC);

-- Create composite index on (admin_id, expires_at) for active session queries
CREATE INDEX idx_admin_sessions_admin_expires ON control_plane.admin_sessions(admin_id, expires_at DESC);

-- Create composite index on (expires_at, created_at) for cleanup queries
CREATE INDEX idx_admin_sessions_expires_created ON control_plane.admin_sessions(expires_at, created_at);

-- Add comment to table
COMMENT ON TABLE control_plane.admin_sessions IS 'Break glass session tracking table for emergency admin access with time-limited sessions and aggressive audit logging';

-- Add comments to columns
COMMENT ON COLUMN control_plane.admin_sessions.id IS 'Unique identifier for the admin session';
COMMENT ON COLUMN control_plane.admin_sessions.admin_id IS 'UUID of the admin who initiated the break glass session';
COMMENT ON COLUMN control_plane.admin_sessions.reason IS 'Reason for requiring break glass access (e.g., production incident, key compromise)';
COMMENT ON COLUMN control_plane.admin_sessions.access_method IS 'Method used to authenticate: hardware_key, otp (TOTP), or emergency_code';
COMMENT ON COLUMN control_plane.admin_sessions.granted_by IS 'UUID of the admin who approved this break glass session (for multi-admin approval scenarios)';
COMMENT ON COLUMN control_plane.admin_sessions.expires_at IS 'Session expiration timestamp (default 1 hour from creation)';
COMMENT ON COLUMN control_plane.admin_sessions.created_at IS 'Timestamp of when the break glass session was created';
