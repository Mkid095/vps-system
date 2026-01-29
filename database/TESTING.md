# Audit Logs Migration Testing Guide

## Prerequisites

1. PostgreSQL 14+ installed and running
2. Database credentials configured

## Quick Test with Docker

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name audit-logs-test-db \
  -e POSTGRES_PASSWORD=testpassword \
  -e POSTGRES_DB=auditlogs_test \
  -p 5433:5432 \
  postgres:16

# Wait for database to start
sleep 3

# Set environment variables
export DATABASE_URL="postgresql://postgres:testpassword@localhost:5433/auditlogs_test"

# Run migration
pnpm migrate

# Check status
pnpm migrate:status
```

## Manual SQL Testing

Connect to your database and run the verification script:

```bash
psql -h localhost -U postgres -d auditlogs_test
```

Then run:
```sql
\i verify-migration.sql
```

## Expected Results

### 1. Table Created

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'control_plane' AND table_name = 'audit_logs';
```

Expected: 1 row returned

### 2. Columns Present

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'control_plane' AND table_name = 'audit_logs'
ORDER BY ordinal_position;
```

Expected columns:
- id (uuid)
- actor_id (text)
- actor_type (text)
- action (text)
- target_type (text)
- target_id (text)
- metadata (jsonb)
- ip_address (inet)
- user_agent (text)
- created_at (timestamp with time zone)

### 3. Indexes Created

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'control_plane' AND tablename = 'audit_logs'
ORDER BY indexname;
```

Expected indexes:
- idx_audit_logs_actor_id
- idx_audit_logs_target_id
- idx_audit_logs_created_at
- idx_audit_logs_actor_created
- idx_audit_logs_target_created
- idx_audit_logs_action

### 4. Constraints Present

```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'control_plane' AND table_name = 'audit_logs';
```

Expected constraints:
- audit_logs_pkey (PRIMARY KEY)
- audit_logs_actor_type_check (CHECK)
- audit_logs_actor_required (CHECK)

### 5. Test Insert

```sql
INSERT INTO control_plane.audit_logs (
  actor_id, actor_type, action, target_type, target_id,
  metadata, ip_address, user_agent
) VALUES (
  'user_123',
  'user',
  'project.created',
  'project',
  'proj_456',
  '{"changes": {"name": "Test"}}'::jsonb,
  '192.168.1.1'::inet,
  'Test Agent'
);

SELECT * FROM control_plane.audit_logs WHERE actor_id = 'user_123';
```

Expected: 1 row with all fields populated correctly

### 6. Test Constraints

```sql
-- Should fail: invalid actor_type
INSERT INTO control_plane.audit_logs (
  actor_id, actor_type, action, target_type, target_id
) VALUES (
  'test', 'invalid', 'test', 'test', 'test'
);

-- Should fail: system actor must have actor_id = 'system'
INSERT INTO control_plane.audit_logs (
  actor_id, actor_type, action, target_type, target_id
) VALUES (
  'not_system', 'system', 'test', 'test', 'test'
);
```

Expected: Both should fail with constraint violations

## Cleanup

```bash
# Stop and remove test database
docker stop audit-logs-test-db
docker rm audit-logs-test-db
```

## Migration Status Check

```bash
# Run status command
pnpm migrate:status
```

Expected output:
```
Migration Status:

ID   Status  Name
---  ------  ----
1    ✓ Done  create_audit_logs_table

Total: 1/1 executed
```

## Rollback (if needed)

```bash
# To rollback, you would need to manually drop the table
psql -c "DROP SCHEMA control_plane CASCADE;"
psql -c "DROP TABLE schema_migrations;"
```
