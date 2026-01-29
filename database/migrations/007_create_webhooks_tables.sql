-- Migration: Create webhooks and webhook_deliveries tables
-- Description: Creates tables for managing webhook configurations and tracking delivery attempts
-- Created: 2026-01-29
-- US-006: Implement Deliver Webhook Job - Step 7: Data Layer

-- Create webhooks table
CREATE TABLE control_plane.webhooks (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Webhook configuration
    project_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    url TEXT NOT NULL,

    -- HTTP configuration
    http_method TEXT NOT NULL DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),
    headers JSONB DEFAULT '{}'::jsonb,

    -- Webhook status
    disabled BOOLEAN DEFAULT false,
    disabled_at TIMESTAMPTZ,
    disabled_reason TEXT,

    -- Delivery tracking
    consecutive_failures INTEGER DEFAULT 0,
    last_delivery_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT webhooks_url_not_empty CHECK (length(url) > 0),
    CONSTRAINT webhooks_consecutive_failures_not_negative CHECK (consecutive_failures >= 0),
    CONSTRAINT webhooks_project_id_not_empty CHECK (length(project_id) > 0),
    CONSTRAINT webhooks_event_type_not_empty CHECK (length(event_type) > 0)
);

-- Create webhook_deliveries table
CREATE TABLE control_plane.webhook_deliveries (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    webhook_id UUID NOT NULL REFERENCES control_plane.webhooks(id) ON DELETE CASCADE,
    event_id TEXT,
    project_id TEXT,

    -- Delivery details
    event_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'pending',
        'delivering',
        'delivered',
        'failed',
        'permanently_failed',
        'disabled'
    )),

    -- HTTP response details
    http_status_code INTEGER,
    response_body TEXT,

    -- Error details
    error_message TEXT,

    -- Retry tracking
    attempts INTEGER NOT NULL DEFAULT 1,
    next_retry_at TIMESTAMPTZ,

    -- Performance tracking
    duration_ms INTEGER,

    -- Timestamps
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT webhook_deliveries_attempts_positive CHECK (attempts > 0),
    CONSTRAINT webhook_deliveries_status_valid CHECK (status IN (
        'pending',
        'delivering',
        'delivered',
        'failed',
        'permanently_failed',
        'disabled'
    ))
);

-- Create indexes for webhooks table
CREATE INDEX idx_webhooks_project_id ON control_plane.webhooks(project_id);
CREATE INDEX idx_webhooks_event_type ON control_plane.webhooks(event_type);
CREATE INDEX idx_webhooks_disabled ON control_plane.webhooks(disabled);
CREATE INDEX idx_webhooks_project_event ON control_plane.webhooks(project_id, event_type);
CREATE INDEX idx_webhooks_consecutive_failures ON control_plane.webhooks(consecutive_failures);

-- Create indexes for webhook_deliveries table
CREATE INDEX idx_webhook_deliveries_webhook_id ON control_plane.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event_id ON control_plane.webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_status ON control_plane.webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON control_plane.webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_webhook_status ON control_plane.webhook_deliveries(webhook_id, status);

-- Add comments to webhooks table
COMMENT ON TABLE control_plane.webhooks IS 'Webhook configurations for event notifications to external endpoints';
COMMENT ON COLUMN control_plane.webhooks.id IS 'Unique identifier for the webhook configuration';
COMMENT ON COLUMN control_plane.webhooks.project_id IS 'Project ID that owns this webhook';
COMMENT ON COLUMN control_plane.webhooks.event_type IS 'Event type that triggers this webhook (e.g., user.created, deployment.completed)';
COMMENT ON COLUMN control_plane.webhooks.url IS 'Target URL to send webhook notifications to';
COMMENT ON COLUMN control_plane.webhooks.http_method IS 'HTTP method to use for delivery (POST, PUT, or PATCH)';
COMMENT ON COLUMN control_plane.webhooks.headers IS 'Additional HTTP headers to include in webhook requests';
COMMENT ON COLUMN control_plane.webhooks.disabled IS 'Whether this webhook is disabled due to consecutive failures';
COMMENT ON COLUMN control_plane.webhooks.disabled_at IS 'Timestamp when webhook was disabled';
COMMENT ON COLUMN control_plane.webhooks.disabled_reason IS 'Reason why webhook was disabled';
COMMENT ON COLUMN control_plane.webhooks.consecutive_failures IS 'Number of consecutive delivery failures (triggers disable at 5)';
COMMENT ON COLUMN control_plane.webhooks.last_delivery_at IS 'Timestamp of last successful delivery';
COMMENT ON COLUMN control_plane.webhooks.last_failure_at IS 'Timestamp of last failed delivery attempt';
COMMENT ON COLUMN control_plane.webhooks.created_at IS 'Timestamp when webhook was created';
COMMENT ON COLUMN control_plane.webhooks.updated_at IS 'Timestamp when webhook was last updated';

-- Add comments to webhook_deliveries table
COMMENT ON TABLE control_plane.webhook_deliveries IS 'Webhook delivery attempt tracking for monitoring and retry logic';
COMMENT ON COLUMN control_plane.webhook_deliveries.id IS 'Unique identifier for the delivery attempt';
COMMENT ON COLUMN control_plane.webhook_deliveries.webhook_id IS 'Reference to the webhook configuration';
COMMENT ON COLUMN control_plane.webhook_deliveries.event_id IS 'Unique identifier for the event that triggered this delivery';
COMMENT ON COLUMN control_plane.webhook_deliveries.project_id IS 'Project ID associated with this delivery';
COMMENT ON COLUMN control_plane.webhook_deliveries.event_type IS 'Event type that triggered this webhook';
COMMENT ON COLUMN control_plane.webhook_deliveries.status IS 'Delivery status: pending, delivering, delivered, failed, permanently_failed, or disabled';
COMMENT ON COLUMN control_plane.webhook_deliveries.http_status_code IS 'HTTP status code received from webhook endpoint';
COMMENT ON COLUMN control_plane.webhook_deliveries.response_body IS 'Response body received from webhook endpoint';
COMMENT ON COLUMN control_plane.webhook_deliveries.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN control_plane.webhook_deliveries.attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN control_plane.webhook_deliveries.next_retry_at IS 'Timestamp of next retry attempt (if scheduled)';
COMMENT ON COLUMN control_plane.webhook_deliveries.duration_ms IS 'Delivery duration in milliseconds';
COMMENT ON COLUMN control_plane.webhook_deliveries.delivered_at IS 'Timestamp of successful delivery';
COMMENT ON COLUMN control_plane.webhook_deliveries.created_at IS 'Timestamp when delivery record was created';
