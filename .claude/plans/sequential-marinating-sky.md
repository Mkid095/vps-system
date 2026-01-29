# NextMavens Self-Hosted Platform - Implementation Plan

## Project Overview

Build a self-hosted platform on Hostinger KVM2 VPS (Ubuntu, user: ken) for deploying and managing multiple SaaS applications. Centralizes Supabase (self-hosted), Evolution API (WhatsApp), email services, and provides a unified dashboard with MCP integration for AI development.

**Key Constraints:**
- 100GB VPS storage limit (monitor, optimize, alert at 80%/90%/95%)
- Low-traffic real-time apps (notifications, chat)
- Shared Docker base images for dependencies
- Production-grade security (Auth + RLS + rate limiting + encrypted secrets)
- Professional branding (no emojis/gradients except external tools)

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    nextmavens.cloud                             │
│                  (Next.js Dashboard)                            │
│  - Orgs/Projects management  - Service redirects                │
│  - Auth (Supabase)            - MCP endpoints                   │
│  - QR code display            - Webhook processing              │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┬─────────────┐
    │                 │              │              │             │
┌───▼────┐    ┌──────▼──────┐  ┌────▼────┐  ┌─────▼─────┐  ┌───▼────┐
│Supabase│    │Evolution API│  │  Redis  │  │   MCPs    │  │  Nginx │
│(self-  │    │  Multi-     │  │(cache)  │  │(stdio)    │  │(routes)│
│hosted) │    │  Instance   │  │         │  │           │  │        │
│        │    │  WhatsApp   │  │         │  │ - Supabase│  │        │
└────────┘    └─────────────┘  └─────────┘  │ - WhatsApp│  └────────┘
    │              │                        │ - Email   │      │
┌───▼────┐    ┌────▼────┐                   └───────────┘  ┌───▼────┐
│Postgres│    │Webhooks │                                     │Kong   │
│(DB per │    │→ Supabase│                                     │(API   │
│ app)   │    │  Realtime│                                     │Gateway)│
│        │    └─────────┘                                     └────────┘
└────────┘          │
    │    ┌─────────────────────────────────────────────────────────┐
    │    │   External Services                                     │
    │    │ - Cloudinary (storage)              │ - Resend (email) │
    │    │ - Cloudflare Workers (inbound email) │ - Telegram       │
    │    └─────────────────────────────────────────────────────────┘
    └──────────┐
               │
         ┌─────▼─────┐
         │  Apps     │
         │(shared    │
         │workspace) │
         └───────────┘
```

**Evolution Multi-Instance Flow (v2.3.7):**
```
Dashboard → POST http://evolution:8080/instance/create
         Body: { instanceName: "project-xyz", qrcode: true }
         ← { instanceId, status, ... }

Dashboard → GET /instance/connect/qr/{instanceName}
         ← { base64: "iVBORw0KGgoAAAANS..." }
         → Display: <img src="data:image/png;base64,{base64}" />

User scans QR → Evolution connects → Status updates

Dashboard → GET /instance/status/{instanceName}
         ← { state: "open", phone: "+1234567890", ... }

Dashboard → POST /message/sendText/{instanceName}
         Body: { number: "...", text: "..." }
         → WhatsApp sent

WhatsApp received → Evolution → Webhook
Webhook URL: https://nextmavens.cloud/api/webhooks/whatsapp
         → Verify signature → Insert to Supabase → Realtime broadcast
```

## Critical Files & Locations

```
/home/ken/
├── nextmavens-platform/          # Main platform repo
│   ├── dashboard/                 # Next.js dashboard
│   ├── docker/                    # Docker compose files
│   ├── scripts/                   # Setup and maintenance scripts
│   └── mcp/                       # MCP servers (stdio)
├── supabase/                      # Self-hosted Supabase
├── evolution-api/                 # WhatsApp API
├── projects/                      # Deployed apps (shared workspace)
└── backups/                       # Local backup staging
```

---

## Phase 1: Core Infrastructure (First 4 PRDs)

### PRD 1: NextMavens Platform Core (Supabase Foundation)

**File:** `docs/prd-platform-core.md`

**Scope:**
- Self-host Supabase with Docker
- Custom organizations → projects flow (NOT built-in)
- Database-per-app isolation (NOT schema-based)
- Supavisor for connection pooling
- Kong API gateway for routing
- Supabase Studio for admin access

**Key Technical Decisions:**
- Single Supabase instance, separate databases per project
- Supavisor config: `POOLER_TENANT_ID=nextmavens_master`, `pool_mode=transaction`
- Connection string format: `postgres://postgres.${tenant_id}:${password}@db:5432/${db_name}`
- Custom API layer uses postgres client to run `CREATE DATABASE "project_${id}"; CREATE ROLE ...; GRANT ...;` transactionally
- Project-scoped JWTs via Supabase Auth admin API or custom signing with project-specific secrets (stored in master DB)
- Studio access via Kong proxy: path `/studio/{project}` → upstream to Studio container with header injection for auth
- Evolution API v2.3.7 endpoints:
  - Create: `POST /instance/create` (body: `{ instanceName, qrcode: true }`)
  - QR: `GET /instance/connect/qr/{instanceName}` → returns base64
  - Status: `GET /instance/status/{instanceName}` → includes phone number post-connect
  - Send: `POST /message/sendText/{instanceName}`
