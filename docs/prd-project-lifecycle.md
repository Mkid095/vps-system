---
project: Project Lifecycle Management
branch: flow/project-lifecycle
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Project Lifecycle Management

## Overview
Project states: CREATED → ACTIVE → SUSPENDED → ARCHIVED → DELETED. Each state has defined behaviors. Keys work only in ACTIVE. Services disabled in SUSPENDED/ARCHIVED. Clear status indicators.

## Technical Approach
Add status column to projects table with enum: created, active, suspended, archived, deleted. Define state behaviors. Implement status change API. Add status badge in UI.

## User Stories

### US-001: Add Project Status Column
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a status column on projects so that I can track project lifecycle.

**Acceptance Criteria:**
- projects table updated with status column
- Status enum: created, active, suspended, archived, deleted
- Default value: created
- Migration script created
- Existing projects set to active
- Typecheck passes

**Status:** false

### US-002: Define State Behaviors
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want behaviors defined per state so that the system responds correctly to project status.

**Acceptance Criteria:**
- CREATED: Keys work, services active, data access full
- ACTIVE: Keys work, services active, data access full
- SUSPENDED: Keys don't work, services disabled, data read-only
- ARCHIVED: Keys don't work, services disabled, data read-only
- DELETED: Keys don't work, services disabled, data deleted (after grace)
- Documented in code
- Typecheck passes

**Status:** false

### US-003: Implement Activate Project
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to activate my project so that I can start using services.

**Acceptance Criteria:**
- POST /api/projects/:id/activate endpoint
- Sets status to ACTIVE
- Enables all services
- Sends confirmation email
- Returns updated project
- Typecheck passes

**Status:** false

### US-004: Implement Suspend Project
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to suspend projects so that I can enforce limits or respond to abuse.

**Acceptance Criteria:**
- POST /api/projects/:id/suspend endpoint
- Sets status to SUSPENDED
- Reason parameter required
- Disables services
- Keys return PROJECT_SUSPENDED error
- Notification sent to owner
- Typecheck passes

**Status:** false

### US-005: Implement Archive Project
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to archive inactive projects so that I don't pay for unused resources.

**Acceptance Criteria:**
- POST /api/projects/:id/archive endpoint
- Sets status to ARCHIVED
- Disables services
- Keys stop working
- Data remains readable
- Typecheck passes

**Status:** false

### US-006: Implement Status Change API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to change project status via API so that I can automate lifecycle management.

**Acceptance Criteria:**
- PUT /api/projects/:id/status endpoint
- Request: new_status, reason
- Validates state transitions
- Logs status change to audit
- Returns updated project
- Typecheck passes

**Status:** false

### US-007: Enforce Status Checks at Gateway
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the gateway to check project status so that suspended projects can't make requests.

**Acceptance Criteria:**
- Gateway checks project status on each request
- SUSPENDED returns PROJECT_SUSPENDED error
- ARCHIVED returns PROJECT_ARCHIVED error
- DELETED returns PROJECT_DELETED error
- Keys don't work for non-active states
- Typecheck passes

**Status:** false

### US-008: Create Status Badge UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see project status in the UI so that I know the current state.

**Acceptance Criteria:**
- Status badge on project detail page
- Status badge in project list
- Color-coded: Active (green), Suspended (red), Archived (yellow), Created (blue)
- Status explanation on hover
- Typecheck passes

**Status:** false

### US-009: Show Status Change History
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see status change history so that I understand why my project was suspended.

**Acceptance Criteria:**
- Status history section in project settings
- Shows previous status, new status, reason, timestamp
- Links to audit log entries
- Explains how to resolve suspension
- Typecheck passes

**Status:** false

### US-010: Implement Auto-Status Transitions
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want automatic status transitions so that projects move through lifecycle without manual intervention.

**Acceptance Criteria:**
- CREATED → ACTIVE after provisioning completes
- ACTIVE → SUSPENDED when hard cap exceeded
- SUSPENDED → ACTIVE after quota reset (if manual suspension)
- Background job handles transitions
- Typecheck passes

**Status:** false
