---
project: Schema Browser
branch: flow/schema-browser
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Schema Browser

## Overview
Visual schema exploration. Tables list. Column details with types. Indexes viewer. Foreign keys display. Developers can understand database structure without writing queries.

## Technical Approach
Query information_schema for tables, columns, indexes, foreign keys. Display in tree structure. Click to expand details. Show column types, constraints, defaults. Filter and search.

## User Stories

### US-001: Create Schema Browser Component
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a schema browser in Studio so that I can explore my database structure.

**Acceptance Criteria:**
- Schema browser component created
- Tree structure for navigation
- Tables list
- Expandable columns
- Typecheck passes

**Status:** false

### US-002: Fetch Tables List
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see all tables so that I know what's in my database.

**Acceptance Criteria:**
- GET /api/studio/:projectId/tables endpoint
- Queries information_schema.tables
- Filters for tenant_{slug} schema
- Returns: table_name, created_at
- Typecheck passes

**Status:** false

### US-003: Fetch Column Details
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see column details so that I understand table structure.

**Acceptance Criteria:**
- GET /api/studio/:projectId/tables/:table/columns endpoint
- Queries information_schema.columns
- Returns: column_name, data_type, is_nullable, column_default
- Typecheck passes

**Status:** false

### US-004: Display Column Types
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want column types shown so that I know what data each column holds.

**Acceptance Criteria:**
- Column list in schema browser
- Shows: column name, type, nullable, default
- Color-coded for data types
- Typecheck passes

**Status:** false

### US-005: Fetch Indexes
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see indexes so that I understand query optimization.

**Acceptance Criteria:**
- GET /api/studio/:projectId/tables/:table/indexes endpoint
- Queries pg_indexes
- Returns: index_name, index_def, is_unique, is_primary
- Typecheck passes

**Status:** false

### US-006: Display Indexes
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want indexes displayed so that I can see what's indexed.

**Acceptance Criteria:**
- Indexes section in table detail
- Shows: index name, columns, unique, primary
- Icon for unique/primary
- Typecheck passes

**Status:** false

### US-007: Fetch Foreign Keys
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see foreign keys so that I understand relationships.

**Acceptance Criteria:**
- GET /api/studio/:projectId/tables/:table/foreign-keys endpoint
- Queries information_schema.table_constraints
- Queries information_schema.key_column_usage
- Returns: constraint_name, column_name, foreign_table, foreign_column
- Typecheck passes

**Status:** false

### US-008: Display Foreign Keys
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want foreign keys displayed so that I can see table relationships.

**Acceptance Criteria:**
- Foreign keys section in table detail
- Shows: column, references table.column
- Visual line connecting related tables
- Typecheck passes

**Status:** false

### US-009: Search Tables
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to search tables so that I can find specific tables quickly.

**Acceptance Criteria:**
- Search box in schema browser
- Filters tables by name
- Real-time search
- Typecheck passes

**Status:** false

### US-010: Show Row Count
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to see row counts so that I know table sizes.

**Acceptance Criteria:**
- COUNT(*) query for each table
- Displayed next to table name
- Async to not block UI
- Typecheck passes

**Status:** false

### US-011: Visual Schema Diagram
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a visual schema diagram so that I can see relationships visually.

**Acceptance Criteria:**
- Canvas-based schema diagram
- Tables as boxes
- Foreign keys as lines
- Draggable boxes
- Zoom/pan
- Typecheck passes

**Status:** false
