---
project: Backup Strategy
branch: flow/backup-strategy
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Backup Strategy

## Overview
Telegram integration for backups. Manual export API generates SQL dump. Send to Telegram backup. Backup history UI. Restore from backup. Database backups: Coming soon. Storage backups: Handled via Telegram (automatic, files >2GB).

## Technical Approach
Manual export endpoint generates SQL dump using pg_dump. Sends to Telegram via existing bot. Backup history tracks all backups. Restore endpoint fetches from Telegram and restores. Transparent about what's backed up.

## User Stories

### US-001: Create Manual Export API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to export my database so that I can create backups.

**Acceptance Criteria:**
- POST /api/backup/export endpoint
- Generates SQL dump using pg_dump
- Dumps tenant_{slug} schema only
- Returns download URL or file
- Async for large databases
- Typecheck passes

**Status:** false

### US-002: Send Backup to Telegram
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want backups sent to Telegram so that I have long-term storage.

**Acceptance Criteria:**
- Integration with Telegram backup bot
- Sends SQL dump to Telegram
- Generates unique filename
- Returns Telegram file ID
- Typecheck passes

**Status:** false

### US-003: Create Backup History Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want backup history tracked so that I can see all backups.

**Acceptance Criteria:**
- backups table created in control_plane schema
- Columns: id, project_id, type, file_id, size, created_at, expires_at
- Type enum: database, storage, logs
- Index on project_id and created_at
- Migration script created

**Status:** false

### US-004: Record Backup in History
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want backups recorded so that I have an audit trail.

**Acceptance Criteria:**
- Backup recorded after export
- Includes: project_id, type, file_id, size
- Expiration set (30 days)
- Typecheck passes

**Status:** false

### US-005: Create Backup UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a backup UI so that I can manage backups easily.

**Acceptance Criteria:**
- Backup settings page created
- Shows backup history
- Export database button
- Export logs button
- Send to Telegram button
- Backup size and date shown
- Typecheck passes

**Status:** false

### US-006: Implement Restore from Backup
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to restore from backup so that I can recover from data loss.

**Acceptance Criteria:**
- POST /api/backup/restore endpoint
- Takes backup_id or file_id
- Fetches from Telegram
- Restores SQL dump to database
- Warning about data overwrite
- Async for large backups
- Typecheck passes

**Status:** false

### US-007: Document Backup Strategy
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want clear documentation about backups so that I understand what's covered.

**Acceptance Criteria:**
- Backup documentation page created
- Explains: Database backups (manual export)
- Explains: Storage backups (Telegram automatic for files >2GB)
- Explains: Logs (archived via Telegram)
- Shows how to restore
- Shows retention policy
- Typecheck passes

**Status:** false

### US-008: Export Logs
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to export logs so that I can archive them externally.

**Acceptance Criteria:**
- POST /api/backup/export-logs endpoint
- Exports project_logs to file
- JSON or text format
- Send to Telegram option
- Typecheck passes

**Status:** false

### US-009: Automatic Storage Backup
**Priority:** 3
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want automatic storage backups so that large files are preserved.

**Acceptance Criteria:**
- Existing Telegram backup handles files >2GB
- Automatic backup documented
- No changes needed
- Typecheck passes

**Status:** false

### US-010: Backup Retention Policy
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want backup retention so that storage doesn't grow indefinitely.

**Acceptance Criteria:**
- Backups retained for 30 days
- Background job deletes old backups
- Cleanup from both database and Telegram
- Notification before deletion
- Typecheck passes

**Status:** false
