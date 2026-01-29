# NextMavens PaaS Control Plane Enhancement Plan

## Executive Summary

**Current State**: 85-90% of a Supabase-class PaaS architecturally
**Gap**: Missing platform-killer layers that separate "very impressive" from "platform that survives real users"
**Goal**: Complete the missing governance, automation, and operational maturity to become production-ready.

**Key Insight**: This is NOT a documentation project. This is building a full **Control Plane** that governs the **Data Plane** services (auth, db, realtime, graphql, storage, MCP).

---

## Architecture: Control Plane vs Data Plane

### Data Plane (Existing - Already Working)
| Service | Endpoint | Purpose | Consumes |
|---------|----------|---------|----------|
| Auth Service | `auth.nextmavens.cloud` | User authentication | Snapshot API |
| API Gateway | `api.nextmavens.cloud` | Database REST API | Snapshot API |
| GraphQL | `graphql.nextmavens.cloud` | GraphQL endpoint | Snapshot API |
| Realtime | `realtime.nextmavens.cloud` | WebSocket subscriptions | Snapshot API |
| Storage | `telegram.nextmavens.cloud` | File storage | Snapshot API |
| MCP Server | GitHub | AI/IDE integration | Snapshot API |

**Characteristics**: Stateless, stable, boring, just executes requests.
**Rule**: Never talk directly to control DB. Always use snapshot API.

### Control Plane (What We're Building Now)
| Component | Type | Purpose | Exposes |
|-----------|------|---------|---------|
| **Control Plane API** | **Service** | **Authoritative API for all governance** | **REST API for CLI, UI, automation** |
| Developer Portal | UI | Web interface for humans | Uses Control Plane API |
| CLI | CLI | Terminal interface for devs | Uses Control Plane API |
| Project Metadata DB | Database | Central control database | Only via Control Plane API |
| Studio Console | UI | Visual DB explorer, user manager | Uses Control Plane API |

---

## The 10 Critical Gaps (Platform-Killers)

| # | Gap | Why It Matters |
|---|-----|----------------|
| 1 | **Control Plane API Boundary** | UI ≠ Control Plane. CLI, automation, CI/CD need first-class API access |
| 2 | **Source of Truth Contract** | Data plane needs explicit, cached snapshot of control plane state |
| 3 | **CLI** | Serious devs don't click UI. DX dealbreaker for teams |
| 4 | **Provisioning State Machine** | Step-aware, not just status. Enables safe retry from failure |
| 5 | **"Break Glass" Mode** | Emergency access path when things break |
| 6 | **Secrets Versioning** | Production secrets are living things, not static |
| 7 | **Observability Beyond Logs** | Traces, health signals, correlation IDs across services |
| 8 | **Deletion with Preview** | Soft delete, dependency awareness, trust |
| 9 | **MCP Governance** | AI is powerful — dangerous without guardrails |
| 10 | **Platform Invariants** | Internal architectural rules prevent drift |

---

## Phase 0: Platform Architecture (CRITICAL - Do First)

### Feature Group 1: Control Plane API Service
**Priority**: HIGHEST - This is the foundation
**Description**: Extract control routes into standalone authoritative API service
**Components**:
- Standalone Next.js service at `/home/ken/control-plane-api/`
- REST API endpoints: /projects, /orgs, /keys, /usage, /jobs, /audit, /webhooks
- Internal endpoints: /internal/snapshot, /internal/health
- Shared auth and DB libraries
- API versioning support (/v1/, /v2/)

**Acceptance Criteria**:
- Control Plane API runs on separate port/domain
- All CRUD operations for projects, orgs, keys available via REST
- Snapshot endpoint returns cached control plane state
- Health endpoint checks all dependencies
- Developer Portal updated to consume Control Plane API instead of direct DB access

### Feature Group 2: Control Plane Snapshot Contract
**Priority**: HIGHEST - Source of truth for data plane
**Description**: Data plane services need authoritative, cached view of control plane state
**Components**:
- GET /internal/control-plane/snapshot?project_id=xxx
- Returns: project status, enabled services, limits, quotas, environment
- TTL caching (30-60s)
- Version field for cache invalidation
- Fail closed if unavailable

**Acceptance Criteria**:
- Snapshot endpoint returns complete project state
- Data plane services consume snapshot (not direct DB)
- Cache TTL prevents excessive control plane queries
- Failed snapshot requests result in denied access (fail closed)

### Feature Group 3: Platform Invariants Document
**Priority**: HIGHEST - Prevent architectural drift
**Description**: Internal architectural rules document
**Components**:
- /home/ken/PLATFORM_INVARIANTS.md
- 10 core principles documented
- Rules for control plane, data plane separation
- Security principles, observability requirements

