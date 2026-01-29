-- Migration: Create admin_actions table
-- Description: Creates the admin_actions table in the control_plane schema for tracking all break glass actions with full context and before/after states
-- Created: 2026-01-29
-- US-002: Create Admin Actions Table (Break Glass Mode)

-- Create admin_actions table
CREATE TABLE control_plane.admin_actions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to the admin session (foreign key to admin_sessions)
    session_id UUID NOT NULL REFERENCES control_plane.admin_sessions(id) ON DELETE CASCADE,

    -- Action performed (e.g., 'unlock_project', 'override_suspension', 'force_delete', 'regenerate_keys', 'access_project')
    action TEXT NOT NULL,

    -- Target type (what was acted upon: 'project', 'api_key', 'user', 'system', etc.)
    target_type TEXT NOT NULL,

    -- Target ID (UUID of the affected resource)
    target_id UUID,

    -- Before state (full system state before action, stored as JSONB)
    before_state JSONB,

    -- After state (full system state after action, stored as JSONB)
    after_state JSONB,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on session_id for querying by session
CREATE INDEX idx_admin_actions_session_id ON control_plane.admin_actions(session_id);

-- Create index on action for filtering by action type
CREATE INDEX idx_admin_actions_action ON control_plane.admin_actions(action);

-- Create index on target_type and target_id for querying by target
CREATE INDEX idx_admin_actions_target ON control_plane.admin_actions(target_type, target_id);

-- Create index on created_at for date range queries
CREATE INDEX idx_admin_actions_created_at ON control_plane.admin_actions(created_at DESC);

-- Create composite index on (session_id, created_at) for session action queries
CREATE INDEX idx_admin_actions_session_created ON control_plane.admin_actions(session_id, created_at DESC);

-- Create composite index on (target_type, target_id, created_at) for target history queries
CREATE INDEX idx_admin_actions_target_history ON control_plane.admin_actions(target_type, target_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE control_plane.admin_actions IS 'Break glass action tracking table for logging all emergency admin actions with full before/after state capture for aggressive audit logging';

-- Add comments to columns
COMMENT ON COLUMN control_plane.admin_actions.id IS 'Unique identifier for the admin action';
COMMENT ON COLUMN control_plane.admin_actions.session_id IS 'Reference to the admin session that performed this action (foreign key to admin_sessions)';
COMMENT ON COLUMN control_plane.admin_actions.action IS 'Action performed (e.g., unlock_project, override_suspension, force_delete, regenerate_keys, access_project)';
COMMENT ON COLUMN control_plane.admin_actions.target_type IS 'Type of target that was acted upon (e.g., project, api_key, user, system)';
COMMENT ON COLUMN control_plane.admin_actions.target_id IS 'UUID of the specific resource that was acted upon';
COMMENT ON COLUMN control_plane.admin_actions.before_state IS 'Full system state before the action was performed (JSONB)';
COMMENT ON COLUMN control_plane.admin_actions.after_state IS 'Full system state after the action was performed (JSONB)';
COMMENT ON COLUMN control_plane.admin_actions.created_at IS 'Timestamp of when the admin action was performed';
