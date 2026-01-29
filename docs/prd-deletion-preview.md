---
project: Deletion with Preview
branch: flow/deletion-preview
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Deletion with Preview

## Overview
Deletion is the hardest feature. Users need to understand: what will be deleted? What depends on what? Is this recoverable? Soft delete with preview builds trust by showing exactly what will happen before it happens.

## Technical Approach
Add deleted_at, deletion_scheduled_at, grace_period_ends_at columns to projects. Create deletion preview API that calculates dependencies: schemas, api_keys, webhooks, edge_functions, storage_buckets, secrets. Implement 30-day grace period before hard delete. Add restore capability.

## User Stories

### US-001: Add Deletion Columns to Projects
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want deletion tracking columns so that I can implement soft delete.

**Acceptance Criteria:**
- Projects table updated with: deleted_at, deletion_scheduled_at, grace_period_ends_at
- All nullable TIMESTAMPTZ columns
- Migration script created
- Existing projects have NULL values
- Typecheck passes

**Status:** false

### US-002: Create Deletion Preview API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to preview what will be deleted so that I understand the impact before confirming.

**Acceptance Criteria:**
- GET /api/projects/:id/deletion-preview endpoint
- Returns project details
- Returns will_be_deleted counts: schemas, tables, api_keys, webhooks, edge_functions, storage_buckets, secrets
- Returns dependencies array: type, target, impact
- Returns recoverable_until date
- Typecheck passes

**Status:** false

### US-003: Calculate Schema Dependencies
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to know how many database schemas will be deleted so that I understand data impact.

**Acceptance Criteria:**
- Deletion preview queries information_schema
- Counts tables in tenant_{slug} schema
- Counts rows per table
- Includes in will_be_deleted
- Typecheck passes

**Status:** false

### US-004: Calculate API Key Dependencies
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to know how many API keys will be deleted so that I understand credential impact.

**Acceptance Criteria:**
- Deletion preview queries api_keys table
- Counts keys for project
- Groups by key_type
- Includes in will_be_deleted
- Typecheck passes

**Status:** false

### US-005: Calculate Webhook Dependencies
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to know which webhooks will be deleted so that I understand integration impact.

**Acceptance Criteria:**
- Deletion preview queries webhooks table
- Lists all webhook URLs
- Adds to dependencies: "webhook", "url", "Will stop receiving events"
- Typecheck passes

**Status:** false

### US-006: Calculate Storage Dependencies
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to know which storage buckets will be deleted so that I understand file impact.

**Acceptance Criteria:**
- Deletion preview queries storage_buckets table
- Lists all buckets
- Counts files per bucket
- Adds to dependencies: "storage", "bucket", "Files will be deleted"
- Typecheck passes

**Status:** false

### US-007: Implement Soft Delete
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want deletion to be soft initially so that I have time to recover if needed.

**Acceptance Criteria:**
- DELETE /api/projects/:id sets deletion_scheduled_at = NOW()
- Sets grace_period_ends_at = NOW() + 30 days
- Sets project status = DELETED
- Returns recoverable_until date
- Typecheck passes

**Status:** false

### US-008: Implement 30-Day Grace Period
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want projects to be retained for 30 days so that users can recover from accidental deletion.

**Acceptance Criteria:**
- Grace period set to 30 days
- Background job checks for expired grace periods
- Hard delete after grace period ends
- Notification sent 7 days before hard delete
- Typecheck passes

**Status:** false

### US-009: Implement Restore During Grace Period
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to restore deleted projects during grace period so that I can recover from accidental deletion.

**Acceptance Criteria:**
- POST /api/projects/:id/restore endpoint
- Clears deletion columns
- Sets status back to ACTIVE
- Works only if grace_period_ends_at > NOW()
- Typecheck passes

**Status:** false

### US-010: Create Deletion Preview UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see deletion preview in the UI so that I can understand impact before deleting.

**Acceptance Criteria:**
- Deletion preview modal created
- Shows what will be deleted (counts)
- Shows dependencies and their impact
- Shows recoverable_until date
- Shows clear warning
- Confirm delete button
- Typecheck passes

**Status:** false

### US-011: Implement Hard Delete After Grace Period
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want projects hard deleted after grace period so that resources are freed up.

**Acceptance Criteria:**
- Background job runs daily
- Finds projects where grace_period_ends_at < NOW()
- Drops tenant schema
- Deletes all related records
- Deletes project row
- Typecheck passes

**Status:** false

### US-012: Show Deleted Projects in List
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see deleted projects in a separate list so that I can restore them if needed.

**Acceptance Criteria:**
- Deleted projects section in dashboard
- Shows project name, deleted_at, recoverable_until
- Restore button for each
- Filter for active vs deleted
- Typecheck passes
