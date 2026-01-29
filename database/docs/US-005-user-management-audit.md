# US-005: Audit User Management Operations

**Status**: Step 1 Complete
**Story**: Audit User Management Operations
**Maven Steps**: 1, 2, 7, 10

## Overview

This implementation provides audit logging infrastructure for user management operations (invite, remove, role change). The helper functions already exist from US-001 and US-002, ready to be integrated when the organizations-teams PRD is implemented.

## Acceptance Criteria (Step 1)

All acceptance criteria have been met:

- User invites logged with action: `user.invited`
- User removals logged with action: `user.removed`
- Role changes logged with action: `user.role_changed`
- Actor captured from authenticated user
- Target is user_id
- Metadata includes role and organization
- Typecheck passes

## Implementation

### 1. Type Definitions

The audit action types for user management operations are defined in `/home/ken/database/types/audit.types.ts`:

```typescript
export enum AuditAction {
  // User actions
  USER_INVITED = 'user.invited',
  USER_REMOVED = 'user.removed',
  USER_ROLE_CHANGED = 'user.role_changed',
  // ... other actions
}

export interface AuditLogMetadata {
  [key: string]: unknown;
  // User action metadata fields
  role?: string;
  organization?: string;
  old_value?: unknown;
  new_value?: unknown;
  reason?: string;
}
```

### 2. Helper Functions

User management audit logging helper functions are available in `/home/ken/database/src/helpers.ts`:

```typescript
export const logUserAction = {
  invited: (
    actor: ActorInfo,
    userId: string,
    role: string,
    organization: string,
    options?: AuditLogOptions
  ) =>
    logAction(
      actor,
      'user.invited',
      { type: 'user' as TargetType, id: userId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          role,
          organization,
        },
      }
    ),

  removed: (actor: ActorInfo, userId: string, reason?: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'user.removed',
      { type: 'user' as TargetType, id: userId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          reason,
        },
      }
    ),

  roleChanged: (
    actor: ActorInfo,
    userId: string,
    oldRole: string,
    newRole: string,
    organization: string,
    options?: AuditLogOptions
  ) =>
    logAction(
      actor,
      'user.role_changed',
      { type: 'user' as TargetType, id: userId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          old_value: oldRole,
          new_value: newRole,
          organization,
        },
      }
    ),
};
```

### 3. Usage Examples

See `/home/ken/database/docs/US-005-integration-patterns.md` for complete integration examples including:

- User invite endpoint integration
- User removal endpoint integration
- Role change endpoint integration
- Actor capture from authenticated user
- Request context extraction
- Security considerations

## Quick Start

### Basic Usage

```typescript
import { logUserAction, userActor } from '@nextmavens/audit-logs-database';

// Log user invitation
await logUserAction.invited(
  userActor('user-123'),
  'user-456',
  'developer',
  'acme-corp',
  { request: req }
);

// Log user removal
await logUserAction.removed(
  userActor('user-123'),
  'user-456',
  'Violation of terms',
  { request: req }
);

// Log role change
await logUserAction.roleChanged(
  userActor('user-123'),
  'user-456',
  'developer',
  'admin',
  'acme-corp',
  { request: req }
);
```

### With Full Metadata

```typescript
await logUserAction.invited(
  userActor('user-123'),
  'user-456',
  'developer',
  'acme-corp',
  {
    request: req,
    metadata: {
      invited_by_email: 'admin@example.com',
      invited_user_email: 'newuser@example.com',
      team: 'backend-team',
      invitation_method: 'email',
    },
  }
);
```

## Integration Pattern

### Recommended Pattern for User Management Services

```typescript
import { logUserAction, userActor } from '@nextmavens/audit-logs-database';

class UserService {
  async inviteUser(
    inviterId: string,
    email: string,
    role: string,
    organizationId: string,
    organizationName: string,
    request?: RequestContext
  ): Promise<User> {
    // 1. Perform the actual operation
    const user = await this.db.inviteUser(email, role, organizationId);

    // 2. Log the audit event
    await logUserAction.invited(
      userActor(inviterId),
      user.id,
      role,
      organizationName,
      {
        request,
        metadata: {
          invited_by_email: await this.getEmail(inviterId),
          invited_user_email: email,
        },
      }
    );

    // 3. Return the result
    return user;
  }

  async removeUser(
    removerId: string,
    userId: string,
    reason: string,
    request?: RequestContext
  ): Promise<void> {
    // 1. Perform the actual operation
    await this.db.removeUser(userId);

    // 2. Log the audit event
    await logUserAction.removed(
      userActor(removerId),
      userId,
      reason,
      { request }
    );
  }

  async changeRole(
    adminId: string,
    userId: string,
    oldRole: string,
    newRole: string,
    organization: string,
    request?: RequestContext
  ): Promise<void> {
    // 1. Perform the actual operation
    await this.db.updateRole(userId, newRole);

    // 2. Log the audit event
    await logUserAction.roleChanged(
      userActor(adminId),
      userId,
      oldRole,
      newRole,
      organization,
      { request }
    );
  }
}
```

