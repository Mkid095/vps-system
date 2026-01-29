# Audit Logs Database Schema

This directory contains the database schema and migrations for the audit logs feature.

## Overview

The audit logs system tracks all governance operations for compliance, security, and forensic purposes. It captures who did what, when, and from where.

## Table Structure

### `control_plane.audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier for the audit log entry |
| `actor_id` | TEXT | ID of the entity that performed the action |
| `actor_type` | TEXT | Type of actor: `user`, `system`, or `api_key` |
| `action` | TEXT | Action performed (e.g., `project.created`, `user.invited`) |
| `target_type` | TEXT | Type of resource affected |
| `target_id` | TEXT | ID of the affected resource |
| `metadata` | JSONB | Additional contextual information |
| `ip_address` | INET | IP address of the request source |
| `user_agent` | TEXT | User agent string of the client |
| `created_at` | TIMESTAMPTZ | Timestamp of when the action occurred |

## Indexes

- `idx_audit_logs_actor_id` - Query by actor (user/system/api_key)
- `idx_audit_logs_target_id` - Query by target resource
- `idx_audit_logs_created_at` - Date range queries
- `idx_audit_logs_actor_created` - Actor + date range queries
- `idx_audit_logs_target_created` - Target + date range queries
- `idx_audit_logs_action` - Filter by action type

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Database

Copy `.env.example` to `.env` and configure your database connection:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

### 3. Run Migrations

```bash
pnpm migrate
```

### 4. Check Migration Status

```bash
pnpm migrate:status
```

## TypeScript Types

TypeScript types are available in `types/audit.types.ts`:

```typescript
import type { CreateAuditLogInput, AuditLog, AuditAction } from './types/audit.types.js';

// Create an audit log entry
const input: CreateAuditLogInput = {
  actor_id: 'user_123',
  actor_type: ActorType.USER,
  action: AuditAction.PROJECT_CREATED,
  target_type: TargetType.PROJECT,
  target_id: 'proj_456',
  metadata: {
    changes: { name: 'MyProject' }
  },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...'
};
```

## Schema

The schema is located in `migrations/001_create_audit_logs_table.sql`.

## Testing

To test the migration locally:

1. Start a PostgreSQL database:
   ```bash
   docker run -d -p 5432:5432 \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=postgres \
     postgres:16
   ```

2. Run migrations:
   ```bash
   pnpm migrate
   ```

3. Verify the table was created:
   ```bash
   psql -h localhost -U postgres -d postgres -c "\d control_plane.audit_logs"
   ```

## Acceptance Criteria

✅ `audit_logs` table created in `control_plane` schema
✅ Columns: `id`, `actor_id`, `actor_type`, `action`, `target_type`, `target_id`, `metadata` (JSONB), `ip_address`, `user_agent`, `created_at`
✅ Index on `actor_id` for querying by user
✅ Index on `target_id` for querying by resource
✅ Index on `created_at` for date range queries
✅ Migration script created and tested

## US-001: Create Audit Logs Table

This database schema implements US-001 from the audit logs PRD.

## Related Files

- Migration: `migrations/001_create_audit_logs_table.sql`
- Types: `types/audit.types.ts`
- Migration Runner: `migrate.ts`
