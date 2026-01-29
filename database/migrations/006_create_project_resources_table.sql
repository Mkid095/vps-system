-- Migration: Create project_resources table
-- Description: Creates the project_resources table for tracking resource usage and quotas
-- Created: 2026-01-29
-- US-004: Implement Provision Project Job - Step 7: Data Layer

-- Create project_resources table
CREATE TABLE IF NOT EXISTS control_plane.project_resources (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project reference
    project_id UUID NOT NULL REFERENCES control_plane.projects(id) ON DELETE CASCADE,

    -- Resource details
    resource_type TEXT NOT NULL CHECK (resource_type IN ('databases', 'api_keys', 'services', 'storage')),
    resource_id TEXT NOT NULL,

    -- Resource metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT project_resources_unique UNIQUE (project_id, resource_type, resource_id)
);

-- Create index on project_id for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_resources_project_id ON control_plane.project_resources(project_id);

-- Create index on resource_type for filtering
CREATE INDEX IF NOT EXISTS idx_project_resources_resource_type ON control_plane.project_resources(resource_type);

-- Create composite index for quota checks
CREATE INDEX IF NOT EXISTS idx_project_resources_project_type ON control_plane.project_resources(project_id, resource_type);

-- Add comment to table
COMMENT ON TABLE control_plane.project_resources IS 'Resource tracking for quota management';

-- Add comments to columns
COMMENT ON COLUMN control_plane.project_resources.id IS 'Unique identifier for the resource record';
COMMENT ON COLUMN control_plane.project_resources.project_id IS 'Reference to the project';
COMMENT ON COLUMN control_plane.project_resources.resource_type IS 'Type of resource (databases, api_keys, services, storage)';
COMMENT ON COLUMN control_plane.project_resources.resource_id IS 'Identifier for the specific resource';
COMMENT ON COLUMN control_plane.project_resources.metadata IS 'Additional resource metadata';
COMMENT ON COLUMN control_plane.project_resources.created_at IS 'Timestamp when resource was created';
COMMENT ON COLUMN control_plane.project_resources.updated_at IS 'Timestamp when resource was last updated';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION control_plane.update_project_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_resources_updated_at
    BEFORE UPDATE ON control_plane.project_resources
    FOR EACH ROW
    EXECUTE FUNCTION control_plane.update_project_resources_updated_at();

-- Create function to check resource quota
CREATE OR REPLACE FUNCTION control_plane.check_resource_quota(
    p_project_id UUID,
    p_resource_type TEXT,
    p_quota_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM control_plane.project_resources
    WHERE project_id = p_project_id
      AND resource_type = p_resource_type;

    RETURN current_count < p_quota_limit;
END;
$$ LANGUAGE plpgsql;
