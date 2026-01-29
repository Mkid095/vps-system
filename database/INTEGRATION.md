# Audit Logs Integration Layer

**Step 7 Implementation: Integration Layer for Audit Logs System**

This document describes the integration layer for the audit logs system, which provides a complete, type-safe interface for logging and querying audit events.

## Overview

The integration layer consists of:

1. **Database Connection Pool** (`pool.ts`) - PostgreSQL connection pooling
2. **AuditLogService** (`AuditLogService.ts`) - Core service implementing IAuditLogService
3. **Error Handling** (`errors.ts`) - Custom error classes
4. **Helper Functions** (`helpers.ts`) - Convenience functions for common audit patterns
5. **Integration Utilities** (`integration.ts`) - Easy-to-use functions for other services
6. **Main Exports** (`index.ts`) - Unified exports
7. **Integration Tests** (`test-integration.ts`) - Test suite

## Architecture

```
src/
├── pool.ts              # Database connection pool
├── AuditLogService.ts   # Core service implementation
├── errors.ts            # Custom error classes
├── helpers.ts           # Helper utilities
├── integration.ts       # Integration utilities for other services
├── index.ts             # Main exports
└── test-integration.ts  # Integration tests
```

## Usage

### Basic Integration

For other services (api-gateway, auth-service, etc.):

```typescript
import { logAuditEvent, queryAuditLogs } from '@nextmavens/audit-logs-database';

// Log an event
await logAuditEvent({
  actorId: 'user-123',
  actorType: 'user',
  action: 'project.created',
  targetType: 'project',
  targetId: 'proj-456',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: {
    source: 'api-gateway',
  },
});

// Query logs
const logs = await queryAuditLogs({
  actor_id: 'user-123',
  limit: 10,
});
```

### Using Helper Functions

```typescript
import { logProjectAction, userActor, projectTarget } from '@nextmavens/audit-logs-database';

// Log project creation
await logProjectAction.created(
  userActor('user-123'),
  'proj-456',
  { request: req }
);

// Log project update
await logProjectAction.updated(
  userActor('user-123'),
  'proj-456',
  { status: 'active' },
  { request: req }
);

// Log project suspension
await logProjectAction.suspended(
  userActor('user-123'),
  'proj-456',
  'Usage limit exceeded',
  { request: req }
);
```

### Using the Service Directly

```typescript
import { auditLogService } from '@nextmavens/audit-logs-database';

// Create audit log
const log = await auditLogService.create({
  actor_id: 'user-123',
  actor_type: 'user',
  action: 'project.created',
  target_type: 'project',
  target_id: 'proj-456',
  metadata: { source: 'test' },
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0...',
});

// Query by actor
const byActor = await auditLogService.findByActor('user-123', { limit: 10 });

// Query by target
const byTarget = await auditLogService.findByTarget('proj-456', { limit: 10 });

// Query by action
const byAction = await auditLogService.findByAction('project.created', { limit: 10 });
```

## API Reference

### Integration Functions

#### `logAuditEvent(params)`
Log an audit event with full control.

#### `logAuditEventFromRequest(params)`
Log an audit event, automatically extracting IP and user agent from request.

#### `queryAuditLogs(query)`
Query audit logs with filters.

#### `queryAuditLogsByActor(actorId, query?)`
Query audit logs by actor ID.

#### `queryAuditLogsByTarget(targetId, query?)`
Query audit logs by target ID.

#### `queryAuditLogsByAction(action, query?)`
Query audit logs by action.

### Helper Functions

#### `logProjectAction`
- `created(actor, projectId, options?)`
- `updated(actor, projectId, changes, options?)`
- `deleted(actor, projectId, options?)`
- `suspended(actor, projectId, reason, options?)`
- `autoSuspended(projectId, reason, hardCapExceeded, options?)`

