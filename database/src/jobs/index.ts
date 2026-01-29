/**
 * Jobs Module
 *
 * Background job processing system for async operations.
 * Provides job handlers, registry, and utilities for managing background tasks.
 *
 * US-004: Implement Provision Project Job - Step 1: Foundation
 *
 * @example
 * ```typescript
 * import { getJobHandler, JobType } from '@nextmavens/audit-logs-database';
 *
 * // Get and execute a job handler
 * const handler = getJobHandler(JobType.PROVISION_PROJECT);
 * const result = await handler({
 *   project_id: 'proj-123',
 *   region: 'us-east-1',
 * });
 * ```
 */

// Export job handlers
export { provisionProjectHandler } from './provision-project.handler.js';

// Export job handler registry
export {
  jobHandlers,
  getJobHandler,
  hasJobHandler,
  registerJobHandler,
  getRegisteredJobTypes,
  validateRequiredHandlers,
} from './registry.js';

// Export job-specific types
export type {
  ProvisionProjectPayload,
  ProvisionProjectResult,
} from './types.js';

export { ProvisionProjectErrorType, ProvisionProjectStage } from './types.js';
