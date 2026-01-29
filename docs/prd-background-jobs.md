---
project: Background Jobs & Task Queue
branch: flow/background-jobs
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Background Jobs & Task Queue

## Overview
Async operations happen everywhere in a PaaS: provisioning, key rotation, webhooks, backups, suspension. Jobs make the platform deterministic under chaos by providing reliable retry logic and state tracking.

## Technical Approach
Create job queue system with jobs table for tracking state, and worker process for background execution. Implement exponential backoff for retries and status tracking (pending, running, failed, completed). Job types: provision_project, rotate_key, deliver_webhook, export_backup, check_usage_limits, auto_suspend.

## User Stories

### US-001: Create Jobs Database Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a jobs table to track async operations so that I can monitor and retry failed jobs.

**Acceptance Criteria:**
- Jobs table created in control_plane schema
- Columns: id, type, payload, status, attempts, max_attempts, last_error, scheduled_at, started_at, completed_at, created_at
- Status enum: pending, running, failed, completed
- Index on status for efficient querying
- Index on scheduled_at for job scheduling
- Migration script created and tested

**Status:** false

### US-002: Create Job Queue System
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a job queue system so that I can enqueue jobs for background processing.

**Acceptance Criteria:**
- Job queue class created at src/lib/jobs/queue.ts
- enqueueJob(type, payload, options) function
- Returns job ID
- Supports scheduling with delay
- Supports max_attempts configuration
- Job priority support
- Typecheck passes

**Status:** false

### US-003: Create Job Worker
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a job worker process so that background jobs are processed reliably.

**Acceptance Criteria:**
- Worker created at src/lib/jobs/worker.ts
- Polls for pending jobs
- Updates job status to running when processing
- Executes job handler based on job type
- Updates job status to completed or failed
- Implements exponential backoff for retries
- Handles worker graceful shutdown
- Typecheck passes

**Status:** false

### US-004: Implement Provision Project Job
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want project provisioning to run as a background job so that failures can be retried automatically.

**Acceptance Criteria:**
- provision_project job handler implemented
- Creates tenant database
- Creates tenant schema
- Registers with services (auth, realtime, storage)
- Generates API keys
- Retries on failure every 5 minutes
- Max 3 attempts
- Typecheck passes

**Status:** false

### US-005: Implement Rotate Key Job
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want key rotation to run as a background job so that old keys are expired after grace period.

**Acceptance Criteria:**
- rotate_key job handler implemented
- Creates new key version
- Marks old key as expired after 24h
- One-shot job (no retry)
- Typecheck passes

**Status:** false

### US-006: Implement Deliver Webhook Job
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want webhook delivery to run as a background job so that failed webhooks are retried automatically.

**Acceptance Criteria:**
- deliver_webhook job handler implemented
- POSTs payload to webhook URL
- Retries 5x with exponential backoff
- Records delivery status
- Marks webhook as disabled after 5 consecutive failures
- Typecheck passes

**Status:** false

### US-007: Implement Export Backup Job
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want backup exports to run as background jobs so that large exports don't block requests.

**Acceptance Criteria:**
- export_backup job handler implemented
- Generates SQL dump of project schema
- Uploads to Telegram storage
- Retries on failure
- Sends notification when complete
- Typecheck passes

**Status:** false

### US-008: Implement Check Usage Limits Job
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want usage limit checks to run as scheduled jobs so that quotas are enforced automatically.

**Acceptance Criteria:**
- check_usage_limits job handler implemented
- Runs hourly via scheduler
- Checks all projects against quotas
- Suspends projects exceeding hard caps
- Sends warnings at 80% and 90%
- Typecheck passes

**Status:** false

### US-009: Implement Auto Suspend Job
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want auto-suspend to run as a background job so that abuse is detected and stopped automatically.

**Acceptance Criteria:**
- auto_suspend job handler implemented
- Detects abuse patterns (excessive usage, error spikes)
- Suspends project when abuse detected
- Sends notification to project owner
- One-shot job triggered by monitoring
- Typecheck passes

**Status:** false

### US-010: Create Job Status API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to query job status via API so that I can monitor async operations.

**Acceptance Criteria:**
- GET /api/jobs/:id endpoint created
- Returns job status and details
- Returns last_error if failed
- Includes created_at and completed_at timestamps
- Requires authentication
- Typecheck passes

**Status:** false

### US-011: Create Job Retry API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want to retry failed jobs via API so that I can recover from transient failures.

**Acceptance Criteria:**
- POST /api/jobs/:id/retry endpoint created
- Resets job status to pending
- Increments attempt count
- Checks max_attempts limit
- Requires authentication
- Typecheck passes

**Status:** false

### US-012: Create Job Progress UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see job progress in the UI so that I can monitor long-running operations like provisioning.

**Acceptance Criteria:**
- Job progress component created
- Shows current job status
- Shows progress bar for multi-step jobs
- Shows estimated time remaining
- Auto-refreshes status
- Shows error if job failed
- Retry button for failed jobs

**Status:** false
