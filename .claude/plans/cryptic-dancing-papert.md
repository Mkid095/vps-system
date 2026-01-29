# NextMavens PaaS Control Plane Enhancement Plan

## Executive Summary

**Current State**: 85-90% of a Supabase-class PaaS architecturally
**Gap**: Missing platform-killer layers that separate "very impressive" from "platform that survives real users"
**Goal**: Complete the missing governance, automation, and operational maturity to become production-ready.

**Key Insight**: This is NOT a documentation project. This is building a full **Control Plane** that governs the **Data Plane** services (auth, db, realtime, graphql, storage, MCP).

---

## The 10 Critical Gaps (Platform-Killers)

Based on production PaaS experience, these are the layers that separate "ambitious platform" from "legit PaaS foundation":

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

**Verdict**: Add these 10 layers → cross from "ambitious platform" into "legit PaaS foundation."

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

**Characteristics**: Stateful, authoritative, enforces rules.
**Rule**: All mutations go through Control Plane API. UI never talks directly to DB.

### The Critical Separation
```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌──────────┐  ┌─────────┐  ┌─────┐  ┌──────────┐  ┌──────┐  │
│  │   UI     │  │   CLI   │  │ CI/CD│  │  Terraform│  │ MCP  │  │
│  └────┬─────┘  └────┬────┘  └──┬──┘  └────┬─────┘  └───┬──┘  │
│       └───────────────┴─────────┴────────┴────────────┘        │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Control Plane API (Authoritative)             │  │
│  │  /projects  /orgs  /keys  /usage  /jobs  /audit  /webhooks │  │
│  │  /internal/snapshot  ←── Source of truth contract         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│                    Control Plane Database                      │
│  projects  api_keys  orgs  quotas  usage  audit  jobs         │
│  webhooks  secrets  provisioning_steps                         │
└──────────────────────────────────────────────────────────────┘

                            │ (Cached snapshot, TTL 30-60s)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Plane                                │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │   Auth  │ │API GW   │ │ GraphQL  │ │ Realtime │ │Storage │ │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 0.1: Background Jobs & Task Queue (PLATFORM RELIABILITY)

### Why This Matters
You have async operations everywhere: provisioning, key rotation, webhooks, backups, suspension. Requests fail, services timeout. **Jobs make the platform deterministic under chaos.**

### Database Schema
```sql
CREATE TABLE control_plane.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, failed, completed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Job Types
| Job Type | Purpose | Retry Logic |
|----------|---------|-------------|
| `provision_project` | Setup DB, services, keys | Retry on failure every 5min |
| `rotate_key` | Expire old key after 24h | One-shot, no retry |
| `deliver_webhook` | Deliver event to external URL | Retry 5x with exponential backoff |
| `export_backup` | Generate SQL dump for Telegram | Retry on failure |
| `check_usage_limits` | Check quotas, suspend if exceeded | Runs hourly |
| `auto_suspend` | Suspend project on abuse | One-shot |

### Implementation
**File**: `/home/ken/developer-portal/src/lib/jobs/queue.ts` (NEW)
**File**: `/home/ken/developer-portal/src/lib/jobs/worker.ts` (NEW)

---

## Phase 0.2: Idempotency & Safety Nets

### Why This Matters
Duplicate requests happen: double-click, retries, network glitches. Idempotency keeps the platform calm under chaos.

### Database Schema
```sql
CREATE TABLE control_plane.idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  response JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Idempotent Endpoints
| Endpoint | Idempotency Key | TTL |
|----------|------------------|-----|
| Provision project | `provision:{project_id}` | 1 hour |
| Create API key | `create_key:{request_id}` | 5 minutes |
| Revoke key | `revoke:{key_id}` | Immediate |
| Send webhook | `webhook:{event_id}` | 24 hours |

### Implementation
**Middleware** in `/home/ken/developer-portal/src/lib/idempotency.ts` (NEW):
```typescript
export async function withIdempotency(key: string, fn: () => Promise<any>) {
  const existing = await db.query(
    'SELECT response FROM control_plane.idempotency_keys WHERE key = $1 AND expires_at > NOW()',
    [key]
  )
  if (existing.rows.length > 0) {
    return existing.rows[0].response
  }
  const result = await fn()
  await db.query(
    'INSERT INTO control_plane.idempotency_keys (key, response, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
    [key, result]
  )
  return result
}
```

---

## Phase 0.3: Audit Logs (Enterprise-Grade Trust)

### Why This Matters
**Logs** = what happened (technical)
**Audit logs** = who did what, when, from where (compliance, forensics)

### Database Schema
```sql
CREATE TABLE control_plane.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES developers(id),
  actor_type VARCHAR(20) NOT NULL, -- user, system, api_key
  action VARCHAR(100) NOT NULL, -- project.created, key.rotated, user.deleted
  target_type VARCHAR(50),
  target_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Actions to Audit
- Project created/deleted
- API key created/rotated/revoked
- User invited/removed
- Role changed
- Project suspended
- Secrets accessed

### Implementation
**File**: `/home/ken/developer-portal/src/lib/audit.ts` (NEW)
**UI**: `/dashboard/projects/[slug]/audit` tab (NEW)

---

## Phase 0.4: Quotas vs Limits (Clarity = Trust)

### Why This Matters
**Hard caps** = abuse prevention (felt punitive)
**Quotas** = monthly allowance (business logic)
**Rate limits** = per-second protection (technical)

### Database Schema
```sql
CREATE TABLE control_plane.quotas (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service VARCHAR(20),
  monthly_limit INT,
  hard_cap INT,
  reset_at TIMESTAMPTZ,
  PRIMARY KEY (project_id, service)
);

CREATE TABLE control_plane.usage_snapshots (
  project_id UUID REFERENCES projects(id),
  service VARCHAR(20),
  metric_type VARCHAR(50),
  amount INT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UX Messaging Matters
| Situation | Message |
|-----------|---------|
| 80% of quota | "You've used 80% of your monthly database quota" |
| Rate limited | "Too many requests. Slow down." |
| Hard cap hit | "Project temporarily suspended due to excessive usage" |

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/usage/check-quota/route.ts` (NEW)

---

## Phase 0.5: Environment Parity (Dev ≠ Prod)

### Why This Matters
Dev is for experimentation. Prod is for stability. Different rules = fewer support headaches.

### Behavioral Differences
| Aspect | Dev Environment | Prod Environment |
|--------|----------------|-----------------|
| Rate limits | Higher (10x) | Standard |
| Auto-suspend | No | Yes |
| Logging | Verbose | Sampled (1%) |
| Webhook retries | Infinite | 3 attempts |
| Audit logging | Minimal | Full |

### Implementation
Add `environment` field to projects and API keys.
**File**: `/home/ken/developer-portal/src/lib/environment.ts` (NEW)

---

## Phase 0.6: SDK Error Semantics (DX Credibility)

### Why This Matters
Developers hate inconsistent errors. Define once, use everywhere.

### Standard Error Format
```json
{
  "error": {
    "code": "PROJECT_SUSPENDED",
    "message": "This project is suspended due to usage limits",
    "docs": "/docs/errors#project_suspended",
    "retryable": false,
    "project_id": "uuid"
  }
}
```

