/**
 * Audit Log Integration Utilities
 *
 * Integration utilities that other services (api-gateway, auth-service, etc.)
 * can use to easily log audit events without directly importing the service layer.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 */

import type {
  AuditLog,
  CreateAuditLogInput,
  AuditLogQuery,
  AuditLogResponse,
  RequestContext,
  AuditLogMetadata,
  ActorType,
  TargetType,
} from '../types/audit.types.js';
import { auditLogService } from './AuditLogService.js';
import { AuditLogError } from './errors.js';
import { extractRequestId } from './helpers.js';

/**
 * Initialize audit logs with database configuration
 * Should be called during service startup
 */
export async function initializeAuditLogs(config?: {
  schema?: string;
  waitForConnection?: boolean;
}): Promise<void> {
  // Service is already initialized with default schema
  // In the future, this could perform health checks or migrations
  if (config?.waitForConnection) {
    const { healthCheck } = await import('./pool.js');
    const healthy = await healthCheck();
    if (!healthy) {
      throw new AuditLogError('Failed to connect to audit logs database');
    }
  }
}

/**
 * Simple audit logging function for other services
 * This is the main integration point for external services
 */
export async function logAuditEvent(params: {
  actorId: string;
  actorType: ActorType;
  action: string;
  targetType: TargetType;
  targetId: string;
  metadata?: AuditLogMetadata;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}): Promise<AuditLog> {
  const input: CreateAuditLogInput = {
    actor_id: params.actorId,
    actor_type: params.actorType,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    metadata: params.metadata || {},
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    request_id: params.requestId ?? null,
  };

  return auditLogService.create(input);
}

/**
 * Log audit event from HTTP request context
 * Automatically extracts IP, user agent, and request ID from request
 */
export async function logAuditEventFromRequest(params: {
  actorId: string;
  actorType: ActorType;
  action: string;
  targetType: TargetType;
  targetId: string;
  metadata?: AuditLogMetadata;
  request: RequestContext;
}): Promise<AuditLog> {
  return logAuditEvent({
    actorId: params.actorId,
    actorType: params.actorType,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata || {},
    ipAddress: extractRequestIp(params.request) ?? undefined,
    userAgent: extractRequestUserAgent(params.request) ?? undefined,
    requestId: extractRequestId(params.request) ?? undefined,
  });
}

/**
 * Extract IP address from request
 */
function extractRequestIp(request: RequestContext): string | null {
  if (!request) return null;

  const ip = request.ip || request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'];

  if (typeof ip === 'string') {
    const parts = ip.split(',');
    return parts[0]?.trim() || null;
  }

  return null;
}

/**
 * Extract user agent from request
 */
function extractRequestUserAgent(request: RequestContext): string | null {
  if (!request) return null;

  const userAgent = request.userAgent || request.headers?.['user-agent'];

  return typeof userAgent === 'string' ? userAgent : null;
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
  return auditLogService.query(query);
}

/**
 * Query audit logs by actor
 */
export async function queryAuditLogsByActor(
  actorId: string,
  query?: Omit<AuditLogQuery, 'actor_id'>
): Promise<AuditLogResponse> {
  return auditLogService.findByActor(actorId, query);
}

/**
 * Query audit logs by target
 */
export async function queryAuditLogsByTarget(
  targetId: string,
  query?: Omit<AuditLogQuery, 'target_id'>
): Promise<AuditLogResponse> {
  return auditLogService.findByTarget(targetId, query);
}

/**
 * Query audit logs by action
 */
export async function queryAuditLogsByAction(
  action: string,
  query?: Omit<AuditLogQuery, 'action'>
): Promise<AuditLogResponse> {
  return auditLogService.findByAction(action, query);
}

/**
 * Audit log middleware creator for Express-like frameworks
 * Adds audit logging capability to route handlers
 */
export function createAuditMiddleware(options: {
  getActor: (req: unknown) => { id: string; type: ActorType } | null;
  getAction: (req: unknown) => string;
  getTarget: (req: unknown) => { type: TargetType; id: string };
  getMetadata?: (req: unknown) => AuditLogMetadata;
}) {
  return async (req: unknown, _res: unknown, next: () => void) => {
    const actor = options.getActor(req);

    if (!actor) {
      // No actor info, skip audit logging
      return next();
    }

    const action = options.getAction(req);
    const targetInfo = options.getTarget(req);
    const metadata = options.getMetadata?.(req);

    const request = req as RequestContext;

    try {
      await logAuditEventFromRequest({
        actorId: actor.id,
        actorType: actor.type,
        action,
        targetType: targetInfo.type,
        targetId: targetInfo.id,
        metadata,
        request,
      });
    } catch (error) {
      // Log error but don't block the request
      console.error('Failed to log audit event:', error);
    }

    next();
  };
}

/**
 * Audit log decorator for class methods
 * Automatically logs method calls as audit events
 */
export function AuditLogDecorator(params: {
  action: string;
  targetType: TargetType;
  getTargetId: (this: unknown, ...args: unknown[]) => string;
  getActorId?: (this: unknown, ...args: unknown[]) => string;
  getActorType?: (this: unknown, ...args: unknown[]) => ActorType;
  getMetadata?: (this: unknown, ...args: unknown[]) => AuditLogMetadata;
}) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      // Extract actor info
      const actorId = params.getActorId?.apply(this, args) || 'system';
      const actorType = params.getActorType?.apply(this, args) || ('system' as ActorType);
      const targetId = params.getTargetId.apply(this, args);
      const metadata = params.getMetadata?.apply(this, args);

      // Log the action asynchronously
      logAuditEvent({
        actorId,
        actorType,
        action: params.action,
        targetType: params.targetType,
        targetId,
        metadata: metadata || {},
      }).catch((error) => {
        console.error(`Failed to log audit event for ${propertyKey}:`, error);
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Audit log decorator alias - export as type to avoid conflict
 */
export type { AuditLog as AuditLogDecoratorType } from '../types/audit.types.js';

/**
 * Clean shutdown of audit log service
 * Should be called during service shutdown
 */
export async function shutdownAuditLogs(): Promise<void> {
  const { closeDatabase } = await import('./pool.js');
  await closeDatabase();
}

/**
 * Health check for audit log service
 */
export async function auditLogsHealthCheck(): Promise<boolean> {
  const { healthCheck } = await import('./pool.js');
  return healthCheck();
}
