---
project: Usage Tracking
branch: flow/usage-tracking
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Usage Tracking

## Overview
Collect metrics for billing and quotas. Track per service: db queries, rows read, rows written, realtime messages, connections, storage uploads/downloads, bytes transferred, auth signups/signins, function invocations. Aggregation API, usage dashboard.

## Technical Approach
Usage metrics table tracks each operation. Track per service and metric_type. Aggregation API sums usage by time period. Usage dashboard shows current consumption and quota percentage.

## User Stories

### US-001: Create Usage Metrics Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a usage_metrics table so that I can track resource consumption.

**Acceptance Criteria:**
- usage_metrics table created in control_plane schema
- Columns: id, project_id, service, metric_type, quantity, recorded_at
- Index on (project_id, service, recorded_at) for aggregation
- Metric types: db_query, db_row_read, db_row_written, realtime_message, realtime_connection, storage_upload, storage_download, storage_bytes, auth_signup, auth_signin, function_invocation
- Migration script created

**Status:** false

### US-002: Track Database Usage
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to track database usage so that I can enforce quotas.

**Acceptance Criteria:**
- API gateway logs db_query count
- Logs db_row_read count
- Logs db_row_written count
- Records to usage_metrics table
- Async to not block requests
- Typecheck passes

**Status:** false

### US-003: Track Realtime Usage
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to track realtime usage so that I can enforce connection limits.

**Acceptance Criteria:**
- Realtime service logs message count
- Logs connection count
- Records to usage_metrics table
- Connection count tracked per hour
- Typecheck passes

**Status:** false

### US-004: Track Storage Usage
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to track storage usage so that I can enforce storage quotas.

**Acceptance Criteria:**
- Storage service logs upload count
- Logs download count
- Logs bytes transferred
- Records to usage_metrics table
- Typecheck passes

**Status:** false

### US-005: Track Auth Usage
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to track auth usage so that I can understand user growth.

**Acceptance Criteria:**
- Auth service logs signup count
- Logs signin count
- Records to usage_metrics table
- Typecheck passes

**Status:** false

### US-006: Create Usage Aggregation API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to query aggregated usage so that I can see my consumption.

**Acceptance Criteria:**
- GET /api/usage/:projectId endpoint
- Query params: service, metric_type, start_date, end_date, aggregation (day/week/month)
- Returns aggregated usage
- Returns usage percentage vs quota
- Typecheck passes

**Status:** false

### US-007: Create Usage Dashboard
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a usage dashboard so that I can see my resource consumption.

**Acceptance Criteria:**
- Usage dashboard page created
- Shows current usage per service
- Shows percentage of quota used
- Shows reset date
- Visual indicators (progress bars, color coding)
- Historical usage chart
- Breakdown by metric type
- Typecheck passes

**Status:** false

### US-008: Export Usage Data
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to export usage data so that I can analyze consumption externally.

**Acceptance Criteria:**
- Export button on usage dashboard
- Exports to CSV
- Includes: date, service, metric_type, quantity
- Date range selector
- Typecheck passes

**Status:** false

### US-009: Implement Usage Sampling
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want usage sampling in production so that tracking overhead is minimal.

**Acceptance Criteria:**
- Sample rate configurable per environment
- Prod: 10% sampling
- Dev: 100% tracking
- Extrapolates from sample
- Typecheck passes

**Status:** false
