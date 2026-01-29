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

---

# Admin Actions Integration Testing Guide

## Overview

The integration tests for `admin_actions` (US-002) require a running PostgreSQL database with the `control_plane` schema and both `admin_sessions` and `admin_actions` tables created.

## Prerequisites

### 1. Database Setup

Use the same PostgreSQL instance from the audit logs testing above.

### 2. Configure Environment

Ensure your `.env` file is configured (same as audit logs testing):

```bash
# For local testing with Docker
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres

# OR use individual variables
AUDIT_LOGS_DB_HOST=localhost
AUDIT_LOGS_DB_PORT=5432
AUDIT_LOGS_DB_NAME=postgres
AUDIT_LOGS_DB_USER=postgres
AUDIT_LOGS_DB_PASSWORD=password
```

### 3. Run Migrations

```bash
# Run migrations to create both tables
pnpm migrate

# Verify migration status - should see 2 migrations
pnpm migrate:status
```

Expected output should include:
- `015_create_admin_sessions_table.sql` ✓ Done
- `016_create_admin_actions_table.sql` ✓ Done

## Running Tests

### Run All Admin Actions Tests

```bash
pnpm test:admin-actions
```

### Run with Verbose Output

```bash
vitest run src/__tests__/admin-actions.integration.test.ts --reporter=verbose
```

### Run in Watch Mode

```bash
vitest src/__tests__/admin-actions.integration.test.ts
```

## Test Coverage

The integration tests include ~80 comprehensive tests covering:

1. **Migration and Table Structure** (6 tests)
   - Table existence
   - Column types and nullability
   - Schema validation

2. **Creating Actions with Each Action Type** (12 tests)
   - All 10 action types (unlock_project, override_suspension, force_delete, regenerate_keys, access_project, system_config_change, database_intervention, restore_backup, modify_user, modify_api_key)
   - NULL constraint validation
   - Custom action strings

3. **Foreign Key Relationship with admin_sessions** (4 tests)
   - Foreign key constraint enforcement
   - Cascade delete behavior
   - Multiple actions per session
   - Join queries with sessions

4. **JSONB before_state and after_state Handling** (10 tests)
   - Simple and complex JSONB objects
   - NULL values
   - Nested structures
   - Arrays and special characters
   - JSONB field queries

5. **Indexes** (7 tests)
   - All 6 indexes verified:
     - idx_admin_actions_session_id
     - idx_admin_actions_action
     - idx_admin_actions_target
     - idx_admin_actions_created_at
     - idx_admin_actions_session_created (composite)
     - idx_admin_actions_target_history (composite)

6. **Querying by session_id** (3 tests)
7. **Querying by target_type and target_id** (4 tests)
8. **Filters and Pagination** (7 tests)
9. **Action Type Enumeration** (2 tests)
10. **Data Integrity and Validation** (4 tests)
11. **Table and Column Comments** (3 tests)
12. **Query Patterns** (4 tests)
13. **Performance** (1 test)
14. **Foreign Key Constraints** (2 tests)
15. **Edge Cases** (5 tests)

## Troubleshooting

### Error: Relation "control_plane.admin_actions" does not exist

**Solution:** Run migrations:
```bash
pnpm migrate
```

### Error: Foreign key constraint fails

**Solution:** Ensure `admin_sessions` table exists:
```bash
# Check migration status - both 015 and 016 should be applied
pnpm migrate:status
```

### Tests timeout

**Solution:** Check database connection:
```bash
# Test database connection
psql -h localhost -U postgres -d postgres -c "SELECT 1"
```

## Cleanup

Clean up test data (keeps tables):

```bash
psql -h localhost -U postgres -d postgres -c \
  "DELETE FROM control_plane.admin_actions WHERE session_id IN
    (SELECT id FROM control_plane.admin_sessions WHERE admin_id LIKE 'test-admin-%');
   DELETE FROM control_plane.admin_sessions WHERE admin_id LIKE 'test-admin-%';"
```

## Notes

- Tests automatically clean up after themselves (beforeEach/afterEach hooks)
- All test data uses `test-admin-%` prefix for easy identification
- Tests use Vitest with Node environment
- Default timeout: 30 seconds (configurable in vitest.config.ts)
- Tests follow the same patterns as admin-sessions.integration.test.ts
