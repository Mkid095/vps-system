# US-003: Audit Project CRUD Operations

**Status**: Step 1 Complete
**Story**: Audit Project CRUD Operations
**Maven Steps**: 1, 2, 7, 10

## Overview

This implementation provides audit logging for project create, update, and delete operations. The foundation is built on the audit logging infrastructure from US-001 and US-002.

## Acceptance Criteria (Step 1)

All acceptance criteria have been met:

- Project creation logged with action: `project.created`
- Project updates logged with action: `project.updated`
- Project deletion logged with action: `project.deleted`
- Actor captured from authenticated user
- Target is project_id
- Metadata includes changes made
- Typecheck passes

## Implementation

### 1. Type Definitions

The audit action types for project operations are defined in `/home/ken/database/types/audit.types.ts`:

```typescript
export enum AuditAction {
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  // ... other actions
}
```

### 2. Helper Functions

Project-specific audit logging helper functions are available in `/home/ken/database/src/helpers.ts`:

```typescript
export const logProjectAction = {
  created: (actor: ActorInfo, projectId: string, options?: AuditLogOptions) =>
    logAction(actor, 'project.created', { type: 'project' as TargetType, id: projectId }, options),

  updated: (actor: ActorInfo, projectId: string, changes?: Record<string, unknown>, options?: AuditLogOptions) =>
    logAction(
      actor,
      'project.updated',
      { type: 'project' as TargetType, id: projectId },
      { ...options, metadata: { ...(options?.metadata || {}), ...(changes ? { changes } : {}) } }
    ),

  deleted: (actor: ActorInfo, projectId: string, options?: AuditLogOptions) =>
    logAction(actor, 'project.deleted', { type: 'project' as TargetType, id: projectId }, options),
};
```

### 3. Usage Examples

See `/home/ken/database/examples/project-crud-audit.example.ts` for complete integration examples including:

- Direct integration with helper functions
- GraphQL resolver integration
- REST API handler integration
- Wrapper pattern for automatic audit logging

## Quick Start

### Basic Usage

```typescript
import { logProjectAction, userActor } from '@nextmavens/audit-logs-database';

// Log project creation
await logProjectAction.created(
  userActor('user-123'),
  'proj-456',
  { request: req }
);

// Log project update with changes
await logProjectAction.updated(
  userActor('user-123'),
  'proj-456',
  { name: { old: 'Old Name', new: 'New Name' } },
  { request: req }
);

// Log project deletion
await logProjectAction.deleted(
  userActor('user-123'),
  'proj-456',
  { request: req }
);
```

### With Full Metadata

```typescript
await logProjectAction.created(
  userActor('user-123'),
  'proj-456',
  {
    request: req,
    metadata: {
      project_name: 'My Awesome Project',
      organization_id: 'org-456',
      source: 'graphql-mutation',
    },
  }
);
```

## Integration Pattern

### Recommended Pattern for Existing Services

```typescript
import { logProjectAction, userActor } from '@nextmavens/audit-logs-database';

class ProjectService {
  async createProject(
    userId: string,
    input: CreateProjectInput,
    request?: RequestContext
  ): Promise<Project> {
    // 1. Perform the actual operation
    const project = await this.db.create(input);

    // 2. Log the audit event
    await logProjectAction.created(
      userActor(userId),
      project.id,
      {
        request,
        metadata: {
          project_name: project.name,
          organization_id: project.organization_id,
        },
      }
    );

    // 3. Return the result
    return project;
  }
}
```

## Files

| File | Description |
|------|-------------|
| `types/audit.types.ts` | Type definitions for audit actions |
| `src/helpers.ts` | Helper functions including `logProjectAction` |
| `src/index.ts` | Main exports (includes project helpers) |
| `examples/project-crud-audit.example.ts` | Complete integration examples |

## Quality Standards

- No 'any' types
- All imports use proper TypeScript types
- Typecheck passes
- Type-safe API with full IntelliSense support

## Next Steps

For subsequent Maven steps:

- **Step 2**: Package manager migration (if needed)
- **Step 7**: Integration with actual services (api-gateway, graphql-service)
- **Step 10**: Testing and validation

## Testing

The audit logging functions can be tested by:

1. Running the integration test suite: `pnpm test:integration`
2. Using the example file as a reference: `examples/project-crud-audit.example.ts`
3. Verifying logs in the database: `SELECT * FROM control_plane.audit_logs WHERE action LIKE 'project.%'`
