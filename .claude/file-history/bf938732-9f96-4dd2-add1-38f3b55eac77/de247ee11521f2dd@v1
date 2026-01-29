---
project: Quotas vs Limits
branch: flow/quotas-limits
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Quotas vs Limits

## Overview
Clear distinction between monthly allowances (business logic) and hard caps (abuse prevention). Quotas = "you've used 80% of your monthly database quota." Hard caps = "project temporarily suspended due to excessive usage." Rate limits = "too many requests, slow down."

## Technical Approach
Create quotas table for monthly limits and usage_snapshots table for metrics tracking. Implement quota checking API with warning system (80%, 90%, 100%). Auto-suspend on hard cap exceeded. Clear UX messaging for each scenario.

## User Stories

### US-001: Create Quotas Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a quotas table so that I can define monthly resource allowances per project.

**Acceptance Criteria:**
- quotas table created in control_plane schema
- Columns: project_id, service, monthly_limit, hard_cap, reset_at
- Composite primary key on (project_id, service)
- Services: db_queries, storage_mb, realtime_connections, function_invocations, auth_users
- Index on project_id for efficient queries
- Migration script created and tested

**Status:** false

### US-002: Create Usage Snapshots Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a usage_snapshots table so that I can track actual resource consumption.

**Acceptance Criteria:**
- usage_snapshots table created in control_plane schema
- Columns: project_id, service, metric_type, amount, recorded_at
- Index on (project_id, service, recorded_at) for efficient aggregation
- metric_type: db_query, storage_upload, realtime_message, function_call, auth_signup
- Migration script created and tested

**Status:** false

### US-003: Create Quota Checking API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a data plane service, I want to check if an operation is within quota so that I can enforce limits.

**Acceptance Criteria:**
- POST /api/usage/check endpoint created
- Request body: project_id, service, amount
- Returns: allowed (boolean), usage_percentage, reset_at
- Returns 429 if over rate limit
- Returns 403 if over hard cap
- Typecheck passes

**Status:** false

### US-004: Implement Usage Tracking
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a data plane service, I want to track usage so that quotas are enforced accurately.

**Acceptance Criteria:**
- POST /api/usage/track endpoint created
- Request body: project_id, service, metric_type, amount
- Records usage in usage_snapshots table
- Idempotent (deduplicates based on request_id)
- Typecheck passes

**Status:** false

### US-005: Implement Quota Warnings
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to receive warnings when approaching quota limits so that I can plan accordingly.

**Acceptance Criteria:**
- Warning sent at 80% of quota
- Warning sent at 90% of quota
- Notification sent via email
- Warning also shown in dashboard
- Warning message clear and actionable
- Typecheck passes

**Status:** false

### US-006: Implement Auto-Suspend on Hard Cap
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want projects to be automatically suspended when hard cap is exceeded so that abuse is prevented.

**Acceptance Criteria:**
- Background job checks for hard cap violations
- Project status set to SUSPENDED
- Notification sent to project owner
- All API requests return 403 while suspended
- Reason included in error response
- Typecheck passes

**Status:** false

### US-007: Create Usage Dashboard
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see my current usage so that I can understand my resource consumption.

**Acceptance Criteria:**
- Usage dashboard page created
- Shows current usage per service
- Shows percentage of quota used
- Shows reset date for quotas
- Visual indicators (progress bars)
- Historical usage chart
- Typecheck passes

**Status:** false

### US-008: Implement Quota Reset
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want quotas to reset monthly so that developers get a fresh allowance each period.

**Acceptance Criteria:**
- Quota reset_at column set to next month
- Background job resets quotas monthly
- Usage snapshots older than reset period archived
- Notifications sent when quota resets
- Typecheck passes

**Status:** false

### US-009: Define Clear Error Messages
**Priority:** 2
**Maven Steps:** [1, 5, 10]
**MCP Tools:** []

As a developer, I want clear error messages so that I understand the difference between quota exceeded, rate limited, and hard cap.

**Acceptance Criteria:**
- Quota exceeded: "You've used 80% of your monthly database quota"
- Rate limited: "Too many requests. Slow down."
- Hard cap: "Project temporarily suspended due to excessive usage"
- Messages include actionable guidance
- Messages include reset information
- Typecheck passes

**Status:** false
