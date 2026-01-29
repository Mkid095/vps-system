---
project: Control Plane API Service
branch: flow/control-plane-api
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Control Plane API Service

## Overview
Extract control routes into standalone authoritative API service that separates the control plane from the UI layer. This creates the foundational API boundary that CLI, automation, CI/CD, and the developer portal will all consume.

## Technical Approach
Create standalone Next.js service at `/home/ken/control-plane-api/` with REST API endpoints for all governance operations. Implement API versioning support (/v1/, /v2/) and shared authentication/DB libraries that can be consumed by both the control plane and other services.

## User Stories

### US-001: Create Control Plane API Project Structure
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to create the standalone Control Plane API service so that all governance operations have a first-class API boundary.

**Acceptance Criteria:**
- Next.js project created at /home/ken/control-plane-api/
- Project structure includes /app/api with versioned routes
- Shared auth.ts library for JWT authentication
- Shared db.ts library for database connection pooling
- Package.json includes all necessary dependencies
- Typecheck passes
- Can run development server locally

**Status:** false

### US-002: Implement Projects CRUD API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to create, read, update, and delete projects via REST API so that I can manage projects programmatically.

**Acceptance Criteria:**
- POST /v1/projects - Create new project
- GET /v1/projects - List all projects (with filtering)
- GET /v1/projects/:id - Get project details
- PUT /v1/projects/:id - Update project
- DELETE /v1/projects/:id - Delete project (soft delete)
- All endpoints require authentication
- Request validation on all inputs
- Typecheck passes
- API returns JSON responses with standard error format

**Status:** false

### US-003: Implement Organizations API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to manage organizations and team membership via API so that I can programmatically handle multi-tenant scenarios.

**Acceptance Criteria:**
- POST /v1/orgs - Create organization
- GET /v1/orgs - List organizations
- GET /v1/orgs/:id - Get organization details
- PUT /v1/orgs/:id - Update organization
- POST /v1/orgs/:id/members - Add member
- DELETE /v1/orgs/:id/members/:userId - Remove member
- PUT /v1/orgs/:id/members/:userId - Update member role
- All endpoints require authentication
- Authorization checks ensure only owners can manage members
- Typecheck passes

**Status:** false

### US-004: Implement API Keys Management API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create, rotate, and revoke API keys via API so that I can manage credentials programmatically.

**Acceptance Criteria:**
- POST /v1/keys - Create new API key with type and scopes
- GET /v1/keys - List keys for project
- GET /v1/keys/:id - Get key details (show value only on creation)
- PUT /v1/keys/:id/rotate - Rotate key with grace period
- DELETE /v1/keys/:id/revoke - Revoke key immediately
- GET /v1/keys/:id/usage - Get usage statistics
- Key types supported: public, secret, service_role, mcp
- Scopes enforced per key type
- Typecheck passes

**Status:** false

### US-005: Implement Usage and Quotas API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to track usage and manage quotas via API so that I can monitor and control resource consumption.

**Acceptance Criteria:**
- GET /v1/usage/:projectId - Get current usage metrics
- POST /v1/usage/check - Check if operation is within quota
- PUT /v1/quotas/:projectId - Update project quotas
- GET /v1/quotas/:projectId - Get current quotas
- Usage metrics aggregated by service and time period
- Quota warnings returned at 80%, 90%, 100%
- Typecheck passes

**Status:** false

### US-006: Implement Jobs API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to query job status and retry failed jobs via API so that I can monitor and manage async operations.

**Acceptance Criteria:**
- GET /v1/jobs - List jobs with filtering
- GET /v1/jobs/:id - Get job details and status
- POST /v1/jobs/:id/retry - Retry failed job
- DELETE /v1/jobs/:id - Cancel pending job
- Job types: provision_project, rotate_key, deliver_webhook, export_backup, check_usage_limits
- Status tracking: pending, running, failed, completed
- Typecheck passes

**Status:** false

### US-007: Implement Audit Logs API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to query audit logs via API so that I can investigate who did what and when.

**Acceptance Criteria:**
- GET /v1/audit - Query audit logs with filtering
- Filters: actor_id, action, target_type, date_range
- Returns actor details, action, target, metadata, timestamp
- Pagination support
- Export to CSV endpoint
- Typecheck passes

**Status:** false

### US-008: Implement Webhooks API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to manage webhook subscriptions via API so that I can integrate with external systems.

**Acceptance Criteria:**
- POST /v1/webhooks - Register webhook URL for events
- GET /v1/webhooks - List webhooks for project
- DELETE /v1/webhooks/:id - Remove webhook
- PUT /v1/webhooks/:id - Update webhook
- Event types: project.created, user.signedup, file.uploaded, key.rotated, etc.
- Webhook secret for signature verification
- Typecheck passes

**Status:** false

### US-009: Implement Internal Snapshot Endpoint
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a data plane service, I want to fetch a cached snapshot of control plane state so that I can enforce governance without hitting the control database directly.

**Acceptance Criteria:**
- GET /internal/snapshot?project_id=xxx returns complete project state
- Response includes: project status, enabled services, limits, quotas, environment
- Snapshot cached with 30-60s TTL
- Version field for cache invalidation
- Returns 503 if snapshot unavailable (fail closed)
- No authentication required (internal endpoint)
- Typecheck passes

**Status:** false

### US-010: Implement Health Check Endpoint
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to check the health of the Control Plane API and its dependencies so that I can monitor system status.

**Acceptance Criteria:**
- GET /internal/health returns health status
- Response includes: status, version, uptime
- Dependencies section checks: database, redis (if used)
- Each dependency shows status and latency
- Returns 200 if healthy, 503 if any dependency unhealthy
- Typecheck passes

**Status:** false

### US-011: Update Developer Portal to Consume Control Plane API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want the developer portal UI to call the Control Plane API instead of accessing the database directly so that all operations go through the authoritative API boundary.

**Acceptance Criteria:**
- Remove direct DB queries from developer portal API routes
- All project operations call Control Plane API
- All API key operations call Control Plane API
- Authentication shared between portal and control plane
- Error handling uses standard error format
- Typecheck passes
- All existing functionality preserved

**Status:** false

### US-012: Implement API Versioning
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to version the Control Plane API so that I can introduce breaking changes without disrupting existing clients.

**Acceptance Criteria:**
- Current version accessible at /v1/
- Version returned in response headers (X-API-Version)
- Deprecation warnings in headers for old versions
- Documentation clearly indicates version differences
- Typecheck passes

**Status:** false
