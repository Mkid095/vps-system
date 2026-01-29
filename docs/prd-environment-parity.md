---
project: Environment Parity
branch: flow/environment-parity
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# Environment Parity

## Overview
Dev is for experimentation. Prod is for stability. Different rules = fewer support headaches. Environment-aware behavior ensures developers can experiment freely in dev while production remains stable and secure.

## Technical Approach
Add environment field to projects and API keys tables. Define behavioral differences: rate limits (10x in dev), auto-suspend (no in dev), logging (verbose in dev), webhook retries (infinite in dev). Implement getEnvironmentConfig() helper. Add environment selector in UI.

## User Stories

### US-001: Add Environment Field to Projects
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a platform engineer, I want projects to have an environment field so that I can apply different rules based on environment.

**Acceptance Criteria:**
- projects table updated with environment column
- Environment enum: prod, dev, staging
- Default value: prod
- Migration script created
- Existing projects set to prod
- Typecheck passes

**Status:** false

### US-002: Add Environment Field to API Keys
**Priority:** 1
**Maven Steps:** [1, 2, 7]
**MCP Tools:** []

As a developer, I want API keys to be scoped to environments so that dev keys don't work in production.

**Acceptance Criteria:**
- api_keys table updated with environment column
- Environment enum: prod, dev, staging
- Key must match project environment to work
- Migration script created
- Typecheck passes

**Status:** false

### US-003: Create Environment Config Helper
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want a getEnvironmentConfig() helper so that I can easily get environment-specific behavior.

**Acceptance Criteria:**
- Helper created at src/lib/environment.ts
- Takes environment as parameter
- Returns config object with: rate_limit_multiplier, auto_suspend_enabled, log_level, max_webhook_retries
- Prod: rate_limit_multiplier=1, auto_suspend=true, log_level=info, retries=3
- Dev: rate_limit_multiplier=10, auto_suspend=false, log_level=debug, retries=infinite
- Staging: rate_limit_multiplier=5, auto_suspend=false, log_level=debug, retries=5
- Typecheck passes

**Status:** false

### US-004: Implement Different Rate Limits per Environment
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want higher rate limits in dev so that I can test without hitting limits.

**Acceptance Criteria:**
- Rate limit checking uses environment config
- Dev environment gets 10x rate limit
- Staging gets 5x rate limit
- Prod gets standard rate limit
- Typecheck passes

**Status:** false

### US-005: Disable Auto-Suspend in Dev
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want auto-suspend disabled in dev so that my testing doesn't get interrupted.

**Acceptance Criteria:**
- Auto-suspend job checks environment config
- Dev and staging environments skip auto-suspend
- Only prod environment auto-suspends
- Typecheck passes

**Status:** false

### US-006: Implement Verbose Logging in Dev
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want verbose logging in dev so that I can debug issues easily.

**Acceptance Criteria:**
- Log level set from environment config
- Dev and staging use debug level
- Prod uses info level (or sampled)
- Debug logs include full request/response bodies
- Typecheck passes

**Status:** false

### US-007: Implement Infinite Webhook Retries in Dev
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want infinite webhook retries in dev so that testing webhooks is reliable.

**Acceptance Criteria:**
- Webhook retry logic uses environment config
- Dev environment retries indefinitely
- Staging retries 5 times
- Prod retries 3 times
- Typecheck passes

**Status:** false

### US-008: Add Environment Selector in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to select environment when creating projects so that I can set up dev/staging/proj environments.

**Acceptance Criteria:**
- Environment dropdown in project creation form
- Options: Production, Development, Staging
- Default: Production
- Help text explaining differences
- Typecheck passes

**Status:** false

### US-009: Show Environment Indicators in UI
**Priority:** 2
**Maven Steps:** [5, 10]
**MCP Tools:** []

As a developer, I want to see environment indicators so that I know which environment I'm working with.

**Acceptance Criteria:**
- Environment badge shown on project detail page
- Color-coded: Prod (green), Dev (blue), Staging (yellow)
- Environment shown in project list
- Warning when working in prod environment
- Typecheck passes

**Status:** false

### US-010: Environment-Specific API Key Prefixes
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want API keys to have environment-specific prefixes so that I can easily identify key environment.

**Acceptance Criteria:**
- Prod keys: nm_live_pk_, nm_live_sk_
- Dev keys: nm_dev_pk_, nm_dev_sk_
- Staging keys: nm_staging_pk_, nm_staging_sk_
- Prefix set based on project environment
- Typecheck passes
