---
project: Idempotency & Safety Nets
branch: flow/idempotency
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Idempotency & Safety Nets

## Overview
Duplicate requests happen: double-click, network glitches, retry storms. Idempotency keeps the platform calm under chaos by ensuring that duplicate operations don't create duplicate side effects.

## Technical Approach
Create idempotency keys table with TTL and middleware that checks for existing responses before executing operations. Applied to critical endpoints: provision project, create key, revoke key, send webhook. Default TTL of 1 hour.

## User Stories

### US-001: Create Idempotency Keys Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an idempotency keys table so that I can store and retrieve operation results.

**Acceptance Criteria:**
- idempotency_keys table created in control_plane schema
- Columns: key (VARCHAR(255) PRIMARY KEY), response (JSONB), expires_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ)
- Index on expires_at for cleanup
- Migration script created and tested

**Status:** false

### US-002: Create Idempotency Middleware
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want idempotency middleware so that I can easily add idempotency to any endpoint.

**Acceptance Criteria:**
- Middleware created at src/lib/idempotency.ts
- withIdempotency(key, fn) helper function
- Checks for existing response
- Returns cached response if exists
- Executes function if not exists
- Stores result with TTL
- Typecheck passes

**Status:** false

### US-003: Add Idempotency to Provision Project
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want project creation to be idempotent so that accidental double-click doesn't create duplicate projects.

**Acceptance Criteria:**
- Provision project endpoint uses idempotency middleware
- Idempotency key format: provision:{project_id}
- TTL: 1 hour
- Duplicate requests return same response
- No duplicate projects created
- Typecheck passes

**Status:** false

### US-004: Add Idempotency to Create API Key
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want API key creation to be idempotent so that retry requests don't create multiple keys.

**Acceptance Criteria:**
- Create key endpoint uses idempotency middleware
- Idempotency key format: create_key:{request_id}
- TTL: 5 minutes
- Duplicate requests return same key
- No duplicate keys created
- Typecheck passes

**Status:** false

### US-005: Add Idempotency to Revoke Key
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want key revocation to be idempotent so that retry requests don't cause errors.

**Acceptance Criteria:**
- Revoke key endpoint uses idempotency middleware
- Idempotency key format: revoke:{key_id}
- TTL: Immediate (revocation is permanent)
- Duplicate requests return same response
- Typecheck passes

**Status:** false

### US-006: Add Idempotency to Send Webhook
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want webhook delivery to be idempotent so that retry requests don't cause duplicate webhook deliveries.

**Acceptance Criteria:**
- Webhook delivery uses idempotency middleware
- Idempotency key format: webhook:{event_id}
- TTL: 24 hours
- Duplicate requests return same response
- Webhook delivered only once
- Typecheck passes

**Status:** false

### US-007: Implement Idempotency Key Cleanup
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want expired idempotency keys to be automatically cleaned up so that the table doesn't grow indefinitely.

**Acceptance Criteria:**
- Cleanup job runs hourly
- Deletes keys where expires_at < NOW()
- Job logged in audit log
- Typecheck passes

**Status:** false

### US-008: Add Idempotency Key to Request Headers
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to pass idempotency keys via HTTP header so that I can ensure idempotency for my requests.

**Acceptance Criteria:**
- Middleware checks Idempotency-Key header
- If not provided, generates UUID for key
- Returns idempotency key in response header
- Documentation updated with header usage
- Typecheck passes

**Status:** false