**Acceptance Criteria**:
- Document created and reviewed
- Symlink in developer-portal directory
- All future changes validated against invariants

### Feature Group 4: CLI Tool
**Priority**: HIGH - Developer experience dealbreaker
**Description**: Standalone CLI for terminal-based workflows
**Components**:
- Node.js CLI at `/home/ken/nextmavens-cli/`
- Commands: login, project create/link, db push, functions deploy, secrets set, status
- Wrapper around Control Plane API
- Config in .nextmavens/config.json
- NPM distribution

**Acceptance Criteria**:
- Can authenticate via CLI
- Can create and link projects
- Can deploy functions and manage secrets
- Package published to npm
- Documentation complete

---

## Phase 0.1: Platform Reliability (Foundation)

### Feature Group 5: Background Jobs & Task Queue
**Description**: Handle async operations reliably (provisioning, webhooks, rotation)
**Components**:
- Job queue system with retry logic
- Worker process for background execution
- Job types: provision_project, rotate_key, deliver_webhook, export_backup, check_usage_limits
- Status tracking: pending, running, failed, completed
- Exponential backoff for retries

**Acceptance Criteria**:
- Jobs table created and populated
- Worker process running
- Failed jobs retry with backoff
- Job status API endpoint
- UI shows job progress

### Feature Group 6: Idempotency & Safety Nets
**Description**: Prevent duplicate operations
**Components**:
- Idempotency keys table with TTL
- Middleware for checking/storing results
- Applied to: provision project, create key, revoke key, send webhook
- 1 hour default TTL

**Acceptance Criteria**:
- Duplicate requests return cached response
- Idempotency checked before execution
- TTL-based expiration working
- No side effects from duplicate calls

### Feature Group 7: Audit Logs
**Description**: Track who did what, when, from where
**Components**:
- Audit logs table with actor tracking
- Middleware for auto-logging mutations
- Actions: project CRUD, key CRUD/rotate, user invites, role changes, suspensions
- Audit log viewer UI with filtering

**Acceptance Criteria**:
- All mutations logged with actor info
- Audit log API endpoint
- UI for viewing and filtering logs
- Export capability

### Feature Group 8: Quotas vs Limits
**Description**: Clear distinction between monthly allowance and abuse prevention
**Components**:
- Quotas table (monthly limits)
- Usage snapshots table (metrics tracking)
- Quota checking API
- Warning system (80%, 90%, 100%)
- Auto-suspend on hard cap

**Acceptance Criteria**:
- Can set monthly quotas per service
- Usage tracked and aggregated
- Warnings sent at thresholds
- Auto-suspend on hard cap
- Clear UX messaging

### Feature Group 9: Environment Parity
**Description**: Different rules for dev vs prod
**Components**:
- Environment field on projects and keys
- Config differences: rate limits (10x dev), auto-suspend (no dev), logging level
- getEnvironmentConfig() helper
- Environment selector in UI

**Acceptance Criteria**:
- Dev/prod/staging environments supported
- Different behaviors per environment
- Clear environment indicators in UI

### Feature Group 10: Standardized Error Format
**Description**: Consistent errors across all services
**Components**:
- Error factory with standard shape
- Error codes: PROJECT_SUSPENDED, RATE_LIMITED, QUOTA_EXCEEDED, etc.
- Retryable flag for client behavior
- Error documentation

**Acceptance Criteria**:
- All services use same error format
- Error codes documented
- Retryable flag guides client behavior
- Error docs page created

### Feature Group 11: Feature Flags (Kill Switches)
**Description**: Operational control for rollouts and incidents
**Components**:
- Feature flags table with scope support
- Core flags: signups_enabled, provisioning_enabled, storage_enabled
- Admin UI for managing flags
- Cached checks (60s TTL)

**Acceptance Criteria**:
- Can toggle features globally or per project
- Changes take effect within 60s
- Admin UI functional
- All flag changes audited

### Feature Group 12: Migration Strategy
**Description**: Rollback-capable database migrations
**Components**:
- Schema migrations table with versioning
- Rollback SQL column
- Breaking change flag
- Migration runner script

**Acceptance Criteria**:
- Migrations tracked in database
- Rollback SQL tested
- Breaking changes marked
- Can rollback to previous version

---

## Phase 0.2: Platform Maturity (Production Survival)

### Feature Group 13: Provisioning State Machine
**Description**: Step-aware provisioning with retry capability
**Components**:
- Provisioning steps table
- Ordered steps: create_tenant, create_schema, register_services, generate_keys
- State transitions: PENDING → RUNNING → SUCCESS/FAILED
- Retry from failed step
- Progress bar UI

