---
project: Auth User Manager in Studio
branch: flow/auth-user-manager
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Auth User Manager in Studio

## Overview
Visual user management interface in Studio. Developers can list all users, view details (email, name, metadata), disable/delete users, reset passwords, view active sessions. Killer feature for auth service.

## Technical Approach
Add Users tab to Studio interface. Create user management components: UserList, UserDetail, UserActions. Integrate with auth service API for user CRUD operations. Show user metadata, auth provider, sessions.

## User Stories

### US-001: Create Users Tab in Studio
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a Users tab in Studio so that I can manage users without using API calls.

**Acceptance Criteria:**
- Users tab added to Studio sidebar
- Tab shows user list by default
- Integrated into Studio navigation
- Typecheck passes

**Status:** false

### US-002: Create User List Component
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see all users so that I can browse user accounts.

**Acceptance Criteria:**
- UserList component created
- Fetches users from auth service API
- Shows: email, name, created_at, last_sign_in_at
- Paginated list (50 per page)
- Search/filter by email
- Sortable columns
- Typecheck passes

**Status:** false

### US-003: Create User Detail View
**Priority:** 1
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see user details so that I can understand user accounts.

**Acceptance Criteria:**
- UserDetail component created
- Shows: email, name, user_id, created_at, updated_at
- Shows: last_sign_in_at, sign_in_count
- Shows: auth_provider (email, oauth later)
- Shows: user_metadata (JSON)
- Editable metadata
- Typecheck passes

**Status:** false

### US-004: Implement Disable User
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to disable users so that I can block accounts without deleting them.

**Acceptance Criteria:**
- Disable user button in UserDetail
- Calls auth service API to disable
- User shows as disabled in list
- Disabled users can't sign in
- Re-enable button available
- Typecheck passes

**Status:** false

### US-005: Implement Delete User
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to delete users so that I can remove accounts.

**Acceptance Criteria:**
- Delete user button in UserDetail
- Confirmation modal before deletion
- Calls auth service API to delete
- User removed from list
- Action logged to audit log
- Typecheck passes

**Status:** false

### US-006: Implement Reset Password
**Priority:** 2
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a developer, I want to reset user passwords so that I can help users who forgot credentials.

**Acceptance Criteria:**
- Reset password button in UserDetail
- Sends password reset email
- Shows confirmation
- Typecheck passes

**Status:** false

### US-007: Implement View Active Sessions
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see user sessions so that I can understand login activity.

**Acceptance Criteria:**
- Sessions section in UserDetail
- Lists active sessions
- Shows: device, IP, created_at
- Revoke session button
- Session revokes immediately
- Typecheck passes

**Status:** false

### US-008: Add User Filtering
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to filter users so that I can find specific accounts.

**Acceptance Criteria:**
- Filter bar in UserList
- Filter by: email, created_at range, last_sign_in range
- Filter by auth_provider
- Filter by status (active/disabled)
- Typecheck passes

**Status:** false

### US-009: Add User Export
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to export users so that I can analyze user data externally.

**Acceptance Criteria:**
- Export users button
- Exports to CSV
- Includes: email, name, created_at, last_sign_in, metadata
- Typecheck passes

**Status:** false

### US-010: Show User Auth History
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see user auth history so that I can track login patterns.

**Acceptance Criteria:**
- Auth history section in UserDetail
- Shows: sign_in_at, sign_out_at, method, IP
- Paginated list
- Typecheck passes

**Status:** false

### US-011: Integrate with Auth Service API
**Priority:** 1
**Maven Steps:** [1, 2, 5, 7, 10]
**MCP Tools:** []

As a platform engineer, I want Studio to call auth service API so that user management is centralized.

**Acceptance Criteria:**
- API client for auth service created
- Endpoints: list users, get user, update user, delete user, disable user, reset password, get sessions
- Authentication via developer portal token
- Error handling
- Typecheck passes

**Status:** false
