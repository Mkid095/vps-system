# Jobs Table Integration Tests

Integration tests for the jobs database table (US-001: Create Jobs Database Table).

## Test Coverage

These tests verify the following acceptance criteria:

1. **Creating jobs with valid data** - Tests job creation with various payloads and configurations
2. **Status enum constraints** - Validates only valid status values (pending, running, failed, completed) can be used
3. **Index creation** - Verifies all required indexes exist (status, scheduled_at, composite)
4. **Querying by status** - Tests filtering jobs by status efficiently
5. **Querying by scheduled_at** - Tests time-based job queries
6. **Status transitions** - Tests full job lifecycle (pending → running → completed/failed)
7. **Attempts constraints** - Validates attempts cannot be negative and don't exceed max_attempts
8. **JSONB payload storage** - Tests complex JSON data storage and retrieval

## Running the Tests

### Prerequisites

1. PostgreSQL database must be running
2. Jobs table must be created (run migration: `pnpm migrate`)
3. Database connection must be configured

### Set Environment Variables

```bash
# Option 1: Use DATABASE_URL
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Option 2: Use individual variables
export AUDIT_LOGS_DB_HOST=localhost
export AUDIT_LOGS_DB_PORT=5432
export AUDIT_LOGS_DB_NAME=postgres
export AUDIT_LOGS_DB_USER=postgres
export AUDIT_LOGS_DB_PASSWORD=your_password
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only jobs integration tests
pnpm test src/__tests__/jobs.integration.test.ts
```

## Test Structure

### Test Helper Functions

- `createTestJob()` - Creates a test job with specified parameters
- `cleanupTestJobs()` - Removes all test jobs (those with type starting with 'test-')

### Test Organization

Tests are organized by acceptance criteria:

```typescript
describe('US-001: Jobs Database Table Integration Tests', () => {
  describe('AC1: Creating a job with valid data', () => {
    // Tests for job creation
  });

  describe('AC2: Status enum constraint', () => {
    // Tests for status validation
  });

  // ... more AC sections
});
```

## Database Schema

Tests verify the following schema:

```sql
CREATE TABLE control_plane.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'failed', 'completed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT jobs_attempts_not_negative CHECK (attempts >= 0),
    CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts > 0),
    CONSTRAINT jobs_attempts_not_exceed_max CHECK (attempts <= max_attempts)
);

CREATE INDEX idx_jobs_status ON control_plane.jobs(status);
CREATE INDEX idx_jobs_scheduled_at ON control_plane.jobs(scheduled_at);
CREATE INDEX idx_jobs_status_scheduled_at ON control_plane.jobs(status, scheduled_at);
```

## Example Test

```typescript
it('should create a job with all required fields', async () => {
  const job = await createTestJob({
    type: JobType.PROVISION_PROJECT,
    payload: { project_id: 'proj-123', region: 'us-east-1' },
    status: JobStatus.PENDING,
    attempts: 0,
    max_attempts: 3,
  });

  expect(job).toBeDefined();
  expect(job.type).toBe(JobType.PROVISION_PROJECT);
  expect(job.status).toBe(JobStatus.PENDING);
});
```

## Notes

- Tests clean up after themselves using `beforeEach` and `afterEach` hooks
- Test jobs are identified by having a type starting with 'test-'
- All tests use the actual database connection (not mocked)
- Tests verify constraints at the database level
- JSONB payload tests include complex nested structures and special characters
