-- Migration: Add project_id to jobs table
-- Description: Adds project_id column to jobs table for authorization and data isolation
-- Created: 2026-01-29
-- Security Fix: US-011 Job Retry API Authorization Bypass

-- Add project_id column to jobs table
ALTER TABLE control_plane.jobs
  ADD COLUMN project_id TEXT NOT NULL DEFAULT '';

-- Create index on project_id for efficient authorization queries
CREATE INDEX idx_jobs_project_id ON control_plane.jobs(project_id);

-- Add comment to column
COMMENT ON COLUMN control_plane.jobs.project_id IS 'Project ID for authorization and data isolation. Jobs can only be accessed/retried by their owning project.';

-- Add foreign key constraint to ensure referential integrity
-- Note: This assumes projects table exists in control_plane schema
-- If projects table is in a different location, adjust accordingly
ALTER TABLE control_plane.jobs
  ADD CONSTRAINT jobs_project_id_foreign
  FOREIGN KEY (project_id)
  REFERENCES control_plane.projects(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Add comment for the constraint
COMMENT ON CONSTRAINT jobs_project_id_foreign ON control_plane.jobs IS 'Ensures jobs belong to valid projects. Cascade delete if project is deleted.';
