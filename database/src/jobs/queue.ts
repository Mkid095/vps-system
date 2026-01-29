/**
 * Job Queue System
 *
 * Provides a job queue implementation for enqueuing background jobs
 * with support for scheduling, priority, and retry configuration.
 *
 * US-002: Create Job Queue System
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../pool.js';
import type {
  Job,
  JobType,
  JobPayload,
  JobStatus,
} from '../../types/jobs.types.js';

/**
 * Job queue options
 */
export interface JobQueueOptions {
  /** Delay before job should be processed (milliseconds) */
  delay?: number;
  /** Maximum number of retry attempts (default: 3) */
  max_attempts?: number;
  /** Job priority for execution order (higher = more important) */
  priority?: number;
}

/**
 * Job enqueue result
 */
export interface EnqueueJobResult {
  /** The created job ID */
  id: string;
  /** The job type */
  type: string;
  /** Current job status */
  status: JobStatus;
  /** When the job is scheduled to run */
  scheduled_at: Date;
  /** When the job was created */
  created_at: Date;
}

/**
 * JobQueue class
 * Manages job enqueuing with support for scheduling and retry configuration
 */
class JobQueueClass {
  /**
   * Enqueue a new job
   *
   * @param type - The job type identifier
   * @param payload - Job data payload
   * @param options - Additional job options (delay, max_attempts, priority)
   * @returns The created job ID and metadata
   *
   * @example
   * ```typescript
   * const queue = new JobQueue();
   * const result = await queue.enqueue('provision_project', {
   *   project_id: 'proj-123',
   *   region: 'us-east-1',
   * }, {
   *   delay: 5000, // 5 seconds
   *   max_attempts: 3,
   * });
   * ```
   */
  async enqueue(
    type: JobType | string,
    payload: JobPayload = {},
    options: JobQueueOptions = {}
  ): Promise<EnqueueJobResult> {
    const { delay = 0, max_attempts = 3, priority } = options;

    // Generate a unique job ID
    const id = uuidv4();

    // Calculate scheduled time
    const scheduled_at = new Date(Date.now() + delay);

    // Merge priority into payload
    const finalPayload = priority !== undefined
      ? { ...payload, priority }
      : payload;

    // Insert job into database
    const queryText = `
      INSERT INTO control_plane.jobs (
        id,
        type,
        payload,
        status,
        max_attempts,
        scheduled_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5)
      RETURNING id, type, status, scheduled_at, created_at
    `;

    const values = [
      id,
      type,
      JSON.stringify(finalPayload),
      max_attempts,
      scheduled_at,
    ];

    try {
      const result = await query(queryText, values);
      const row = result.rows[0];

      if (!row) {
        throw new Error('Failed to create job: No row returned');
      }

      return {
        id: row.id,
        type: row.type,
        status: row.status as JobStatus,
        scheduled_at: row.scheduled_at,
        created_at: row.created_at,
      };
    } catch (error) {
      throw new Error(
        `Failed to enqueue job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Schedule a job to run at a specific time
   *
   * @param type - The job type identifier
   * @param scheduledAt - When to run the job
   * @param payload - Job data payload
   * @param options - Additional job options
   * @returns The created job ID and metadata
   *
   * @example
   * ```typescript
   * const queue = new JobQueue();
   * const scheduledTime = new Date('2026-01-30T10:00:00Z');
   * const result = await queue.schedule(
   *   'backup',
   *   scheduledTime,
   *   { project_id: 'proj-123' }
   * );
   * ```
   */
  async schedule(
    type: JobType | string,
    scheduledAt: Date,
    payload: JobPayload = {},
    options: Omit<JobQueueOptions, 'delay'> = {}
  ): Promise<EnqueueJobResult> {
    const { max_attempts = 3, priority } = options;

    const id = uuidv4();

    // Merge priority into payload
    const finalPayload = priority !== undefined
      ? { ...payload, priority }
      : payload;

    const queryText = `
      INSERT INTO control_plane.jobs (
        id,
        type,
        payload,
        status,
        max_attempts,
        scheduled_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5)
      RETURNING id, type, status, scheduled_at, created_at
    `;

    const values = [
      id,
      type,
      JSON.stringify(finalPayload),
      max_attempts,
      scheduledAt,
    ];

    try {
      const result = await query(queryText, values);
      const row = result.rows[0];

      if (!row) {
        throw new Error('Failed to create job: No row returned');
      }

      return {
        id: row.id,
        type: row.type,
        status: row.status as JobStatus,
        scheduled_at: row.scheduled_at,
        created_at: row.created_at,
      };
    } catch (error) {
      throw new Error(
        `Failed to schedule job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a job by ID
   *
   * @param id - The job ID
   * @returns The job or null if not found
   */
  async getJob(id: string): Promise<Job | null> {
    const queryText = `
      SELECT
        id,
        type,
        payload,
        status,
        attempts,
        max_attempts,
        last_error,
        scheduled_at,
        started_at,
        completed_at,
        created_at
      FROM control_plane.jobs
      WHERE id = $1
    `;

    try {
      const result = await query(queryText, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        type: row.type,
        payload: row.payload,
        status: row.status as JobStatus,
        attempts: row.attempts,
        max_attempts: row.max_attempts,
        last_error: row.last_error,
        scheduled_at: row.scheduled_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
      };
    } catch (error) {
      throw new Error(
        `Failed to get job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Global job queue instance
 */
const jobQueue = new JobQueueClass();

/**
 * Enqueue a job for background processing
 *
 * This is a convenience function that uses the global JobQueue instance.
 *
 * @param type - The job type identifier
 * @param payload - Job data payload
 * @param options - Additional job options (delay, max_attempts, priority)
 * @returns The created job ID and metadata
 *
 * @example
 * ```typescript
 * import { enqueueJob } from '@nextmavens/audit-logs-database';
 *
 * // Enqueue a job to run immediately
 * const result = await enqueueJob('provision_project', {
 *   project_id: 'proj-123',
 *   region: 'us-east-1',
 * });
 *
 * // Enqueue a job with a delay
 * const delayed = await enqueueJob('rotate_key', {
 *   key_id: 'key-456',
 * }, {
 *   delay: 60000, // 1 minute
 *   max_attempts: 5,
 * });
 *
 * // Enqueue a high-priority job
 * const priority = await enqueueJob('send_notification', {
 *   user_id: 'user-789',
 *   message: 'Project provisioned successfully',
 * }, {
 *   priority: 100, // High priority
 * });
 * ```
 */
export async function enqueueJob(
  type: JobType | string,
  payload: JobPayload = {},
  options: JobQueueOptions = {}
): Promise<EnqueueJobResult> {
  return jobQueue.enqueue(type, payload, options);
}

/**
 * Schedule a job to run at a specific time
 *
 * This is a convenience function that uses the global JobQueue instance.
 *
 * @param type - The job type identifier
 * @param scheduledAt - When to run the job
 * @param payload - Job data payload
 * @param options - Additional job options
 * @returns The created job ID and metadata
 *
 * @example
 * ```typescript
 * import { scheduleJob } from '@nextmavens/audit-logs-database';
 *
 * const scheduledTime = new Date('2026-01-30T10:00:00Z');
 * const result = await scheduleJob('backup', scheduledTime, {
 *   project_id: 'proj-123',
 * });
 * ```
 */
export async function scheduleJob(
  type: JobType | string,
  scheduledAt: Date,
  payload: JobPayload = {},
  options: Omit<JobQueueOptions, 'delay'> = {}
): Promise<EnqueueJobResult> {
  return jobQueue.schedule(type, scheduledAt, payload, options);
}

/**
 * Get a job by ID
 *
 * This is a convenience function that uses the global JobQueue instance.
 *
 * @param id - The job ID
 * @returns The job or null if not found
 */
export async function getJob(id: string): Promise<Job | null> {
  return jobQueue.getJob(id);
}

/**
 * JobQueue class export
 * Export the JobQueue class for advanced usage
 */
export { JobQueueClass as JobQueue };