### Error Codes
| Code | Message | Retryable |
|------|---------|-----------|
| `PROJECT_SUSPENDED` | Project suspended | No |
| `RATE_LIMITED` | Too many requests | Yes (after delay) |
| `QUOTA_EXCEEDED` | Monthly quota exceeded | No |
| `KEY_INVALID` | API key invalid | No |
| `SERVICE_DISABLED` | Service not enabled | No |
| `PERMISSION_DENIED` | Insufficient permissions | No |

### Implementation
**File**: `/home/ken/developer-portal/src/lib/errors.ts` (NEW)
**All services** must use this format.

---

## Phase 0.7: Kill Switches (Founder Superpower)

### Why This Matters
Disable signups, pause provisioning, roll out features safely - every real platform has this.

### Database Schema
```sql
CREATE TABLE control_plane.feature_flags (
  name VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  scope VARCHAR(20) DEFAULT 'global', -- global, project, org
  metadata JSONB
);
```

### Feature Flags
| Flag | Scope | Purpose |
|------|-------|---------|
| `signups_enabled` | Global | Disable new user registration |
| `provisioning_enabled` | Global | Pause project provisioning |
| `storage_enabled` | Global | Disable storage temporarily |
| `realtime_enabled` | Global | Disable realtime during incidents |
| `new_feature_xyz` | Global | Gradual rollout of new feature |

### Implementation
**File**: `/home/ken/developer-portal/src/lib/features.ts` (NEW)
**Admin UI**: `/admin/feature-flags` (NEW)

---

## Phase 0.8: Migration Strategy (Future-Proof)

### Why This Matters
Migrations will happen. You need rollback capability and version tracking.

### Database Schema
```sql
CREATE TABLE control_plane.schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  rollback_sql TEXT,
  breaking BOOLEAN DEFAULT FALSE
);
```

### Migration Process
1. Create migration in `migrations/` directory
2. Test on staging project
3. Apply to production
4. Mark as applied in `schema_migrations`
5. If rollback needed: run `rollback_sql`

### Implementation
**File**: `/home/ken/developer-portal/src/lib/migrations.ts` (NEW)

---

## Phase 0.9: CLI (Developer Experience Dealbreaker)

### Why This Matters
Serious devs don't want to click UI for everything. Supabase/Vercel adoption skyrocketed because of CLI-first DX. Without CLI, you'll struggle with serious teams and MCP tooling won't shine.

### Architecture
```
CLI = thin wrapper around Control Plane API
  ↓
control-plane-api (authoritative)
  ↓
developer-portal (UI only)
```

### Commands (MVP)
```bash
nextmavens login                          # Authenticate, store token
nextmavens project create <name>          # Create new project
nextmavens project link                   # Link current dir to project
nextmavens db push                        # Push schema changes
nextmavens functions deploy               # Deploy edge functions
nextmavens secrets set <key> <value>      # Set project secrets
nextmavens status                         # Show project status
```

### Implementation
**Directory**: `/home/ken/nextmavens-cli/` (NEW - standalone Node.js CLI)
**File**: `src/commands/auth.ts` - Login/logout commands
**File**: `src/commands/project.ts` - Project CRUD operations
**File**: `src/commands/db.ts` - Database operations
**File**: `src/commands/functions.ts` - Function deployment
**File**: `src/commands/secrets.ts` - Secret management
**File**: `src/lib/api-client.ts` - Wrapper around Control Plane API
**File**: `package.json` - Distribute via npm

**Auth**: Reuses same access tokens as developer portal
**Config**: Stores project link in `.nextmavens/config.json`

---

## Phase 0.10: Control Plane API Boundary (CRITICAL ARCHITECTURE)

### Why This Matters
Right now: UI = Control Plane (tightly coupled)
Reality: Automation, CLI, CI/CD, MCP need first-class API access

### Architecture
```
developer-portal (UI only)
        ↓
control-plane-api (authoritative)
        ↓
data plane services
```

### What This Unlocks
- CLI tooling (`nextmavens deploy`)
- Terraform-style automation
- GitHub Actions integration
- Internal operators
- Future mobile admin app

### API Routes to Extract
**Directory**: `/home/ken/control-plane-api/` (NEW - standalone service)
**Structure**:
```
/control-plane-api
  ├── /projects          - Project CRUD, lifecycle
  ├── /orgs              - Organization management
  ├── /keys              - API key CRUD, rotation
  ├── /usage             - Usage tracking, quotas
  ├── /jobs              - Job management
  ├── /audit             - Audit log access
  ├── /webhooks          - Webhook management
  └── /internal/health   - Health checks
```

### Implementation
**File**: `/home/ken/control-plane-api/src/app/api/projects/route.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/orgs/route.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/keys/route.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/lib/auth.ts` (NEW - same JWT logic)
**File**: `/home/ken/control-plane-api/src/lib/db.ts` (NEW - same pool connection)

**Rule**: UI should NEVER talk directly to DB. Only to Control Plane API.

---

## Phase 0.11: Control Plane Snapshot Contract (Source of Truth)

### Why This Matters
Data plane needs authoritative, cached view of control plane state. Without explicit contract, behavior is undefined.

### The Problem
Right now:
- Data plane checks control plane (assumed)
- Control plane updates data plane (assumed)
- But where is the contract?

### The Solution: Snapshot Endpoint
```
GET /internal/control-plane/snapshot?project_id=xxx
```

**Response**:
```json
{
  "version": "1.0.0",
  "project": {
    "id": "uuid",
    "status": "active",
    "environment": "prod"
  },
  "services": {
    "database": { "enabled": true, "config": {} },
    "auth": { "enabled": true, "config": {} },
    "realtime": { "enabled": false, "config": {} },
    "storage": { "enabled": true, "config": {} },
    "graphql": { "enabled": true, "config": {} }
  },
  "limits": {
    "db_queries_per_min": 100,
    "storage_mb": 500,
    "realtime_connections": 50
  },
  "quotas": {
    "db_queries_monthly": 10000,
    "storage_gb_monthly": 10
  }
}
```

### Data Plane Behavior
- Cache this snapshot (TTL: 30-60 seconds)
- Do NOT hit DB directly for governance
- Fail closed if unavailable
- This improves performance and prevents cascading failures

### Implementation
**File**: `/home/ken/control-plane-api/src/app/api/internal/snapshot/route.ts` (NEW)
**Middleware in data plane services**: Fetch and cache snapshot on startup

---

## Phase 0.12: Provisioning State Machine (Not Just Status)

### Why This Matters
Real-world failure modes:
- Step 3 fails after step 2 succeeds
- Partial resources exist
- Retrying blindly causes duplicates

### Current Model (Insufficient)
```sql
provisioning_status VARCHAR(20) -- Just a string
last_provision_error TEXT -- Just one error
```

### New Model: Step-Aware State Machine
```sql
CREATE TABLE control_plane.provisioning_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_name VARCHAR(50) NOT NULL, -- create_schema, register_auth, etc
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, success, failed, skipped
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, step_name)
);
```

### Provisioning Steps (Ordered)
1. `create_tenant` - Create tenant record
2. `create_schema` - Create `tenant_{slug}` schema
3. `create_storage_namespace` - Setup storage bucket
4. `register_auth` - Register with auth service
5. `register_realtime` - Register with realtime service
6. `generate_keys` - Create default API keys
7. `verify_services` - Ping all services to confirm ready

