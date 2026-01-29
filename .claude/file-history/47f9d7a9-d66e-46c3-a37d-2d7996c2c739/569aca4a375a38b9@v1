---
project: Control Plane Snapshot Contract
branch: flow/control-plane-snapshot
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Control Plane Snapshot Contract

## Overview
Data plane services need an authoritative, cached view of control plane state to enforce governance without hitting the control database directly. This creates the critical source-of-truth contract between control plane and data plane.

## Technical Approach
Implement GET /internal/control-plane/snapshot endpoint that returns complete project state including status, enabled services, limits, quotas, and environment. Use TTL caching (30-60s) to prevent excessive queries. Implement fail-closed behavior - if snapshot is unavailable, deny all requests.

## User Stories

### US-001: Create Snapshot Endpoint
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a data plane service, I want to fetch a snapshot of control plane state so that I can enforce governance rules without querying the control database.

**Acceptance Criteria:**
- GET /internal/snapshot?project_id=xxx endpoint created
- Returns complete project state in JSON format
- Response includes: version, project (id, status, environment), services (enabled/config per service), limits, quotas
- No authentication required (internal endpoint)
- Typecheck passes
- Response time < 100ms

**Status:** false

### US-002: Implement Snapshot Caching
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want the snapshot to be cached so that data plane services don't overwhelm the control plane with requests.

**Acceptance Criteria:**
- Snapshots cached with 30-60s TTL
- Cache key includes project_id
- Cache invalidation on project changes
- Version field increments on cache invalidation
- Cached responses returned until TTL expires
- Typecheck passes

**Status:** false

### US-003: Implement Fail-Closed Behavior
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want data plane services to deny requests when the snapshot is unavailable so that security is never compromised.

**Acceptance Criteria:**
- Returns 503 Service Unavailable when snapshot fetch fails
- Error message indicates control plane unavailable
- Data plane services block all requests on 503
- Retry-after header included
- Typecheck passes

**Status:** false

### US-004: Update Auth Service to Consume Snapshot
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As the auth service, I want to consume the snapshot API so that I can check project status and enabled services without hitting the control database.

**Acceptance Criteria:**
- Auth service fetches snapshot on startup
- Snapshot cached locally with TTL
- Project status checked before auth operations
- Service enablement checked before operations
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-005: Update API Gateway to Consume Snapshot
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As the API gateway, I want to consume the snapshot API so that I can enforce rate limits and service enablement without hitting the control database.

**Acceptance Criteria:**
- Gateway fetches snapshot per request
- Snapshot cached with 30s TTL
- Project status validated on each request
- Rate limits enforced from snapshot
- Service enablement checked before routing
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-006: Update GraphQL Service to Consume Snapshot
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As the GraphQL service, I want to consume the snapshot API so that I can check project status and service enablement.

**Acceptance Criteria:**
- GraphQL service fetches snapshot on request
- Snapshot cached with 30s TTL
- Project status validated before query execution
- GraphQL service enablement checked
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-007: Update Realtime Service to Consume Snapshot
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As the realtime service, I want to consume the snapshot API so that I can validate project status before accepting WebSocket connections.

**Acceptance Criteria:**
- Realtime service fetches snapshot on connection
- Snapshot cached with 30s TTL
- Project status validated on connection
- Realtime service enablement checked
- Connection limit enforced from snapshot
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-008: Update Storage Service to Consume Snapshot
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As the storage service, I want to consume the snapshot API so that I can validate project status and storage quotas.

**Acceptance Criteria:**
- Storage service fetches snapshot on request
- Snapshot cached with 30s TTL
- Project status validated before operations
- Storage quota checked from snapshot
- Storage service enablement checked
- Fails closed if snapshot unavailable
- Typecheck passes

**Status:** false

### US-009: Create Snapshot Response Schema
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a data plane service, I want the snapshot response to have a well-defined schema so that I can reliably parse and use the data.

**Acceptance Criteria:**
- Schema defined in TypeScript
- Schema includes: version (string), project (object), services (object), limits (object), quotas (object)
- Schema validation on response
- Documentation of schema format
- Version increment logic defined
- Typecheck passes

**Status:** false

### US-010: Implement Snapshot Versioning
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want snapshots to be versioned so that data plane services can detect and invalidate stale cached data.

**Acceptance Criteria:**
- Version field included in all snapshot responses
- Version increments on project changes
- Version increments on quota changes
- Version increments on service enablement changes
- Data plane services compare version on cache refresh
- Typecheck passes

**Status:** false
