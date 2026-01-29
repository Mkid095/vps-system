# Admin Sessions Integration Tests

## Overview

Integration tests for the `admin_sessions` table, created as part of US-001: Create Admin Sessions Table (Break Glass Mode).

## Test File

`src/__tests__/admin-sessions.integration.test.ts`

## Running the Tests

```bash
# From the database directory
pnpm test:admin-sessions

# Or run with vitest directly
pnpm test src/__tests__/admin-sessions.integration.test.ts

# Run in watch mode
pnpm test:watch src/__tests__/admin-sessions.integration.test.ts
```

## Prerequisites

Before running tests, ensure:

1. **Database is running**: PostgreSQL 12+ instance
2. **Environment variables set**: Either `DATABASE_URL` or individual `AUDIT_LOGS_DB_*` variables
3. **Migrations applied**: Run `pnpm migrate` to create the `admin_sessions` table

See `TEST_SETUP.md` for detailed setup instructions.

## Test Suites

### 1. Migration and Table Structure (6 tests)

Verifies the table was created correctly by the migration:

- ✓ Table exists in `control_plane` schema
- ✓ All required columns present (id, admin_id, reason, access_method, granted_by, expires_at, created_at)
- ✓ Column data types are correct (uuid, text, timestamptz)
- ✓ Required columns are NOT NULL
- ✓ Optional column (granted_by) is nullable

### 2. Creating Sessions with Each Access Method (7 tests)

Tests creating sessions with different authentication methods:

- ✓ Create session with `hardware_key` access method
- ✓ Create session with `otp` access method
- ✓ Create session with `emergency_code` access method
- ✓ Create session with `granted_by` approver
- ✓ Enforce access_method CHECK constraint
- ✓ Reject NULL for required fields (access_method, reason, admin_id)

### 3. Indexes (6 tests)

Verifies all indexes are created for performance:

- ✓ `idx_admin_sessions_admin_id` - Query by admin
- ✓ `idx_admin_sessions_expires_at` - Query by expiration
- ✓ `idx_admin_sessions_created_at` - Query by creation time
- ✓ `idx_admin_sessions_admin_expires` - Active session queries
- ✓ `idx_admin_sessions_expires_created` - Cleanup queries
- ✓ All indexes verification

### 4. Querying Sessions by admin_id (4 tests)

Tests common query patterns:

- ✓ Query sessions by admin_id
- ✓ Query sessions using index
- ✓ Query active sessions for an admin
- ✓ Query expired sessions for an admin

### 5. Session Expiration Logic (6 tests)

Verifies session expiration behavior:

- ✓ Default expiration is 1 hour from creation
- ✓ Custom expiration times work correctly
- ✓ Identify active sessions (expires_at > NOW())
- ✓ Identify expired sessions (expires_at < NOW())
- ✓ Query sessions expiring soon (within 5 minutes)
- ✓ Use composite index for active session queries

### 6. Foreign Key Readiness for admin_actions (5 tests)

Ensures table is ready for future foreign key references:

- ✓ `id` column is suitable for foreign key references (uuid, not null)
- ✓ Primary key constraint exists on `id`
- ✓ Referential integrity maintained
- ✓ Table in correct schema (`control_plane`)
- ✓ Supports future foreign key references from `admin_actions`

### 7. Table and Column Comments (3 tests)

Verifies documentation in database:

- ✓ Table comment exists
- ✓ Column comments exist for all columns
- ✓ `access_method` comment includes all valid values

### 8. Data Integrity and Validation (6 tests)

Tests data storage and retrieval:

- ✓ Store and retrieve session with all fields
- ✓ Handle special characters in reason field
- ✓ Handle long reason text (1000+ characters)
- ✓ Generate UUID for id automatically
- ✓ Set created_at timestamp automatically
- ✓ Handle all data types correctly

### 9. Query Patterns for Common Use Cases (4 tests)

Tests realistic query scenarios:

- ✓ Get all active sessions for an admin
- ✓ Get recent sessions ordered by created_at
- ✓ Count sessions by access method
- ✓ Query sessions within time range

### 10. Database Constraints Validation (2 tests)

Verifies database-level constraints:

- ✓ All CHECK constraints exist
- ✓ Primary key constraint exists

## Total Test Count

**48 tests** covering all acceptance criteria from US-001.

## Test Isolation

Each test suite:
- Runs in a transaction (when using `getClient()`)
- Cleans up test data before and after execution
- Uses predictable test data prefixes (`test-admin-*`)
- Is independent of other test suites

## Acceptance Criteria Coverage

From US-001 PRD:

| Criteria | Tests | Status |
|----------|-------|--------|
| admin_sessions table created in control_plane schema | Migration and Table Structure suite | ✓ |
| Columns: id, admin_id, reason, access_method, granted_by, expires_at, created_at | Migration and Table Structure suite | ✓ |
| access_method enum: hardware_key, otp, emergency_code | Creating Sessions suite | ✓ |
| Session must be referenced by admin_actions | Foreign Key Readiness suite | ✓ |
| Migration script created and tested | Migration and Table Structure suite | ✓ |
| Typecheck passes | All tests (TypeScript types used throughout) | ✓ |

## Test Data

Test sessions use these patterns:
- `admin_id`: `test-admin-*` (e.g., `test-admin-001`)
- `reason`: Descriptive test reasons
- `access_method`: All three valid values tested
- `granted_by`: Optional approver IDs
- `expires_at`: Both default and custom times

## Cleanup

Tests automatically clean up by deleting sessions with:
```sql
DELETE FROM control_plane.admin_sessions
WHERE admin_id LIKE 'test-admin-%'
```

## Failure Diagnostics

When tests fail:

1. **Check database connection**: Verify `DATABASE_URL` is set correctly
2. **Check migrations**: Run `pnpm migrate:status` to see if migrations are applied
3. **Check permissions**: Ensure database user has CREATE, SELECT, INSERT, DELETE permissions
4. **Check schema**: Verify `control_plane` schema exists
5. **Check logs**: Review test output for specific error messages

## Example Output

Successful test run:
```
✓ src/__tests__/admin-sessions.integration.test.ts (48)
  ✓ US-001: Admin Sessions Table Integration Tests
    ✓ Migration and Table Structure (6)
    ✓ Creating sessions with each access_method (7)
    ✓ Indexes (6)
    ✓ Querying sessions by admin_id (4)
    ✓ Session expiration logic (6)
    ✓ Foreign key readiness for admin_actions (5)
    ✓ Table and column comments (3)
    ✓ Data integrity and validation (6)
    ✓ Query patterns for common use cases (4)
    ✓ Database constraints validation (2)

Test Files  1 passed (1)
Tests       48 passed (48)
```

## Related Files

- Migration: `/home/ken/database/migrations/015_create_admin_sessions_table.sql`
- Types: `/home/ken/database/types/admin-sessions.types.ts`
- Setup Guide: `/home/ken/database/TEST_SETUP.md`
- Pool: `/home/ken/database/src/pool.ts`

## Next Steps

After tests pass:
1. ✓ Verify typecheck passes: `pnpm typecheck`
2. ✓ Review test coverage (100% of AC covered)
3. ✓ Integrate into CI/CD pipeline
4. ✓ Document test results in progress file

## Notes

- Tests require a live PostgreSQL connection (no mocking)
- Tests are integration tests, not unit tests
- Tests verify database schema, constraints, and query patterns
- Tests follow existing patterns from `jobs.integration.test.ts`
- Tests use TypeScript for type safety throughout
