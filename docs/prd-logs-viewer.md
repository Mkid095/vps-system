---
project: Real-time Logs Viewer
branch: flow/logs-viewer
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Real-time Logs Viewer

## Overview
Streaming logs with filtering. Logs page in project dashboard. Real-time log stream. Filter by service (db, auth, realtime, storage) and level (info, warn, error). Search functionality. Download logs.

## Technical Approach
Logs stored in project_logs table. WebSocket endpoint streams new logs. UI connects to WebSocket for real-time updates. Filter and search server-side. Download endpoint exports logs.

## User Stories

### US-001: Create Logs Page
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a logs page so that I can view project logs.

**Acceptance Criteria:**
- Logs page created at /dashboard/projects/[slug]/logs
- Shows log stream
- Filter controls
- Search box
- Download button
- Typecheck passes

**Status:** false

### US-002: Create Logs WebSocket Endpoint
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want real-time log streaming so that I can see logs as they happen.

**Acceptance Criteria:**
- WebSocket endpoint at /api/logs/stream
- Accepts project_id parameter
- Streams new logs as they arrive
- Sends log entries as JSON
- Authenticates via token
- Typecheck passes

### US-003: Implement Log Filtering
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to filter logs so that I can find relevant entries.

**Acceptance Criteria:**
- Filter by service: db, auth, realtime, storage, graphql
- Filter by level: info, warn, error
- Filter by date range
- Filters update query
- Results update in real-time
- Typecheck passes

**Status:** false

### US-004: Implement Log Search
**Priority:** 2
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to search logs so that I can find specific entries.

**Acceptance Criteria:**
- Search box in logs page
- Full-text search across message and metadata
- Search results highlighted
- Typecheck passes

**Status:** false

### US-005: Implement Log Pagination
**Priority:** 2
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want paginated logs so that I can browse large log volumes.

**Acceptance Criteria:**
- Logs loaded in pages (100 per page)
- Load more button
- Auto-loads older logs when scrolling
- Shows log count
- Typecheck passes

**Status:** false

### US-006: Implement Log Download
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to download logs so that I can analyze them externally.

**Acceptance Criteria:**
- Download logs button
- Exports to JSON or text
- Respects current filters
- Date range limited to 7 days max
- Typecheck passes

**Status:** false

### US-007: Color Code Log Levels
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want color-coded log levels so that I can quickly identify issues.

**Acceptance Criteria:**
- Info: gray
- Warn: yellow
- Error: red
- Background color applied to log entry
- Typecheck passes

**Status:** false

### US-008: Show Log Details
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see log details so that I can understand log entries.

**Acceptance Criteria:**
- Expandable log entries
- Shows: timestamp, service, level, message
- Shows metadata (JSON formatted)
- Shows request_id for tracing
- Typecheck passes

**Status:** false

### US-009: Implement Log Retention
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want log retention so that logs don't grow indefinitely.

**Acceptance Criteria:**
- Logs retained for 30 days
- Background job deletes old logs
- Job runs daily
- Logs archived to long-term storage (optional)
- Typecheck passes

**Status:** false

### US-010: Add Log Charts
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want log charts so that I can visualize log trends.

**Acceptance Criteria:**
- Log volume chart over time
- Grouped by level
- Grouped by service
- Interactive chart
- Typecheck passes

**Status:** false