### State Transitions
```
PENDING → RUNNING → SUCCESS
  ↓         ↓
      FAILED → (retry from step)
```

### Implementation
**File**: `/home/ken/control-plane-api/src/lib/provisioning/state-machine.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/projects/[id]/provision/route.ts` (UPDATE)

**UI**: Show progress bar with step-by-step status

---

## Phase 0.13: "Break Glass" / Super-Admin Mode

### Why This Matters
Stuff will break:
- Keys locked
- Projects misconfigured
- Data plane unreachable

You need emergency access path.

### Characteristics
- Separate auth (not normal user login)
- Hardware-key / OTP protected
- Full override powers
- Logged aggressively in audit_logs

### Database Schema
```sql
CREATE TABLE control_plane.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES developers(id),
  reason TEXT NOT NULL,
  access_method VARCHAR(50), -- hardware_key, otp, emergency_code
  granted_by UUID REFERENCES developers(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE control_plane.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES admin_sessions(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Super-Admin Powers
| Action | Normal Access | Break Glass |
|--------|--------------|-------------|
| Unlock project | ❌ | ✅ |
| Override suspension | ❌ | ✅ |
| Access any project | ❌ | ✅ |
| Force-delete project | ❌ (30-day grace) | ✅ Immediate |
| Regenerate system keys | ❌ | ✅ |
| Disable feature flags | ❌ | ✅ |
| Access all secrets | ❌ | ✅ |

### Implementation
**File**: `/home/ken/developer-portal/src/app/admin/break-glass/page.tsx` (NEW)
**File**: `/home/ken/control-plane-api/src/lib/admin/break-glass.ts` (NEW)
**Auth**: Require TOTP or hardware key

---

## Phase 0.14: Secrets Versioning & Rotation

### Why This Matters
Production secrets are living things. You need:
- Safe rotation
- Rollback capability
- Audit trail
- Blast radius awareness

### Current Model (Insufficient)
```sql
-- Secrets exist but no versioning
```

### New Model: Versioned Secrets
```sql
CREATE TABLE control_plane.secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value_encrypted TEXT NOT NULL, -- PGP encrypted
  version INT DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  rotated_from UUID REFERENCES secrets(id), -- Previous version
  rotation_reason TEXT,
  created_by UUID REFERENCES developers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, name, version)
);

CREATE TABLE control_plane.secret_consumers (
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL, -- edge_function, worker, etc
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (secret_id, service)
);
```

### Rotation Flow
1. Create new version (v2) of secret
2. Mark v1 as `active = false`
3. Link v2.rotated_from = v1.id
4. Notify all consumers via webhook
5. Consumers fetch and activate v2
6. After 24h, delete v1

### Implementation
**File**: `/home/ken/control-plane-api/src/app/api/secrets/route.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/secrets/[id]/rotate/route.ts` (NEW)
**UI**: Show secret history, rotation status, consumer list

---

## Phase 0.15: Observability Beyond Logs (Traces & Health)

### Why This Matters
Logs ✅, Usage ✅, but missing:
- Request tracing
- Service health reporting
- Correlation IDs

### The Problem
Right now: Logs exist but no way to trace a request across services

### The Solution

#### 1. Correlation IDs (Everywhere)
```typescript
// Middleware in all services
import { randomUUID } from 'crypto'

