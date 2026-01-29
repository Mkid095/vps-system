---
project: MCP & AI Access Governance
branch: flow/mcp-governance
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# MCP & AI Access Governance

## Overview
AI is powerful — and dangerous without guardrails. MCP tokens need governance: read-only by default, explicit opt-in for destructive actions, heavy audit logging. Scope documentation must be clear.

## Technical Approach
Define MCP token types: mcp_ro_ (read-only), mcp_rw_ (write), mcp_admin_ (admin). Default to read-only scopes: db:select, storage:read, realtime:subscribe. Write access requires explicit opt-in with warnings. Heavy audit logging for all MCP actions.

## User Stories

### US-001: Define MCP Token Types
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want MCP token types defined so that AI tools have appropriate default permissions.

**Acceptance Criteria:**
- MCP token types defined: mcp_ro_, mcp_rw_, mcp_admin_
- Prefix stored in api_keys.key_prefix
- Type column distinguishes MCP from other keys
- Documentation of each type
- Typecheck passes

**Status:** false

### US-002: Define MCP Default Scopes
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want MCP tokens to default to read-only so that AI tools have safe default behavior.

**Acceptance Criteria:**
- Default scopes defined for MCP tokens
- db: [select]
- storage: [read]
- auth: []
- realtime: [subscribe]
- graphql: []
- Scopes stored in api_keys.scopes
- Typecheck passes

### US-003: Implement MCP Read-Only Token
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create read-only MCP tokens so that AI assistants can read but not modify data.

**Acceptance Criteria:**
- Create API key with type=mcp, scope=mcp_ro_
- Key prefix: mcp_ro_
- Scopes limited to read operations
- Documented use cases: AI assistants, codegen
- Typecheck passes

**Status:** false

### US-004: Implement MCP Write Token
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create write-enabled MCP tokens so that trusted AI tools can modify data.

**Acceptance Criteria:**
- Create API key with type=mcp, scope=mcp_rw_
- Key prefix: mcp_rw_
- Additional scopes: db:insert, db:update, storage:write
- Requires explicit opt-in with warning
- Typecheck passes

**Status:** false

### US-005: Implement MCP Admin Token
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to create admin MCP tokens so that trusted AI ops tools have full access.

**Acceptance Criteria:**
- Create API key with type=mcp, scope=mcp_admin_
- Key prefix: mcp_admin_
- Full scopes: db:delete, secrets:read, etc.
- Requires extra confirmation
- Typecheck passes

**Status:** false

### US-006: Add Explicit Opt-In for Write Access
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want explicit warnings when granting write access so that I understand the risks.

**Acceptance Criteria:**
- Warning modal when creating write-enabled MCP token
- Warning text: "This AI can modify your data. Only grant to trusted systems."
- Checkbox to confirm understanding
- Confirmation required before creation
- Typecheck passes

**Status:** false

### US-007: Implement MCP Scope Enforcement
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want MCP scopes enforced at the gateway so that tokens can't exceed their permissions.

**Acceptance Criteria:**
- Gateway checks key type and scopes
- MCP tokens limited to their scopes
- Read-only tokens rejected for write operations
- Returns PERMISSION_DENIED with clear message
- Typecheck passes

**Status:** false

### US-008: Implement MCP Audit Logging
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all MCP actions heavily audited so that I can detect AI tool abuse.

**Acceptance Criteria:**
- All MCP requests logged to audit_logs
- actor_type = 'mcp_token'
- Full payload captured (for forensics)
- AI/IDE identified from user_agent
- Project_id captured
- Typecheck passes

**Status:** false

### US-009: Create MCP Documentation
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want clear MCP scope documentation so that I understand what each token type can do.

**Acceptance Criteria:**
- MCP documentation page created
- Explains each token type
- Shows scopes per type
- Shows use cases for each type
- Warns about write access risks
- Examples of when to use each type
- Typecheck passes

**Status:** false

### US-010: Add MCP Token Indicators in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see which API keys are MCP tokens so that I can manage them appropriately.

**Acceptance Criteria:**
- MCP tokens marked in keys list
- Badge showing type (read-only, write, admin)
- Different color for each type
- Warning icon for write/admin tokens
- Typecheck passes

**Status:** false

### US-011: Implement MCP Usage Analytics
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to see MCP token usage so that I can understand how AI tools are being used.

**Acceptance Criteria:**
- Track usage per MCP token
- Show request count
- Show operations performed
- Show success/error rate
- Exportable for analysis
- Typecheck passes

**Status:** false

### US-012: Disable Auth Access by Default
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want MCP tokens to have no auth access by default so that AI tools can't manage users.

**Acceptance Criteria:**
- Default MCP scopes exclude auth
- Auth scopes require explicit admin token
- User management blocked for read-only and write tokens
- Clear error if attempted
- Typecheck passes

**Status:** false
