-- Migration: Create api_keys table
-- Description: Creates the api_keys table for managing project API keys
-- Created: 2026-01-29
-- US-004: Implement Provision Project Job - Step 7: Data Layer

-- Create api_keys table
CREATE TABLE IF NOT EXISTS control_plane.api_keys (
    -- Primary key
    id TEXT PRIMARY KEY,

    -- Project reference
    project_id UUID NOT NULL REFERENCES control_plane.projects(id) ON DELETE CASCADE,

    -- Key details
    key_value TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,

    -- Scopes and permissions
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],

    -- Status tracking
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Usage tracking
    last_used TIMESTAMPTZ,

    -- Revocation tracking
    revoked_at TIMESTAMPTZ,

    -- Expiration
    expires_at TIMESTAMPTZ,

    -- Audit fields
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT api_keys_name_not_empty CHECK (LENGTH(name) > 0),
    CONSTRAINT api_keys_prefix_not_empty CHECK (LENGTH(key_prefix) > 0)
);

-- Create index on project_id for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON control_plane.api_keys(project_id);

-- Create index on key_prefix for filtering
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON control_plane.api_keys(key_prefix);

-- Create index on is_active for active key queries
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON control_plane.api_keys(is_active);

-- Create index on key_value for authentication lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON control_plane.api_keys(key_value);

-- Add comment to table
COMMENT ON TABLE control_plane.api_keys IS 'API keys for project authentication and authorization';

-- Add comments to columns
COMMENT ON COLUMN control_plane.api_keys.id IS 'Unique identifier for the API key';
COMMENT ON COLUMN control_plane.api_keys.project_id IS 'Reference to the project';
COMMENT ON COLUMN control_plane.api_keys.key_value IS 'Hashed API key value';
COMMENT ON COLUMN control_plane.api_keys.key_prefix IS 'Key prefix (e.g., "nm" for NextMavens)';
COMMENT ON COLUMN control_plane.api_keys.name IS 'Human-readable key name';
COMMENT ON COLUMN control_plane.api_keys.scopes IS 'Array of permission scopes';
COMMENT ON COLUMN control_plane.api_keys.is_active IS 'Whether the key is currently active';
COMMENT ON COLUMN control_plane.api_keys.last_used IS 'Timestamp of last key usage';
COMMENT ON COLUMN control_plane.api_keys.revoked_at IS 'Timestamp when key was revoked';
COMMENT ON COLUMN control_plane.api_keys.expires_at IS 'Optional expiration timestamp';
COMMENT ON COLUMN control_plane.api_keys.created_by IS 'User or system that created the key';
COMMENT ON COLUMN control_plane.api_keys.created_at IS 'Timestamp when key was created';

-- Create function to check if API key is valid
CREATE OR REPLACE FUNCTION control_plane.is_api_key_valid(key_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM control_plane.api_keys
        WHERE id = key_id
          AND is_active = true
          AND (revoked_at IS NULL OR revoked_at > NOW())
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to record API key usage
CREATE OR REPLACE FUNCTION control_plane.record_api_key_usage(key_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE control_plane.api_keys
    SET last_used = NOW()
    WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;