- Subdomain routing: `app.nextmavens.cloud` + custom domains

**User Stories:**
1. Admin creates organization
2. Admin creates project within organization
3. Project gets isolated PostgreSQL database
4. Project generates API keys (anon/service_role)
5. Admin accesses Supabase Studio for any project

**Critical Files:**
- `/home/ken/supabase/docker/docker-compose.yml` - Main compose
- `/home/ken/supabase/.env` - Configuration
- `/home/ken/nextmavens-platform/api/orgs.ts` - Org management API
- `/home/ken/nextmavens-platform/api/projects.ts` - Project creation API

---

### PRD 2: NextMavens Dashboard UI

**File:** `docs/prd-dashboard-ui.md`

**Scope:**
- Next.js 15+ with TypeScript
- Tailwind CSS (professional, neutral colors, Inter font)
- Supabase Auth integration
- Organizations → Projects navigation
- Service redirects (Supabase Studio, Evolution, etc.)
- Real-time notifications (Supabase Realtime)

**Key Features:**
- Login/logout with Supabase Auth
- Organization switcher
- Project list with status indicators
- Quick links to all services
- API key management
- Team member invitations

**User Stories:**
1. User logs in with email/password
2. User sees all organizations
3. User creates/selects project
4. Dashboard shows project overview
5. User navigates to Supabase Studio
6. User manages API keys

**Critical Files:**
- `/home/ken/nextmavens-platform/dashboard/app/page.tsx` - Dashboard home
- `/home/ken/nextmavens-platform/dashboard/app/layout.tsx` - Root layout
- `/home/ken/nextmavens-platform/dashboard/components/OrgSwitcher.tsx`
- `/home/ken/nextmavens-platform/dashboard/lib/supabase.ts` - Client config

---

### PRD 3: Evolution API Integration (WhatsApp)

**File:** `docs/prd-whatsapp-integration.md`

**Scope:**
- Self-host Evolution API via Docker
- Multi-instance support (one per project/client)
- QR-based number connection (Evolution handles it)
- Shared WhatsApp for multiple apps
- Webhook support for real-time messages
- MCP server for Claude integration

**Key Features:**
- Create/start/stop WhatsApp instances via Evolution API
- QR endpoint: `GET /instance/{id}/qr` returns base64 or text for dashboard display
- Post-connect: Status endpoint fetches phone number/details
- Global or per-instance webhook URL → Next.js API route → process → Supabase insert for realtime
- Send messages (text, media, interactive)
- Multi-device session management
- MCP server: Node.js stdio wrapper for Claude integration

**MCP Implementation (stdio):**
```typescript
// mcp/whatsapp-mcp.ts
import * as readline from 'readline';

const EVOLUTION_API = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const API_KEY = process.env.EVOLUTION_API_KEY;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Handshake per MCP spec
process.stdout.write(JSON.stringify({ type: 'handshake', version: '1.0' }) + '\n');

rl.on('line', async (line) => {
  const msg = JSON.parse(line);
  if (msg.type === 'invoke') {
    try {
      // Actions: create-instance, send-message, get-status
      const response = await fetch(`${EVOLUTION_API}/${msg.action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
        body: JSON.stringify(msg.params)
      });
      const result = await response.json();
      process.stdout.write(JSON.stringify({ type: 'response', data: result }) + '\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({ type: 'error', message: error.message }) + '\n');
    }
  }
});
```

**User Stories:**
1. User creates WhatsApp instance in dashboard
2. Dashboard displays QR code
3. User scans QR with WhatsApp mobile
4. Instance connects and shows phone number
5. User sends test message via API
6. User receives message via webhook

**Critical Files:**
- `/home/ken/evolution-api/docker-compose.yml`
- `/home/ken/nextmavens-platform/api/whatsapp/`
- `/home/ken/nextmavens-platform/mcp/whatsapp-mcp.ts` - MCP server

---

### PRD 4: npx CLI Tool

**File:** `docs/prd-cli-tool.md`

**Scope:**
- npm package: `@nextmavens/cli`
- Commands: create-project, deploy, logs, db:migrate, whatsapp-connect
- Token and API key authentication
- Works with local dev + VPS deploy

**Commands:**
```bash
npx nextmavens login                    # Authenticate
npx nextmavens create-project           # Create new project
npx nextmavens deploy                    # Deploy to platform
npx nextmavens logs --project=xxx       # View logs
npx nextmavens db:migrate                # Run migrations
npx nextmavens whatsapp-connect          # Connect WhatsApp
```

**User Stories:**
1. Developer installs CLI via npx
2. Developer logs in with token
3. Developer creates new project
4. Developer deploys local app
5. Developer views logs
6. Developer runs migrations

**Critical Files:**
- `/home/ken/nextmavens-platform/cli/package.json`
- `/home/ken/nextmavens-platform/cli/src/commands/`

---

## Version Pinning for Stability

**Docker Images (pin in docker-compose.yml):**
```yaml
services:
  studio:
    image: supabase/studio:2026.01.19-sha-...  # Pull latest monthly
  evolution:
    image: evolutionapi/evolution-api:v2.3.7   # Pin to Dec 2025 release
  redis:
    image: redis:7-alpine                       # Lightweight stable
