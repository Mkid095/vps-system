---
project: Abuse Controls
branch: flow/abuse-controls
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Abuse Controls

## Overview
Per-project hard caps. Signup rate limiting. Auto-suspend triggers. Suspension notifications. Hard caps enforced: DB queries/day, realtime connections, storage uploads/day, function invocations/day.

## Technical Approach
Hard caps per resource in quotas table. Rate limiting on signup endpoint (3 per hour per org/IP). Auto-suspend job checks for violations. Triggers: 3x average usage for 1 hour, error rate >50%, malicious patterns. Users notified on suspension.

## User Stories

### US-001: Define Hard Caps
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform operator, I want hard caps defined so that abuse is prevented automatically.

**Acceptance Criteria:**
- Hard caps defined in quotas table
- DB queries/day: 10,000
- Realtime connections: 100
- Storage uploads/day: 1,000
- Function invocations/day: 5,000
- Configurable per project
- Typecheck passes

**Status:** false

### US-002: Implement Signup Rate Limiting
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want signup rate limiting so that abuse prevention starts at registration.

**Acceptance Criteria:**
- Signup endpoint rate limited
- 3 projects per hour per org
- 5 projects per hour per IP
- Returns 429 with retry-after
- Typecheck passes

**Status:** false

### US-003: Implement Auto-Suspend on Hard Cap
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want auto-suspend on hard cap so that abuse is stopped immediately.

**Acceptance Criteria:**
- Background job checks hard caps
- Runs hourly
- Suspends projects exceeding caps
- Sets status to SUSPENDED
- Reason includes which cap exceeded
- Typecheck passes

**Status:** false

### US-004: Detect Usage Spikes
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want usage spike detection so that anomalous behavior is caught.

**Acceptance Criteria:**
- Job calculates average usage per project
- Detects 3x average for 1 hour
- Triggers warning or suspension
- Threshold configurable
- Typecheck passes

**Status:** false

### US-005: Detect Error Rate Spikes
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want error rate detection so that abuse patterns are identified.

**Acceptance Criteria:**
- Job calculates error rate per project
- Detects >50% error rate
- May indicate abuse or DDoS
- Triggers investigation
- Typecheck passes

**Status:** false

### US-006: Detect Malicious Patterns
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want malicious pattern detection so that sophisticated abuse is caught.

**Acceptance Criteria:**
- Detects: SQL injection attempts
- Detects: auth brute force
- Detects: rapid sequential key creation
- Triggers suspension
- Patterns configurable
- Typecheck passes

**Status:** false

### US-007: Send Suspension Notifications
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a project owner, I want notification when my project is suspended so that I understand what happened.

**Acceptance Criteria:**
- Email sent on suspension
- Includes: reason, which cap exceeded, how to resolve
- Includes support contact
- Sent to project owner and org members
- Typecheck passes

**Status:** false

### US-008: Create Suspension UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see suspension details so that I can resolve the issue.

**Acceptance Criteria:**
- Suspension banner in project dashboard
- Shows reason and details
- Shows which limit exceeded
- Shows how to resolve
- Request review button
- Typecheck passes

**Status:** false

### US-009: Implement Manual Override
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform operator, I want manual override capability so that I can handle edge cases.

**Acceptance Criteria:**
- Admin can override auto-suspend
- Requires reason
- Logged to audit
- Can increase caps if needed
- Typecheck passes

**Status:** false

### US-010: Abuse Dashboard
**Priority:** 3
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a platform operator, I want an abuse dashboard so that I can monitor platform abuse.

**Acceptance Criteria:**
- Dashboard shows: suspensions, rate limit hits, cap violations
- Shows: projects approaching caps
- Shows: suspicious patterns
- Filterable by time range
- Typecheck passes

**Status:** false
