---
project: Key Rotation & Revocation
branch: flow/key-rotation
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Key Rotation & Revocation

## Overview
Key hygiene operations. Rotate key API with 24h overlap. Revoke key API for immediate invalidation. Usage stats per key. Last used tracking. Developers can manage key lifecycle.

## Technical Approach
Rotate endpoint creates new key, keeps old active for 24h. Revoke endpoint immediately invalidates. Track usage per key: request count, last used, success/error rate. Show stats in UI.

## User Stories

### US-001: Add Key Lifecycle Columns
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want key lifecycle tracking so that I can manage key rotation.

**Acceptance Criteria:**
- api_keys table updated with: expires_at, rotated_to, last_used, usage_count
- expires_at for automatic expiration
- rotated_to references new key after rotation
- Migration script created
- Typecheck passes

**Status:** false

### US-002: Implement Rotate Key API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to rotate keys so that I can maintain security hygiene.

**Acceptance Criteria:**
- POST /api/keys/:id/rotate endpoint
- Creates new key version
- Links old key.rotated_to = new key.id
- Sets old key.expires_at = NOW() + 24 hours
- Returns new key (show once)
- Typecheck passes

**Status:** false

### US-003: Implement Revoke Key API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to revoke keys immediately so that I can respond to key compromise.

**Acceptance Criteria:**
- DELETE /api/keys/:id/revoke endpoint
- Sets key status to revoked
- Key immediately invalid
- Returns revoked key info
- Typecheck passes

**Status:** false

### US-004: Update Key Usage on Each Request
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want key usage tracked so that I know which keys are active.

**Acceptance Criteria:**
- Gateway updates last_used on each request
- Increments usage_count
- Async update to not block requests
- Typecheck passes

**Status:** false

### US-005: Create Key Usage API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see key usage stats so that I know which keys are being used.

**Acceptance Criteria:**
- GET /api/keys/:id/usage endpoint
- Returns: usage_count, last_used, created_at
- Returns request count by time period (7d, 30d)
- Returns success/error rate
- Typecheck passes

**Status:** false

### US-006: Show Usage Stats in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see key usage in the UI so that I can identify inactive keys.

**Acceptance Criteria:**
- Usage stats shown in key list
- Shows: last used, usage count
- Visual indicator for inactive keys (>30 days)
- Success/error rate shown
- Typecheck passes

**Status:** false

### US-007: Implement Automatic Key Expiration
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want rotated keys to expire automatically so that old keys don't stay active.

**Acceptance Criteria:**
- Background job checks for expired keys
- Revokes keys where expires_at < NOW()
- Job runs hourly
- Typecheck passes

**Status:** false

### US-008: Add Rotation Warning
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want warning when rotating keys so that I understand the impact.

**Acceptance Criteria:**
- Warning modal on rotate
- Explains 24h grace period
- Shows which services use this key
- Confirm to proceed
- Typecheck passes

**Status:** false

### US-009: Rotate Button in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a rotate button in the UI so that I can easily rotate keys.

**Acceptance Criteria:**
- Rotate button for each key in list
- Rotate button in key detail view
- Shows confirmation modal
- Typecheck passes

**Status:** false

### US-010: Revoke Button in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a revoke button in the UI so that I can immediately invalidate keys.

**Acceptance Criteria:**
- Revoke button for each key in list
- Revoke button in key detail view
- Shows confirmation modal with warning
- Typecheck passes

**Status:** false
