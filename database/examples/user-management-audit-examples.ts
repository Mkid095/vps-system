/**
 * User Management Audit Logging Examples
 *
 * This file demonstrates how to integrate audit logging into user management
 * operations: invite, remove, and role changes.
 *
 * US-005: Audit User Management Operations - Step 7: Integration
 *
 * These are EXAMPLE/DEMONSTRATION files showing the integration patterns
 * for when the real user management endpoints are built (as part of the
 * organizations-teams PRD).
 */

import type { RequestContext } from '../types/audit.types.js';
import {
  logUserAction,
  userActor,
  type ActorInfo,
} from '../index.js';

// ============================================================================
// Types for User Management Operations
// ============================================================================

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  invited_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface InviteMemberInput {
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface RemoveMemberInput {
  user_id: string;
  organization_id: string;
  reason?: string;
}

export interface ChangeRoleInput {
  user_id: string;
  organization_id: string;
  new_role: 'owner' | 'admin' | 'member' | 'viewer';
}

// ============================================================================
// Example 1: Next.js API Route Integration (POST /api/organizations/:id/members)
// ============================================================================

/**
 * POST /api/organizations/:id/members - Invite a user to an organization
 *
 * This example shows how to integrate audit logging into a Next.js API route
 * for inviting users to an organization.
 *
 * Pattern from US-003 and US-004:
 * 1. Use authenticateRequest middleware to capture actor
 * 2. Extract IP and user-agent (NOT full headers)
 * 3. Log audit event after successful operation
 * 4. Don't fail the request if audit logging fails
 */
export async function POST_inviteOrganizationMember(
  req: {
    headers: {
      get: (name: string) => string | null;
    };
    json: () => Promise<{ user_id: string; role: string }>;
    params: { id: string };
  },
  context: {
    user?: { id: string };
    authenticateRequest: () => Promise<{ id: string }>;
  }
) {
  try {
    // Step 1: Capture actor from authenticated request (pattern from US-003)
    const developer = await context.authenticateRequest();

    // Step 2: Extract IP and user-agent (NOT full headers - security lesson from US-004)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const organizationId = req.params.id;
    const body = await req.json();
    const { user_id, role } = body;

    // Validation
    if (!user_id || !role) {
      return {
        status: 400,
        body: { error: 'user_id and role are required' },
      };
    }

    // Step 3: Perform the actual invite operation
    // This would be a database operation in production
    const member = await performInviteMember(developer.id, organizationId, user_id, role);

    // Step 4: Log audit event after successful operation
    try {
      await logUserAction.invited(
        userActor(developer.id),
        user_id,
        role,
        organizationId,
        {
          request: {
            ip: clientIP,
            userAgent: userAgent,
          },
          metadata: {
            invited_by: developer.id,
            invited_by_email: developer.id, // In production, use actual email
            organization_id: organizationId,
          },
        }
      );
    } catch (auditError) {
      // Don't fail the request if audit logging fails (pattern from US-004)
      console.error('[User Management] Failed to log user invite:', auditError);
    }

    return {
      status: 201,
      body: {
        member: {
          id: member.id,
          user_id: member.user_id,
          organization_id: member.organization_id,
          role: member.role,
          status: member.status,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to invite member';
    console.error('[User Management] Invite member error:', error);
    return {
      status: 500,
      body: { error: message },
    };
  }
}

// ============================================================================
// Example 2: Next.js API Route Integration (DELETE /api/organizations/:id/members/:userId)
// ============================================================================

/**
 * DELETE /api/organizations/:id/members/:userId - Remove a member from organization
 *
 * This example shows how to integrate audit logging for removing users.
 *
 * Pattern from US-004 (API keys DELETE):
 * 1. Get the member details BEFORE deletion (for audit logging)
 * 2. Perform the deletion
 * 3. Log the audit event
 * 4. Include reason if provided
 */
export async function DELETE_removeOrganizationMember(
  req: {
    headers: {
      get: (name: string) => string | null;
    };
    params: { id: string; userId: string };
    query: { reason?: string };
  },
  context: {
    user?: { id: string };
    authenticateRequest: () => Promise<{ id: string }>;
  }
) {
  try {
    // Step 1: Capture actor from authenticated request
    const developer = await context.authenticateRequest();

    // Step 2: Extract IP and user-agent
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const organizationId = req.params.id;
    const targetUserId = req.params.userId;
    const reason = req.query.reason;

    // Step 3: Get member details BEFORE deletion (pattern from US-004)
    const member = await getMemberByOrganizationAndUser(organizationId, targetUserId);

    if (!member) {
      return {
        status: 404,
        body: { error: 'Member not found' },
      };
    }

    // Step 4: Perform the actual removal
    await performRemoveMember(organizationId, targetUserId);

    // Step 5: Log audit event with reason
    try {
      await logUserAction.removed(
        userActor(developer.id),
        targetUserId,
        reason,
        {
          request: {
            ip: clientIP,
            userAgent: userAgent,
          },
          metadata: {
            removed_by: developer.id,
            organization_id: organizationId,
            previous_role: member.role,
          },
        }
      );
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('[User Management] Failed to log user removal:', auditError);
    }

    return {
      status: 200,
      body: { success: true },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    console.error('[User Management] Remove member error:', error);
    return {
      status: 500,
      body: { error: message },
    };
  }
}

// ============================================================================
// Example 3: Next.js API Route Integration (PUT /api/organizations/:id/members/:userId)
// ============================================================================

/**
 * PUT /api/organizations/:id/members/:userId - Change member role
 *
 * This example shows how to integrate audit logging for role changes.
 *
 * Pattern from US-003 (project updates):
 * 1. Get current state BEFORE update
 * 2. Perform the update
 * 3. Log what changed (old vs new)
 */
export async function PUT_changeMemberRole(
  req: {
    headers: {
      get: (name: string) => string | null;
    };
    json: () => Promise<{ role: string }>;
    params: { id: string; userId: string };
  },
  context: {
    user?: { id: string };
    authenticateRequest: () => Promise<{ id: string }>;
  }
) {
  try {
    // Step 1: Capture actor from authenticated request
    const developer = await context.authenticateRequest();

    // Step 2: Extract IP and user-agent
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const organizationId = req.params.id;
    const targetUserId = req.params.userId;
    const body = await req.json();
    const { role: newRole } = body;

    // Validation
    if (!newRole) {
      return {
        status: 400,
        body: { error: 'role is required' },
      };
    }

    // Step 3: Get current member state BEFORE update (pattern from US-003)
    const currentMember = await getMemberByOrganizationAndUser(organizationId, targetUserId);

    if (!currentMember) {
      return {
        status: 404,
        body: { error: 'Member not found' },
      };
    }

    const oldRole = currentMember.role;

    // Step 4: Perform the role update
    const updatedMember = await performChangeRole(organizationId, targetUserId, newRole);

    // Step 5: Log audit event with old and new values (pattern from US-003)
    try {
      await logUserAction.roleChanged(
        userActor(developer.id),
        targetUserId,
        oldRole,
        newRole,
        organizationId,
        {
          request: {
            ip: clientIP,
            userAgent: userAgent,
          },
          metadata: {
            changed_by: developer.id,
            organization_id: organizationId,
          },
        }
      );
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('[User Management] Failed to log role change:', auditError);
    }

    return {
      status: 200,
      body: {
        member: {
          id: updatedMember.id,
          user_id: updatedMember.user_id,
          organization_id: updatedMember.organization_id,
          role: updatedMember.role,
          status: updatedMember.status,
        },
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to change role';
    console.error('[User Management] Change role error:', error);
    return {
      status: 500,
      body: { error: message },
    };
  }
}

// ============================================================================
// Example 4: Express Route Integration
// ============================================================================

/**
 * Express.js Route Handlers with Audit Logging
 *
 * This example shows how to integrate audit logging into Express.js routes
 * for user management operations.
 */
export class OrganizationMemberController {
  /**
   * POST /api/organizations/:id/members - Invite member
   */
  async inviteMember(
    req: {
      user?: { id: string };
      params: { id: string };
      body: { user_id: string; role: string };
      ip?: string;
      headers?: Record<string, string>;
    },
    res: {
      status: (code: number) => { json: (data: unknown) => void };
      json: (data: unknown) => void;
    }
  ): Promise<void> {
    try {
      // Capture actor
      const actor = userActor(req.user?.id || 'unknown');

      // Extract IP and user-agent
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
      const userAgent = req.headers?.['user-agent'];

      const organizationId = req.params.id;
      const { user_id, role } = req.body;

      // Perform invite
      const member = await performInviteMember(req.user?.id || 'unknown', organizationId, user_id, role);

      // Log audit event
      try {
        await logUserAction.invited(actor, user_id, role, organizationId, {
          request: {
            ip: typeof clientIP === 'string' ? clientIP : undefined,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          },
        });
      } catch (auditError) {
        console.error('[Organization] Failed to log invite:', auditError);
      }

      res.status(201).json({ member });
    } catch (error) {
      console.error('[Organization] Invite error:', error);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  }

  /**
   * DELETE /api/organizations/:id/members/:userId - Remove member
   */
  async removeMember(
    req: {
      user?: { id: string };
      params: { id: string; userId: string };
      query: { reason?: string };
      ip?: string;
      headers?: Record<string, string>;
    },
    res: { json: (data: unknown) => void }
  ): Promise<void> {
    try {
      const actor = userActor(req.user?.id || 'unknown');
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
      const userAgent = req.headers?.['user-agent'];

      const organizationId = req.params.id;
      const targetUserId = req.params.userId;
      const reason = req.query.reason;

      // Get member before removal
      const member = await getMemberByOrganizationAndUser(organizationId, targetUserId);

      if (!member) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      // Perform removal
      await performRemoveMember(organizationId, targetUserId);

      // Log audit event
      try {
        await logUserAction.removed(actor, targetUserId, reason, {
          request: {
            ip: typeof clientIP === 'string' ? clientIP : undefined,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          },
          metadata: {
            organization_id: organizationId,
            previous_role: member.role,
          },
        });
      } catch (auditError) {
        console.error('[Organization] Failed to log removal:', auditError);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Organization] Remove error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  /**
   * PUT /api/organizations/:id/members/:userId - Change role
   */
  async changeRole(
    req: {
      user?: { id: string };
      params: { id: string; userId: string };
      body: { role: string };
      ip?: string;
      headers?: Record<string, string>;
    },
    res: { json: (data: unknown) => void }
  ): Promise<void> {
    try {
      const actor = userActor(req.user?.id || 'unknown');
      const clientIP = req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
      const userAgent = req.headers?.['user-agent'];

      const organizationId = req.params.id;
      const targetUserId = req.params.userId;
      const { role: newRole } = req.body;

      // Get current member
      const currentMember = await getMemberByOrganizationAndUser(organizationId, targetUserId);

      if (!currentMember) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      const oldRole = currentMember.role;

      // Perform role change
      const updatedMember = await performChangeRole(organizationId, targetUserId, newRole);

      // Log audit event
      try {
        await logUserAction.roleChanged(actor, targetUserId, oldRole, newRole, organizationId, {
          request: {
            ip: typeof clientIP === 'string' ? clientIP : undefined,
            userAgent: typeof userAgent === 'string' ? userAgent : undefined,
          },
        });
      } catch (auditError) {
        console.error('[Organization] Failed to log role change:', auditError);
      }

      res.json({ member: updatedMember });
    } catch (error) {
      console.error('[Organization] Change role error:', error);
      res.status(500).json({ error: 'Failed to change role' });
    }
  }
}

// ============================================================================
// Example 5: Service Layer Integration
// ============================================================================

/**
 * Organization Member Service with Audit Logging
 *
 * This demonstrates the recommended pattern: encapsulate business logic
 * in a service layer with integrated audit logging.
 */
export class OrganizationMemberService {
  /**
   * Invite a user to an organization
   */
  async inviteMember(
    actor: ActorInfo,
    organizationId: string,
    userId: string,
    role: string,
    request?: RequestContext
  ): Promise<OrganizationMember> {
    // Perform the invite
    const member = await performInviteMember(actor.id, organizationId, userId, role);

    // Log the audit event
    await logUserAction.invited(actor, userId, role, organizationId, {
      request,
      metadata: {
        invited_by: actor.id,
        organization_id: organizationId,
      },
    });

    return member;
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(
    actor: ActorInfo,
    organizationId: string,
    userId: string,
    reason?: string,
    request?: RequestContext
  ): Promise<void> {
    // Get member before removal
    const member = await getMemberByOrganizationAndUser(organizationId, userId);

    if (!member) {
      throw new Error('Member not found');
    }

    // Perform the removal
    await performRemoveMember(organizationId, userId);

    // Log the audit event
    await logUserAction.removed(actor, userId, reason, {
      request,
      metadata: {
        organization_id: organizationId,
        previous_role: member.role,
      },
    });
  }

  /**
   * Change a member's role
   */
  async changeMemberRole(
    actor: ActorInfo,
    organizationId: string,
    userId: string,
    newRole: string,
    request?: RequestContext
  ): Promise<OrganizationMember> {
    // Get current member
    const currentMember = await getMemberByOrganizationAndUser(organizationId, userId);

    if (!currentMember) {
      throw new Error('Member not found');
    }

    const oldRole = currentMember.role;

    // Perform the role change
    const updatedMember = await performChangeRole(organizationId, userId, newRole);

    // Log the audit event
    await logUserAction.roleChanged(actor, userId, oldRole, newRole, organizationId, {
      request,
      metadata: {
        changed_by: actor.id,
        organization_id: organizationId,
      },
    });

    return updatedMember;
  }
}

// ============================================================================
// Simulated Database Operations (for demonstration purposes)
// ============================================================================

/**
 * Simulated database operation: Invite a member
 */
async function performInviteMember(
  invitedBy: string,
  organizationId: string,
  userId: string,
  role: string
): Promise<OrganizationMember> {
  // In production, this would be a database INSERT
  return {
    id: `member_${Date.now()}`,
    user_id: userId,
    organization_id: organizationId,
    role: role as 'owner' | 'admin' | 'member' | 'viewer',
    status: 'pending',
    invited_by: invitedBy,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Simulated database operation: Remove a member
 */
async function performRemoveMember(organizationId: string, userId: string): Promise<void> {
  // In production, this would be a database DELETE
  console.log(`Removing member ${userId} from organization ${organizationId}`);
}

/**
 * Simulated database operation: Change member role
 */
async function performChangeRole(
  organizationId: string,
  userId: string,
  newRole: string
): Promise<OrganizationMember> {
  // In production, this would be a database UPDATE
  return {
    id: `member_${Date.now()}`,
    user_id: userId,
    organization_id: organizationId,
    role: newRole as 'owner' | 'admin' | 'member' | 'viewer',
    status: 'active',
    invited_by: 'system',
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Simulated database operation: Get member by organization and user
 */
async function getMemberByOrganizationAndUser(
  organizationId: string,
  userId: string
): Promise<OrganizationMember | null> {
  // In production, this would be a database SELECT
  return {
    id: `member_${Date.now()}`,
    user_id: userId,
    organization_id: organizationId,
    role: 'member',
    status: 'active',
    invited_by: 'admin',
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Using the Organization Member Service
 */
export async function exampleUsage() {
  const service = new OrganizationMemberService();

  // Create actor and request context
  const actor = userActor('user-123');
  const requestContext: RequestContext = {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  };

  // Invite a member
  const member = await service.inviteMember(
    actor,
    'org-456',
    'user-789',
    'admin',
    requestContext
  );

  console.log('Invited member:', member.id);

  // Change role
  const updatedMember = await service.changeMemberRole(
    actor,
    'org-456',
    'user-789',
    'owner',
    requestContext
  );

  console.log('Changed role for member:', updatedMember.id);

  // Remove member
  await service.removeMember(actor, 'org-456', 'user-789', 'Account cleanup', requestContext);

  console.log('Removed member: user-789');
}

// ============================================================================
// Security Best Practices (from US-004)
// ============================================================================

/**
 * SECURITY LESSONS FROM US-004 (API Key Operations)
 *
 * 1. NEVER log entire request headers
 *    - Bad: request: { headers: req.headers }
 *    - Good: Extract only safe values: req.headers.get('x-forwarded-for')
 *
 * 2. Always extract IP and user-agent separately
 *    - These are safe to log and valuable for forensics
 *    - Don't log authorization headers, cookies, or other sensitive data
 *
 * 3. Don't fail the main operation if audit logging fails
 *    - Wrap audit calls in try-catch
 *    - Log errors to console but continue processing
 *
 * 4. Get data BEFORE deletion
 *    - For DELETE operations, fetch the record first
 *    - This ensures you have data for audit logging
 *    - Pattern from US-004 API key revocation
 *
 * 5. Log changes for updates
 *    - For PUT/PATCH operations, log old vs new values
 *    - This helps forensic investigations
 *    - Pattern from US-003 project updates
 */
