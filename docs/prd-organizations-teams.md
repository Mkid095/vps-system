---
project: Organizations & Teams
branch: flow/organizations-teams
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Organizations & Teams

## Overview
Right now: 1 developer = 1 project. Reality: Production teams have multiple members, roles, client handoffs. Organizations enable multi-member projects with role-based access control.

## Technical Approach
Create organizations table with owner_id. Create organization_members table with roles (owner, admin, developer, viewer). Add organization_id to projects table. Implement permission matrix per role. Team management UI.

## User Stories

### US-001: Create Organizations Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an organizations table so that I can support multi-tenant team structures.

**Acceptance Criteria:**
- organizations table created in control_plane schema
- Columns: id, name, slug, owner_id (REFERENCES developers(id)), created_at
- slug is unique
- Index on owner_id
- Migration script created and tested

**Status:** false

### US-002: Create Organization Members Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want an organization_members table so that I can track team membership.

**Acceptance Criteria:**
- organization_members table created in control_plane schema
- Columns: org_id (REFERENCES organizations(id)), user_id (REFERENCES developers(id)), role, invited_by, joined_at
- Composite primary key on (org_id, user_id)
- Role enum: owner, admin, developer, viewer
- Migration script created and tested

**Status:** false

### US-003: Add Organization to Projects
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want projects to belong to organizations so that teams can share projects.

**Acceptance Criteria:**
- projects table updated with organization_id column
- Foreign key to organizations table
- Nullable (personal projects have NULL)
- Migration script created
- Typecheck passes

**Status:** false

### US-004: Define Permission Matrix
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a permission matrix defined so that roles have clear capabilities.

**Acceptance Criteria:**
- Permissions defined per role
- Owner: delete projects, manage services, manage keys, manage users, use services
- Admin: manage services, manage keys, view logs, use services
- Developer: view logs, use services
- Viewer: view logs, read-only access
- Documented in code
- Typecheck passes

**Status:** false

### US-005: Implement Create Organization
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create an organization so that my team can collaborate on projects.

**Acceptance Criteria:**
- POST /api/organizations endpoint
- Request: name, slug
- Creates organization with authenticated user as owner
- Returns organization details
- Generates unique slug if not provided
- Typecheck passes

**Status:** false

### US-006: Implement Invite Member
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As an organization owner, I want to invite members so that my team can access shared projects.

**Acceptance Criteria:**
- POST /api/organizations/:id/members endpoint
- Request: email, role
- Sends invitation email
- Creates pending membership
- Only owners/admins can invite
- Typecheck passes

**Status:** false

### US-007: Implement Accept Invitation
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to accept organization invitations so that I can join teams.

**Acceptance Criteria:**
- POST /api/organizations/:id/accept endpoint
- Requires invitation token
- Sets membership to active
- Sets joined_at timestamp
- Typecheck passes

**Status:** false

### US-008: Implement Remove Member
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As an organization owner, I want to remove members so that I can control team access.

**Acceptance Criteria:**
- DELETE /api/organizations/:id/members/:userId endpoint
- Only owners/admins can remove
- Cannot remove owner
- Revokes access to organization projects
- Typecheck passes

**Status:** false

### US-009: Implement Update Member Role
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As an organization owner, I want to update member roles so that I can grant/revoke permissions.

**Acceptance Criteria:**
- PUT /api/organizations/:id/members/:userId endpoint
- Request: role
- Only owners can update roles
- Cannot change owner role
- Typecheck passes

**Status:** false

### US-010: Create Organizations List UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see my organizations so that I can switch between teams.

**Acceptance Criteria:**
- Organizations page created at /dashboard/organizations
- Lists all organizations
- Shows name, member count, project count
- Create organization button
- Organization detail view
- Typecheck passes

**Status:** false

### US-011: Create Team Management UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As an organization owner, I want to manage team members so that I can control access.

**Acceptance Criteria:**
- Team management page in organization settings
- Lists all members with roles
- Shows member status (active/pending)
- Invite member form
- Change role dropdown
- Remove member button
- Resend invitation button
- Typecheck passes

**Status:** false

### US-012: Enforce Organization Scoping
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want organization projects scoped so that members only see their org's projects.

**Acceptance Criteria:**
- Project list filtered by organization membership
- Personal projects (org_id = NULL) only visible to owner
- Org projects visible to all org members
- Typecheck passes
