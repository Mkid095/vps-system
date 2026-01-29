# Vercel-like PaaS Implementation Plan

## Overview

Transform NextMavens Platform into a Vercel-like PaaS where users can connect GitHub repositories and automatically deploy applications on push events.

## Current State Analysis

**What Exists:**
- Multi-tenant Supabase hosting with isolated databases per project
- Each project gets 4 containers: Studio, PostgREST, GoTrue, Kong
- Port allocation system via `scripts/get-next-ports.sh`
- nginx routing for project-specific paths
- WhatsApp webhook pattern for signature verification

**What's Missing:**
- GitHub integration (webhooks, repo connection)
- Build pipeline for user code
- Application container management
- Deployment tracking and history

---

## Implementation Phases

### Phase 1: Database Schema (Day 1)

**File:** `/home/ken/nextmavens-platform/scripts/00-init.sql`

Add GitHub integration fields to projects table:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_repo_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_branch TEXT DEFAULT 'main';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_webhook_id BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS github_webhook_secret TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_deploy_enabled BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_port INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_container_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS app_status TEXT DEFAULT 'not_deployed';
```

Create deployments tracking table:
```sql
CREATE TYPE deployment_status AS ENUM ('pending', 'building', 'deploying', 'success', 'failed', 'rollback');

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    commit_message TEXT,
    branch TEXT NOT NULL,
    status deployment_status NOT NULL DEFAULT 'pending',
    framework TEXT,
    deployment_url TEXT,
    container_name TEXT,
    image_name TEXT,
    port INTEGER,
    build_logs TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

Create environment variables table:
```sql
CREATE TABLE deployment_env_vars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT false,
    description TEXT,
    UNIQUE(project_id, key)
);
```

---

### Phase 2: GitHub Webhook Handler (Day 2)

**File:** `/home/ken/nextmavens-platform/dashboard/src/app/api/webhooks/github/route.ts`

Follow WhatsApp webhook pattern for signature verification:
- Verify `X-Hub-Signature-256` header using HMAC-SHA256
- Parse `push` events from GitHub
- Trigger deployment on push to configured branch
- Return 200 OK even on errors to prevent webhook retry loops

**Key Functions:**
- `verifyGitHubSignature()` - Validate webhook payload
- `handlePushEvent()` - Process push events and trigger builds
- `findProjectByRepo()` - Match GitHub repo to project

---

### Phase 3: Build Pipeline (Days 3-4)

**File:** `/home/ken/nextmavens-platform/scripts/clone-and-build.sh`

Core build orchestration script:
1. Clone repository to temporary directory
2. Detect framework (Next.js, Vite, Astro, static, Docker)
3. Generate optimized Dockerfile for framework
4. Build Docker image with project-specific tag
5. Output build metadata (image name, framework)

**Supported Frameworks:**
- Next.js → Standalone Docker build
- Vite → Nginx static build
- Astro → Nginx static build
- Nuxt → Node.js server
- Static sites → nginx:alpine
- Dockerfile → Use existing
- Generic Node.js → Default container

---

### Phase 4: Container Deployment (Days 5-6)

**File:** `/home/ken/nextmavens-platform/scripts/deploy-container.sh`

Zero-downtime deployment orchestration:
1. Allocate port for application container
2. Rename existing container (for rollback)
3. Start new container with health checks
4. Wait for health check to pass (30 second timeout)
5. Update nginx routing to new container
6. Stop old container only if deployment successful
7. Automatic rollback on health check failure

**Health Check Strategy:**
- Framework-specific endpoints (Next.js: `/_health`)
- Fallback to root path `/`
- 30-second interval, 3 retries

---

### Phase 5: API Endpoints (Days 7-8)

**Connect GitHub Repo:** `POST /api/projects/[id]/github`
- Validates repo URL and access
- Generates webhook secret
- Registers webhook with GitHub API
- Updates project with GitHub integration

**Manual Deployment:** `POST /api/projects/[id]/deploy`
- Triggers build and deploy
- Supports async mode for background builds
- Returns deployment ID for tracking

**Deployment History:** `GET /api/projects/[id]/deployments`
- Lists all deployments for project
- Shows status, commit info, timestamps

**Rollback:** `POST /api/projects/[id]/rollback`
- Deploys previous successful image
- Creates rollback deployment record
- No rebuild required

**Environment Variables:** CRUD under `/api/projects/[id]/env`
- Manage per-project environment variables
- Secret values encrypted
- Injected into containers at runtime

---

### Phase 6: Webhook Registration (Day 9)

**File:** `/home/ken/nextmavens-platform/scripts/register-github-webhook.sh`

Register webhook with GitHub API:
- Requires `GITHUB_TOKEN` environment variable
- Creates webhook with push events
- Configures webhook URL and secret
- Returns webhook ID for database storage

---

## Critical Implementation Files

1. **`scripts/00-init.sql`** - Database schema (must do first)
2. **`dashboard/src/app/api/webhooks/github/route.ts`** - Webhook handler (entry point)
3. **`scripts/clone-and-build.sh`** - Build pipeline
4. **`scripts/deploy-container.sh`** - Deployment orchestration
5. **`dashboard/src/app/api/projects/[id]/deploy/route.ts`** - Main deployment API

---

## Architecture Flow

```
GitHub Push → Webhook → Build Script → Docker Image → Deploy Script → Container
                                                              ↓
                                                          nginx Update
```

---

## Security Considerations

- **Webhook Secrets:** Per-project unique secrets, HMAC-SHA256 verification
- **GitHub Token:** Personal access token with `admin:repo_hook` scope
- **Secret Encryption:** Use pgcrypto for environment variables
- **Container Isolation:** Each app in separate container with resource limits
- **Network:** All apps on same `nextmavens-network` (can access Supabase services)

---

## Zero-Downtime Deployment Strategy

**Blue-Green Deployment:**
1. Start new container alongside old one
2. Health check new container
3. Update nginx to point to new container
4. Stop old container
5. Keep old container briefly for rollback

**Automatic Rollback:**
- Health check fails → Rollback to previous version
- Build fails → Mark deployment failed, no container changes

---

## Testing Checklist

- [ ] Deploy Next.js app from GitHub push
- [ ] Deploy Vite app from GitHub push
- [ ] Deploy static site
- [ ] Build failure handling
- [ ] Health check failure with rollback
- [ ] Manual deployment trigger
- [ ] Environment variable injection
- [ ] Webhook signature verification

---

## Environment Variables Required

Add to `.env`:
```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_WEBHOOK_URL=https://nextmavens.cloud/api/webhooks/github

# Encryption
ENCRYPTION_KEY=generate-with-openssl-rand-base64-32
```

---

## Implementation Order

1. Database schema migrations
2. Webhook handler (test with ping events)
3. Build pipeline script (test manually)
4. Deploy container script (test manually)
5. API endpoints (connect full flow)
6. End-to-end testing

---

## Estimated Timeline

10 business days for full implementation and testing.