#### `logApiKeyAction`
- `created(actor, keyId, keyType, scopes, options?)`
- `rotated(actor, keyId, keyType, scopes, options?)`
- `revoked(actor, keyId, reason, options?)`

#### `logUserAction`
- `invited(actor, userId, role, organization, options?)`
- `removed(actor, userId, reason, options?)`
- `roleChanged(actor, userId, oldRole, newRole, organization, options?)`

#### `logSecretAction`
- `created(actor, secretId, secretName, options?)`
- `accessed(actor, secretId, secretName, options?)`
- `rotated(actor, secretId, secretName, options?)`

### Actor Creators

- `systemActor()` - Create a system actor
- `userActor(userId)` - Create a user actor
- `apiKeyActor(keyId)` - Create an API key actor

### Target Creators

- `projectTarget(projectId)` - Create a project target
- `userTarget(userId)` - Create a user target
- `apiKeyTarget(keyId)` - Create an API key target
- `secretTarget(secretId)` - Create a secret target

## Middleware and Decorators

### Express Middleware

```typescript
import { createAuditMiddleware } from '@nextmavens/audit-logs-database';

const auditMiddleware = createAuditMiddleware({
  getActor: (req) => ({
    id: req.user?.id,
    type: 'user',
  }),
  getAction: (req) => `${req.method} ${req.route?.path}`,
  getTarget: (req) => ({
    type: 'endpoint',
    id: req.route?.path || 'unknown',
  }),
});

app.use('/api', auditMiddleware);
```

### Method Decorator

```typescript
import { AuditLogDecorator } from '@nextmavens/audit-logs-database';

class ProjectService {
  @AuditLogDecorator({
    action: 'project.created',
    targetType: 'project',
    getTargetId: function(this, args) { return args[0]; },
    getActorId: function(this, args) { return this.currentUser.id; },
  })
  async createProject(projectId: string, data: ProjectData) {
    // Method implementation
  }
}
```

## Database Configuration

The integration layer uses environment variables for database connection:

```bash
# Direct connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Or individual components
AUDIT_LOGS_DB_HOST=localhost
AUDIT_LOGS_DB_PORT=5432
AUDIT_LOGS_DB_NAME=postgres
AUDIT_LOGS_DB_USER=postgres
AUDIT_LOGS_DB_PASSWORD=yourpassword

# Pool configuration (optional)
AUDIT_LOGS_DB_POOL_MAX=20
AUDIT_LOGS_DB_IDLE_TIMEOUT=30000
AUDIT_LOGS_DB_CONN_TIMEOUT=2000
```

## Error Handling

The integration layer provides custom error classes:

- `AuditLogError` - Base error class
- `AuditLogValidationError` - Input validation errors
- `AuditLogConnectionError` - Database connection errors
- `AuditLogQueryError` - Query execution errors
- `AuditLogNotFoundError` - Resource not found errors

## Testing

Run the integration test suite:

```bash
# Set database password
export AUDIT_LOGS_DB_PASSWORD=yourpassword

# Run tests
pnpm test:integration
```

## Type Safety

All functions are fully typed with TypeScript. No 'any' types are used.

## Quality Standards

- ✓ Typecheck passes
- ✓ Build succeeds
- ✓ No 'any' types
- ✓ Proper error handling
- ✓ Connection pooling
- ✓ Type-safe API

## Files

| File | Lines | Description |
|------|-------|-------------|
| `pool.ts` | ~180 | Database connection pool |
| `AuditLogService.ts` | ~200 | Core service implementation |
| `errors.ts` | ~80 | Custom error classes |
| `helpers.ts` | ~350 | Helper utilities |
| `integration.ts` | ~250 | Integration utilities |
| `index.ts` | ~100 | Main exports |
| `test-integration.ts` | ~200 | Integration tests |

**Total**: ~1,360 lines of production code

## Next Steps

This integration layer is ready for use by:
- api-gateway
- auth-service
- graphql-service
- Any other service that needs audit logging
