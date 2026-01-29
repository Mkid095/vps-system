---
project: Webhooks & Events System
branch: flow/webhooks-events
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Webhooks & Events System

## Overview
Outbound event delivery to external systems. Integrations: Stripe (billing), analytics (Mixpanel, Amplitude), automations (Zapier, Make), internal webhooks. Event types: project created, user signed up, file uploaded, key rotated, function executed. Delivery with retry.

## Technical Approach
Webhooks table stores URL, event types, secret. Event log table tracks delivery. Background job delivers webhooks with retry (5x exponential backoff). Signature verification via shared secret. Webhook management UI.

## User Stories

### US-001: Create Webhooks Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a webhooks table so that I can store webhook configurations.

**Acceptance Criteria:**
- webhooks table created in control_plane schema
- Columns: id, project_id, event, target_url, secret, enabled, created_at
- Event is VARCHAR for flexibility
- Secret for signature verification
- Index on project_id and event
- Migration script created

**Status:** false

### US-002: Create Event Log Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an event log table so that I can track webhook delivery.

**Acceptance Criteria:**
- event_log table created in control_plane schema
- Columns: id, project_id, event_type, payload (JSONB), delivered_at, status, created_at
- Status enum: pending, delivered, failed
- Index on project_id and status
- Migration script created

**Status:** false

### US-003: Define Event Types
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want event types defined so that webhooks can be configured appropriately.

**Acceptance Criteria:**
- Events defined: project.created, project.suspended, project.deleted
- Events: user.signedup, user.deleted
- Events: file.uploaded, file.deleted
- Events: key.created, key.rotated, key.revoked
- Events: function.executed
- Events: usage.threshold
- Documented in code

**Status:** false

### US-004: Implement Webhook Registration
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to register webhooks so that I receive event notifications.

**Acceptance Criteria:**
- POST /api/webhooks endpoint
- Request: project_id, event, target_url
- Generates secret for signature
- Returns webhook with secret (show once)
- Typecheck passes

**Status:** false

### US-005: Implement Webhook Delivery
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want webhooks delivered reliably so that external systems receive events.

**Acceptance Criteria:**
- Background job processes pending event_log entries
- POSTs payload to target_url
- Signs with shared secret (HMAC)
- Updates event_log status
- Retry on failure (5x with exponential backoff)
- Typecheck passes

**Status:** false

### US-006: Implement Signature Verification
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a webhook consumer, I want to verify webhook signatures so that I know events are authentic.

**Acceptance Criteria:**
- Signature header: X-Webhook-Signature
- HMAC-SHA256 of payload with secret
- Documentation shows how to verify
- Example code provided
- Typecheck passes

**Status:** false

### US-007: Emit Events on Actions
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want events emitted on key actions so that webhooks are triggered.

**Acceptance Criteria:**
- Project creation emits project.created
- User signup emits user.signedup
- File upload emits file.uploaded
- Key rotation emits key.rotated
- Events created in event_log
- Typecheck passes

**Status:** false

### US-008: Create Webhooks API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to manage webhooks via API so that I can automate webhook configuration.

**Acceptance Criteria:**
- GET /api/webhooks - List webhooks
- GET /api/webhooks/:id - Get webhook details
- PUT /api/webhooks/:id - Update webhook
- DELETE /api/webhooks/:id - Delete webhook
- Typecheck passes

**Status:** false

### US-009: Create Webhooks UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a webhooks UI so that I can manage webhooks without API calls.

**Acceptance Criteria:**
- Webhooks management page created
- Lists all webhooks for project
- Create webhook form
- Event type selector
- Target URL input
- Enable/disable toggle
- Test webhook button
- Typecheck passes

**Status:** false

### US-010: Show Webhook History
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see webhook delivery history so that I can troubleshoot.

**Acceptance Criteria:**
- Webhook history section
- Shows: event type, delivered_at, status, response code
- Shows retry count
- Retry failed webhooks button
- Filter by status
- Typecheck passes

**Status:** false

### US-011: Disable Failed Webhooks
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want failed webhooks auto-disabled so that delivery attempts don't continue forever.

**Acceptance Criteria:**
- After 5 consecutive failures, webhook disabled
- Sets enabled = FALSE
- Notification sent to project owner
- Can be re-enabled manually
- Typecheck passes

**Status:** false