**Acceptance Criteria**:
- Each provisioning step tracked separately
- Can retry from failed step
- UI shows step-by-step progress
- No partial failure states

### Feature Group 14: Break Glass Mode
**Description**: Emergency super-admin access
**Components**:
- Admin sessions table with reason tracking
- TOTP/hardware key authentication
- Powers: unlock project, override suspension, force delete
- Aggressive audit logging
- Time-limited sessions

**Acceptance Criteria**:
- Separate auth for break glass
- All actions logged with before/after states
- Sessions expire after 1 hour
- Reason required for access

### Feature Group 15: Secrets Versioning & Rotation
**Description**: Living secrets with safe rotation
**Components**:
- Versioned secrets table
- Rotation flow with grace period
- Consumer tracking
- PGP encryption
- Rotation history UI

**Acceptance Criteria**:
- Can create new secret version
- Old version expires after 24h
- Consumers notified of rotation
- Secret values never logged
- Rotation history visible

### Feature Group 16: Observability Beyond Logs
**Description**: Request tracing and correlation
**Components**:
- Correlation ID middleware in all services
- Request traces table
- Service health endpoint
- x-request-id propagation

**Acceptance Criteria**:
- Every request has correlation ID
- Can trace request across services
- Health endpoint checks dependencies
- Correlation ID in all logs

### Feature Group 17: Deletion with Preview
**Description**: Soft delete with dependency awareness
**Components**:
- Deletion preview API
- Soft delete with 30-day grace
- Dependency calculation
- Restore capability
- Preview UI showing impact

**Acceptance Criteria**:
- Preview shows exactly what will be deleted
- Dependencies listed explicitly
- 30-day grace period before hard delete
- Can restore during grace period

### Feature Group 18: MCP & AI Access Governance
**Description**: Guardrails for AI tool access
**Components**:
- MCP token types: read-only, write, admin
- Default read-only scopes
- Explicit opt-in for destructive actions
- Heavy audit logging for MCP
- Scope warnings in UI

**Acceptance Criteria**:
- MCP tokens default to read-only
- Write access requires explicit opt-in with warning
- All MCP actions heavily audited
- Scope documentation clear

---

## Phase 1: Foundation (Teams & Governance)

### Feature Group 19: Organizations & Teams
**Description**: Multi-member projects with roles
**Components**:
- Organizations table
- Organization members with roles (owner, admin, developer, viewer)
- Permission matrix per role
- Team management UI

**Acceptance Criteria**:
- Can create organization
- Can invite members with roles
- Role permissions enforced
- UI shows organization members

### Feature Group 20: RBAC System
**Description**: Role-based access control
**Components**:
- Permission system
- Role definitions
- Permission checking middleware
- UI updates based on role

**Acceptance Criteria**:
- Each role has defined permissions
- Permissions checked before actions
- UI hides/shows based on role
- Studio respects permissions

### Feature Group 21: Enhanced API Key System
**Description**: Key types, scopes, environments
**Components**:
- Key types: public, secret, service_role, mcp
- Scopes per service (db, storage, auth, realtime, graphql)
- Environment selector
- Usage stats per key
- Key creation UI with type selection

**Acceptance Criteria**:
- Can create each key type
- Scopes enforced at gateway
- Keys work per environment
- Usage stats visible
- Clear documentation on when to use each type

### Feature Group 22: Project Lifecycle Management
**Description**: Project states and transitions
**Components**:
- Project states: CREATED, ACTIVE, SUSPENDED, ARCHIVED, DELETED
- State behaviors defined
- Status change API
- Status badge in UI

**Acceptance Criteria**:
- Projects transition through states
- Keys don't work when suspended
- Services disabled when archived
- Clear status indicators

### Feature Group 23: Project Detail Pages Enhancement
**Description**: Integration guidance for each service tab
**Components**:
- "What is this?" section per service
- Quick integration code examples
- SDK installation instructions
- Use case guidance
- Link to full docs

**Acceptance Criteria**:
- Each service tab has explanation
- Code examples copy-pasteable
- SDK docs integrated
- Clear use cases described

### Feature Group 24: Auth User Manager in Studio
**Description**: Visual user management interface
**Components**:
- Users list in Studio
- User details: email, name, metadata
- Disable/delete user actions
- Reset password
- View active sessions

**Acceptance Criteria**:
- Can list all users
- Can disable/delete users
- Can reset passwords
- Can view sessions
- Integrated into Studio sidebar

---

## Phase 2: Safety & Trust (Production Ready)

