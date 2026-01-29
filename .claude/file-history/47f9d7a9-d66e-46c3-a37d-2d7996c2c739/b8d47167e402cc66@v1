---
project: Observability Beyond Logs
branch: flow/observability
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Observability Beyond Logs

## Overview
Logs exist but no way to trace a request across services. Request tracing with correlation IDs, service health reporting, and request traces table provide complete observability across the platform.

## Technical Approach
Add correlation ID middleware in all services. Create request_traces table tracking services_hit, total_duration_ms. Create service health endpoint checking all dependencies. Ensure x-request-id propagated across all services.

## User Stories

### US-001: Create Request Traces Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a request_traces table so that I can track request flow across services.

**Acceptance Criteria:**
- request_traces table created in control_plane schema
- Columns: request_id (UUID PRIMARY KEY), project_id, path, method, services_hit (JSONB), total_duration_ms, created_at
- services_hit: array of service names
- Index on project_id for querying
- Index on created_at for time range queries
- Migration script created and tested

**Status:** false

### US-002: Implement Correlation ID Middleware
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want correlation ID middleware so that every request has a unique ID for tracing.

**Acceptance Criteria:**
- Middleware created at src/lib/middleware/correlation.ts
- Generates UUID if not in x-request-id header
- Sets req.id = correlation ID
- Sets x-request-id response header
- Works with Express/Next.js
- Typecheck passes

**Status:** false

### US-003: Add Correlation ID to API Gateway
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the API gateway to use correlation IDs so that all gateway requests are traceable.

**Acceptance Criteria:**
- Correlation middleware applied to gateway
- Every request gets x-request-id
- Request ID passed to downstream services
- Request ID logged with all logs
- Typecheck passes

**Status:** false

### US-004: Add Correlation ID to Auth Service
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the auth service to use correlation IDs so that auth requests are traceable.

**Acceptance Criteria:**
- Correlation middleware applied to auth service
- x-request-id propagated
- Request ID in all auth logs
- Typecheck passes

**Status:** false

### US-005: Add Correlation ID to GraphQL Service
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the GraphQL service to use correlation IDs so that GraphQL queries are traceable.

**Acceptance Criteria:**
- Correlation middleware applied to GraphQL service
- x-request-id propagated
- Request ID in all GraphQL logs
- Typecheck passes

**Status:** false

### US-006: Add Correlation ID to Realtime Service
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the realtime service to use correlation IDs so that WebSocket connections are traceable.

**Acceptance Criteria:**
- Correlation ID on connection handshake
- x-request-id in connection headers
- Request ID in all realtime logs
- Typecheck passes

**Status:** false

### US-007: Add Correlation ID to Storage Service
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the storage service to use correlation IDs so that storage operations are traceable.

**Acceptance Criteria:**
- Correlation middleware applied to storage service
- x-request-id propagated
- Request ID in all storage logs
- Typecheck passes

**Status:** false

### US-008: Add Correlation ID to Audit Logs
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want audit logs to include correlation IDs so that I can trace audit entries to specific requests.

**Acceptance Criteria:**
- audit_logs table updated with request_id column
- Request ID captured from x-request-id
- Links audit entries to requests
- Can query all audit entries for a request
- Migration script created
- Typecheck passes

**Status:** false

### US-009: Add Correlation ID to Project Logs
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want project logs to include correlation IDs so that I can trace logs to specific requests.

**Acceptance Criteria:**
- project_logs table updated with request_id column
- Request ID captured from x-request-id
- Links logs to requests
- Can query all logs for a request
- Migration script created
- Typecheck passes

**Status:** false

### US-010: Create Service Health Endpoint
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want a health endpoint in each service so that I can monitor service dependencies.

**Acceptance Criteria:**
- GET /internal/health endpoint in all services
- Returns: status, version, uptime, dependencies
- Dependencies section with: database {status, latency_ms}, redis {status, latency_ms}
- Returns 200 if healthy, 503 if unhealthy
- Latency measured for each dependency
- Typecheck passes

**Status:** false

### US-011: Implement Request Tracing
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to trace requests across services so that I can see the full request path.

**Acceptance Criteria:**
- Request ID logged when entering each service
- services_hit array updated in request_traces
- Total duration tracked
- Trace queryable by request_id
- Typecheck passes

**Status:** false

### US-012: Create Trace Viewer UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to view request traces so that I can debug request flow.

**Acceptance Criteria:**
- Trace viewer page created
- Search by request_id
- Shows request path through services
- Shows duration per service
- Shows total duration
- Timeline visualization
- Typecheck passes

**Status:** false
