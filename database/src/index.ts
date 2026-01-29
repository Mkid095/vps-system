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

// ============================================================================
// JOB QUEUE EXPORT
// ============================================================================
// US-002: Create Job Queue System
//
// Job queue implementation for enqueuing background jobs with support for
// scheduling, priority, and retry configuration.
//
// @example
// ```typescript
// import { enqueueJob, scheduleJob, getJob } from '@nextmavens/audit-logs-database';
//
// // Enqueue a job to run immediately
// const result = await enqueueJob('provision_project', {
//   project_id: 'proj-123',
//   region: 'us-east-1',
// });
//
// // Enqueue a job with a delay
// const delayed = await enqueueJob('rotate_key', {
//   key_id: 'key-456',
// }, {
//   delay: 60000, // 1 minute
//   max_attempts: 5,
// });
//
// // Schedule a job for a specific time
// const scheduledTime = new Date('2026-01-30T10:00:00Z');
// const scheduled = await scheduleJob('backup', scheduledTime, {
//   project_id: 'proj-123',
// });
//
// // Get a job by ID
// const job = await getJob(result.id);
// ```
export {
  JobQueue,
  enqueueJob,
  scheduleJob,
  getJob,
  retryJob,
} from './jobs/queue.js';

export type {
  JobQueueOptions,
  EnqueueJobResult,
} from './jobs/queue.js';

// ============================================================================
// JOB HANDLERS EXPORT
// ============================================================================
// US-004: Implement Provision Project Job - Step 1: Foundation
//
// Job handlers for background task processing. Each handler implements
// the logic for a specific job type (e.g., provision_project, rotate_key).
//
// @example
// ```typescript
// import { getJobHandler, provisionProjectHandler } from '@nextmavens/audit-logs-database';
//
// // Get a handler dynamically
// const handler = getJobHandler(JobType.PROVISION_PROJECT);
// const result = await handler({ project_id: 'proj-123', region: 'us-east-1' });
//
// // Use handler directly
// const result2 = await provisionProjectHandler({ project_id: 'proj-456', region: 'eu-west-1' });
// ```
export {
  provisionProjectHandler,
  getJobHandler,
  hasJobHandler,
  registerJobHandler,
  getRegisteredJobTypes,
  validateRequiredHandlers,
  jobHandlers,
} from './jobs/index.js';

export type {
  ProvisionProjectPayload,
  ProvisionProjectResult,
} from './jobs/types.js';

export { ProvisionProjectErrorType, ProvisionProjectStage } from './jobs/types.js';

// ============================================================================
// WEBHOOK TYPES EXPORT
// ============================================================================
// US-006: Implement Deliver Webhook Job - Step 7: Data Layer
//
// Webhook configuration and delivery tracking types for managing webhook
// notifications to external endpoints.
//
// @example
// ```typescript
// import { Webhook, WebhookDelivery, WebhookDeliveryStatus } from '@nextmavens/audit-logs-database';
//
// // Create a webhook
// const webhook: Webhook = {
//   id: 'webhook-123',
//   project_id: 'proj-456',
//   event_type: 'user.created',
//   url: 'https://example.com/webhook',
//   http_method: 'POST',
//   headers: { 'Authorization': 'Bearer token123' },
//   disabled: false,
//   disabled_at: null,
//   disabled_reason: null,
//   consecutive_failures: 0,
//   last_delivery_at: null,
//   last_failure_at: null,
//   created_at: new Date(),
//   updated_at: new Date(),
// };
// ```
export type {
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDelivery,
  CreateWebhookDeliveryInput,
  WebhookQuery,
  WebhookDeliveryQuery,
  WebhookStatistics,
} from '../types/webhooks.types.js';

export { WebhookDeliveryStatus, WebhookDeliveryErrorType } from '../types/webhooks.types.js';

// ============================================================================
// BACKUP TYPES EXPORT
// ============================================================================
// US-003: Create Backup History Table
//
// Backup history tracking types for managing database, storage, and logs backups.
// These types are used to track backup records with retention policy.
//
// @example
// ```typescript
// import { Backup, BackupType, CreateBackupInput } from '@nextmavens/audit-logs-database';
//
// // Create a backup record
// const backup: CreateBackupInput = {
//   project_id: 'proj-123',
//   type: BackupType.DATABASE,
//   file_id: 'telegram-file-456',
//   size: 1024000,
//   expires_at: new Date('2026-02-28'),
// };
// ```
export type {
  Backup,
  CreateBackupInput,
  BackupQuery,
  BackupResponse,
  BackupStats,
  BackupRetentionConfig,
  BackupFileMetadata,
  BackupWithMetadata,
} from '../types/backups.types.js';

export { BackupType } from '../types/backups.types.js';

// ============================================================================
// BACKUP HISTORY TYPES EXPORT
// ============================================================================
// US-004: Record Backup in History
//
// Backup history tracking types with status management for recording backup exports.
// These types provide audit trail for backup operations with 30-day retention.
//
// @example
// ```typescript
// import { BackupHistory, BackupHistoryStatus, BackupHistoryInput, BackupHistoryType } from '@nextmavens/audit-logs-database';
//
// // Create a backup history record
// const history: BackupHistoryInput = {
//   project_id: 'proj-123',
//   type: BackupHistoryType.EXPORT,
//   file_id: 'telegram-file-456',
//   size: 1024000,
// };
// ```
export type {
  BackupHistory,
  BackupHistoryInput,
  BackupHistoryQuery,
  BackupHistoryResponse,
  BackupHistoryStats,
  BackupHistoryResult,
} from './jobs/types.backup.js';

export {
  BackupHistoryStatus,
  BackupHistoryType,
} from './jobs/types.backup.js';

// Export backup history functions
export {
  recordBackup,
  getBackupHistory,
  getBackupById,
  markBackupExpired,
  markBackupDeleted,
  cleanupExpiredBackups,
} from './jobs/backup-history.js';
