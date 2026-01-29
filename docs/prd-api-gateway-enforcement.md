---
project: API Gateway Enforcement
branch: flow/api-gateway-enforcement
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# API Gateway Enforcement

## Overview
Validate at gateway level using snapshot. Gateway checks project status, service enabled, rate limits. Returns 403/429 on violations. Consumes snapshot API (not direct DB). Enforces limits from snapshot.

## Technical Approach
Gateway middleware validates each request. Fetches snapshot on startup, caches with 30s TTL. Checks: project status, service enabled, rate limit from snapshot. Returns appropriate error codes. All enforcement happens at gateway before forwarding to services.

## User Stories

### US-001: Implement Snapshot Consumption
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to consume the snapshot API so that I don't hit the control database directly.

**Acceptance Criteria:**
- Gateway fetches snapshot on startup
- Snapshot cached with 30s TTL
- Snapshot refreshes in background
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-002: Validate Project Status
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to check project status so that suspended projects can't make requests.

**Acceptance Criteria:**
- Gateway checks status from snapshot
- SUSPENDED returns PROJECT_SUSPENDED error
- ARCHIVED returns PROJECT_ARCHIVED error
- DELETED returns PROJECT_DELETED error
- Only ACTIVE requests proceed
- Typecheck passes

**Status:** false

### US-003: Validate Service Enablement
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to check service enablement so that disabled services can't be accessed.

**Acceptance Criteria:**
- Gateway checks services from snapshot
- Returns SERVICE_DISABLED if service not enabled
- Error message includes which service
- Typecheck passes

**Status:** false

### US-004: Enforce Rate Limits
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to enforce rate limits so that projects stay within quotas.

**Acceptance Criteria:**
- Gateway checks limits from snapshot
- Rate limit per project
- Returns RATE_LIMITED with retry-after header
- Sliding window rate limiting
- Typecheck passes

**Status:** false

### US-005: Extract Project ID from JWT
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to extract project_id from JWT so that I can scope requests.

**Acceptance Criteria:**
- JWT validation middleware
- Extracts project_id claim
- Validates JWT signature
- Rejects invalid JWT with KEY_INVALID error
- Typecheck passes

**Status:** false

### US-006: Add Correlation ID
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to add correlation IDs so that requests are traceable.

**Acceptance Criteria:**
- Correlation ID middleware
- Generates UUID if not in x-request-id
- Passes to downstream services
- Returns in response header
- Typecheck passes

**Status:** false

### US-007: Return Standard Error Format
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to return standard error format so that errors are consistent.

**Acceptance Criteria:**
- All errors use standard format
- Error codes: PROJECT_SUSPENDED, SERVICE_DISABLED, RATE_LIMITED, KEY_INVALID
- Include error code, message, retryable flag
- Typecheck passes

**Status:** false

### US-008: Log All Requests
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to log all requests so that I have audit trail.

**Acceptance Criteria:**
- Request logging middleware
- Logs: project_id, path, method, status_code, duration
- Includes correlation_id
- Async to not block requests
- Typecheck passes

**Status:** false

### US-009: Track Request Duration
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want to track request duration so that I can monitor performance.

**Acceptance Criteria:**
- Duration tracking middleware
- Records start and end time
- Logs slow requests (>1s)
- Aggregates duration metrics
- Typecheck passes

**Status:** false

### US-010: Health Check
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a gateway engineer, I want a health check endpoint so that I can monitor gateway status.

**Acceptance Criteria:**
- GET /health endpoint
- Returns: status, version, uptime
- Checks: database, control_plane_api
- Returns 503 if any dependency unhealthy
- Typecheck passes

**Status:** false
