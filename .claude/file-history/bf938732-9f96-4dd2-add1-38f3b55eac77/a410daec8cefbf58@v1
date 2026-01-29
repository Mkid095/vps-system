---
project: Failure Modes Documentation
branch: flow/failure-modes-docs
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Failure Modes Documentation

## Overview
What breaks and how. Rate limits per service. Max file sizes. Query timeouts. Connection limits. Error codes. Common pitfalls. Developers can understand limits and avoid problems.

## Technical Approach
Document all limits and constraints per service. Explain error codes and their meanings. Show common pitfalls and how to avoid them. Provide troubleshooting guidance. Be explicit about what breaks.

## User Stories

### US-001: Document Database Limits
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know database limits so that I can design within constraints.

**Acceptance Criteria:**
- Database limits section created
- Max rows per query: 1000
- Query timeout: 30 seconds
- Rate limit: 100 requests/minute
- Connection pool: 20 per project
- Transaction timeout: 60 seconds
- Typecheck passes

**Status:** false

### US-002: Document Auth Limits
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know auth service limits.

**Acceptance Criteria:**
- Auth limits section created
- Max users per project: 100,000
- Rate limit: 50 requests/minute
- Session duration: 7 days
- Max concurrent sessions: 10 per user
- Typecheck passes

**Status:** false

### US-003: Document Realtime Limits
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know realtime limits.

**Acceptance Criteria:**
- Realtime limits section created
- Max connections: 50 per project
- Message rate: 100/second
- Channel subscription limit: 100 per connection
- Connection timeout: 2 hours
- Message size: 64KB max
- Typecheck passes

**Status:** false

### US-004: Document Storage Limits
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know storage limits.

**Acceptance Criteria:**
- Storage limits section created
- Max file size: 5GB
- Upload rate: 10/minute
- Storage quota: varies by plan
- Bucket limit: 100 per project
- File retention: 30 days minimum
- Typecheck passes

**Status:** false

### US-005: Document GraphQL Limits
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know GraphQL limits.

**Acceptance Criteria:**
- GraphQL limits section created
- Query depth: 10 levels
- Query complexity: 1000 points
- Rate limit: 60 requests/minute
- Query timeout: 30 seconds
- Max result size: 10MB
- Typecheck passes

**Status:** false

### US-006: Document Error Codes
**Priority:** 1
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want error codes documented so that I can handle errors properly.

**Acceptance Criteria:**
- Error codes section created
- Each error code documented
- Shows: error name, code, message, retryable
- Shows: when it occurs
- Shows: how to resolve
- Typecheck passes

**Status:** false

### US-007: Document Common Pitfalls
**Priority:** 2
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want common pitfalls documented so that I can avoid mistakes.

**Acceptance Criteria:**
- Pitfalls section created
- Database: N+1 queries, missing indexes
- Auth: Storing tokens insecurely
- Realtime: Not cleaning up subscriptions
- Storage: Large file uploads
- Solutions provided
- Typecheck passes

**Status:** false

### US-008: Document Query Timeout Scenarios
**Priority:** 2
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to know what causes query timeouts.

**Acceptance Criteria:**
- Timeout scenarios section created
- Long-running queries
- Large result sets
- Missing indexes
- Locks and blocking
- How to diagnose and fix
- Typecheck passes

**Status:** false

### US-009: Document Rate Limit Behavior
**Priority:** 2
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want to understand rate limiting behavior.

**Acceptance Criteria:**
- Rate limiting section created
- How limits are calculated
- Sliding window vs fixed window
- Response headers (RateLimit-Remaining, RateLimit-Reset)
- Retry-after header
- Best practices for handling
- Typecheck passes

**Status:** false

### US-010: Add Troubleshooting Guide
**Priority:** 2
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want troubleshooting guidance for common errors.

**Acceptance Criteria:**
- Troubleshooting guide created
- Common errors per service
- Step-by-step diagnosis
- Solutions for each error
- When to contact support
- Typecheck passes

**Status:** false