export function addCorrelationId(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
}
```

#### 2. Store in Logs + Audit
```sql
ALTER TABLE control_plane.project_logs ADD COLUMN request_id UUID;
ALTER TABLE control_plane.audit_logs ADD COLUMN request_id UUID;
```

#### 3. Service Health Endpoint
```
GET /internal/health
```

**Response**:
```json
{
  "status": "ok",
  "version": "1.3.2",
  "uptime": 123456,
  "dependencies": {
    "database": { "status": "ok", "latency_ms": 5 },
    "redis": { "status": "ok", "latency_ms": 2 },
    "control_plane_api": { "status": "ok", "latency_ms": 15 }
  },
  "timestamp": "2026-01-28T10:30:00Z"
}
```

#### 4. Request Tracing (Basic)
```sql
CREATE TABLE control_plane.request_traces (
  request_id UUID PRIMARY KEY,
  project_id UUID,
  path TEXT,
  method VARCHAR(10),
  services_hit JSONB, -- ["api-gateway", "database", "auth"]
  total_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Implementation
**File**: `/home/ken/control-plane-api/src/lib/middleware/correlation.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/internal/health/route.ts` (NEW)
**All data plane services**: Add correlation middleware

---

## Phase 0.16: Deletion with Preview (Trust Matters)

### Why This Matters
Deletion is the hardest feature. Users need to understand:
- What will be deleted?
- What depends on what?
- Is this recoverable?

### Current Model (Insufficient)
```sql
DELETE FROM projects WHERE id = $1 -- Gone forever
```

### New Model: Soft Delete + Preview

#### Step 1: Dependency Awareness
```sql
CREATE TABLE control_plane.deletion_preview (
  project_id UUID PRIMARY KEY,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculated on demand
SELECT
  'schemas' as resource_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema LIKE 'tenant_%'
UNION ALL
SELECT
  'api_keys',
  COUNT(*)
FROM control_plane.api_keys
WHERE project_id = $1
UNION ALL
SELECT
  'webhooks',
  COUNT(*)
FROM control_plane.webhooks
WHERE project_id = $1
UNION ALL
SELECT
  'edge_functions',
  COUNT(*)
FROM control_plane.edge_functions
WHERE project_id = $1;
```

#### Step 2: Soft Delete First
```sql
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN deletion_scheduled_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN grace_period_ends_at TIMESTAMPTZ;

-- 30-day grace period before hard delete
```

#### Step 3: Preview API
```
GET /projects/{id}/deletion-preview
```

**Response**:
```json
{
  "project": {
    "id": "uuid",
    "name": "My Project",
    "slug": "my-project"
  },
  "will_be_deleted": {
    "database_schemas": 1,
    "tables": 15,
    "api_keys": 4,
    "webhooks": 2,
    "edge_functions": 3,
    "storage_buckets": 2,
    "secrets": 8
  },
  "dependencies": [
    { "type": "webhook", "target": "https://example.com/hook", "impact": "Will stop receiving events" },
    { "type": "storage", "target": "telegram:bucket123", "impact": "Files will be deleted" }
  ],
  "recoverable_until": "2026-02-27T10:30:00Z"
}
```

### Implementation
**File**: `/home/ken/control-plane-api/src/app/api/projects/[id]/deletion-preview/route.ts` (NEW)
**File**: `/home/ken/control-plane-api/src/app/api/projects/[id]/delete/route.ts` (UPDATE - soft delete)
**UI**: Show preview modal before confirming deletion

---

## Phase 0.17: MCP & AI Access Governance

### Why This Matters
AI is powerful — and dangerous without guardrails.

### Questions to Answer
- Which scopes can MCP access?
- Can MCP run mutations?
- Can MCP access secrets?
- Is MCP read-only by default?

### Governance Model

#### MCP Token Types
| Type | Prefix | Scopes | Use Case |
|------|--------|--------|----------|
| MCP Read-Only | `mcp_ro_` | `db:select`, `storage:read` | AI assistants, codegen |
| MCP Write | `mcp_rw_` | + `db:insert`, `db:update`, `storage:write` | AI with write access |
| MCP Admin | `mcp_admin_` | + `db:delete`, `secrets:read` | Trusted AI ops |

#### Default Behavior
```typescript
// MCP tokens are READ-ONLY by default
const mcpDefaultScopes = {
  db: ['select'],
  storage: ['read'],
  auth: [], // No auth access by default
  realtime: ['subscribe'] // Listen only
}
```

#### Explicit Opt-In for Destructive Actions
```typescript
// UI must show warning when granting write access
<Warning text="This AI can modify your data. Only grant to trusted systems." />
```

#### Audit All MCP Actions
```sql
-- Every MCP action logged with:
-- - actor_type = 'mcp_token'
-- - Which AI/IDE made the request
-- - Full payload for forensics
```

### Implementation
**File**: `/home/ken/control-plane-api/src/app/api/keys/route.ts` (UPDATE - add MCP types)
**File**: `/home/ken/control-plane-api/src/lib/mcp/governance.ts` (NEW)
**UI**: Show MCP-specific warnings and scope explanations

---

## Phase 0.18: Platform Invariants Document (Internal)

### Why This Matters
This is NOT user docs. This is for you and future contributors. It will save you from architectural drift.

### Example Invariants

```markdown
# NextMavens Platform Invariants

## Core Principles

### 1. Control Plane is the Source of Truth
- The control plane database is authoritative for all governance state
- Data plane services NEVER mutate governance state
- Data plane services ONLY read from control plane via snapshot API

### 2. All Destructive Actions Are Idempotent
- Deleting a project twice = same result
- Rotating a key twice = same result
- No partial failures leave system in undefined state

### 3. Every Request Is Attributable to a Project
- Every API request must have `project_id` in JWT
- Every log entry must have `project_id`
- Every audit entry must have `actor_id` and `project_id`

### 4. Data Plane Never Talks Directly to Control DB
- All control plane access goes through Control Plane API
- No direct DB connections from data plane to control plane schema

### 5. Isolation Is Enforced, Not Implied
- Every database query scoped to `tenant_{project_id}`
- Every realtime channel prefixed with `project_id:`
- Every storage path prefixed with `project_id:/`
- Cross-project access returns 403, never 404

### 6. Observability Is Universal
- Every request has `x-request-id`
- Every log entry has `request_id`
- Every audit entry has `request_id`
- Correlation across services is always possible

### 7. Fail Closed, Never Open
- If control plane is unreachable, deny all requests
- If snapshot is unavailable, deny all requests
- If service health is unknown, deny all requests
- Security > Availability

### 8. Secrets Are Never Logged
- Secret values never appear in logs
- Secret values never appear in error messages
- Secret values never appear in audit logs (only refs)

### 9. MCP is Read-Only by Default
- MCP tokens start with read-only access
- Write access requires explicit opt-in with warnings
- MCP actions are heavily audited

### 10. Deletion is Soft First
- All deletions start with 30-day grace period
- Preview shows exactly what will be deleted
- Dependencies are called out explicitly
```

### Implementation
**File**: `/home/ken/PLATFORM_INVARIANTS.md` (NEW - repo root)
**File**: `/home/ken/developer-portal/PLATFORM_INVARIANTS.md` (NEW - symlink or copy)

---

## Phase 1: Organizations & Teams (CRITICAL - Real Teams Need This)

### Why This Matters
Right now: 1 developer = 1 project
Reality: Production teams have multiple members, roles, client handoffs

### Database Schema Addition
```sql
-- Organizations (teams/companies)
CREATE TABLE control_plane.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID REFERENCES developers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members with roles
CREATE TABLE control_plane.organization_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES developers(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- owner, admin, developer, viewer
  invited_by UUID REFERENCES developers(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Add to projects table
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

### Roles & Permissions
| Role | Can Delete Projects | Can Manage Services | Can Manage Keys | Can View Logs | Can Use Services |
|------|-------------------|-------------------|-----------------|---------------|----------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ❌ | ✅ | ✅ | ✅ | ✅ |
| Developer | ❌ | ❌ | ❌ | ✅ | ✅ |
| Viewer | ❌ | ❌ | ❌ | ✅ | ❌ (read-only) |

### Implementation Files
**File**: `/home/ken/developer-portal/src/app/api/organizations/route.ts` (NEW)
**File**: `/home/ken/developer-portal/src/app/api/organizations/[id]/members/route.ts` (NEW)
**File**: `/home/ken/developer-portal/src/app/dashboard/organizations/page.tsx` (NEW)

---

## Phase 1: Project Metadata Service (CRITICAL FOUNDATION)

### Why This Matters
Supabase has an internal projects database that controls everything. Without this, we're just "gluing services together" with no real governance.

### Database Schema

**File**: Database migration to create control plane tables

```sql
-- Core project table
CREATE TABLE control_plane.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES developers(id),
  status VARCHAR(20) DEFAULT 'created', -- created, active, suspended, archived, deleted
  environment VARCHAR(10) DEFAULT 'prod', -- prod, dev, staging
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Which services are enabled per project
CREATE TABLE control_plane.project_services (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service VARCHAR(20) NOT NULL, -- database, auth, realtime, storage, graphql
  enabled BOOLEAN DEFAULT FALSE,
  config_json JSONB,
  PRIMARY KEY (project_id, service)
);

-- Enhanced API keys with types and scopes
CREATE TABLE control_plane.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  key_type VARCHAR(20) NOT NULL, -- public, secret, service_role, mcp
  key_prefix VARCHAR(20) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  scopes JSONB, -- ["db:select", "db:insert", "storage:read"]
  environment VARCHAR(10) DEFAULT 'prod',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

-- Edge functions
CREATE TABLE control_plane.edge_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  entry_point VARCHAR(255),
  runtime VARCHAR(20),
  env_vars JSONB,
  status VARCHAR(20) DEFAULT 'active'
);

-- Storage buckets
CREATE TABLE control_plane.storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(20) DEFAULT 'telegram', -- telegram, cloudinary
  public BOOLEAN DEFAULT FALSE
);

-- Usage tracking (for future billing + quotas)
CREATE TABLE control_plane.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service VARCHAR(20) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- db_query, realtime_message, storage_upload, etc
  quantity INTEGER DEFAULT 1,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project logs
CREATE TABLE control_plane.project_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service VARCHAR(20),
  level VARCHAR(10), -- info, warn, error
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Implementation Files
**File**: `/home/ken/developer-portal/src/lib/control-plane.ts` (NEW)
**File**: `/home/ken/developer-portal/src/app/api/control-plane/migrate/route.ts` (NEW)

---

## Phase 1.5: Project Provisioning Pipeline

### The Cold Start Problem
Right now: Project exists → services are ready (assumed)
Reality: DB needs creation, schemas need setup, services need registration

### Provisioning States
```tsx
CREATED → PROVISIONING → ACTIVE
  ↓           ↓           ↓
Database   Services   Ready
```

### What Happens During Provisioning
1. Create tenant schema `tenant_{project_id}`
2. Register project with auth service
3. Register with realtime service
4. Create storage namespace
5. Generate default keys
6. Mark project ACTIVE

