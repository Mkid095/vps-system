-- Migration: Create jobs table
-- Description: Creates the jobs table in the control_plane schema for tracking async operations and background tasks
-- Created: 2026-01-29
-- US-001: Create Jobs Database Table

-- Create jobs table
CREATE TABLE control_plane.jobs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job type and data
    type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,

    -- Job status and retry tracking
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'failed', 'completed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,

    -- Timestamps
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT jobs_attempts_not_negative CHECK (attempts >= 0),
    CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts > 0),
    CONSTRAINT jobs_attempts_not_exceed_max CHECK (attempts <= max_attempts)
);

-- Create index on status for efficient querying
CREATE INDEX idx_jobs_status ON control_plane.jobs(status);

-- Create index on scheduled_at for job scheduling
CREATE INDEX idx_jobs_scheduled_at ON control_plane.jobs(scheduled_at);

-- Create composite index on (status, scheduled_at) for worker polling
CREATE INDEX idx_jobs_status_scheduled_at ON control_plane.jobs(status, scheduled_at);

-- Add comment to table
COMMENT ON TABLE control_plane.jobs IS 'Background job tracking table for async operations with retry logic and state management';

-- Add comments to columns
COMMENT ON COLUMN control_plane.jobs.id IS 'Unique identifier for the job';
COMMENT ON COLUMN control_plane.jobs.type IS 'Job type identifier (e.g., provision_project, rotate_key, deliver_webhook)';
COMMENT ON COLUMN control_plane.jobs.payload IS 'Job data in JSONB format for flexible job parameters';
COMMENT ON COLUMN control_plane.jobs.status IS 'Current job status: pending, running, failed, or completed';
COMMENT ON COLUMN control_plane.jobs.attempts IS 'Number of execution attempts made';
COMMENT ON COLUMN control_plane.jobs.max_attempts IS 'Maximum number of retry attempts allowed';
COMMENT ON COLUMN control_plane.jobs.last_error IS 'Error message from the last failed attempt';
COMMENT ON COLUMN control_plane.jobs.scheduled_at IS 'Timestamp when the job is scheduled to run';
COMMENT ON COLUMN control_plane.jobs.started_at IS 'Timestamp when the job started processing';
COMMENT ON COLUMN control_plane.jobs.completed_at IS 'Timestamp when the job finished (successfully or not)';
COMMENT ON COLUMN control_plane.jobs.created_at IS 'Timestamp when the job was created';
