-- Migration: Create project_services table
-- Description: Creates the project_services table for tracking service registrations (auth, realtime, storage)
-- Created: 2026-01-29
-- US-004: Implement Provision Project Job - Step 7: Data Layer

-- Create project_services table
CREATE TABLE IF NOT EXISTS control_plane.project_services (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project reference
    project_id UUID NOT NULL REFERENCES control_plane.projects(id) ON DELETE CASCADE,

    -- Service details
    service_type TEXT NOT NULL CHECK (service_type IN ('auth', 'realtime', 'storage')),
    service_id TEXT NOT NULL,

    -- Service configuration
    config JSONB DEFAULT '{}'::jsonb,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT project_services_unique UNIQUE (project_id, service_type)
);

-- Create index on project_id for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_services_project_id ON control_plane.project_services(project_id);

-- Create index on service_type for filtering
CREATE INDEX IF NOT EXISTS idx_project_services_service_type ON control_plane.project_services(service_type);

-- Create index on status for active service queries
CREATE INDEX IF NOT EXISTS idx_project_services_status ON control_plane.project_services(status);

-- Add comment to table
COMMENT ON TABLE control_plane.project_services IS 'Service registrations for projects (auth, realtime, storage)';

-- Add comments to columns
COMMENT ON COLUMN control_plane.project_services.id IS 'Unique identifier for the service registration';
COMMENT ON COLUMN control_plane.project_services.project_id IS 'Reference to the project';
COMMENT ON COLUMN control_plane.project_services.service_type IS 'Type of service (auth, realtime, storage)';
COMMENT ON COLUMN control_plane.project_services.service_id IS 'Service-specific tenant identifier';
COMMENT ON COLUMN control_plane.project_services.config IS 'Service configuration and connection details';
COMMENT ON COLUMN control_plane.project_services.status IS 'Service status: active, disabled, or error';
COMMENT ON COLUMN control_plane.project_services.created_at IS 'Timestamp when service was registered';
COMMENT ON COLUMN control_plane.project_services.updated_at IS 'Timestamp when service was last updated';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION control_plane.update_project_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_services_updated_at
    BEFORE UPDATE ON control_plane.project_services
    FOR EACH ROW
    EXECUTE FUNCTION control_plane.update_project_services_updated_at();
