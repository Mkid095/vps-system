---
project: Standardized Error Format
branch: flow/standardized-errors
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Standardized Error Format

## Overview
Developers hate inconsistent errors. Define once, use everywhere. Standard error format with error codes, messages, documentation links, and retryable flags provides DX credibility and predictable, actionable error handling.

## Technical Approach
Create error factory with standard shape: {error: {code, message, docs, retryable, project_id}}. Define error codes: PROJECT_SUSPENDED, RATE_LIMITED, QUOTA_EXCEEDED, KEY_INVALID, SERVICE_DISABLED, PERMISSION_DENIED. Update all services to use standard format.

## User Stories

### US-001: Create Error Factory
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want an error factory so that all services return consistent error responses.

**Acceptance Criteria:**
- Error factory created at src/lib/errors.ts
- Standard error shape defined
- createError(code, message, details) function
- Returns {error: {code, message, docs, retryable, project_id}}
- TypeScript types for error codes
- Typecheck passes

**Status:** false

### US-002: Define Error Codes
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a comprehensive list of error codes so that errors are consistent across the platform.

**Acceptance Criteria:**
- Error codes enum defined
- PROJECT_SUSPENDED - Project is suspended
- RATE_LIMITED - Too many requests
- QUOTA_EXCEEDED - Monthly quota exceeded
- KEY_INVALID - API key invalid or expired
- SERVICE_DISABLED - Service not enabled for project
- PERMISSION_DENIED - Insufficient permissions
- VALIDATION_ERROR - Request validation failed
- INTERNAL_ERROR - Unexpected server error
- Typecheck passes

**Status:** false

### US-003: Add Retryable Flag
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to know if an error is retryable so that my client can handle it appropriately.

**Acceptance Criteria:**
- Each error code has retryable flag
- Retryable: RATE_LIMITED (after delay), INTERNAL_ERROR
- Not retryable: PROJECT_SUSPENDED, QUOTA_EXCEEDED, KEY_INVALID, SERVICE_DISABLED, PERMISSION_DENIED, VALIDATION_ERROR
- Flag included in error response
- Typecheck passes

**Status:** false

### US-004: Add Documentation Links
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want links to documentation in error responses so that I can understand and fix errors quickly.

**Acceptance Criteria:**
- Each error code has documentation URL
- URL format: /docs/errors#{error_code}
- Link included in error response
- Documentation page created for each error
- Typecheck passes

**Status:** false

### US-005: Update API Gateway Errors
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want API gateway to use standard error format so that errors are consistent.

**Acceptance Criteria:**
- API gateway updated to use error factory
- All errors return standard format
- Rate limit errors use RATE_LIMITED code
- Invalid key errors use KEY_INVALID code
- Service disabled errors use SERVICE_DISABLED code
- Typecheck passes

**Status:** false

### US-006: Update Auth Service Errors
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want auth service to use standard error format so that authentication errors are consistent.

**Acceptance Criteria:**
- Auth service updated to use error factory
- Authentication errors use standard format
- Permission errors use PERMISSION_DENIED code
- Validation errors use VALIDATION_ERROR code
- Typecheck passes

**Status:** false

### US-007: Update GraphQL Service Errors
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want GraphQL service to use standard error format so that GraphQL errors are consistent.

**Acceptance Criteria:**
- GraphQL service updated to use error factory
- GraphQL errors use standard format
- Schema errors use VALIDATION_ERROR code
- Execution errors use INTERNAL_ERROR code
- Typecheck passes

**Status:** false

### US-008: Update Realtime Service Errors
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want realtime service to use standard error format so that WebSocket errors are consistent.

**Acceptance Criteria:**
- Realtime service updated to use error factory
- Connection errors use standard format
- Rate limit errors use RATE_LIMITED code
- Typecheck passes

**Status:** false

### US-009: Update Storage Service Errors
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want storage service to use standard error format so that storage errors are consistent.

**Acceptance Criteria:**
- Storage service updated to use error factory
- Upload errors use standard format
- Quota errors use QUOTA_EXCEEDED code
- Typecheck passes

**Status:** false

### US-010: Create Error Documentation Page
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want comprehensive error documentation so that I can understand and resolve errors quickly.

**Acceptance Criteria:**
- Error documentation page created at /docs/errors
- Each error code documented with:
  - Error name and code
  - When it occurs
  - How to fix it
  - Whether it's retryable
- Searchable by error code
- Linked from error responses
- Typecheck passes

**Status:** false
