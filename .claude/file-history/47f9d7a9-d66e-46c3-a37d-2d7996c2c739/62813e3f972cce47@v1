---
project: Provisioning State Machine
branch: flow/provisioning-state-machine
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Provisioning State Machine

## Overview
Real-world failure modes: Step 3 fails after step 2 succeeds, partial resources exist, retrying blindly causes duplicates. Step-aware provisioning enables safe retry from failure and better UX.

## Technical Approach
Create provisioning_steps table tracking each step separately: step_name, status, error_details, retry_count. Define ordered steps: create_tenant, create_schema, create_storage_namespace, register_auth, register_realtime, generate_keys, verify_services. State transitions: PENDING → RUNNING → SUCCESS/FAILED.

## User Stories

### US-001: Create Provisioning Steps Table
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want a provisioning_steps table so that I can track each provisioning step separately.

**Acceptance Criteria:**
- provisioning_steps table created in control_plane schema
- Columns: id, project_id, step_name, status, started_at, completed_at, error_message, error_details (JSONB), retry_count, created_at
- Unique constraint on (project_id, step_name)
- Index on project_id for efficient queries
- Status enum: pending, running, success, failed, skipped
- Migration script created and tested

**Status:** false

### US-002: Define Provisioning Steps
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want ordered provisioning steps defined so that provisioning follows a consistent sequence.

**Acceptance Criteria:**
- Steps defined in order:
  1. create_tenant - Create tenant record
  2. create_schema - Create tenant_{slug} schema
  3. create_storage_namespace - Setup storage bucket
  4. register_auth - Register with auth service
  5. register_realtime - Register with realtime service
  6. generate_keys - Create default API keys
  7. verify_services - Ping all services to confirm ready
- Each step has handler function
- Typecheck passes

**Status:** false

### US-003: Implement State Machine Logic
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want state machine logic so that provisioning steps transition through states correctly.

**Acceptance Criteria:**
- State machine created at src/lib/provisioning/state-machine.ts
- runProvisioningStep(project_id, step_name) function
- Transitions: PENDING → RUNNING → SUCCESS/FAILED
- RUNNING status set when step starts
- SUCCESS/FAILED set based on outcome
- Timestamps recorded for started_at and completed_at
- Typecheck passes

**Status:** false

### US-004: Implement Step Retry Logic
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want retry from failed step so that provisioning can recover from failures.

**Acceptance Criteria:**
- retryProvisioningStep(project_id, step_name) function
- Resets status to PENDING
- Increments retry_count
- Re-runs step handler
- Skips already successful steps
- Typecheck passes

### US-005: Implement Error Capture
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want errors captured in detail so that I can diagnose provisioning failures.

**Acceptance Criteria:**
- Error message captured in error_message column
- Error details captured in error_details JSONB
- Error details include: error_type, stack_trace, context
- Failed step shows error in UI
- Typecheck passes

**Status:** false

### US-006: Create Provisioning Progress API
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to query provisioning progress so that I can monitor setup status.

**Acceptance Criteria:**
- GET /api/projects/:id/provisioning endpoint
- Returns all provisioning steps for project
- Shows step name, status, started_at, completed_at
- Shows error if failed
- Shows overall progress percentage
- Typecheck passes

**Status:** false

### US-007: Create Provisioning Progress UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see provisioning progress in the UI so that I know what's happening during setup.

**Acceptance Criteria:**
- Progress bar component created
- Shows overall progress
- Shows each step with status (pending, running, success, failed)
- Auto-refreshes status every 2 seconds
- Shows error message if step failed
- Retry button for failed steps
- Typecheck passes

**Status:** false

### US-008: Implement Verify Services Step
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to verify all services are ready so that the project is fully operational after provisioning.

**Acceptance Criteria:**
- verify_services step handler
- Pings each service endpoint
- Checks service health status
- Marks step success only if all services ready
- Fails step if any service unavailable
- Typecheck passes

**Status:** false

### US-009: Handle Partial Failures
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to handle partial failures so that some steps succeeding doesn't leave system in undefined state.

**Acceptance Criteria:**
- Failed step doesn't prevent retry of subsequent steps
- Success steps marked as success (not re-run on retry)
- No duplicate resources created on retry
- System always in known state
- Typecheck passes

**Status:** false

### US-010: Update Provisioning API
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want the provisioning API to use the state machine so that all provisioning is tracked.

**Acceptance Criteria:**
- POST /api/projects/:id/provision uses state machine
- Creates all provisioning steps as PENDING
- Runs steps in order
- Returns job ID for tracking
- Typecheck passes

**Status:** false
