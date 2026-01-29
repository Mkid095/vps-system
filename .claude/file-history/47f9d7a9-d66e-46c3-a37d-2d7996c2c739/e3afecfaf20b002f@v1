---
project: Feature Flags (Kill Switches)
branch: flow/feature-flags
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Feature Flags (Kill Switches)

## Overview
Disable signups, pause provisioning, roll out features safely - every real platform has this. Feature flags provide operational control for rollouts and incident response, enabling gradual rollouts and instant kill switches.

## Technical Approach
Create feature_flags table with scope support (global, project, org). Implement checkFeature() helper with caching (60s TTL). Create admin UI for managing flags. Core flags: signups_enabled, provisioning_enabled, storage_enabled, realtime_enabled. Log all flag changes to audit log.

## User Stories

### US-001: Create Feature Flags Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a feature_flags table so that I can dynamically control platform features.

**Acceptance Criteria:**
- feature_flags table created in control_plane schema
- Columns: name (VARCHAR(100) PRIMARY KEY), enabled (BOOLEAN DEFAULT TRUE), scope (VARCHAR(20) DEFAULT 'global'), metadata (JSONB)
- Scope enum: global, project, org
- Migration script created and tested

**Status:** false

### US-002: Create Feature Flag Helper
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a checkFeature() helper so that I can easily check if a feature is enabled.

**Acceptance Criteria:**
- Helper created at src/lib/features.ts
- checkFeature(name, scope, scopeId) function
- Checks global flag first
- Checks scope-specific flag if provided
- Returns boolean
- Results cached with 60s TTL
- Typecheck passes

**Status:** false

### US-003: Implement Core Feature Flags
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform operator, I want core feature flags so that I can disable critical platform functions during incidents.

**Acceptance Criteria:**
- signups_enabled flag created (global, default: true)
- provisioning_enabled flag created (global, default: true)
- storage_enabled flag created (global, default: true)
- realtime_enabled flag created (global, default: true)
- Flags seeded in database
- Typecheck passes

**Status:** false

### US-004: Apply Signups Flag
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to disable new user signups so that I can control registration during incidents.

**Acceptance Criteria:**
- Registration endpoint checks signups_enabled flag
- Returns error message when disabled
- Error message explains signups are temporarily disabled
- Typecheck passes

**Status:** false

### US-005: Apply Provisioning Flag
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to pause project provisioning so that I can stop new project creation during incidents.

**Acceptance Criteria:**
- Project creation endpoint checks provisioning_enabled flag
- Returns error message when disabled
- Existing projects unaffected
- Typecheck passes

**Status:** false

### US-006: Apply Storage Flag
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to disable storage temporarily so that I can respond to storage-related incidents.

**Acceptance Criteria:**
- Storage service checks storage_enabled flag
- Uploads rejected when disabled
- Downloads still work (read-only mode)
- Typecheck passes

**Status:** false

### US-007: Apply Realtime Flag
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to disable realtime so that I can respond to realtime-related incidents.

**Acceptance Criteria:**
- Realtime service checks realtime_enabled flag
- New WebSocket connections rejected when disabled
- Existing connections allowed to close gracefully
- Typecheck passes

**Status:** false

### US-008: Create Admin Feature Flag UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a platform operator, I want an admin UI for managing feature flags so that I can toggle flags without database access.

**Acceptance Criteria:**
- Admin feature flags page created at /admin/feature-flags
- Lists all feature flags
- Toggle switch for each flag
- Shows current state (enabled/disabled)
- Shows scope (global/project/org)
- Requires admin role
- Typecheck passes

**Status:** false

### US-009: Implement Feature Flag Caching
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want feature flags cached so that flag checks don't hit the database on every request.

**Acceptance Criteria:**
- Flag values cached with 60s TTL
- Cache invalidated on flag change
- Cache key includes name and scope
- Falls back to DB if cache miss
- Typecheck passes

**Status:** false

### US-010: Audit Feature Flag Changes
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all feature flag changes logged so that I have an audit trail of feature toggles.

**Acceptance Criteria:**
- Flag changes logged to audit_logs
- Action: feature_flag.enabled or feature_flag.disabled
- Actor captured from authenticated user
- Metadata includes flag name, old value, new value
- Typecheck passes

**Status:** false

### US-011: Support Project-Level Flags
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to enable/disable features for specific projects so that I can gradually roll out features.

**Acceptance Criteria:**
- Flags can be set at project scope
- Project flags override global flags
- checkFeature() checks project flag first
- UI to manage project-specific flags
- Typecheck passes

**Status:** false
