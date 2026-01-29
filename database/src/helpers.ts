/**
 * Audit Log Helpers
 *
 * Helper functions for creating audit log entries with common patterns.
 * Provides convenience methods for logging various types of actions.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 */

import type {
  CreateAuditLogInput,
  RequestContext,
  AuditLogMetadata,
  ActorType,
  TargetType,
  AuditAction,
} from '../types/audit.types.js';
import { auditLogService } from './AuditLogService.js';
import { AuditLogError } from './errors.js';

/**
 * Actor information for audit logs
 */
export interface ActorInfo {
  id: string;
  type: ActorType;
}

/**
 * Target information for audit logs
 */
export interface TargetInfo {
  type: TargetType;
  id: string;
}

/**
 * Audit log options
 */
export interface AuditLogOptions {
  metadata?: AuditLogMetadata;
  request?: RequestContext;
}

/**
 * Extract IP address from various request formats
 */
export function extractIpAddress(request: RequestContext): string | null {
  if (!request) return null;

  // Handle various IP header formats
  const ip = request.ip || request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'];

  if (typeof ip === 'string') {
    // x-forwarded-for can contain multiple IPs, take the first one
    const parts = ip.split(',');
    return parts[0]?.trim() || null;
  }

  return null;
}

/**
 * Extract user agent from request
 */
export function extractUserAgent(request: RequestContext): string | null {
  if (!request) return null;

  const userAgent = request.userAgent || request.headers?.['user-agent'];

  return typeof userAgent === 'string' ? userAgent : null;
}

/**
 * Extract request ID from request headers
 */
export function extractRequestId(request: RequestContext): string | null {
  if (!request) return null;

  const requestId = request.requestId || request.headers?.['x-request-id'];

  return typeof requestId === 'string' ? requestId : null;
}

/**
 * Create audit log entry with automatic request context extraction
 */
export async function logAction(
  actor: ActorInfo,
  action: AuditAction | string,
  target: TargetInfo,
  options: AuditLogOptions = {}
) {
  const input: CreateAuditLogInput = {
    actor_id: actor.id,
    actor_type: actor.type,
    action,
    target_type: target.type,
    target_id: target.id,
    metadata: options.metadata || {},
    ip_address: extractIpAddress(options.request || {}),
    user_agent: extractUserAgent(options.request || {}),
    request_id: extractRequestId(options.request || {}),
  };

  try {
    return await auditLogService.create(input);
  } catch (error) {
    throw new AuditLogError('Failed to log action', { cause: error });
  }
}

/**
 * Log project-related actions
 */
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

  suspended: (actor: ActorInfo, projectId: string, reason: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'project.suspended',
      { type: 'project' as TargetType, id: projectId },
      { ...options, metadata: { ...(options?.metadata || {}), reason } }
    ),

  autoSuspended: (projectId: string, reason: string, hardCapExceeded: boolean, options?: AuditLogOptions) =>
    logAction(
      { id: 'system', type: 'system' as ActorType },
      'project.auto_suspended',
      { type: 'project' as TargetType, id: projectId },
      {
        ...options,
        metadata: {
          ...(options?.metadata || {}),
          reason,
          hard_cap_exceeded: hardCapExceeded,
        },
      }
    ),
};

/**
 * Log API key-related actions
 */
export const logApiKeyAction = {
  created: (actor: ActorInfo, keyId: string, keyType: string, scopes: string[], options?: AuditLogOptions) =>
    logAction(
      actor,
      'key.created',
      { type: 'api_key' as TargetType, id: keyId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          key_type: keyType,
          scopes,
        },
      }
    ),

  rotated: (actor: ActorInfo, keyId: string, keyType: string, scopes: string[], options?: AuditLogOptions) =>
    logAction(
      actor,
      'key.rotated',
      { type: 'api_key' as TargetType, id: keyId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          key_type: keyType,
          scopes,
        },
      }
    ),

  revoked: (actor: ActorInfo, keyId: string, reason?: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'key.revoked',
      { type: 'api_key' as TargetType, id: keyId },
      {
        ...options,
        metadata: {
          ...(options?.metadata || {}),
          ...(reason ? { reason } : {}),
        },
      }
    ),
};

/**
 * Log user-related actions
 */
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

/**
 * Log secret-related actions
 */
export const logSecretAction = {
  created: (actor: ActorInfo, secretId: string, secretName: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'secret.created',
      { type: 'secret' as TargetType, id: secretId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          secret_name: secretName,
        },
      }
    ),

  accessed: (actor: ActorInfo, secretId: string, secretName: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'secret.accessed',
      { type: 'secret' as TargetType, id: secretId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          secret_name: secretName,
        },
      }
    ),

  rotated: (actor: ActorInfo, secretId: string, secretName: string, options?: AuditLogOptions) =>
    logAction(
      actor,
      'secret.rotated',
      { type: 'secret' as TargetType, id: secretId },
      {
        ...options,
        metadata: {
          ...options?.metadata,
          secret_name: secretName,
        },
      }
    ),
};

/**
 * Create a system actor
 */
export function systemActor(): ActorInfo {
  return { id: 'system', type: 'system' as ActorType };
}

/**
 * Create a user actor
 */
export function userActor(userId: string): ActorInfo {
  return { id: userId, type: 'user' as ActorType };
}

/**
 * Create an API key actor
 */
export function apiKeyActor(keyId: string): ActorInfo {
  return { id: keyId, type: 'api_key' as ActorType };
}

/**
 * Create a project target
 */
export function projectTarget(projectId: string): TargetInfo {
  return { type: 'project' as TargetType, id: projectId };
}

/**
 * Create a user target
 */
export function userTarget(userId: string): TargetInfo {
  return { type: 'user' as TargetType, id: userId };
}

/**
 * Create an API key target
 */
export function apiKeyTarget(keyId: string): TargetInfo {
  return { type: 'api_key' as TargetType, id: keyId };
}

/**
 * Create a secret target
 */
export function secretTarget(secretId: string): TargetInfo {
  return { type: 'secret' as TargetType, id: secretId };
}
