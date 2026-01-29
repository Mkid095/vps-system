---
project: Resource Isolation Enforcement
branch: flow/resource-isolation
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Resource Isolation Enforcement

## Overview
Enforce project boundaries everywhere. JWT contains project_id. DB queries scoped to tenant_{project_id}. Realtime channels prefixed. Storage paths prefixed. Return 403 for cross-project access (never 404).

## Technical Approach
Middleware in all services enforces isolation. Validates project_id in JWT. Scopes all queries to tenant schema. Prefixes all channels and paths. Returns 403 for cross-project attempts. No isolation bypass possible.

## User Stories

### US-001: Require project_id in JWT
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want JWT to contain project_id so that every request is attributable to a project.

**Acceptance Criteria:**
- JWT includes project_id claim
- JWT validation checks project_id exists
- Rejects requests without project_id
- Error: Missing project_id claim
- Typecheck passes

**Status:** false

### US-002: Scope Database Queries
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want database queries scoped to tenant schema so that projects can't access each other's data.

**Acceptance Criteria:**
- API gateway sets search_path to tenant_{project_id}
- All queries scoped to tenant schema
- Cross-schema queries blocked
- Returns 403 for cross-project access
- Typecheck passes

**Status:** false

### US-003: Prefix Realtime Channels
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want realtime channels prefixed so that projects can't subscribe to each other's updates.

**Acceptance Criteria:**
- Realtime channels prefixed: project_id:table_name
- Subscription validation checks prefix
- Rejects subscriptions to other projects
- Returns 403 for cross-project access
- Typecheck passes

**Status:** false

### US-004: Prefix Storage Paths
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want storage paths prefixed so that projects can't access each other's files.

**Acceptance Criteria:**
- Storage paths prefixed: project_id:/path
- Upload/validation checks prefix
- Rejects access to other project paths
- Returns 403 for cross-project access
- Typecheck passes

**Status:** false

### US-005: Return 403 Not 404
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want cross-project access to return 403 so that isolation is explicit.

**Acceptance Criteria:**
- Cross-project DB queries return 403
- Cross-project realtime subscriptions return 403
- Cross-project storage access returns 403
- Error message: "Access to other project's resources not permitted"
- Typecheck passes

**Status:** false

### US-006: Enforce Isolation in API Gateway
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the API gateway to enforce isolation so that cross-project requests are blocked.

**Acceptance Criteria:**
- Gateway validates project_id in JWT
- Gateway sets search_path based on project_id
- Gateway blocks cross-project requests
- Typecheck passes

**Status:** false

### US-007: Enforce Isolation in Auth Service
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the auth service to enforce isolation so that auth tokens are project-scoped.

**Acceptance Criteria:**
- Auth tokens include project_id claim
- User auth validated per project
- Cross-project auth rejected
- Typecheck passes

**Status:** false

### US-008: Enforce Isolation in GraphQL Service
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the GraphQL service to enforce isolation so that GraphQL queries are scoped.

**Acceptance Criteria:**
- GraphQL queries scoped to tenant_{project_id}
- Cross-project queries rejected
- Returns 403
- Typecheck passes

**Status:** false

### US-009: Enforce Isolation in Realtime Service
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the realtime service to enforce isolation so that WebSocket connections are scoped.

**Acceptance Criteria:**
- WebSocket connection validated for project_id
- Channel prefix enforced
- Cross-project channel subscriptions rejected
- Returns 403
- Typecheck passes

**Status:** false

### US-010: Enforce Isolation in Storage Service
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the storage service to enforce isolation so that file access is scoped.

**Acceptance Criteria:**
- File operations validated for project_id prefix
- Cross-project file access rejected
- Returns 403
- Typecheck passes

**Status:** false

### US-011: Isolation Testing
**Priority:** 3
**Maven Steps:** [3]
**MCP Tools:** []

As a platform engineer, I want isolation tested so that I'm confident cross-project access is impossible.

**Acceptance Criteria:**
- Test suite for isolation
- Tests cross-project DB access
- Tests cross-project realtime access
- Tests cross-project storage access
- All tests verify 403 response
- Typecheck passes

**Status:** false