### Feature Group 25: Usage Tracking
**Description**: Collect metrics for billing and quotas
**Components**:
- Usage metrics table
- Track per service: queries, messages, uploads, signups
- Aggregation API
- Usage dashboard

**Acceptance Criteria**:
- All services track usage
- Metrics aggregated correctly
- Usage visible in dashboard
- Exportable for billing

### Feature Group 26: Real-time Logs Viewer
**Description**: Streaming logs with filtering
**Components**:
- Logs page in project dashboard
- Real-time log stream
- Filter by service and level
- Search functionality
- Download logs

**Acceptance Criteria**:
- Logs stream in real-time
- Filters work correctly
- Search returns relevant logs
- Can download log archive

### Feature Group 27: API Gateway Enforcement
**Description**: Validate at gateway level using snapshot
**Components**:
- Gateway middleware for validation
- Consume snapshot API
- Check project status, service enabled, rate limits
- Return 403/429 on violations

**Acceptance Criteria**:
- Gateway validates all requests
- Snapshot consumed (not direct DB)
- Rate limits enforced
- Proper error codes returned

### Feature Group 28: Resource Isolation Enforcement
**Description**: Enforce project boundaries everywhere
**Components**:
- JWT must contain project_id
- All DB queries scoped to tenant_{project_id}
- Realtime channels prefixed
- Storage paths prefixed
- Return 403 for cross-project access

**Acceptance Criteria**:
- All requests have project_id
- Queries scoped correctly
- Cross-project access returns 403
- No isolation bypass possible

### Feature Group 29: Key Rotation & Revocation
**Description**: Key hygiene operations
**Components**:
- Rotate key API (24h overlap)
- Revoke key API
- Usage stats per key
- Last used tracking

**Acceptance Criteria**:
- Can rotate key with grace period
- Can revoke key immediately
- See usage per key
- Last used timestamp accurate

### Feature Group 30: Abuse Controls
**Description**: Hard caps and auto-suspension
**Components**:
- Per-project hard caps
- Signup rate limiting
- Auto-suspend triggers
- Suspension notifications

**Acceptance Criteria**:
- Hard caps enforced
- Signups rate limited
- Auto-suspend on abuse
- Users notified of suspension

### Feature Group 31: Webhooks & Events System
**Description**: Outbound event delivery
**Components**:
- Webhooks table
- Event types: project created, user signed up, file uploaded, etc.
- Delivery with retry
- Webhook management UI

**Acceptance Criteria**:
- Can register webhook URLs
- Events delivered reliably
- Failed webhooks retried
- UI shows webhook history

### Feature Group 32: Backup Strategy
**Description**: Telegram integration for backups
**Components**:
- Manual export API
- Send to Telegram backup
- Backup history UI
- Restore from backup

**Acceptance Criteria**:
- Can export database dump
- Can send to Telegram
- Backup history visible
- Can restore from backup

### Feature Group 33: Support Escape Hatch
**Description**: Request support with context
**Components**:
- Support button per project
- Auto-attach context (project ID, logs, errors)
- Support request API
- Incident status page

**Acceptance Criteria**:
- Support button visible
- Context auto-attached
- Support requests tracked
- Status page shows incidents

---

## Phase 3: Studio Enhancement

### Feature Group 34: SQL Editor
**Description**: Run queries from UI
**Components**:
- Monaco-based SQL editor
- Run query button
- Results table
- Query history
- Transaction mode (read-only default)

**Acceptance Criteria**:
- Can write and execute SQL
- Results displayed in table
- Query history saved
- Read-only mode by default

### Feature Group 35: Schema Browser
**Description**: Visual schema exploration
**Components**:
- Tables list
- Column details with types
- Indexes viewer
- Foreign keys display

**Acceptance Criteria**:
- All tables visible
- Columns with types shown
- Indexes listed
- Foreign keys displayed

---

## Phase 4: Documentation

### Feature Group 36: Collapsible Sidebar Docs
**Description**: Better documentation navigation
**Components**:
- Collapsible sidebar layout
- Toggle button
- Smooth transitions
- Mobile-responsive
- Active section highlighting

**Acceptance Criteria**:
- Sidebar collapses/expands
- Toggle works smoothly
- Mobile hamburger menu
- Active section highlighted

### Feature Group 37: SDK Documentation
**Description**: Integrated SDK docs
**Components**:
- SDK installation guide
- Client initialization
- Database, auth, realtime, storage examples
- Error handling guide

**Acceptance Criteria**:
- SDK docs complete
- Code examples work
- All services covered
- Error handling explained