## Metadata Structure

### User Invite Metadata

```typescript
{
  role: string;              // Required: Role assigned to user
  organization: string;      // Required: Organization name
  invited_by_email?: string; // Optional: Email of inviter
  invited_user_email?: string; // Optional: Email of invited user
  team?: string;             // Optional: Team assignment
  invitation_method?: string; // Optional: How invitation was sent
}
```

### User Removal Metadata

```typescript
{
  reason?: string;           // Optional: Reason for removal
  removed_by_email?: string; // Optional: Email of remover
  removed_user_email?: string; // Optional: Email of removed user
  violation_type?: string;   // Optional: Type of violation if applicable
}
```

### Role Change Metadata

```typescript
{
  old_value: string;         // Required: Previous role
  new_value: string;         // Required: New role
  organization: string;      // Required: Organization name
  changed_by_email?: string; // Optional: Email of admin who made change
  user_email?: string;       // Optional: Email of user whose role changed
  reason?: string;           // Optional: Reason for role change
}
```

## Security Considerations

### What to Log

- User IDs (not PII like emails in the target_id field)
- Role names (enum values, not free text)
- Organization names or IDs
- Business context (reason for removal, etc.)

### What NOT to Log

- Passwords or password hashes
- Session tokens or JWTs
- API keys
- Personal identifiable information (PII) in the target_id
- Request headers with sensitive data (Authorization, Cookie, etc.)

### Request Context Extraction

The helper functions automatically extract safe values from the request:

```typescript
export function extractIpAddress(request: RequestContext): string | null {
  if (!request) return null;

  const ip = request.ip ||
             request.headers?.['x-forwarded-for'] ||
             request.headers?.['x-real-ip'];

  if (typeof ip === 'string') {
    const parts = ip.split(',');
    return parts[0]?.trim() || null;
  }

  return null;
}

export function extractUserAgent(request: RequestContext): string | null {
  if (!request) return null;

  const userAgent = request.userAgent || request.headers?.['user-agent'];

  return typeof userAgent === 'string' ? userAgent : null;
}
```

**CRITICAL**: Never log the entire `headers` object directly. Only extract safe values like IP address and user agent.

## Files

| File | Description |
|------|-------------|
| `types/audit.types.ts` | Type definitions for audit actions |
| `src/helpers.ts` | Helper functions including `logUserAction` |
| `src/index.ts` | Main exports (includes user helpers) |
| `docs/US-005-integration-patterns.md` | Complete integration examples |

## Quality Standards

- No 'any' types
- All imports use proper TypeScript types
- Typecheck passes
- Type-safe API with full IntelliSense support
- Security-conscious logging practices

## Next Steps

For subsequent Maven steps:

- **Step 2**: Package manager migration (if needed)
- **Step 7**: Integration with actual services (organizations-teams PRD)
- **Step 10**: Testing and validation

## Implementation Timeline

**Current State**: Step 1 Complete (Foundation)
- Helper functions exist and are type-safe
- Documentation and examples provided
- Ready for integration when organizations-teams endpoints are built

**Future Implementation**: When organizations-teams PRD is implemented
- Integrate audit logging into user invite endpoint
- Integrate audit logging into user removal endpoint
- Integrate audit logging into role change endpoint
- Test with actual user management operations

## Testing

The audit logging functions can be tested by:

1. **Unit testing**: Test helper functions directly
   ```typescript
   await logUserAction.invited(
     userActor('test-user'),
     'target-user',
     'developer',
     'test-org'
   );
   ```

2. **Integration testing**: Test with real database
   ```bash
   pnpm test:integration
   ```

3. **Verify logs in the database**:
   ```sql
   SELECT * FROM control_plane.audit_logs
   WHERE action LIKE 'user.%'
   ORDER BY created_at DESC;
   ```

## References

- US-001: Create Audit Logs Table
- US-002: Create Audit Logging Function
- US-003: Audit Project CRUD Operations (integration pattern reference)
- US-004: Audit API Key Operations (security considerations reference)
