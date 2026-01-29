/**
 * Audit Logs Integration Layer
 *
 * Main entry point for the audit logs integration layer.
 * Exports all types, services, helpers, and integration utilities.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 *
 * @example
 * ```typescript
 * import { logAuditEvent, queryAuditLogs } from '@nextmavens/audit-logs-database';
 *
 * // Log an event
 * await logAuditEvent({
 *   actorId: 'user-123',
 *   actorType: 'user',
 *   action: 'project.created',
 *   targetType: 'project',
 *   targetId: 'proj-456',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...',
 * });
 *
 * // Query logs
 * const logs = await queryAuditLogs({ actor_id: 'user-123' });
 * ```
 */

// Export all types
export type {
  AuditLog,
  CreateAuditLogInput,
  AuditLogQuery,
  AuditLogResponse,
  RequestContext,
  AuditLogMetadata,
  IAuditLogService,
} from '../types/audit.types.js';

// Export enums
export { ActorType, TargetType, AuditAction } from '../types/audit.types.js';

// Export service
export { AuditLogService, auditLogService } from './AuditLogService.js';

// Export errors
export {
  AuditLogError,
  AuditLogValidationError,
  AuditLogConnectionError,
  AuditLogQueryError,
  AuditLogNotFoundError,
} from './errors.js';

// Export helpers
export {
  logAction,
  logProjectAction,
  logApiKeyAction,
  logUserAction,
  logSecretAction,
  systemActor,
  userActor,
  apiKeyActor,
  projectTarget,
  userTarget,
  apiKeyTarget,
  secretTarget,
  extractIpAddress,
  extractUserAgent,
  extractRequestId,
} from './helpers.js';

export type { ActorInfo, TargetInfo, AuditLogOptions } from './helpers.js';

// Export integration utilities
export {
  initializeAuditLogs,
  shutdownAuditLogs,
  auditLogsHealthCheck,
  logAuditEvent,
  logAuditEventFromRequest,
  queryAuditLogs,
  queryAuditLogsByActor,
  queryAuditLogsByTarget,
  queryAuditLogsByAction,
  createAuditMiddleware,
  AuditLogDecorator,
} from './integration.js';

// Export database pool utilities (for advanced usage)
export {
  getPool,
  query,
  getClient,
  closeDatabase,
  healthCheck,
  getDatabaseStats,
} from './pool.js';

export type { DatabaseConfig } from './pool.js';
