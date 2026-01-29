---
project: RBAC System
branch: flow/rbac-system
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# RBAC System

## Overview
Right now: Any logged-in user can do too much. Need: Explicit permissions based on role. RBAC enforces permission checks before actions and updates UI based on user capabilities.

## Technical Approach
Create permission system with role definitions. Implement permission checking middleware. Update UI to hide/show based on role. Studio respects permissions. Permission matrix: Owner, Admin, Developer, Viewer.

## User Stories

### US-001: Define Permissions
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want permissions defined so that I can enforce role-based access control.

**Acceptance Criteria:**
- Permissions enum defined
- Permissions: projects.delete, projects.manage_services, projects.manage_keys, projects.manage_users, projects.view_logs, projects.use_services, database.write, database.read
- Documented in code
- Typecheck passes

**Status:** false

### US-002: Define Role Permissions
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want role-permission mappings defined so that I can check permissions efficiently.

**Acceptance Criteria:**
- Role permissions constant created
- Owner: all permissions
- Admin: all except projects.delete
- Developer: projects.view_logs, projects.use_services, database.read
- Viewer: projects.view_logs, database.read
- Typecheck passes

**Status:** false

### US-003: Create Permission Checker
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a permission checker function so that I can enforce permissions.

**Acceptance Criteria:**
- hasPermission(user, role, permission) function created at src/lib/rbac.ts
- Checks user's role in organization
- Looks up permissions for role
- Returns boolean
- Typecheck passes

**Status:** false

### US-004: Create Permission Middleware
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want permission middleware so that I can easily protect routes.

**Acceptance Criteria:**
- requirePermission(permission) middleware created
- Checks user permission
- Returns 403 if not permitted
- Works with Express/Next.js
- Typecheck passes

**Status:** false

### US-005: Apply Permissions to Project Deletion
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want only owners to delete projects so that team members can't accidentally delete shared projects.

**Acceptance Criteria:**
- DELETE /api/projects/:id checks permission
- Only organization owners or project owners can delete
- Returns 403 for non-owners
- Typecheck passes

**Status:** false

### US-006: Apply Permissions to Service Management
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want only admins and owners to manage services so that developers can't disable critical services.

**Acceptance Criteria:**
- Service enable/disable endpoints check permission
- Only admins and owners can manage
- Returns 403 for developers/viewers
- Typecheck passes

**Status:** false

### US-007: Apply Permissions to Key Management
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want only admins and owners to manage API keys so that developers can't create credentials.

**Acceptance Criteria:**
- Key create/delete/revoke endpoints check permission
- Only admins and owners can manage keys
- Returns 403 for developers/viewers
- Typecheck passes

**Status:** false

### US-008: Apply Permissions to User Management
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want only owners to manage users so that admins can't add other admins.

**Acceptance Criteria:**
- User invite/remove endpoints check permission
- Only owners can manage users
- Returns 403 for admins and below
- Typecheck passes

**Status:** false

### US-009: Update UI Based on Permissions
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want the UI to show only actions I can perform so that I don't see buttons I can't use.

**Acceptance Criteria:**
- Permission check in UI components
- Delete project button: owners only
- Manage services button: admins/owners only
- Manage keys button: admins/owners only
- Manage users button: owners only
- Typecheck passes

**Status:** false

### US-010: Enforce Database Write Permissions
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want database writes restricted so that viewers can't modify data.

**Acceptance Criteria:**
- API gateway checks permission for writes
- Viewers rejected for INSERT/UPDATE/DELETE
- Returns 403 with clear message
- Developers and admins can write
- Typecheck passes

**Status:** false

### US-011: Enforce Studio Permissions
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want Studio to respect permissions so that viewers can't execute destructive SQL.

**Acceptance Criteria:**
- Studio checks permission before SQL execution
- Viewers can only SELECT
- Developers can SELECT/INSERT/UPDATE
- Admins/owners have full access
- Typecheck passes

**Status:** false

### US-012: Create Permission Denied Error
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want clear permission denied errors so that I understand why I can't perform an action.

**Acceptance Criteria:**
- PERMISSION_DENIED error code defined
- Error message explains what permission is needed
- Error message explains who to contact
- Typecheck passes
