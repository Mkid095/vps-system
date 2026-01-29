# US-005 Integration Patterns: User Management Audit

## Overview

This document provides code examples and integration patterns for audit logging user management operations. These patterns are ready to be implemented when the organizations-teams PRD is developed.

## Import Pattern

Always import from the `@nextmavens/audit-logs-database` package:

```typescript
import {
  logUserAction,
  userActor,
  type ActorInfo,
  type AuditLogOptions,
  type RequestContext
} from '@nextmavens/audit-logs-database';
```

## REST API Integration Patterns

### Pattern 1: User Invite Endpoint

```typescript
// File: organizations-teams/src/app/api/users/invite/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { logUserAction, userActor } from '@nextmavens/audit-logs-database';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request
    const auth = await authenticateRequest(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role, organizationId } = await req.json();

    // 2. Validate input
    if (!email || !role || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Check permissions
    const canInvite = await checkPermission(auth.user.id, 'invite_user', organizationId);
    if (!canInvite) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Get organization details
    const organization = await getOrganization(organizationId);

    // 5. Create the user invitation
    const invitation = await createInvitation({
      email,
      role,
      organizationId,
      invitedBy: auth.user.id
    });

    // 6. Log the audit event
    await logUserAction.invited(
      userActor(auth.user.id),
      invitation.id,
      role,
      organization.name,
      {
        request: {
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
        metadata: {
          invited_by_email: auth.user.email,
          invited_user_email: email,
          organization_id: organizationId,
          invitation_method: 'email',
        }
      }
    );

    // 7. Send invitation email
    await sendInvitationEmail(email, invitation.token);

    return NextResponse.json({
      success: true,
      invitationId: invitation.id
    });

  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pattern 2: User Removal Endpoint

```typescript
// File: organizations-teams/src/app/api/users/[userId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { logUserAction, userActor } from '@nextmavens/audit-logs-database';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. Authenticate the request
    const auth = await authenticateRequest(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { reason } = await req.json();

    // 2. Get user details for audit log
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 3. Check permissions
    const canRemove = await checkPermission(
      auth.user.id,
      'remove_user',
      targetUser.organizationId
    );
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 4. Prevent self-removal
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    // 5. Remove the user
    await removeUser(userId);

    // 6. Log the audit event
    await logUserAction.removed(
      userActor(auth.user.id),
      userId,
      reason || 'No reason provided',
      {
        request: {
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
        metadata: {
          removed_by_email: auth.user.email,
          removed_user_email: targetUser.email,
          organization_id: targetUser.organizationId,
          user_role: targetUser.role,
        }
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Role Change Endpoint

```typescript
// File: organizations-teams/src/app/api/users/[userId]/role/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { logUserAction, userActor } from '@nextmavens/audit-logs-database';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 1. Authenticate the request
    const auth = await authenticateRequest(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { newRole, reason } = await req.json();

    // 2. Validate input
    if (!newRole) {
      return NextResponse.json(
        { error: 'Missing required field: newRole' },
        { status: 400 }
      );
    }

    // 3. Get current user details
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Check permissions
    const canChangeRole = await checkPermission(
      auth.user.id,
      'change_role',
      targetUser.organizationId
    );
    if (!canChangeRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // 5. Prevent self-role-change
    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // 6. Get organization details
    const organization = await getOrganization(targetUser.organizationId);

    // 7. Store old role for audit
    const oldRole = targetUser.role;

    // 8. Update the user role
    await updateUserRole(userId, newRole);

    // 9. Log the audit event
    await logUserAction.roleChanged(
      userActor(auth.user.id),
      userId,
      oldRole,
      newRole,
      organization.name,
      {
        request: {
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        },
        metadata: {
          changed_by_email: auth.user.email,
          user_email: targetUser.email,
          organization_id: targetUser.organizationId,
          reason: reason || 'Administrative action',
        }
      }
    );

    // 10. Notify user of role change
    await sendRoleChangeEmail(targetUser.email, oldRole, newRole, organization.name);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error changing role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## GraphQL Integration Pattern

```typescript
// File: organizations-teams/src/graphql/resolvers/user-resolver.ts

import { logUserAction, userActor } from '@nextmavens/audit-logs-database';
import type { Context } from '@/graphql/context';

export const userResolvers = {
  Mutation: {
    inviteUser: async (
      _: unknown,
      args: {
        email: string;
        role: string;
        organizationId: string;
      },
      context: Context
    ) => {
      const { user } = context;

      // Check permissions
      const canInvite = await checkPermission(user.id, 'invite_user', args.organizationId);
      if (!canInvite) {
        throw new Error('Insufficient permissions');
      }

      // Get organization details
      const organization = await getOrganization(args.organizationId);

      // Create invitation
      const invitation = await createInvitation({
        email: args.email,
        role: args.role,
        organizationId: args.organizationId,
        invitedBy: user.id
      });

      // Log audit event
      await logUserAction.invited(
        userActor(user.id),
        invitation.id,
        args.role,
        organization.name,
        {
          request: context.req,
          metadata: {
            invited_by_email: user.email,
            invited_user_email: args.email,
            organization_id: args.organizationId,
          }
        }
      );

      return invitation;
    },

    removeUser: async (
      _: unknown,
      args: {
        userId: string;
        reason?: string;
      },
      context: Context
    ) => {
      const { user } = context;

      // Get user details
      const targetUser = await getUserById(args.userId);

      // Check permissions
      const canRemove = await checkPermission(user.id, 'remove_user', targetUser.organizationId);
      if (!canRemove) {
        throw new Error('Insufficient permissions');
      }

      // Remove user
      await removeUser(args.userId);

      // Log audit event
      await logUserAction.removed(
        userActor(user.id),
        args.userId,
        args.reason,
        {
          request: context.req,
          metadata: {
            removed_by_email: user.email,
            removed_user_email: targetUser.email,
            organization_id: targetUser.organizationId,
          }
        }
      );

      return { success: true };
    },

    changeUserRole: async (
      _: unknown,
      args: {
        userId: string;
        newRole: string;
        reason?: string;
      },
      context: Context
    ) => {
      const { user } = context;

      // Get current user details
      const targetUser = await getUserById(args.userId);
      const organization = await getOrganization(targetUser.organizationId);

      // Check permissions
      const canChangeRole = await checkPermission(user.id, 'change_role', targetUser.organizationId);
      if (!canChangeRole) {
        throw new Error('Insufficient permissions');
      }

      // Update role
      const oldRole = targetUser.role;
      await updateUserRole(args.userId, args.newRole);

      // Log audit event
      await logUserAction.roleChanged(
        userActor(user.id),
        args.userId,
        oldRole,
        args.newRole,
        organization.name,
        {
          request: context.req,
          metadata: {
            changed_by_email: user.email,
            user_email: targetUser.email,
            organization_id: targetUser.organizationId,
            reason: args.reason,
          }
        }
      );

      return { success: true };
    },
  },
};
```

## Service Layer Integration Pattern

```typescript
// File: organizations-teams/src/services/UserService.ts

import { logUserAction, userActor } from '@nextmavens/audit-logs-database';
import type { RequestContext } from '@nextmavens/audit-logs-database';

export class UserService {
  constructor(
    private db: Database,
    private emailService: EmailService
  ) {}

  async inviteUser(
    inviterId: string,
    inviterEmail: string,
    email: string,
    role: string,
    organizationId: string,
    organizationName: string,
    request?: RequestContext
  ): Promise<Invitation> {
    // 1. Create invitation
    const invitation = await this.db.invitations.create({
      email,
      role,
      organizationId,
      invitedBy: inviterId,
      token: generateToken(),
    });

    // 2. Log audit event
    await logUserAction.invited(
      userActor(inviterId),
      invitation.id,
      role,
      organizationName,
      {
        request,
        metadata: {
          invited_by_email: inviterEmail,
          invited_user_email: email,
          organization_id: organizationId,
        }
      }
    );

    // 3. Send invitation email
    await this.emailService.sendInvitation(email, invitation.token);

    return invitation;
  }

  async removeUser(
    removerId: string,
    removerEmail: string,
    userId: string,
    reason: string,
    request?: RequestContext
  ): Promise<void> {
    // 1. Get user details
    const user = await this.db.users.findById(userId);

    // 2. Remove user
    await this.db.users.delete(userId);

    // 3. Log audit event
    await logUserAction.removed(
      userActor(removerId),
      userId,
      reason,
      {
        request,
        metadata: {
          removed_by_email: removerEmail,
          removed_user_email: user.email,
          organization_id: user.organizationId,
          user_role: user.role,
        }
      }
    );
  }

  async changeRole(
    adminId: string,
    adminEmail: string,
    userId: string,
    oldRole: string,
    newRole: string,
    organizationId: string,
    organizationName: string,
    userEmail: string,
    reason?: string,
    request?: RequestContext
  ): Promise<void> {
    // 1. Update role
    await this.db.users.update(userId, { role: newRole });

    // 2. Log audit event
    await logUserAction.roleChanged(
      userActor(adminId),
      userId,
      oldRole,
      newRole,
      organizationName,
      {
        request,
        metadata: {
          changed_by_email: adminEmail,
          user_email: userEmail,
          organization_id: organizationId,
          reason,
        }
      }
    );
  }
}
```

## Middleware Pattern for Automatic Audit Logging

```typescript
// File: organizations-teams/src/middleware/audit-middleware.ts

import { logUserAction, userActor } from '@nextmavens/audit-logs-database';
import type { RequestContext } from '@nextmavens/audit-logs-database';

export function withUserAudit<T extends { userId: string }>(
  action: 'invite' | 'remove' | 'roleChange'
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [userId, ...rest] = args;
      const context = args[args.length - 1] as {
        user: { id: string; email: string };
        request?: RequestContext;
      };

      // Execute the original method
      const result = await originalMethod.apply(this, args);

      // Extract audit-relevant data
      const auditData = extractAuditData(action, result);

      // Log audit event based on action type
      switch (action) {
        case 'invite':
          await logUserAction.invited(
            userActor(context.user.id),
            auditData.userId,
            auditData.role,
            auditData.organization,
            { request: context.request }
          );
          break;

        case 'remove':
          await logUserAction.removed(
            userActor(context.user.id),
            userId,
            auditData.reason,
            { request: context.request }
          );
          break;

        case 'roleChange':
          await logUserAction.roleChanged(
            userActor(context.user.id),
            userId,
            auditData.oldRole,
            auditData.newRole,
            auditData.organization,
            { request: context.request }
          );
          break;
      }

      return result;
    };

    return descriptor;
  };
}

// Usage:
class UserService {
  @withUserAudit('invite')
  async inviteUser(userId: string, role: string, organization: string, context: Context) {
    // Method implementation
  }
}
```

## Testing Patterns

### Unit Test Example

```typescript
// File: organizations-teams/src/__tests__/user-service.test.ts

import { describe, it, expect, vi } from 'vitest';
import { logUserAction } from '@nextmavens/audit-logs-database';
import { UserService } from '../services/UserService';

vi.mock('@nextmavens/audit-logs-database');

describe('UserService - Audit Logging', () => {
  it('should log user invitation', async () => {
    const mockLogUserAction = vi.mocked(logUserAction);
    const service = new UserService(mockDb, mockEmailService);

    await service.inviteUser(
      'inviter-123',
      'inviter@example.com',
      'newuser@example.com',
      'developer',
      'org-456',
      'Acme Corp',
      mockRequest
    );

    expect(mockLogUserAction.invited).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'inviter-123', type: 'user' }),
      expect.any(String),
      'developer',
      'Acme Corp',
      expect.objectContaining({
        request: mockRequest,
        metadata: expect.objectContaining({
          invited_by_email: 'inviter@example.com',
          invited_user_email: 'newuser@example.com',
        })
      })
    );
  });

  it('should log user removal', async () => {
    const mockLogUserAction = vi.mocked(logUserAction);
    const service = new UserService(mockDb, mockEmailService);

    await service.removeUser(
      'admin-123',
      'admin@example.com',
      'user-456',
      'Policy violation',
      mockRequest
    );

    expect(mockLogUserAction.removed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-123', type: 'user' }),
      'user-456',
      'Policy violation',
      expect.objectContaining({
        request: mockRequest,
      })
    );
  });

  it('should log role change', async () => {
    const mockLogUserAction = vi.mocked(logUserAction);
    const service = new UserService(mockDb, mockEmailService);

    await service.changeRole(
      'admin-123',
      'admin@example.com',
      'user-456',
      'developer',
      'admin',
      'org-456',
      'Acme Corp',
      'user@example.com',
      'Promotion',
      mockRequest
    );

    expect(mockLogUserAction.roleChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-123', type: 'user' }),
      'user-456',
      'developer',
      'admin',
      'Acme Corp',
      expect.objectContaining({
        request: mockRequest,
        metadata: expect.objectContaining({
          reason: 'Promotion',
        })
      })
    );
  });
});
```

## Common Mistakes to Avoid

### ❌ DON'T: Log sensitive headers directly

```typescript
// WRONG: Logs entire headers object (may contain tokens, cookies)
await logUserAction.invited(
  userActor(auth.user.id),
  userId,
  role,
  organization,
  {
    request: {
      headers: req.headers, // DANGER!
    }
  }
);
```

### ✅ DO: Extract only safe values

```typescript
// RIGHT: Only extract IP and user agent
await logUserAction.invited(
  userActor(auth.user.id),
  userId,
  role,
  organization,
  {
    request: {
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    }
  }
);
```

### ❌ DON'T: Use 'any' types

```typescript
// WRONG: Uses 'any' type
const actor: any = { id: userId, type: 'user' };
```

### ✅ DO: Use proper TypeScript types

```typescript
// RIGHT: Uses proper type
import { userActor } from '@nextmavens/audit-logs-database';
const actor = userActor(userId);
```

## Summary

These patterns provide a complete reference for implementing user management audit logging when the organizations-teams PRD is developed. Key points:

1. **Always import from `@nextmavens/audit-logs-database`**
2. **Use helper functions**: `logUserAction.invited()`, `logUserAction.removed()`, `logUserAction.roleChanged()`
3. **Use actor helpers**: `userActor(userId)` for type-safe actor creation
4. **Extract safe request context**: Only IP and user agent, never entire headers
5. **Log AFTER successful operations**: Audit logs shouldn't block the operation
6. **Include relevant metadata**: Business context like emails, organization, reasons
7. **Never log sensitive data**: Passwords, tokens, API keys, session IDs
