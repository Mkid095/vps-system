---
project: Migration Strategy
branch: flow/migration-strategy
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Migration Strategy

## Overview
Migrations will happen. You need rollback capability and version tracking. Breaking changes should be marked explicitly. A solid migration strategy prevents deployment disasters and enables safe schema evolution.

## Technical Approach
Create schema_migrations table with versioning, description, applied_at, rollback_sql, and breaking flag. Create migration runner script that applies migrations in order and tracks which have been applied. Support rollback to previous version using rollback_sql.

## User Stories

### US-001: Create Schema Migrations Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a schema_migrations table so that I can track which database migrations have been applied.

**Acceptance Criteria:**
- schema_migrations table created in control_plane schema
- Columns: version (VARCHAR(50) PRIMARY KEY), description (TEXT), applied_at (TIMESTAMPTZ DEFAULT NOW()), rollback_sql (TEXT), breaking (BOOLEAN DEFAULT FALSE)
- Index on applied_at for sorting
- Migration script created to create this table first

**Status:** false

### US-002: Create Migration Runner Script
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a migration runner script so that I can apply database migrations programmatically.

**Acceptance Criteria:**
- Migration runner created at src/lib/migrations.ts
- runMigrations() function applies pending migrations
- Migrations in /migrations directory
- Migrations numbered: 001_initial.sql, 002_add_columns.sql, etc.
- Checks schema_migrations table before running
- Records each migration in schema_migrations
- Transaction per migration (rollback on failure)
- Typecheck passes

**Status:** false

### US-003: Implement Rollback Support
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want rollback support so that I can revert bad migrations.

**Acceptance Criteria:**
- rollbackMigration(version) function
- Executes rollback_sql from schema_migrations
- Removes migration record from schema_migrations
- Verifies rollback succeeded
- Typecheck passes

**Status:** false

### US-004: Implement Breaking Change Tracking
**Priority:** 2
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want to mark breaking changes so that I know which migrations require special attention.

**Acceptance Criteria:**
- breaking column in schema_migrations
- Set to TRUE for breaking changes
- Migration runner warns before applying breaking migrations
- Requires confirmation for breaking migrations in production
- Typecheck passes

**Status:** false

### US-005: Create Migration Status Command
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to see migration status so that I know which migrations have been applied.

**Acceptance Criteria:**
- migrationStatus() function
- Lists all migrations
- Shows status: applied, pending
- Shows applied_at for applied migrations
- Shows breaking flag
- Typecheck passes

**Status:** false

### US-006: Create Migrations Directory Structure
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want a standard migrations directory so that migrations are organized and discoverable.

**Acceptance Criteria:**
- /migrations directory created
- Naming convention: NNN_description.sql
- README in directory explaining conventions
- Each migration file includes: up SQL, rollback SQL, breaking flag, description
- Template migration file provided

**Status:** false

### US-007: Test Migrations on Staging
**Priority:** 2
**Maven Steps:** [3]
**MCP Tools:** []

As a platform engineer, I want to test migrations on staging before production so that I catch issues early.

**Acceptance Criteria:**
- Process documented for testing migrations
- Migration runner supports --dry-run flag
- Dry-run shows what would be applied
- Staging environment available
- Typecheck passes

**Status:** false

### US-008: Add Migration Locking
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want migration locking so that concurrent migrations don't cause conflicts.

**Acceptance Criteria:**
- Migration lock table created
- Runner acquires lock before running
- Waits if lock held by another process
- Releases lock after migration completes
- Typecheck passes

**Status:** false
