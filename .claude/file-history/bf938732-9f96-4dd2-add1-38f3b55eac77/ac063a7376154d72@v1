---
project: SQL Editor
branch: flow/sql-editor
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# SQL Editor

## Overview
Run queries from UI. Monaco-based SQL editor. Run query button. Results table below. Query history. Transaction mode (read-only default). Developers can execute SQL directly from Studio.

## Technical Approach
Monaco editor for SQL editing. Execute API runs query and returns results. Results displayed in table. Query history stored locally. Read-only mode by default with warning for writes. RBAC enforced for writes.

## User Stories

### US-001: Create SQL Editor Component
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a SQL editor in Studio so that I can run queries without leaving the browser.

**Acceptance Criteria:**
- Monaco editor component created
- SQL syntax highlighting
- Line numbers
- Auto-indentation
- Query shortcut (Ctrl+Enter)
- Typecheck passes

**Status:** false

### US-002: Create Execute Query API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to execute SQL queries via API so that the SQL editor can run queries.

**Acceptance Criteria:**
- POST /api/studio/:projectId/query endpoint
- Request: query, readonly (boolean)
- Validates query (prevent destructive in readonly mode)
- Executes query on tenant_{slug} schema
- Returns results as JSON
- Typecheck passes

**Status:** false

### US-003: Create Results Table Component
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want results displayed in a table so that I can read query output.

**Acceptance Criteria:**
- Results table component created
- Columns from query results
- Rows from query results
- Pagination for large result sets
- Export to CSV button
- Typecheck passes

**Status:** false

### US-004: Implement Query History
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want query history so that I can revisit previous queries.

**Acceptance Criteria:**
- Query history stored in localStorage
- Last 50 queries saved
- History panel shows previous queries
- Click to load query into editor
- Clear history button
- Typecheck passes

**Status:** false

### US-005: Implement Read-Only Mode
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want read-only mode by default so that I don't accidentally modify data.

**Acceptance Criteria:**
- Read-only checkbox in editor
- Checked by default
- Prevents: INSERT, UPDATE, DELETE, DROP, etc.
- Shows warning if trying to execute write in read-only
- Must uncheck to run writes
- Typecheck passes

**Status:** false

### US-006: Enforce RBAC for Writes
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want RBAC enforced so that viewers can't execute writes.

**Acceptance Criteria:**
- Query API checks user permissions
- Viewers can only SELECT
- Developers and above can write
- Returns PERMISSION_DENIED for unauthorized writes
- Typecheck passes

**Status:** false

### US-007: Add Query Timeout
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want query timeout so that long-running queries don't hang the system.

**Acceptance Criteria:**
- Query timeout: 30 seconds
- Timeout enforced at API level
- Returns error with timeout message
- Configurable per project
- Typecheck passes

**Status:** false

### US-008: Show Query Stats
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want query statistics so that I can understand query performance.

**Acceptance Criteria:**
- Shows: execution time
- Shows: rows returned
- Shows: rows affected (for writes)
- Shows: query plan (optional)
- Typecheck passes

**Status:** false

### US-009: Format SQL
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want SQL formatting so that my queries are readable.

**Acceptance Criteria:**
- Format SQL button
- Uses SQL formatter library
- Formats query in editor
- Shortcut: Ctrl+Shift+F
- Typecheck passes

**Status:** false

### US-010: Save Queries
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to save queries so that I can reuse them later.

**Acceptance Criteria:**
- Save query button
- Prompts for query name
- Saves to localStorage (or server)
- Saved queries panel
- Click to load saved query
- Typecheck passes

**Status:** false
