---
project: Audit Logs
branch: flow/audit-logs
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Audit Logs

## Overview
Logs show what happened (technical). Audit logs show who did what, when, from where (compliance, forensics). Essential for enterprise-grade trust and security incident investigation.

## Technical Approach
Create audit_logs table with actor tracking (actor_id, actor_type, action, target_type, target_id, metadata, ip_address, user_agent). Implement middleware for auto-logging all mutations. Create audit log viewer UI with filtering and export capabilities.

## User Stories

### US-001: Create Audit Logs Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an audit logs table so that I can track all governance operations.

**Acceptance Criteria:**
- audit_logs table created in control_plane schema
- Columns: id, actor_id, actor_type (user/system/api_key), action, target_type, target_id, metadata (JSONB), ip_address, user_agent, created_at
- Index on actor_id for querying by user
- Index on target_id for querying by resource
- Index on created_at for date range queries
- Migration script created and tested

**Status:** false

### US-002: Create Audit Logging Function
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want an audit logging function so that I can easily log actions from anywhere in the codebase.

**Acceptance Criteria:**
- logAction() function created at src/lib/audit.ts
- Parameters: actor_id, actor_type, action, target_type, target_id, metadata, req (for ip/user_agent)
- Automatically extracts IP and user agent from request
- Stores action in audit_logs table
- Returns audit log entry
- Typecheck passes

**Status:** false

### US-003: Audit Project CRUD Operations
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all project create/update/delete operations logged so that I can investigate project lifecycle changes.

**Acceptance Criteria:**
- Project creation logged with action: project.created
- Project updates logged with action: project.updated
- Project deletion logged with action: project.deleted
- Actor captured from authenticated user
- Target is project_id
- Metadata includes changes made
- Typecheck passes

**Status:** false

### US-004: Audit API Key Operations
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all API key create/rotate/revoke operations logged so that I can track credential changes.

**Acceptance Criteria:**
- Key creation logged with action: key.created
- Key rotation logged with action: key.rotated
- Key revocation logged with action: key.revoked
- Actor captured from authenticated user
- Target is key_id
- Metadata includes key_type and scopes (not key value)
- Typecheck passes

**Status:** false

### US-005: Audit User Management Operations
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all user invite/remove operations logged so that I can track team membership changes.

**Acceptance Criteria:**
- User invites logged with action: user.invited
- User removals logged with action: user.removed
- Role changes logged with action: user.role_changed
- Actor captured from authenticated user
- Target is user_id
- Metadata includes role and organization
- Typecheck passes

**Status:** false

### US-006: Audit Project Suspensions
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all project suspensions logged so that I can understand why projects were suspended.

**Acceptance Criteria:**
- Manual suspensions logged with action: project.suspended
- Auto-suspensions logged with action: project.auto_suspended
- Actor captured (or 'system' for auto)
- Target is project_id
- Metadata includes reason and hard_cap_exceeded
- Typecheck passes

**Status:** false

### US-007: Audit Secret Access
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all secret access logged so that I can detect unauthorized access attempts.

**Acceptance Criteria:**
- Secret creation logged with action: secret.created
- Secret access logged with action: secret.accessed
- Secret rotation logged with action: secret.rotated
- Actor captured from authenticated user
- Target is secret_id (not secret value)
- Metadata includes secret_name
- Typecheck passes

**Status:** false

### US-008: Create Audit Log API Endpoint
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to query audit logs via API so that I can investigate actions programmatically.

**Acceptance Criteria:**
- GET /api/audit endpoint created
- Query parameters: actor_id, action, target_type, target_id, start_date, end_date
- Returns paginated results
- Filters applied securely (SQL injection protected)
- Requires authentication
- Results sorted by created_at DESC
- Typecheck passes

**Status:** false

### US-009: Create Audit Log Viewer UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a platform operator, I want a UI to view audit logs so that I can investigate actions without writing queries.

**Acceptance Criteria:**
- Audit log viewer page created
- Filter by actor, action, target type
- Date range picker
- Paginated results table
- Shows: timestamp, actor, action, target, details
- Expandable metadata view
- Export to CSV button
- Typecheck passes

**Status:** false

### US-010: Add Correlation ID to Audit Logs
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want audit logs to include correlation IDs so that I can trace requests across services.

**Acceptance Criteria:**
- audit_logs table updated with request_id column
- Correlation ID captured from x-request-id header
- Links audit entries to specific requests
- Can view all audit entries for a request
- Typecheck passes
