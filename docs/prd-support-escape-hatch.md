---
project: Support Escape Hatch
branch: flow/support-escape-hatch
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Support Escape Hatch

## Overview
Request support with context. Support button per project auto-attaches: project ID, recent logs, error context. Pre-fills support form. Shows incident status. Incident status page shows all systems operational/degraded.

## Technical Approach
Support button in project header. Creates support request with auto-attached context. Context includes: project_id, recent errors, current status, logs snippet. Incident status page shows service health. Support requests tracked and viewable.

## User Stories

### US-001: Create Support Requests Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a support_requests table so that I can track support tickets.

**Acceptance Criteria:**
- support_requests table created in control_plane schema
- Columns: id, project_id, user_id, subject, description, context (JSONB), status, created_at, resolved_at
- Status enum: open, in_progress, resolved, closed
- Index on project_id and status
- Migration script created

**Status:** false

### US-002: Create Support Request API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create support requests so that I can get help when I need it.

**Acceptance Criteria:**
- POST /api/support/request endpoint
- Request: project_id, subject, description
- Auto-attaches context
- Returns support request ID
- Typecheck passes

**Status:** false

### US-003: Auto-Attach Request Context
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a support agent, I want context auto-attached so that I can understand the issue quickly.

**Acceptance Criteria:**
- Context includes: project_id, project_name, project_status
- Context includes: recent errors (last 10)
- Context includes: current usage metrics
- Context includes: logs snippet (last 20 lines)
- Context formatted as JSON
- Typecheck passes

**Status:** false

### US-004: Add Support Button to UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a support button so that I can easily request help.

**Acceptance Criteria:**
- Support button in project header
- Always visible
- Opens support request modal
- Pre-fills project info
- Typecheck passes

**Status:** false

### US-005: Create Support Request Modal
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a support request form so that I can describe my issue.

**Acceptance Criteria:**
- Modal with subject and description fields
- Shows what context will be attached
- Submit button creates request
- Returns request ID
- Typecheck passes

**Status:** false

### US-006: Create Support Request List UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see my support requests so that I can track progress.

**Acceptance Criteria:**
- Support requests page in project settings
- Lists all requests for project
- Shows: subject, status, created_at, resolved_at
- Filter by status
- Click to view details
- Typecheck passes

**Status:** false

### US-007: Create Incident Status Page
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see system status so that I know if there are ongoing issues.

**Acceptance Criteria:**
- Status page at /status
- Shows all services: API Gateway, Auth, Realtime, GraphQL, Storage, Control Plane
- Status: Operational, Degraded, Outage
- Shows incident history
- Auto-refreshes every 60 seconds
- Typecheck passes

**Status:** false

### US-008: Update Incident Status
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to update incident status so that users are informed.

**Acceptance Criteria:**
- Admin API to update service status
- Status changes logged
- Incident history tracked
- Show incident details: description, start time, updates
- Typecheck passes

**Status:** false

### US-009: Send Support Notifications
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want notifications about my support requests so that I know when they're resolved.

**Acceptance Criteria:**
- Email sent on support request creation
- Email sent when status changes
- Email includes: request_id, subject, status, link to view
- Typecheck passes

**Status:** false

### US-010: Create Admin Support UI
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a support agent, I want an admin UI so that I can manage support requests.

**Acceptance Criteria:**
- Admin support dashboard
- Lists all open requests
- Filter by status, project
- View request details with context
- Update status
- Add notes
- Typecheck passes

**Status:** false
