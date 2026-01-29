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

// ============================================================================
// JOB TYPES EXPORT
// ============================================================================
// US-001: Create Jobs Database Table
//
// Job-related types for background job processing and queue management.
// These types are used across api-gateway, worker, and other services.
//
// @example
// ```typescript
// import { Job, JobStatus, JobType } from '@nextmavens/audit-logs-database';
//
// // Create a job
// const job: Job = {
//   id: 'job-123',
//   type: JobType.PROVISION_PROJECT,
//   payload: { project_id: 'proj-456' },
//   status: JobStatus.PENDING,
//   attempts: 0,
//   max_attempts: 3,
//   last_error: null,
//   scheduled_at: new Date(),
//   started_at: null,
//   completed_at: null,
//   created_at: new Date(),
// };
// ```
export type {
  Job,
  JobPayload,
  CreateJobInput,
  JobQuery,
  JobResponse,
  JobExecutionResult,
  JobHandler,
  JobHandlerRegistry,
  WorkerOptions,
  RetryConfig,
} from '../types/jobs.types.js';

export { JobStatus, JobType } from '../types/jobs.types.js';
