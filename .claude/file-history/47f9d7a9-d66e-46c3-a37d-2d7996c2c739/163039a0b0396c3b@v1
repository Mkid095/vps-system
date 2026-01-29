---
project: CLI Tool
branch: flow/cli-tool
availableMCPs:
  - supabase
  - chrome-devtools
  - web-search-prime
---

# CLI Tool

## Overview
Standalone CLI tool that provides terminal-based workflows for developers who prefer command-line interfaces over UI. Serious developers don't click UI for everything - CLI is essential for team adoption and CI/CD integration.

## Technical Approach
Create Node.js CLI package at `/home/ken/nextmavens-cli/` using oclif or yargs framework. CLI acts as a thin wrapper around the Control Plane API, storing authentication tokens and project configuration locally. Distribute via npm for easy installation.

## User Stories

### US-001: Create CLI Project Structure
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a platform engineer, I want to create the CLI project structure so that we have a foundation for adding CLI commands.

**Acceptance Criteria:**
- Node.js project created at /home/ken/nextmavens-cli/
- CLI framework configured (oclif or yargs)
- package.json with bin entry point
- TypeScript configuration
- Build scripts configured
- Can run `nextmavens --version`
- Can run `nextmavens --help`
- Typecheck passes

**Status:** false

### US-002: Implement Authentication Commands
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to login and logout via CLI so that I can authenticate my terminal session.

**Acceptance Criteria:**
- `nextmavens login` command implemented
- Prompts for email and password
- Stores access token locally
- Token stored in ~/.nextmavens/config.json
- `nextmavens logout` command implemented
- Logout removes stored token
- `nextmavens whoami` shows current user
- Typecheck passes

**Status:** false

### US-003: Implement Project Commands
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to create and link projects via CLI so that I can set up projects without using the web UI.

**Acceptance Criteria:**
- `nextmavens project create <name>` command
- Creates project via Control Plane API
- Returns project details and API keys
- `nextmavens project link` command
- Links current directory to existing project
- Creates .nextmavens/config.json with project_id
- `nextmavens project list` command
- Lists all projects for authenticated user
- Typecheck passes

**Status:** false

### US-004: Implement Database Commands
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to push schema changes and run migrations via CLI so that I can manage database schema from the terminal.

**Acceptance Criteria:**
- `nextmavens db push` command
- Reads schema from local file
- Pushes schema to project database
- `nextmavens db diff` command
- Shows diff between local and remote schema
- `nextmavens db reset` command
- Resets database to initial state (dev only)
- Typecheck passes

**Status:** false

### US-005: Implement Functions Commands
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to deploy edge functions via CLI so that I can deploy serverless code from my terminal.

**Acceptance Criteria:**
- `nextmavens functions deploy` command
- Deploys functions from /functions directory
- Shows deployment progress
- `nextmavens functions list` command
- Lists deployed functions
- `nextmavens functions logs <name>` command
- Shows function logs
- Typecheck passes

**Status:** false

### US-006: Implement Secrets Commands
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to manage project secrets via CLI so that I can set environment variables without using the web UI.

**Acceptance Criteria:**
- `nextmavens secrets set <key> <value>` command
- Sets secret for linked project
- `nextmavens secrets list` command
- Lists all secret names (values hidden)
- `nextmavens secrets delete <key>` command
- Deletes a secret
- Typecheck passes

**Status:** false

### US-007: Implement Status Command
**Priority:** 2
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a developer, I want to check project status via CLI so that I can see the current state of my project.

**Acceptance Criteria:**
- `nextmavens status` command implemented
- Shows linked project information
- Shows project status (active, suspended, etc.)
- Shows enabled services
- Shows current usage metrics
- Shows any issues or warnings
- Typecheck passes

**Status:** false

### US-008: Implement API Client Library
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a CLI developer, I want a reusable API client library so that all CLI commands can communicate with the Control Plane API.

**Acceptance Criteria:**
- API client created at src/lib/api-client.ts
- Handles authentication with stored token
- Handles request/response formatting
- Handles error responses
- Retries on 429 with exponential backoff
- TypeScript types for all API responses
- Typecheck passes

**Status:** false

### US-009: Implement Config Management
**Priority:** 1
**Maven Steps:** [1, 2, 7, 10]
**MCP Tools:** []

As a CLI developer, I want config management so that the CLI can store authentication tokens and project links locally.

**Acceptance Criteria:**
- Config stored in ~/.nextmavens/config.json
- Config stores: auth_token, default_project_id, api_base_url
- Config class with get/set methods
- Config directory created if doesn't exist
- Config file created with defaults if doesn't exist
- Typecheck passes

**Status:** false

### US-010: Publish to NPM
**Priority:** 2
**Maven Steps:** [9]
**MCP Tools:** []

As a developer, I want to install the CLI via npm so that I can easily get started.

**Acceptance Criteria:**
- Package published to npm as `nextmavens-cli`
- Can install with `npm install -g nextmavens-cli`
- Package version follows semantic versioning
- Package includes all dependencies
- Installation tested on fresh system
- README with installation instructions

**Status:** false

### US-011: Create Documentation
**Priority:** 2
**Maven Steps:** [5]
**MCP Tools:** []

As a developer, I want comprehensive CLI documentation so that I can understand how to use all commands.

**Acceptance Criteria:**
- README with overview and installation
- Command reference with examples
- Usage guide for common workflows
- CONTRIBUTING guide for CLI development
- Docs included in npm package
- Docs available online

**Status:** false
