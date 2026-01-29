/**
 * User Management Audit Logging Verification Tests
 *
 * This file contains unit tests that verify the audit helper functions
 * for user management operations work correctly.
 *
 * US-005: Audit User Management Operations - Step 10: Security & Validation
 *
 * Acceptance Criteria Verified:
 * 1. User invites logged with action: user.invited
 * 2. User removals logged with action: user.removed
 * 3. Role changes logged with action: user.role_changed
 * 4. Actor captured from authenticated user
 * 5. Target is user_id
 * 6. Metadata includes role and organization
 * 7. Typecheck passes
 *
 * NOTE: These are verification/example tests. The actual user management
 * endpoints don't exist yet (they're part of organizations-teams PRD).
 * These tests verify the helper functions are correctly implemented.
 *
 * To run these tests:
 * 1. Install vitest: pnpm add -D vitest
 * 2. Run: pnpm test tests/user-management-audit.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logUserAction,
  userActor,
  type ActorInfo,
  type AuditLogOptions,
} from '../src/helpers.js';
import { ActorType } from '../types/audit.types.js';
import type { CreateAuditLogInput } from '../types/audit.types.js';

// Mock the audit log service
vi.mock('../src/AuditLogService.js', () => ({
  auditLogService: {
    create: vi.fn(),
  },
}));

describe('US-005: User Management Audit Logging', () => {
  const mockActor = userActor('user-123');
  const mockUserId = 'user-456';
  const mockOrganizationId = 'org-789';
  const mockRole = 'admin';

  // Helper function to get typed call args
  function getCallArgs(mock: { mock: { calls: Array<[unknown]> } }): CreateAuditLogInput {
    const callArgs = mock.mock.calls[0]?.[0];
    if (!callArgs) {
      throw new Error('Expected mock to be called with arguments');
    }
    return callArgs as CreateAuditLogInput;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC1: User invites logged with action: user.invited', () => {
    it('should log user invitation with correct action name', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        request: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        metadata: {
          invited_by: 'user-123',
          invited_by_email: 'admin@example.com',
        },
      };

      await logUserAction.invited(
        mockActor,
        mockUserId,
        mockRole,
        mockOrganizationId,
        options
      );

      expect(createMock).toHaveBeenCalledTimes(1);
      const callArgs = getCallArgs(createMock);

      // Verify action name
      expect(callArgs.action).toBe('user.invited');
    });

    it('should include role in metadata for user invitations', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        metadata: {
          invited_by: 'user-123',
        },
      };

      await logUserAction.invited(
        mockActor,
        mockUserId,
        mockRole,
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify metadata includes role
      expect(callArgs.metadata?.role).toBe(mockRole);
    });

    it('should include organization in metadata for user invitations', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        metadata: {
          invited_by: 'user-123',
        },
      };

      await logUserAction.invited(
        mockActor,
        mockUserId,
        mockRole,
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify metadata includes organization
      expect(callArgs.metadata?.organization).toBe(mockOrganizationId);
    });
  });

  describe('AC2: User removals logged with action: user.removed', () => {
    it('should log user removal with correct action name', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const reason = 'Violation of terms of service';
      const options: AuditLogOptions = {
        request: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        metadata: {
          removed_by: 'user-123',
          organization_id: mockOrganizationId,
          previous_role: mockRole,
        },
      };

      await logUserAction.removed(mockActor, mockUserId, reason, options);

      expect(createMock).toHaveBeenCalledTimes(1);
      const callArgs = getCallArgs(createMock);

      // Verify action name
      expect(callArgs.action).toBe('user.removed');
    });

    it('should include reason in metadata when provided', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const reason = 'Account cleanup';
      const options: AuditLogOptions = {
        metadata: {
          organization_id: mockOrganizationId,
          previous_role: mockRole,
        },
      };

      await logUserAction.removed(mockActor, mockUserId, reason, options);

      const callArgs = getCallArgs(createMock);

      // Verify metadata includes reason
      expect(callArgs.metadata?.reason).toBe(reason);
    });

    it('should handle removal without reason', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const options: AuditLogOptions = {
        metadata: {
          organization_id: mockOrganizationId,
        },
      };

      await logUserAction.removed(mockActor, mockUserId, undefined, options);

      expect(createMock).toHaveBeenCalledTimes(1);
      const callArgs = getCallArgs(createMock);

      // Verify action name is correct even without reason
      expect(callArgs.action).toBe('user.removed');
    });
  });

  describe('AC3: Role changes logged with action: user.role_changed', () => {
    it('should log role change with correct action name', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const oldRole = 'member';
      const newRole = 'admin';
      const options: AuditLogOptions = {
        request: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        metadata: {
          changed_by: 'user-123',
        },
      };

      await logUserAction.roleChanged(
        mockActor,
        mockUserId,
        oldRole,
        newRole,
        mockOrganizationId,
        options
      );

      expect(createMock).toHaveBeenCalledTimes(1);
      const callArgs = getCallArgs(createMock);

      // Verify action name
      expect(callArgs.action).toBe('user.role_changed');
    });

    it('should include old and new roles in metadata', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const oldRole = 'viewer';
      const newRole = 'admin';
      const options: AuditLogOptions = {
        metadata: {
          changed_by: 'user-123',
        },
      };

      await logUserAction.roleChanged(
        mockActor,
        mockUserId,
        oldRole,
        newRole,
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify metadata includes old and new roles
      expect(callArgs.metadata?.old_value).toBe(oldRole);
      expect(callArgs.metadata?.new_value).toBe(newRole);
    });

    it('should include organization in metadata for role changes', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const oldRole = 'member';
      const newRole = 'owner';
      const options: AuditLogOptions = {};

      await logUserAction.roleChanged(
        mockActor,
        mockUserId,
        oldRole,
        newRole,
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify metadata includes organization
      expect(callArgs.metadata?.organization).toBe(mockOrganizationId);
    });
  });

  describe('AC4: Actor captured from authenticated user', () => {
    it('should capture user actor correctly for invitations', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const actor = userActor('authenticated-user-456');
      const options: AuditLogOptions = {};

      await logUserAction.invited(actor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify actor information
      expect(callArgs.actor_id).toBe('authenticated-user-456');
      expect(callArgs.actor_type).toBe(ActorType.USER);
    });

    it('should capture user actor correctly for removals', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const actor = userActor('authenticated-user-789');
      const options: AuditLogOptions = {};

      await logUserAction.removed(actor, mockUserId, 'Policy violation', options);

      const callArgs = getCallArgs(createMock);

      // Verify actor information
      expect(callArgs.actor_id).toBe('authenticated-user-789');
      expect(callArgs.actor_type).toBe(ActorType.USER);
    });

    it('should capture user actor correctly for role changes', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const actor = userActor('authenticated-user-999');
      const options: AuditLogOptions = {};

      await logUserAction.roleChanged(
        actor,
        mockUserId,
        'member',
        'admin',
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify actor information
      expect(callArgs.actor_id).toBe('authenticated-user-999');
      expect(callArgs.actor_type).toBe(ActorType.USER);
    });

    it('should create user actor with correct type', () => {
      const actor = userActor('test-user-id');

      expect(actor.id).toBe('test-user-id');
      expect(actor.type).toBe(ActorType.USER);
    });
  });

  describe('AC5: Target is user_id', () => {
    it('should set target type as user for invitations', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const targetUserId = 'target-user-123';
      const options: AuditLogOptions = {};

      await logUserAction.invited(mockActor, targetUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify target information
      expect(callArgs.target_id).toBe(targetUserId);
      expect(callArgs.target_type).toBe('user');
    });

    it('should set target type as user for removals', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const targetUserId = 'target-user-456';
      const options: AuditLogOptions = {};

      await logUserAction.removed(mockActor, targetUserId, 'Violation', options);

      const callArgs = getCallArgs(createMock);

      // Verify target information
      expect(callArgs.target_id).toBe(targetUserId);
      expect(callArgs.target_type).toBe('user');
    });

    it('should set target type as user for role changes', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const targetUserId = 'target-user-789';
      const options: AuditLogOptions = {};

      await logUserAction.roleChanged(
        mockActor,
        targetUserId,
        'member',
        'admin',
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify target information
      expect(callArgs.target_id).toBe(targetUserId);
      expect(callArgs.target_type).toBe('user');
    });
  });

  describe('AC6: Metadata includes role and organization', () => {
    it('should merge custom metadata with required role and organization for invitations', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const customMetadata = {
        invited_by: 'user-123',
        invited_by_email: 'admin@example.com',
        custom_field: 'custom_value',
      };

      const options: AuditLogOptions = {
        metadata: customMetadata,
      };

      await logUserAction.invited(mockActor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify all metadata is present
      expect(callArgs.metadata?.role).toBe(mockRole);
      expect(callArgs.metadata?.organization).toBe(mockOrganizationId);
      expect(callArgs.metadata?.invited_by).toBe('user-123');
      expect(callArgs.metadata?.custom_field).toBe('custom_value');
    });

    it('should include custom metadata with organization for removals', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-2' } as never);

      const customMetadata = {
        organization_id: mockOrganizationId,
        previous_role: 'admin',
        removed_by: 'user-123',
      };

      const options: AuditLogOptions = {
        metadata: customMetadata,
      };

      await logUserAction.removed(mockActor, mockUserId, 'Policy violation', options);

      const callArgs = getCallArgs(createMock);

      // Verify metadata is merged correctly
      expect(callArgs.metadata?.reason).toBe('Policy violation');
      expect(callArgs.metadata?.organization_id).toBe(mockOrganizationId);
      expect(callArgs.metadata?.previous_role).toBe('admin');
    });

    it('should include organization in role change metadata', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-3' } as never);

      const customMetadata = {
        changed_by: 'user-123',
        department: 'engineering',
      };

      const options: AuditLogOptions = {
        metadata: customMetadata,
      };

      await logUserAction.roleChanged(
        mockActor,
        mockUserId,
        'member',
        'admin',
        mockOrganizationId,
        options
      );

      const callArgs = getCallArgs(createMock);

      // Verify all metadata is present
      expect(callArgs.metadata?.old_value).toBe('member');
      expect(callArgs.metadata?.new_value).toBe('admin');
      expect(callArgs.metadata?.organization).toBe(mockOrganizationId);
      expect(callArgs.metadata?.changed_by).toBe('user-123');
      expect(callArgs.metadata?.department).toBe('engineering');
    });
  });

  describe('Request Context Handling', () => {
    it('should extract IP address from request context', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        request: {
          ip: '203.0.113.42',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      await logUserAction.invited(mockActor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify IP address is extracted
      expect(callArgs.ip_address).toBe('203.0.113.42');
    });

    it('should extract user agent from request context', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        request: {
          ip: '203.0.113.42',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      };

      await logUserAction.invited(mockActor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify user agent is extracted
      expect(callArgs.user_agent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {
        request: {
          headers: {
            'x-forwarded-for': '198.51.100.23, 203.0.113.42',
          },
        },
      };

      await logUserAction.invited(mockActor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify first IP from x-forwarded-for is extracted
      expect(callArgs.ip_address).toBe('198.51.100.23');
    });

    it('should handle missing request context gracefully', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({ id: 'audit-1' } as never);

      const options: AuditLogOptions = {};

      await logUserAction.invited(mockActor, mockUserId, mockRole, mockOrganizationId, options);

      const callArgs = getCallArgs(createMock);

      // Verify missing request context is handled
      expect(callArgs.ip_address).toBeNull();
      expect(callArgs.user_agent).toBeNull();
    });
  });

  describe('Type Safety', () => {
    it('should enforce ActorInfo type structure', () => {
      const validActor: ActorInfo = {
        id: 'user-123',
        type: ActorType.USER,
      };

      expect(validActor.id).toBeDefined();
      expect(validActor.type).toBeDefined();

      // This would fail type checking if uncommented:
      // const invalidActor: ActorInfo = { id: 'user-123' };
      // Type error: Property 'type' is missing
    });

    it('should enforce AuditLogOptions type structure', () => {
      const validOptions: AuditLogOptions = {
        request: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        metadata: {
          role: 'admin',
          organization: 'org-123',
        },
      };

      expect(validOptions.request).toBeDefined();
      expect(validOptions.metadata).toBeDefined();
    });

    it('should use userActor helper function correctly', () => {
      const actor = userActor('test-user-id');

      // Type assertion to ensure ActorInfo type
      const typedActor: ActorInfo = actor;

      expect(typedActor.id).toBe('test-user-id');
      expect(typedActor.type).toBe(ActorType.USER);
    });
  });

  describe('Integration Examples', () => {
    it('should demonstrate complete invite workflow', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({
        id: 'audit-invite-1',
        actor_id: 'admin-123',
        action: 'user.invited',
        target_id: 'new-user-456',
        created_at: new Date(),
      } as never);

      const actor = userActor('admin-123');
      const requestContext: AuditLogOptions['request'] = {
        ip: '10.0.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      await logUserAction.invited(
        actor,
        'new-user-456',
        'developer',
        'acme-corp',
        {
          request: requestContext,
          metadata: {
            invited_by: 'admin-123',
            invited_by_email: 'admin@acme.com',
            invitation_method: 'email',
          },
        }
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: 'admin-123',
          actor_type: ActorType.USER,
          action: 'user.invited',
          target_id: 'new-user-456',
          target_type: 'user',
          ip_address: '10.0.1.50',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          metadata: expect.objectContaining({
            role: 'developer',
            organization: 'acme-corp',
            invited_by: 'admin-123',
            invited_by_email: 'admin@acme.com',
            invitation_method: 'email',
          }),
        })
      );
    });

    it('should demonstrate complete role change workflow', async () => {
      const { auditLogService } = await import('../src/AuditLogService.js');
      const createMock = vi.mocked(auditLogService.create);

      createMock.mockResolvedValue({
        id: 'audit-role-1',
        actor_id: 'admin-123',
        action: 'user.role_changed',
        target_id: 'user-789',
        created_at: new Date(),
      } as never);

      const actor = userActor('admin-123');

      await logUserAction.roleChanged(
        actor,
        'user-789',
        'viewer',
        'admin',
        'acme-corp',
        {
          request: {
            ip: '10.0.1.50',
            userAgent: 'Mozilla/5.0',
          },
          metadata: {
            changed_by: 'admin-123',
            change_reason: 'Promotion',
          },
        }
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.role_changed',
          target_id: 'user-789',
          target_type: 'user',
          metadata: expect.objectContaining({
            old_value: 'viewer',
            new_value: 'admin',
            organization: 'acme-corp',
            changed_by: 'admin-123',
            change_reason: 'Promotion',
          }),
        })
      );
    });
  });
});
