---
project: Enhanced API Key System
branch: flow/enhanced-api-keys
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Enhanced API Key System

## Overview
Key types, scopes, environments. Public keys for browser/mobile SDK. Secret keys for server-side. Service role keys for admin tasks. MCP tokens for AI tools. Scopes enforce what each key can do.

## Technical Approach
Enhanced api_keys table with key_type, scopes (JSONB), environment columns. Key types: public, secret, service_role, mcp. Scopes per service: db, storage, auth, realtime, graphql. Environment selector. Usage stats per key. Key creation UI with type selection.

## User Stories

### US-001: Add Key Type and Scopes to API Keys Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want enhanced API key tracking so that I can enforce granular permissions.

**Acceptance Criteria:**
- api_keys table updated with: key_type, scopes (JSONB), environment
- key_type enum: public, secret, service_role, mcp
- Migration script created
- Existing keys migrated to appropriate types
- Typecheck passes

**Status:** false

### US-002: Define Key Type Prefixes
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a developer, I want to identify key types by prefix so that I know how to use each key.

**Acceptance Criteria:**
- Public keys: pk_live_, pk_test_, pk_dev_
- Secret keys: sk_live_, sk_test_, sk_dev_
- Service role: sr_live_, sr_test_, sr_dev_
- MCP tokens: mcp_ro_, mcp_rw_, mcp_admin_
- Prefix set based on key_type and environment
- Typecheck passes

**Status:** false

### US-003: Define Scope Per Service
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want scopes defined per service so that I can enforce service-level permissions.

**Acceptance Criteria:**
- db scopes: select, insert, update, delete
- storage scopes: read, write
- auth scopes: signin, signup, manage
- realtime scopes: subscribe, publish
- graphql scopes: execute
- Scopes stored as JSONB array
- Typecheck passes

**Status:** false

### US-004: Implement Create Key with Type
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to select key type when creating so that I get the right key for my use case.

**Acceptance Criteria:**
- POST /api/keys accepts key_type parameter
- Key type validated
- Default scopes set based on key_type
- Key prefix set based on key_type and environment
- Returns key (show once)
- Typecheck passes

**Status:** false

### US-005: Implement Public Key Creation
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want public keys for client-side apps so that I can safely use NextMavens in browsers.

**Acceptance Criteria:**
- Public key has read-only scopes
- Can be exposed in browser code
- Limited to: db:select, storage:read, auth:signin, realtime:subscribe
- Warning shown about client-side exposure
- Typecheck passes

**Status:** false

### US-006: Implement Secret Key Creation
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want secret keys for server-side apps so that I can perform full CRUD operations.

**Acceptance Criteria:**
- Secret key has full scopes
- Must not be exposed in client code
- Includes: db:select/insert/update/delete, storage:read/write, auth:manage, graphql:execute
- Warning shown about server-side only
- Typecheck passes

**Status:** false

### US-007: Implement Service Role Key Creation
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want service role keys for admin tasks so that I can bypass RLS and perform management operations.

**Acceptance Criteria:**
- Service role key has all scopes
- Bypasses row-level security
- Used for server-side admin operations
- Extra warning about bypassing RLS
- Typecheck passes

**Status:** false

### US-008: Add Environment Selector
**Priority:** 2
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to select environment when creating keys so that I can have separate keys for dev/staging/prod.

**Acceptance Criteria:**
- Environment dropdown in key creation form
- Options: Production, Development, Staging
- Key prefix includes environment
- Key only works for matching project environment
- Typecheck passes

**Status:** false

### US-009: Track Key Usage
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see key usage stats so that I know which keys are being used.

**Acceptance Criteria:**
- last_used column updated on each use
- usage_stats table tracks request count
- Request count per key (7 day, 30 day)
- Success vs error rate
- Typecheck passes

**Status:** false

### US-010: Create Key Type Documentation
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want documentation explaining when to use each key type so that I choose correctly.

**Acceptance Criteria:**
- Key types documentation page created
- Explains each key type
- Shows use cases for each type
- Shows which scopes each type has
- Shows example usage code
- Typecheck passes

**Status:** false

### US-011: Create Enhanced Key Creation UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want an improved key creation UI so that I can easily create the right type of key.

**Acceptance Criteria:**
- Key type selector (cards with descriptions)
- Environment selector
- Scope checkboxes (pre-populated based on type)
- Warning for service role keys
- Usage examples shown after creation
- Typecheck passes

**Status:** false

### US-012: Enforce Scopes at Gateway
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want scopes enforced at the gateway so that keys can't exceed their permissions.

**Acceptance Criteria:**
- Gateway checks key scopes before forwarding
- Scopes checked per service
- Returns PERMISSION_DENIED if scope missing
- Scope required logged
- Typecheck passes

**Status:** false