### Database Schema
```sql
ALTER TABLE projects ADD COLUMN provisioning_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE projects ADD COLUMN last_provision_error TEXT;
ALTER TABLE projects ADD COLUMN provisioned_at TIMESTAMPTZ;
```

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/projects/[id]/provision/route.ts` (NEW)

**UI**: Show progress indicator during provisioning, retry on failure

---

## Phase 2: RBAC (Role-Based Access Control)

### Why This Matters
Right now: Any logged-in user can do too much
Need: Explicit permissions based on role

### Permission Matrix
| Action | Owner | Admin | Developer | Viewer |
|--------|-------|-------|-----------|--------|
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Manage services | ✅ | ✅ | ❌ | ❌ |
| Create/delete keys | ✅ | ✅ | ❌ | ❌ |
| View secrets | ✅ | ✅ | ❌ | ❌ |
| View logs | ✅ | ✅ | ✅ | ✅ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Use services | ✅ | ✅ | ✅ | ❌ (read-only) |

### Implementation
**File**: `/home/ken/developer-portal/src/lib/rbac.ts` (NEW)

**Enforcement**:
- Developer Portal UI (hide/show based on role)
- Control plane APIs (check permissions before actions)
- Studio actions (SQL editor only for Admin+)

---

## Phase 3: Enhanced API Key System

### Key Types (Match Supabase Mental Model)
| Type | Prefix | Usage | Example |
|------|--------|-------|--------|
| Public | `pk_` | Browser/mobile SDK | `pk_live_xxx`, `pk_test_xxx` |
| Secret | `sk_` | Server-side (Node, API routes) | `sk_live_xxx` |
| Service Role | `sr_` | Admin tasks (bypass RLS) | `sr_live_xxx` |
| MCP Token | `mcp_` | AI/IDE integrations | `mcp_xxx` |

### Key Scopes (Critical for Granular Control)
```json
{
  "db": ["select", "insert", "update", "delete"],
  "storage": ["read", "write"],
  "auth": ["signin", "signup", "manage"],
  "realtime": ["subscribe"],
  "graphql": ["execute"]
}
```

### Implementation
**File**: `/home/ken/developer-portal/src/app/dashboard/projects/[slug]/page.tsx`

**API Keys Tab Enhancement**:
1. Key type selector when creating (public/secret/service/mcp)
2. Environment selector (prod/dev/test)
3. Scope checkboxes based on key type
4. Explanation panel showing when to use each type
5. Security warnings for service_role keys

---

## Phase 4: Key Rotation & Revocation Strategy

### Why This Matters
Production platforms need key hygiene. Devs will:
- Accidentally expose keys
- Need to rotate keys periodically
- Need to revoke compromised keys

### Features to Add
**Key Rotation**:
- "Rotate" button on each key
- Creates new key, keeps old key active for 24h overlap
- Auto-expires old key after overlap period

**Key Revocation**:
- "Revoke" button on each key
- Immediately invalidates key
- Shows usage stats per key

**Key Usage Stats**:
- Last used timestamp
- Request count (last 7 days, 30 days)
- Success vs error rate

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/api-keys/[id]/rotate/route.ts` (NEW)
**File**: `/home/ken/developer-portal/src/app/api/api-keys/[id]/revoke/route.ts` (NEW)

---

## Phase 5: Project Lifecycle Management

### Project States
```
CREATED → ACTIVE → SUSPENDED → ARCHIVED → DELETED
```

### State Behaviors
| State | Keys Work? | Services Active? | Data Access |
|-------|-------------|-----------------|-------------|
| CREATED | Yes | Yes | Yes |
| ACTIVE | Yes | Yes | Yes |
| SUSPENDED | No | No | Read-only |
| ARCHIVED | No | No | Read-only |
| DELETED | No | No | Deleted (after 7-30 day grace) |

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/projects/[id]/status/route.ts` (NEW)

**UI**: Add status badge and actions in project detail page

---

## Phase 4: Enhanced Database Studio

### Current: `/studio/[slug]` - Table Viewer (Good!)
### Add: SQL Editor (Critical)
**File**: `/home/ken/developer-portal/src/components/studio/SqlEditor.tsx` (NEW)

**Features**:
- Monaco editor for SQL
- Run Query button
- Results table below
- Transaction mode (read-only by default)
- Query history

### Add: Schema Browser
**File**: `/home/ken/developer-portal/src/components/studio/SchemaBrowser.tsx` (NEW)

**Shows**:
- Tables list
- Columns with types
- Indexes
- Foreign keys
- Policies (even if RLS not enforced yet - build the UI first)

### Add: Auth User Manager (Killer Feature!)
**File**: `/home/ken/developer-portal/src/components/studio/AuthUsers.tsx` (NEW)

**Features**:
- Users list
- Email, name, metadata
- Auth provider (email, OAuth later)
- Disable/delete user
- Reset password
- View active sessions

**Route**: Add to `/studio/[slug]` sidebar as "Users"

---

## Phase 5: Enhanced Project Detail Pages

### Current Tab Structure
Each tab shows connection strings but NO guidance.

### New Structure for Each Tab
```tsx
{activeTab === 'database' && (
  <div>
    {/* What is this? */}
    <Section title="What is the Database Service?">
      PostgreSQL-powered data with auto-generated REST & GraphQL APIs.
    </Section>

    {/* When to use it? */}
    <Section title="When to use it">
      Storing application data, running queries, building data-driven features.
    </Section>

    {/* Quick Integration */}
    <Section title="Quick Integration">
      <CodeBlock>
npm install nextmavens-js
      </CodeBlock>
      <CodeBlock>
import { NextMavensClient } from 'nextmavens-js'
const client = new NextMavensClient({
  apiKey: 'pk_live_your_key_here'
})
      </CodeBlock>
      <CopyButton />
    </Section>

    {/* Connection Details */}
    <Section title="Your Connection Details">
      <DatabaseUrl />
      <GraphQLEndpoint />
    </Section>

    {/* Learn More */}
    <Link href="/docs/database">Full Documentation →</Link>
  </div>
)}
```

### Tabs to Enhance
1. **Database** - Add integration code, SDK examples
2. **Auth** - Add user management UI link, integration code
3. **Storage** - Be transparent about Telegram/Cloudinary, show buckets
4. **Realtime** - WebSocket example, subscription code, lifecycle
5. **GraphQL** - Query examples, schema exploration
6. **API Keys** - Key type explanations, when to use which, security

---

## Phase 6: API Gateway as Enforcer (Not Just Router)

### Current: Gateway routes requests
### New: Gateway enforces rules

**File**: `/home/ken/api-gateway/` (existing service - enhance)

**Enforcement Pipeline**:
```
Request → Validate Key → Check Project Status → Check Service Enabled → Apply Rate Limit → Forward Request
```

### Implementation
**Middleware** in each service:
1. Extract `project_id` from JWT
2. Check `control_plane.projects.status`
3. Check `control_plane.project_services.enabled`
4. Check rate limits from usage metrics
5. Return 403/429 if any check fails

---

## Phase 7: Webhooks & Events System

### Why This Matters
Platforms need to push events to external systems for:
- Stripe (billing)
- Analytics (Mixpanel, Amplitude)
- Automations (Zapier, Make)
- Internal webhooks

### Database Schema
```sql
CREATE TABLE control_plane.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL, -- user.created, user.deleted, file.uploaded, etc.
  target_url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE control_plane.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  delivered_at TIMESTAMPTZ,
  status VARCHAR(20), -- pending, delivered, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Event Types to Emit
