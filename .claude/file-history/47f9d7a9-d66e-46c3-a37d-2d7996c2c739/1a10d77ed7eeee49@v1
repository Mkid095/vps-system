---
project: Platform Invariants Document
branch: flow/platform-invariants
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Platform Invariants Document

## Overview
Internal architectural rules document that prevents drift and ensures all contributors understand the core principles of the NextMavens platform. This is NOT user documentation - it's for platform engineers and contributors.

## Technical Approach
Create /home/ken/PLATFORM_INVARIANTS.md documenting the 10 core principles that govern the platform architecture. Include rules for control plane vs data plane separation, security principles, and observability requirements. Create symlink in developer portal directory for easy access.

## User Stories

### US-001: Create Platform Invariants Document
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want a comprehensive invariants document so that all contributors understand the core architectural principles.

**Acceptance Criteria:**
- Document created at /home/ken/PLATFORM_INVARIANTS.md
- 10 core principles documented
- Each principle has clear explanation
- Examples provided for each principle
- Markdown format with good structure
- Document reviewed for clarity

**Status:** false

### US-002: Document Control Plane Source of Truth Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to state that the control plane database is the authoritative source of truth so that there's no ambiguity about governance.

**Acceptance Criteria:**
- Principle clearly stated
- Control plane database defined as authoritative
- Data plane services prohibited from mutating governance state
- Data plane services required to read via snapshot API only
- Examples of correct and incorrect patterns
- Rationale explained

**Status:** false

### US-003: Document Idempotent Destructive Actions Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require idempotent destructive operations so that the platform remains stable under retry conditions.

**Acceptance Criteria:**
- Principle clearly stated
- Idempotency defined for destructive operations
- Examples: deleting project twice = same result, rotating key twice = same result
- No partial failure states permitted
- Implementation patterns provided

**Status:** false

### US-004: Document Request Attribution Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require that every request is attributable to a project so that we have complete observability and accountability.

**Acceptance Criteria:**
- Principle clearly stated
- API requests must have project_id in JWT
- Log entries must have project_id
- Audit entries must have actor_id and project_id
- No anonymous requests allowed (except auth)
- Enforcement mechanisms described

**Status:** false

### US-005: Document No Direct Control DB Access Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to prohibit data plane services from talking directly to the control database so that architectural boundaries are maintained.

**Acceptance Criteria:**
- Principle clearly stated
- Data plane must use Control Plane API
- Data plane must use snapshot API for reads
- Direct DB connections prohibited
- Violation examples provided
- Rationale explained (separation of concerns)

**Status:** false

### US-006: Document Isolation Enforcement Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require explicit isolation enforcement so that cross-project access is impossible.

**Acceptance Criteria:**
- Principle clearly stated
- All database queries scoped to tenant_{project_id}
- All realtime channels prefixed with project_id:
- All storage paths prefixed with project_id:/
- Cross-project access returns 403 (never 404)
- Isolation enforced, not implied

**Status:** false

### US-007: Document Universal Observability Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require correlation IDs everywhere so that we can trace requests across all services.

**Acceptance Criteria:**
- Principle clearly stated
- Every request has x-request-id
- Every log entry has request_id
- Every audit entry has request_id
- Correlation always possible across services
- Implementation patterns provided

**Status:** false

### US-008: Document Fail Closed Security Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require fail-closed behavior so that security is never compromised for availability.

**Acceptance Criteria:**
- Principle clearly stated
- Control plane unreachable = deny all requests
- Snapshot unavailable = deny all requests
- Service health unknown = deny all requests
- Security > availability always
- Examples of fail-closed implementation

**Status:** false

### US-009: Document Secrets Never Logged Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to prohibit logging secret values so that credentials are never exposed.

**Acceptance Criteria:**
- Principle clearly stated
- Secret values never in logs
- Secret values never in error messages
- Secret values never in audit logs (only refs)
- Secret redaction patterns provided
- Violation examples

**Status:** false

### US-010: Document MCP Read-Only Default Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require MCP tokens to be read-only by default so that AI tools have safe default behavior.

**Acceptance Criteria:**
- Principle clearly stated
- MCP tokens start with read-only access
- Write access requires explicit opt-in
- Write access requires warnings
- MCP actions heavily audited
- Scope documentation required

**Status:** false

### US-011: Document Soft Delete First Principle
**Priority:** 1
**Maven Steps:** [1]
**MCP Tools:** []

As a platform engineer, I want the invariants document to require soft delete before hard delete so that users have grace periods for recovery.

**Acceptance Criteria:**
- Principle clearly stated
- All deletions start with 30-day grace period
- Preview shows exactly what will be deleted
- Dependencies called out explicitly
- Hard delete only after grace period
- Restore capability during grace period

**Status:** false

### US-012: Create Symlink in Developer Portal
**Priority:** 2
**Maven Steps:** [1]
**MCP Tools:** []

As a developer, I want easy access to the platform invariants document from the developer portal directory so that I can reference it while working.

**Acceptance Criteria:**
- Symlink created at /home/ken/developer-portal/PLATFORM_INVARIANTS.md
- Symlink points to /home/ken/PLATFORM_INVARIANTS.md
- Symlink accessible from developer portal directory
- Symlink tested and working

**Status:** false