### Feature Group 38: Realtime Documentation
**Description**: Complete realtime guide
**Components**:
- WebSocket connection guide
- Subscription examples
- Event types
- Lifecycle management

**Acceptance Criteria**:
- Realtime docs complete
- Connection examples work
- Events documented
- Lifecycle explained

### Feature Group 39: Platform Philosophy
**Description**: Opinionated stance document
**Components**:
- Postgres-native approach
- Realtime is DB-driven
- Storage abstraction strategy
- JWT-first authentication
- Multi-tenant by default

**Acceptance Criteria**:
- Philosophy documented
- Clear positions stated
- Attracts right developers

### Feature Group 40: Versioning Strategy
**Description**: API/SDK evolution policy
**Components**:
- API versioning (/v1/, /v2/)
- SDK semantic versioning
- Deprecation timeline
- Breaking change policy
- Migration guides

**Acceptance Criteria**:
- Versioning policy clear
- Deprecation timeline defined
- Migration guides available

### Feature Group 41: Infrastructure Documentation
**Description**: Scaling roadmap
**Components**:
- Current single-region deployment
- Scaling phases
- Regional data isolation
- Disaster recovery plans

**Acceptance Criteria**:
- Current state transparent
- Roadmap defined
- Scaling plan clear

### Feature Group 42: Failure Modes Documentation
**Description**: What breaks and how
**Components**:
- Rate limits per service
- Max file sizes
- Query timeouts
- Connection limits
- Error codes
- Common pitfalls

**Acceptance Criteria**:
- All services documented
- Limits clear
- Errors explained
- Pitfalls called out

---

## Implementation Order Priority

### Wave 1: Critical Architecture (Do First)
1. Control Plane API Service (Feature Group 1)
2. Control Plane Snapshot Contract (Feature Group 2)
3. Platform Invariants Document (Feature Group 3)
4. CLI Tool (Feature Group 4)

### Wave 2: Platform Reliability
5. Background Jobs & Task Queue (Feature Group 5)
6. Idempotency & Safety Nets (Feature Group 6)
7. Audit Logs (Feature Group 7)
8. Quotas vs Limits (Feature Group 8)
9. Environment Parity (Feature Group 9)
10. Standardized Error Format (Feature Group 10)
11. Feature Flags (Feature Group 11)
12. Migration Strategy (Feature Group 12)

### Wave 3: Platform Maturity
13. Provisioning State Machine (Feature Group 13)
14. Break Glass Mode (Feature Group 14)
15. Secrets Versioning (Feature Group 15)
16. Observability Beyond Logs (Feature Group 16)
17. Deletion with Preview (Feature Group 17)
18. MCP Governance (Feature Group 18)

### Wave 4: Foundation
19. Organizations & Teams (Feature Group 19)
20. RBAC System (Feature Group 20)
21. Enhanced API Keys (Feature Group 21)
22. Project Lifecycle (Feature Group 22)
23. Project Detail Pages (Feature Group 23)
24. Auth User Manager (Feature Group 24)

### Wave 5: Safety & Trust
25. Usage Tracking (Feature Group 25)
26. Logs Viewer (Feature Group 26)
27. Gateway Enforcement (Feature Group 27)
28. Resource Isolation (Feature Group 28)
29. Key Rotation (Feature Group 29)
30. Abuse Controls (Feature Group 30)
31. Webhooks & Events (Feature Group 31)
32. Backup Strategy (Feature Group 32)
33. Support Escape Hatch (Feature Group 33)

### Wave 6: Studio Enhancement
34. SQL Editor (Feature Group 34)
35. Schema Browser (Feature Group 35)

### Wave 7: Documentation
36. Collapsible Sidebar (Feature Group 36)
37. SDK Documentation (Feature Group 37)
38. Realtime Documentation (Feature Group 38)
39. Platform Philosophy (Feature Group 39)
40. Versioning Strategy (Feature Group 40)
41. Infrastructure Docs (Feature Group 41)
42. Failure Modes Docs (Feature Group 42)

---

## Success Criteria

- Control Plane API runs independently
- Data plane consumes snapshot (not direct DB)
- CLI can authenticate and create projects
- All requests have correlation IDs
- Jobs system handles async operations
- Audit log captures all mutations
- Secrets can be rotated safely
- Deletions show preview
- MCP tokens default to read-only
- Documentation is comprehensive
- Platform invariants documented

---

## Notes

- Current services working: auth, api-gateway, graphql, realtime, storage (telegram), mcp-server
- Developer portal exists at /home/ken/developer-portal
- Need to extract control plane logic from UI into standalone API
- Data plane services need to consume snapshot, not hit control DB directly
- This is about governance and operational maturity, not features