| Event | Description | Payload |
|-------|-------------|---------|
| `project.created` | New project created | Project details |
| `project.suspended` | Project suspended | Reason |
| `user.created` | New user registered | User data |
| `user.deleted` | User deleted | User ID |
| `file.uploaded` | File uploaded | File info |
| `key.created` | API key created | Key type |
| `key.rotated` | Key rotated | New key info |
| `function.executed` | Edge function ran | Result |
| `usage.threshold` | Usage exceeded quota | Metrics |

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/webhooks/route.ts` (NEW)
**File**: `/home/ken/developer-portal/src/app/dashboard/projects/[slug]/webhooks/page.tsx` (NEW tab)

---

## Phase 8: Usage Tracking (Bill Later, Track Now)

### What to Track
| Service | Metrics to Track |
|---------|-------------------|
| Database | Queries, rows read, rows written |
| Realtime | Messages sent, connections |
| Storage | Uploads, downloads, bytes transferred |
| Auth | Signups, signins, active users |
| GraphQL | Queries, mutations |

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/usage/track/route.ts` (NEW)

**All services** should call this endpoint when handling requests.

**Dashboard**: Show usage summary in project overview

---

## Phase 11: Abuse & Safety Controls

### Why This Matters
Real users do dumb things, malicious users do worse. Platform needs self-protection.

### Per-Project Hard Caps
| Resource | Limit | Action When Exceeded |
|----------|-------|----------------------|
| DB queries/day | 10,000 | Auto-suspend |
| Realtime connections | 100 | Reject new connections |
| Storage uploads/day | 1,000 | Auto-suspend |
| Edge function invocations/day | 5,000 | Auto-suspend |

### Signup Abuse Prevention
- Rate limit: 3 projects per hour per org
- Email verification required
- IP-based rate limiting
- CAPTCHA on signup (optional)

### Auto-Suspension Triggers
- Exceed 3x average usage for 1 hour
- Spike in error rate (>50%)
- Malicious patterns detected

### User Communication
**Suspension Message**:
```
This project was temporarily suspended due to excessive usage.
Contact support or upgrade your plan.
```

**Implementation**
**File**: `/home/ken/developer-portal/src/app/api/projects/[id]/suspend/route.ts` (NEW)
**File**: `/home/ken/developer-portal/src/lib/abuse-detection.ts` (NEW)

---

## Phase 12: Secrets & Config Management

### What Developers Need
- Project-level environment variables
- Service-level overrides
- Encrypted at rest
- Not visible after creation

### Implementation
**File**: `/home/ken/developer-portal/src/app/dashboard/projects/[slug]/settings/page.tsx` (NEW tab)

**Features**:
- Add new secret (name, value)
- List existing secrets (values hidden)
- Delete secret
- Environment selector (prod/dev/test)

---

## Phase 9: Observability - Logs & Errors

### Current: Things either "work" or "don't"
### New: Visibility into what's happening

### Implementation
**File**: `/home/ken/developer-portal/src/app/dashboard/projects/[slug]/logs/page.tsx` (NEW tab)

**Features**:
- Real-time logs stream
- Filter by service (db, auth, realtime, storage)
- Filter by level (info, warn, error)
- Search logs
- Download logs

**Backend**:
- All services write to `control_plane.project_logs`
- Logs endpoint streams logs to frontend

---

## Phase 10: Resource Isolation Enforcement

### Current: Isolation is implied
### New: Explicitly enforced everywhere

### Rules
1. **JWT must contain `project_id`** as claim
2. **All database queries** scoped to `tenant_{project_id}`
3. **All realtime channels** prefixed with `project_id:`
4. **All storage paths** prefixed with `project_id:/`
5. **All API keys** contain `project_id` reference

### Implementation
**Middleware** in data plane services to enforce:
- Validate `project_id` in JWT
- Check resource access is scoped to project
- Return 403 if cross-project access attempted

---

## Phase 15: API & SDK Versioning Strategy

### Why This Matters
APIs and SDKs will evolve. Breaking changes will happen.

### API Versioning
**Current**: `/api/database/query`
**Future**: `/api/v1/database/query` (add version prefix)

### Versioning Policy
- **Semantic versioning** for SDK: `1.x.x` (compatible), `2.0.0` (breaking)
- **API versions**: `/api/v1/`, `/api/v2/`
- **Deprecation timeline**: 6 months notice before removing
- **Breaking changes documented** in changelog

### Documentation
**File**: `/home/ken/developer-developer-portal/src/app/docs/versioning/page.tsx` (NEW)

**Explain**:
- How we version APIs
- SDK compatibility guarantees
- Breaking change policy
- How to migrate between versions

---

## Phase 16: Backup & Restore Strategy (Telegram Integration)

### User's Existing Infrastructure
**Telegram Backup Bot** (already integrated):
- Automatic daily backups for files > 2GB
- JSON format for easy fetching and previewing
- Long-term storage on Telegram
- Clear old backups as needed

### What We Add
**Documentation** - Explain the backup story:
- Database backups: Coming soon (manual export option available)
- Storage backups: Handled via Telegram (automatic, files >2GB)
- Logs: Archived via Telegram for long-term storage
- Restore: Fetch from Telegram links, preview in JSON format

### Manual Export Option
**File**: `/home/ken/developer-portal/src/app/dashboard/projects/[slug]/settings/backup/page.tsx` (NEW)

**Features**:
- "Export Database" button - generates SQL dump
- "Export Logs" button - downloads log file
- "Send to Telegram Backup" - stores backup via existing bot
- Backup history list with restore options

### Implementation
**File**: `/home/ken/developer-portal/src/app/api/backup/export/route.ts` (NEW)

---

## Phase 17: Support & Debugging Escape Hatch

### Why This Matters
When things break, logs aren't enough. Users need a way to get help.

### "Request Support" Action
**Per-project support button**:
- In project header
- Auto-attaches: project ID, recent logs, error context
- Pre-fills support form
- Shows incident status

### Incident Status Page (Future)
**File**: `/home/ken/developer-portal/src/status/page.tsx` (NEW)

**Shows**:
- All systems operational?
- Degraded services
| Service | Status | Message |
|---------|--------|--------|
| API Gateway | ✅ Operational | - |
| Auth Service | ⚠️ Degraded | Slow responses |
| Realtime | ✅ Operational | - |

---

## Phase 18: Multi-Region & Scaling Roadmap

### Current State: Single VPS (Totally Fine!)
**Be transparent**: We're single-region for now.

### Scaling Roadmap (Document for Future)
- **Phase 1**: Single VPS with horizontal scaling
- **Phase 2**: Multiple regions (US, EU, Asia)
- **Phase 3**: Auto-scaling based on load

### Constraints Documented
**File**: `/home/ken/developer-portal/src/app/docs/infrastructure/page.tsx` (NEW)

**Explains**:
- Current single-region deployment
- Scaling roadmap
- Regional data isolation
- Disaster recovery plans

