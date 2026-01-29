---
project: Break Glass Mode
branch: flow/break-glass
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Break Glass Mode

## Overview
Stuff will break: keys locked, projects misconfigured, data plane unreachable. You need emergency access path. Break glass mode provides super-admin powers for emergency situations with aggressive audit logging.

## Technical Approach
Create admin_sessions and admin_actions tables with reason tracking. Require separate auth (TOTP or hardware key). Enable powers: unlock project, override suspension, force delete, regenerate system keys. Time-limited sessions (1 hour max). Log all actions with before/after states.

## User Stories

### US-001: Create Admin Sessions Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an admin_sessions table so that I can track break glass access.

**Acceptance Criteria:**
- admin_sessions table created in control_plane schema
- Columns: id, admin_id, reason, access_method, granted_by, expires_at, created_at
- access_method enum: hardware_key, otp, emergency_code
- Session must be referenced by admin_actions
- Migration script created and tested

**Status:** false

### US-002: Create Admin Actions Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an admin_actions table so that I can track all break glass actions with full context.

**Acceptance Criteria:**
- admin_actions table created in control_plane schema
- Columns: id, session_id, action, target_type, target_id, before_state (JSONB), after_state (JSONB), created_at
- References admin_sessions
- Before/after states capture full system state
- Migration script created and tested

**Status:** false

### US-003: Implement Break Glass Authentication
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want separate break glass authentication so that emergency access requires explicit approval.

**Acceptance Criteria:**
- Break glass auth at /api/admin/break-glass
- Requires TOTP code or hardware key
- Requires reason for access
- Creates admin_sessions record
- Session expires after 1 hour
- Returns temporary break glass token
- Typecheck passes

**Status:** false

### US-004: Implement Unlock Project Power
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to unlock suspended projects so that I can recover from false positive suspensions.

**Acceptance Criteria:**
- POST /api/admin/projects/:id/unlock endpoint
- Requires break glass token
- Sets project status to ACTIVE regardless of suspension reason
- Logs action with before/after states
- Returns unlocked project
- Typecheck passes

**Status:** false

### US-005: Implement Override Suspension Power
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to override auto-suspension so that legitimate high-usage projects aren't blocked.

**Acceptance Criteria:**
- POST /api/admin/projects/:id/override-suspension endpoint
- Requires break glass token
- Clears suspension flags
- Increases hard caps if needed
- Logs action with before/after states
- Typecheck passes

**Status:** false

### US-006: Implement Force Delete Power
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to force delete projects immediately so that I can handle emergency situations.

**Acceptance Criteria:**
- DELETE /api/admin/projects/:id/force endpoint
- Requires break glass token
- Deletes project immediately (no grace period)
- Cleans up all resources
- Logs action with before/after states
- Typecheck passes

**Status:** false

### US-007: Implement Regenerate System Keys Power
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to regenerate system keys so that I can recover from key compromise.

**Acceptance Criteria:**
- POST /api/admin/projects/:id/regenerate-keys endpoint
- Requires break glass token
- Invalidates all existing keys
- Generates new service_role keys
- Logs action with before/after states
- Returns new keys (show once)
- Typecheck passes

**Status:** false

### US-008: Implement Access Any Project Power
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to access any project so that I can investigate issues.

**Acceptance Criteria:**
- GET /api/admin/projects/:id endpoint
- Requires break glass token
- Returns full project details
- Bypasses normal ownership checks
- Logs access
- Typecheck passes

**Status:** false

### US-009: Create Break Glass UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a platform operator, I want a break glass UI so that I can initiate emergency access.

**Acceptance Criteria:**
- Break glass page at /admin/break-glass
- Requires 2FA/TOTP
- Prompts for reason
- Shows session expiration countdown
- Lists available powers
- Each power shows warning before execution
- Typecheck passes

**Status:** false

### US-010: Implement Session Expiration
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want break glass sessions to expire after 1 hour so that emergency access is time-limited.

**Acceptance Criteria:**
- Sessions expire after 1 hour
- Expired sessions rejected
- Session expiration checked on every request
- Warning shown 5 minutes before expiration
- Typecheck passes

**Status:** false

### US-011: Implement Aggressive Audit Logging
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want all break glass actions aggressively logged so that emergency access is fully auditable.

**Acceptance Criteria:**
- Every action logged to admin_actions
- Before/after states captured
- Linked to admin_sessions
- Include admin_id, session_id, action, target
- Logged to standard audit_logs too
- Typecheck passes

**Status:** false

### US-012: Add Break Glass Notifications
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform owner, I want to be notified when break glass is used so that I'm aware of emergency access.

**Acceptance Criteria:**
- Email sent when break glass session created
- Includes admin, reason, expiration
- Email sent for each action taken
- Includes action, target, before/after states
- Typecheck passes

**Status:** false
