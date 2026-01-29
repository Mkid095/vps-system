# Admin Sessions Integration Tests - Setup Guide

## Overview

This document describes how to set up and run the integration tests for the `admin_sessions` table (US-001: Create Admin Sessions Table).

## Prerequisites

1. **PostgreSQL Database**: You need a running PostgreSQL instance with the following:
   - PostgreSQL 12+ (supports `gen_random_uuid()`)
   - Database credentials (user, password, host, port, database name)
   - Schema creation permissions (to create `control_plane` schema)

2. **Node.js Dependencies**: Install dependencies:
   ```bash
   cd database
   pnpm install
   ```

## Database Setup

### Option 1: Using DATABASE_URL (Recommended)

Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

Example for local database:
```bash
export DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/nextmavens"
```

### Option 2: Using Individual Environment Variables

```bash
export AUDIT_LOGS_DB_HOST=localhost
export AUDIT_LOGS_DB_PORT=5432
export AUDIT_LOGS_DB_NAME=postgres
export AUDIT_LOGS_DB_USER=postgres
export AUDIT_LOGS_DB_PASSWORD=your_password_here
```

Note: `DATABASE_URL` takes precedence over individual variables.

## Running Migrations

Before running tests, ensure migrations are up to date:

```bash
cd database
pnpm migrate
```

To check migration status:

```bash
pnpm migrate:status
```

## Running Tests

### Run All Admin Sessions Tests

```bash
cd database
pnpm test src/__tests__/admin-sessions.integration.test.ts
```

### Run Tests in Watch Mode

```bash
cd database
pnpm test:watch src/__tests__/admin-sessions.integration.test.ts
```

## Test Coverage

The integration tests verify:

1. **Migration and Table Structure**
   - Table exists in `control_plane` schema
   - All required columns present with correct types
   - Proper NULL constraints
   - Primary key and foreign key readiness

2. **Access Methods**
   - Creating sessions with `hardware_key`
   - Creating sessions with `otp`
   - Creating sessions with `emergency_code`
   - CHECK constraint enforcement
   - NULL constraint violations

3. **Indexes**
   - Single column indexes (admin_id, expires_at, created_at)
   - Composite indexes (admin_id + expires_at, expires_at + created_at)
   - Index usage verification

4. **Querying Sessions**
   - Query by admin_id
   - Query active sessions
   - Query expired sessions
   - Time-based queries
   - Aggregation queries

5. **Session Expiration**
   - Default 1-hour expiration
   - Custom expiration times
   - Active/expired identification
   - Expiring soon queries (5-minute warning)

6. **Foreign Key Readiness**
   - Primary key on `id` column
   - Suitable for admin_actions references
   - Referential integrity verification
   - Schema placement verification

7. **Data Integrity**
   - Special character handling
   - Long text fields
   - UUID generation
   - Automatic timestamps
   - All field storage and retrieval

8. **Documentation**
   - Table comments
   - Column comments
   - Constraint documentation

## Test Isolation

Tests use `cleanupTestSessions()` to clean up after each test suite. Test data is created with predictable prefixes (`test-admin-*`) for easy identification and cleanup.

## Troubleshooting

### Connection Errors

If you see "Database password not set":
- Ensure `DATABASE_URL` or `AUDIT_LOGS_DB_PASSWORD` is set
- Verify database credentials are correct
- Check database is running and accessible

### Table Not Found Errors

If you see "relation \"control_plane.admin_sessions\" does not exist":
- Run migrations: `pnpm migrate`
- Check migration status: `pnpm migrate:status`
- Verify you're connecting to the correct database

### Permission Errors

If you see permission-related errors:
- Ensure database user has CREATE SCHEMA permissions
- Verify user has CREATE TABLE permissions
- Check if user can create indexes

### Port Already in Use

If port 5432 is already in use:
- Check what's using the port: `lsof -i :5432`
- Use a different port in your connection string
- Stop the conflicting service

## CI/CD Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run database tests
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    cd database
    pnpm install
    pnpm migrate
    pnpm test src/__tests__/admin-sessions.integration.test.ts
```

## Docker Setup

For local development with Docker:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nextmavens
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then connect with:
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextmavens"
```

## Production Considerations

When running tests against production-like databases:

1. **Use test-specific databases**: Don't run integration tests against production
2. **Clean up test data**: Tests clean up after themselves, but verify cleanup
3. **Isolate test environments**: Use separate schemas or databases for testing
4. **Mock external dependencies**: Tests should be isolated from external services

## Next Steps

After running tests successfully:

1. Review test results for any failures
2. Check database to verify test data was cleaned up
3. Update this documentation with any environment-specific notes
4. Integrate tests into CI/CD pipeline

## Support

For issues or questions:
- Check test output for detailed error messages
- Review migration logs for database setup issues
- Verify database schema matches expected structure
- Ensure all migrations have been applied