### Be Opinionated (This Attracts the Right Developers)

**File**: `/home/ken/developer-portal/src/app/docs/philosophy/page.tsx` (NEW)

**Our Stance**:
- **Postgres-native**: SQL-first, not ORM-first
- **Realtime is DB-driven**: Subscriptions follow table structure
- **Storage is abstracted but not generic**: Telegram for raw, Cloudinary for optimized
- **Authentication is JWT-first**: Tokens, not sessions
- **Multi-tenant by default**: Every project is isolated

---

## Phase 12: Documentation - Collapsible Sidebar

### User Preference: Collapsible (not permanent)

**File**: `/home/ken/developer-portal/src/app/docs/layout.tsx` (NEW)

**Features**:
- Toggle button to show/hide
- Smooth CSS transition
- Mobile-responsive (hamburger menu)
- Active section highlighting
- Copy-all button on top

**Sidebar Structure**:
```
- Getting Started
- Database
  - Overview
  - CRUD Operations
  - Query Builder
  - Filters
- Authentication
  - Overview
  - User Management
  - Security
- Realtime
  - Overview
  - WebSocket
  - Subscriptions
  - Events
- Storage
  - Overview
  - Telegram vs Cloudinary
  - Buckets
- GraphQL
  - Overview
  - Queries
  - Mutations
  - Schema
- JavaScript SDK
  - Installation
  - Database
  - Auth
  - Realtime
  - Storage
- MCP Integration
  - Overview
  - Installation
  - Configuration
  - Tools
```

---

## Phase 13: SDK Documentation Integration

### User Preference: Copy into portal (not external links)

**File**: `/home/ken/developer-portal/src/app/docs/sdk/page.tsx` (NEW)

**Source**: Copy content from `/home/ken/nextmavens-js/README.md`

**Sections**:
- Installation from GitHub
- Client initialization
- Database query builder
- Auth methods
- Realtime subscriptions
- Storage operations
- Error handling

---

## Phase 14: Failure Modes & Limits Documentation

### Explain What Breaks

**File**: Update all service documentation pages to include:

**For each service**:
- Rate limits
- Max file sizes
- Query timeouts
- Connection limits
- Error codes and meanings
- Common pitfalls

**Example for Database**:
- Max rows per query: 1000
- Query timeout: 30 seconds
- Rate limit: 100 requests/minute
- Error codes with explanations

---

## Implementation Order (Prioritized)

### Phase 0: Platform Architecture (CRITICAL - Do This First)
These separate "ambitious platform" from "legit PaaS foundation."

1. **Control Plane API Boundary** (0.10) - Extract control routes into standalone service
2. **Control Plane Snapshot Contract** (0.11) - Source of truth for data plane
3. **Platform Invariants Document** (0.18) - Write down architectural rules
4. **CLI** (0.9) - Developer experience dealbreaker

### Phase 0.1: Platform Reliability (Battle-Tested Foundation)
5. **Background Jobs & Task Queue** (0.1) - Provisioning, rotation, webhooks, backups
6. **Idempotency & Safety Nets** (0.2) - Duplicate request protection
7. **Audit Logs** (0.3) - Who did what when
8. **Quotas vs Limits** (0.4) - Clear distinction, better UX
9. **Environment Parity** (0.5) - Dev vs Prod behaviors
10. **SDK Error Semantics** (0.6) - Consistent error format
11. **Kill Switches** (0.7) - Feature flags for safety
12. **Migration Strategy** (0.8) - Rollback capability

### Phase 0.2: Platform Maturity (Production Survival)
13. **Provisioning State Machine** (0.12) - Step-aware, not just status
14. **"Break Glass" / Super-Admin Mode** (0.13) - Emergency access path
15. **Secrets Versioning & Rotation** (0.14) - Living secrets, not static
16. **Observability Beyond Logs** (0.15) - Traces, health, correlation IDs
17. **Deletion with Preview** (0.16) - Soft delete, dependency awareness
18. **MCP & AI Access Governance** (0.17) - Guardrails for AI access

### Wave 1: Foundation (Teams & Governance)
19. **Organizations & Teams** - Multi-member projects, roles
20. **RBAC** - Permission system
21. **Project Metadata DB** - Control plane schema
22. **Enhanced API Keys** - Types, scopes, environments
23. **Project Provisioning Pipeline** - Cold start setup (enhanced with state machine)
24. **Project Lifecycle** - States and transitions
25. **Project Detail Pages** - Integration guidance for each tab (PRIMARY FOCUS)
26. **Auth User Manager** - View/manage users in Studio

### Wave 2: Safety & Trust (Production Ready)
27. **Usage Tracking** - Start collecting metrics
28. **Logs Page** - Real-time observability
29. **API Gateway Enforcement** - Validate at gateway level (uses snapshot)
30. **Resource Isolation** - Enforce project boundaries
31. **Key Rotation & Revocation** - Key hygiene
32. **Abuse Controls** - Hard caps, auto-suspension
33. **Webhooks & Events** - Outbound events
34. **Backup Strategy** - Telegram integration documented
35. **Support Escape Hatch** - Request support with context

### Wave 3: Studio Enhancement (Developer Experience)
36. **SQL Editor** - Run queries from UI
37. **Schema Browser** - Tables, columns, indexes
38. **Policies UI** - Even if not enforced yet

### Wave 4: Documentation (Clarity & Trust)
39. **Collapsible Sidebar** - Better navigation
40. **SDK Documentation** - Integrated from nextmavens-js
41. **Realtime Documentation** - Complete guide
42. **Platform Philosophy** - Our opinionated stance
43. **Failure Modes & Limits** - Explain what breaks
44. **Versioning Strategy** - API/SDK evolution
45. **Infrastructure Docs** - Scaling roadmap

---

## File Changes Summary

### Phase 0: Platform Architecture (CRITICAL - Do First)
| File | Purpose |
|------|---------|
| `/home/ken/control-plane-api/` | **NEW SERVICE** - Standalone Control Plane API |
| `control-plane-api/src/app/api/projects/route.ts` | Project CRUD, lifecycle |
| `control-plane-api/src/app/api/orgs/route.ts` | Organization management |
| `control-plane-api/src/app/api/keys/route.ts` | API key CRUD, rotation, MCP types |
| `control-plane-api/src/app/api/usage/route.ts` | Usage tracking, quotas |
| `control-plane-api/src/app/api/jobs/route.ts` | Job management |
| `control-plane-api/src/app/api/audit/route.ts` | Audit log access |
| `control-plane-api/src/app/api/webhooks/route.ts` | Webhook management |
| `control-plane-api/src/app/api/internal/snapshot/route.ts` | **CRITICAL** - Source of truth contract |
| `control-plane-api/src/app/api/internal/health/route.ts` | Service health reporting |
| `control-plane-api/src/lib/auth.ts` | JWT authentication (shared) |
| `control-plane-api/src/lib/db.ts` | Database connection (shared) |
| `control-plane-api/src/lib/provisioning/state-machine.ts` | Step-aware provisioning |
| `control-plane-api/src/lib/admin/break-glass.ts` | Super-admin emergency access |
| `control-plane-api/src/lib/mcp/governance.ts` | MCP access guardrails |
| `control-plane-api/src/lib/middleware/correlation.ts` | Request ID propagation |
| `/home/ken/nextmavens-cli/` | **NEW SERVICE** - Standalone CLI tool |
| `nextmavens-cli/src/commands/auth.ts` | Login/logout commands |
| `nextmavens-cli/src/commands/project.ts` | Project CRUD operations |
| `nextmavens-cli/src/commands/db.ts` | Database operations |
| `nextmavens-cli/src/commands/functions.ts` | Function deployment |
| `nextmavens-cli/src/commands/secrets.ts` | Secret management |
| `nextmavens-cli/src/lib/api-client.ts` | Wrapper around Control Plane API |
| `nextmavens-cli/package.json` | Distribute via npm |
| `/home/ken/PLATFORM_INVARIANTS.md` | **CRITICAL** - Internal architectural rules |
| `/home/ken/developer-portal/PLATFORM_INVARIANTS.md` | Symlink to invariants doc |

