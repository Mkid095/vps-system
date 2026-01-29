/**
 * Job Handler Registry
 *
 * Central registry for all job handlers in the system.
 * Maps job types to their corresponding handler functions.
 *
 * US-004: Implement Provision Project Job - Step 1: Foundation
 *
 * This registry allows:
 * - Easy registration of new job handlers
 * - Type-safe handler lookups
 * - Dynamic handler execution
 * - Handler validation and testing
 */

import type { JobHandler, JobHandlerRegistry } from '../../types/jobs.types.js';
import { JobType } from '../../types/jobs.types.js';
import { provisionProjectHandler } from './provision-project.handler.js';

/**
 * Job handler registry
 * Maps job types to their handler functions
 */
export const jobHandlers: JobHandlerRegistry = {
  // Project management jobs
  [JobType.PROVISION_PROJECT]: provisionProjectHandler,

  // Additional handlers will be registered here as they are implemented
  // [JobType.ROTATE_KEY]: rotateKeyHandler,
  // [JobType.DELIVER_WEBHOOK]: deliverWebhookHandler,
  // [JobType.EXPORT_BACKUP]: exportBackupHandler,
  // etc.
};

/**
 * Get a job handler by type
 *
 * @param jobType - The type of job to get the handler for
 * @returns The job handler function
 * @throws Error if handler is not found
 */
export function getJobHandler(jobType: string): JobHandler {
  const handler = jobHandlers[jobType];

  if (!handler) {
    throw new Error(`No handler registered for job type: ${jobType}`);
  }

  return handler;
}

/**
 * Check if a job handler exists for a given job type
 *
 * @param jobType - The type of job to check
 * @returns True if handler exists, false otherwise
 */
export function hasJobHandler(jobType: string): boolean {
  return jobType in jobHandlers;
}

/**
 * Register a new job handler
 *
 * @param jobType - The type of job
 * @param handler - The handler function
 */
export function registerJobHandler(jobType: string, handler: JobHandler): void {
  jobHandlers[jobType] = handler;
}

/**
 * Get all registered job types
 *
 * @returns Array of registered job types
 */
export function getRegisteredJobTypes(): string[] {
  return Object.keys(jobHandlers);
}

/**
 * Validate that all required job handlers are registered
 *
 * @param requiredJobTypes - Array of job types that must be registered
 * @throws Error if any required handler is missing
 */
export function validateRequiredHandlers(requiredJobTypes: string[]): void {
  const missingHandlers = requiredJobTypes.filter((type) => !hasJobHandler(type));

  if (missingHandlers.length > 0) {
    throw new Error(
      `Missing required job handlers: ${missingHandlers.join(', ')}`
    );
  }
}