```

**Node.js Versions:**
```json
{
  "next": "15.x",
  "react": "^19.0.0",
  "@supabase/supabase-js": "^2.39.0"
}
```

---

## Security Hardening

**Evolution API Proxy:**
- All dashboard calls go through Next.js API routes
- Supabase auth check + your own API key header to Evolution
- Never expose Evolution API key to frontend

**Secrets Management:**
- Use Docker secrets or `.env` + `docker compose --env-file`
- Never commit secrets to git
- Rotate keys monthly

**Rate Limiting:**
- `express-rate-limit` on API routes
- Kong plugin for global rate limiting
- Per-project API key quotas

**Webhook Signature Verification:**
```typescript
// api/webhooks/whatsapp.ts
import { createHmac } from 'crypto';

export async function POST(req: Request) {
  const signature = req.headers.get('x-hub-signature-256');
  const body = await req.text();
  const computed = 'sha256=' + createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== computed) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Insert to Supabase + broadcast via Realtime
}
```

---

## Quick Start Scripts

**create-project-db.ts - Project Database Creation:**
```typescript
// scripts/create-project-db.ts
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.MASTER_DB_URL });

async function createProjectDb(projectId: string) {
  const dbName = `project_${projectId.replace(/-/g, '_')}`;
  const roleName = `app_${projectId}`;
  const password = generateStrongPassword();

  // Create database
  await pool.query(`CREATE DATABASE "${dbName}";`);

  // Create role with password
  await pool.query(`CREATE ROLE ${roleName} WITH LOGIN PASSWORD '${password}';`);

  // Grant privileges
  await pool.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO ${roleName};`);

  // Store credentials in master database
  await pool.query(`
    INSERT INTO project_dbs (project_id, db_name, role_name, password)
    VALUES ($1, $2, $3, $4)
  `, [projectId, dbName, roleName, password]);

  console.log(`DB ${dbName} created for project ${projectId}`);
  return { dbName, roleName, password };
}

// Usage: node scripts/create-project-db.ts proj-abc-123
```

**Dashboard Auth (Next.js):**
```typescript
// app/login/actions.ts
'use server';
import { supabase } from '@/lib/supabase';

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}
```

---

## Firewall Rules

```bash
# After Coolify install
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # Supabase Studio
sudo ufw allow 6001/tcp  # Coolify
sudo ufw allow 3000/tcp  # Dashboard (dev)
sudo ufw enable
```

---

## Phase 2: Secondary Features (Subsequent PRDs)

### PRD 5: Storage Optimization (Cloudinary)
- Auto-upload to Cloudinary (dashboard, API, email)
- Replace local files with URLs
- Scheduled cleanup cron jobs

### PRD 6: Backup System (Telegram)
- Daily compressed pg_dump per app
- Upload to private Telegram channel
- Fetch from Telegram to DB as needed
- Critical alerts to Telegram

**Storage Alerting:**
- Alerts at 80%, 90%, 95% storage usage via Telegram
- Auto-prune at 92% (conditional: check if >90% after Cloudinary offload succeeds): `docker system prune -af --volumes`
- Daily summary of storage usage

### PRD 7: MCP Servers

**Supabase MCP (stdio):**
```typescript
// mcp/supabase-mcp.ts
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Handshake per MCP spec
process.stdout.write(JSON.stringify({ type: 'handshake', version: '1.0' }) + '\n');

// Helper: Get project connection from master DB
async function getProjectConn(projectId: string, token: string) {
  // Validate token, fetch project DB credentials from master
  // Return: postgres://user:pass@host:5432/project_xyz
}

rl.on('line', async (line) => {
  const msg = JSON.parse(line);
  if (msg.type === 'invoke') {
    try {
      if (msg.action === 'query') {
        const conn = await getProjectConn(msg.params.projectId, msg.token);
        const supabase = createClient(conn, { auth: { autoRefreshToken: false } });
        const { data, error } = await supabase
          .from(msg.params.table)
          .select('*')
          .limit(msg.params.limit || 10);
        process.stdout.write(JSON.stringify({ type: 'response', result: data, error }) + '\n');
      } else if (msg.action === 'execute') {
        // Safe SQL execution with whitelist/query limits
      }
    } catch (error) {
      process.stdout.write(JSON.stringify({ type: 'error', message: error.message }) + '\n');
    }
  }
});
```

**WhatsApp MCP (stdio):**
- Wrapper around Evolution API
- Actions: send-message, get-status, create-instance
- Run as subprocess from dashboard/CLI for Claude Desktop integration

**Email MCP (via Resend):**
- Send emails through Resend API
- Template management
- Delivery tracking

### PRD 8: Email Platform
- Cloudflare Workers for inbound
- Resend for outbound
- Save to database
- Cloudinary attachment handling

### PRD 9: Monitoring & Alerting
- Docker metrics (prometheus/grafana lite)
- Error tracking
- Storage alerts (80%, 90%, 95%)
- Uptime monitoring
- All stored to Telegram then DB

### PRD 10: Custom Domain Management
- CNAME setup instructions
- Auto-configure via Let's Encrypt
- Nginx route management
- Per-project custom domains

### PRD 11: Deployment System (Vercel-like)
- Framework detection (Next.js, Express, etc.)
- Environment variables/secrets
- Shared workspace deployment
- Build and run via Docker
- Preview deployments (optional)

---

## Development Environment

**Local Development:**
- `supabase start` for local DB mirror
- Docker Compose for Evolution API, Redis locally
- Next.js dashboard runs on `localhost:3000`
- MCP servers run as Node.js processes

**VPS Deployment:**
- Coolify installation (one-liner): `wget -q https://get.coollabs.io/coolify.sh -O install.sh && bash install.sh`
- Add repo → auto-deploy on push (supports Next.js detection, env vars, Dockerfiles)
- Production databases on self-hosted Supabase
- Shared workspace for deployed apps
- Nginx reverse proxy with SSL

**Workflow:**
1. Develop locally with `supabase start` (local DB)
2. Test Evolution API via local Docker
3. Push to GitHub
4. VPS auto-deploys via webhook/Coolify
5. Production uses self-hosted Supabase + Evolution

---

## Implementation Order (Maven Flow Steps)

### PRD 1: Platform Core
1. Import UI mockups (Figma → code)
2. Convert to pnpm monorepo
3. Feature-based folder structure
4. Modularize components
5. Type safety enforcement
6. Create data layer (Supabase client)
7. Auth integration (Supabase Auth)
8. MCP server endpoints (API for AI)
9. Security validation (RLS, rate limits)

### PRD 2: Dashboard UI
1. Import dashboard mockups
2. pnpm workspace setup
3. Feature-based structure
4. Component modularity
5. TypeScript strict mode
6. Supabase client integration
7. Realtime subscriptions
8. MCP API routes
9. Security audit

### PRD 3: WhatsApp Integration
1. Evolution API setup (Docker)
2. Dashboard integration
3. QR code generation
4. Instance management
5. Message sending/receiving
6. Webhook handling
7. MCP server (stdio)
8. Security (API keys)

### PRD 4: CLI Tool
1. CLI scaffolding (oclif or yargs)
2. Authentication flow
3. Project creation
4. Deployment command
5. Logs streaming
6. Migration runner
7. WhatsApp connect
8. Package publishing

---

## Verification Steps

### After PRD 1 (Platform Core):
- [ ] Supabase containers running (`docker ps`)
- [ ] Can create organization via API
- [ ] Can create project (DB created)
- [ ] Project has API keys
- [ ] Supabase Studio accessible

### After PRD 2 (Dashboard):
- [ ] Can login at `nextmavens.cloud`
- [ ] See organizations/projects
- [ ] Can create new project
- [ ] Redirects work to Studio
- [ ] Realtime updates work

### After PRD 3 (WhatsApp):
- [ ] Evolution API running
- [ ] Can create instance
- [ ] QR code displays
- [ ] Can scan and connect
- [ ] Can send message
- [ ] Webhook receives messages

### After PRD 4 (CLI):
- [ ] `npx nextmavens login` works
- [ ] `npx nextmavens create-project` creates DB
- [ ] `npx nextmavens deploy` deploys app
- [ ] `npx nextmavens logs` shows logs
- [ ] `npx nextmavens whatsapp-connect` shows QR

---

## Next Steps

1. Create first 4 PRD files in `/home/ken/github/docs/`
2. Run `/flow-convert` for each PRD to create JSON
3. Execute `/flow start` to begin development
4. Create remaining PRDs as we progress

**Remember:** All PRDs will be created iteratively - start with core 4, execute, then create additional PRDs as needed.