### Phase 0.1: Platform Reliability (8 New Systems)
| File | Purpose |
|------|---------|
| `src/lib/jobs/queue.ts` | Job queue system |
| `src/lib/jobs/worker.ts` | Background job worker |
| `src/lib/idempotency.ts` | Idempotency middleware |
| `src/lib/audit.ts` | Audit logging system |
| `src/app/api/usage/check-quota/route.ts` | Quota checking |
| `src/lib/environment.ts` | Environment behavior rules |
| `src/lib/errors.ts` | Standardized error format |
| `src/lib/features.ts` | Feature flag system |
| `src/lib/migrations.ts` | Migration tracking |
| `src/app/api/jobs/[id]/route.ts` | Job status API |
| `src/admin/feature-flags/page.tsx` | Admin feature flag UI |
| `src/app/dashboard/projects/[slug]/audit/page.tsx` | Audit log viewer |

### Phase 0.2: Platform Maturity (6 Critical Systems)
| File | Purpose |
|------|---------|
| `control-plane-api/src/app/api/secrets/route.ts` | Secret CRUD with versioning |
| `control-plane-api/src/app/api/secrets/[id]/rotate/route.ts` | Secret rotation with grace period |
| `control-plane-api/src/app/api/projects/[id]/deletion-preview/route.ts` | **CRITICAL** - Show what will be deleted |
| `control-plane-api/src/app/api/projects/[id]/delete/route.ts` | Soft delete with 30-day grace |
| `developer-portal/src/app/admin/break-glass/page.tsx` | Super-admin emergency access UI |
| `developer-portal/src/app/dashboard/projects/[slug]/settings/secrets/page.tsx` | Secret versioning UI |
| Database migrations | Add `provisioning_steps`, `secrets` (versioned), `admin_sessions`, `request_traces`, `deletion_*` columns |

### Phase 1: Foundation (Teams & Governance)
| File | Purpose |
|------|---------|
| `src/lib/control-plane.ts` | Control plane DB connection |
| `src/app/api/control-plane/migrate/route.ts` | DB migration endpoint |
| `src/app/api/organizations/route.ts` | Organizations CRUD |
| `src/app/api/organizations/[id]/members/route.ts` | Member management |
| `src/app/dashboard/organizations/page.tsx` | Orgs UI |
| `src/lib/rbac.ts` | Permission system |
| `src/app/api/projects/[id]/provision/route.ts` | Provisioning pipeline |
| `src/components/studio/AuthUsers.tsx` | User management in Studio |
| `src/app/dashboard/projects/[slug]/page.tsx` | Major: integration guidance, key explanations |

### Phase 2: Safety & Trust
| File | Purpose |
|------|---------|
| `src/app/api/api-keys/[id]/rotate/route.ts` | Key rotation |
| `src/app/api/api-keys/[id]/revoke/route.ts` | Key revocation |
| `src/app/api/api-keys/[id]/usage/route.ts` | Key usage stats |
| `src/app/api/webhooks/route.ts` | Webhook management |
| `src/app/dashboard/projects/[slug]/webhooks/page.tsx` | Webhooks UI |
| `src/app/api/usage/track/route.ts` | Usage tracking endpoint |
| `src/app/dashboard/projects/[slug]/logs/page.tsx` | Logs tab |
| `src/app/dashboard/projects/[slug]/settings/page.tsx` | Secrets tab |
| `src/app/dashboard/projects/[slug]/settings/backup/page.tsx` | Backup UI |
| `src/app/api/backup/export/route.ts` | Export/backup functionality |
| `src/app/api/projects/[id]/suspend/route.ts` | Project suspension |
| `src/lib/abuse-detection.ts` | Abuse prevention logic |
| `src/app/api/support/request/route.ts` | Support request handler |

### Phase 3: Studio Enhancement
| File | Purpose |
|------|---------|
| `src/components/studio/SqlEditor.tsx` | SQL runner |
| `src/components/studio/SchemaBrowser.tsx` | Schema viewer |

### Phase 4: Documentation
| File | Purpose |
|------|---------|
| `src/app/docs/layout.tsx` | Collapsible sidebar layout |
| `src/app/docs/sdk/page.tsx` | SDK documentation |
| `src/app/docs/realtime/page.tsx` | Realtime docs |
| `src/app/docs/philosophy/page.tsx` | Platform stance |
| `src/app/docs/versioning/page.tsx` | API/SDK versioning |
| `src/app/docs/infrastructure/page.tsx` | Scaling roadmap |
| `src/app/status/page.tsx` | System status page |

### Files to Modify
| File | Changes |
|------|---------|
| `src/app/api/api-keys/route.ts` | Add key_type, scopes, environment, MCP types, usage stats |
| `src/app/api/projects/route.ts` | Add org_id, provisioning_status, lifecycle methods, soft delete |
| `src/app/studio/[slug]/page.tsx` | Add SQL editor, users, schema, settings tabs |
| All service documentation pages | Add failure modes, limits, rate limits |
| All API endpoints | Use standardized error format |
| **All data plane services** | Add correlation ID middleware, consume snapshot API |

### Data Plane Services to Update
| Service | Changes |
|---------|---------|
| `/home/ken/api-gateway/` | Add correlation middleware, consume snapshot API, enforce limits from snapshot |
| `/home/ken/auth-service/` | Add correlation middleware, consume snapshot API |
| `/home/ken/realtime-service/` | Add correlation middleware, consume snapshot API |
| `/home/ken/graphql-service/` | Add correlation middleware, consume snapshot API |
| `/home/ken/storage-service/` | Add correlation middleware, consume snapshot API |

---

## Verification

### Testing Checklist
1. Create project → status is "created"
2. Activate project → all services enabled
3. Create API key → select type (public/secret/service/mcp)
4. View project → each tab shows integration guidance
5. Open Studio → see tables, run SQL, manage users
6. View logs → see real-time log stream
7. Check usage → see metrics summary
8. Test isolation → try to access another project's data (should fail)
9. Suspend project → keys stop working
10. Delete project → graceful shutdown with 30-day grace

### End-to-End Test
1. New developer signs up
2. Creates first project
3. Sees "What is this?" explanations on each tab
4. Copies integration code and makes first API call
5. Goes to Studio, runs SQL query
6. Views users in Auth tab
7. Checks logs to see request activity
8. Understands key types and when to use each
