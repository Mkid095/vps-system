---
project: Secrets Versioning & Rotation
branch: flow/secrets-versioning
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Secrets Versioning & Rotation

## Overview
Production secrets are living things. You need safe rotation, rollback capability, audit trail, and blast radius awareness. Secrets versioning enables these capabilities with a grace period for rotation.

## Technical Approach
Create secrets table with versioning: project_id, name, value_encrypted, version, active, rotated_from, rotation_reason, created_by. Implement rotation flow: create v2 → mark v1 inactive → notify consumers → 24h grace → delete v1. Add PGP encryption and rotation history UI.

## User Stories

### US-001: Create Secrets Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a secrets table with versioning so that I can track secret rotation history.

**Acceptance Criteria:**
- secrets table created in control_plane schema
- Columns: id, project_id, name, value_encrypted, version (INT DEFAULT 1), active (BOOLEAN DEFAULT TRUE), rotated_from (REFERENCES secrets(id)), rotation_reason, created_by, created_at
- Unique constraint on (project_id, name, version)
- Index on (project_id, name) for lookup
- Index on active for finding current version
- Migration script created and tested

**Status:** false

### US-002: Create Secret Consumers Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want to track which services use each secret so that I understand rotation blast radius.

**Acceptance Criteria:**
- secret_consumers table created in control_plane schema
- Columns: secret_id (REFERENCES secrets(id)), service (VARCHAR(50)), last_used_at (TIMESTAMPTZ)
- Services: edge_function, worker, webhook, etc.
- Primary key on (secret_id, service)
- Migration script created and tested

**Status:** false

### US-003: Implement Secret Encryption
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want secrets encrypted at rest so that they're never stored in plain text.

**Acceptance Criteria:**
- PGP encryption implemented
- Encryption key from environment variable
- value_encrypted contains PGP encrypted value
- Decryption only when needed
- Key rotation supported
- Typecheck passes

**Status:** false

### US-004: Implement Create Secret
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create secrets so that I can store sensitive configuration.

**Acceptance Criteria:**
- POST /api/secrets endpoint
- Request: project_id, name, value
- Encrypts value before storing
- Creates secret with version=1, active=TRUE
- Returns secret (without value)
- Typecheck passes

**Status:** false

### US-005: Implement Secret Rotation
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to rotate secrets so that I can maintain security hygiene.

**Acceptance Criteria:**
- POST /api/secrets/:id/rotate endpoint
- Creates new version (v2) with new value
- Links v2.rotated_from = v1.id
- Marks v1.active = FALSE
- Includes rotation_reason
- Returns new secret (without value)
- Typecheck passes

**Status:** false

### US-006: Implement Grace Period for Old Secrets
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want old secrets to work for 24h after rotation so that consumers have time to update.

**Acceptance Criteria:**
- Old secret version still decryptable during grace period
- Grace period: 24 hours from rotation
- After grace period, old version deleted
- Warning sent 1 hour before expiration
- Typecheck passes

**Status:** false

### US-007: Implement Consumer Notification
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want consumers notified when secret rotates so that they can fetch the new value.

**Acceptance Criteria:**
- Webhook sent on secret rotation
- Webhook payload: secret_id, name, new_version, rotated_from
- Webhook sent to all registered consumers
- Signature verification via shared secret
- Typecheck passes

**Status:** false

### US-008: Implement Secret Deletion
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to delete secrets so that I can remove unused secrets.

**Acceptance Criteria:**
- DELETE /api/secrets/:id endpoint
- Soft delete (sets deleted_at)
- Hard delete after 30 days
- All versions deleted
- Consumers notified of deletion
- Typecheck passes

**Status:** false

### US-009: Create Secrets API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to list and get secrets so that I can manage them programmatically.

**Acceptance Criteria:**
- GET /api/secrets?project_id=xxx - List secrets (without values)
- GET /api/secrets/:id - Get secret details (decrypt value)
- GET /api/secrets/:id/versions - List all versions
- GET /api/secrets/:id/versions/:version - Get specific version
- Typecheck passes

**Status:** false

### US-010: Create Secrets UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want a UI to manage secrets so that I don't have to use API calls.

**Acceptance Criteria:**
- Secrets management page created
- Lists all secrets for project
- Shows name, version, last rotated, consumers
- Create secret form
- Rotate button for each secret
- View rotation history
- Delete button with confirmation
- Values hidden by default
- Typecheck passes

**Status:** false

### US-011: Prevent Secret Logging
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to ensure secrets are never logged so that credentials don't leak.

**Acceptance Criteria:**
- Secret values never in logs
- Secret values never in error messages
- Secret values never in audit logs (only refs)
- Log redaction for secret patterns
- Typecheck passes

**Status:** false

### US-012: Implement Secret Access Logging
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want all secret access logged so that I can detect unauthorized access.

**Acceptance Criteria:**
- Secret reads logged to audit_logs
- Action: secret.accessed
- Actor captured
- Secret_id captured (not value)
- Typecheck passes

**Status:** false
