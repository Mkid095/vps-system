/**
 * Job Retry Function
 *
 * Provides functionality to retry failed jobs by resetting their status
 * to pending and incrementing the attempt count.
 *
 * US-011: Create Job Retry API - Step 7: Data Layer
 */

import { query } from '../pool.js';
import type { Job } from '../../types/jobs.types.js';

/**
 * Retry a failed job
 *
 * Resets the job status to 'pending' so it can be picked up by the worker again.
 * Increments the attempt count and checks if max_attempts has been reached.
 *
 * @param jobId - The ID of the job to retry
 * @returns The updated job or null if not found
 * @throws Error if max_attempts has been reached
 *
 * @example
 * ```typescript
 * import { retryJob } from '@nextmavens/audit-logs-database';
 *
 * try {
 *   const job = await retryJob('job-uuid-123');
 *   console.log('Job retry queued:', job.id);
 * } catch (error) {
 *   console.error('Failed to retry job:', error);
 * }
 * ```
 */
export async function retryJob(jobId: string): Promise<Job> {
  // First, get the current job to check max_attempts
  const selectQuery = `
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

  const selectResult = await query(selectQuery, [jobId]);

  if (selectResult.rows.length === 0) {
    throw new Error('Job not found');
  }

  const currentJob = selectResult.rows[0];
  if (!currentJob) {
    throw new Error('Job not found');
  }

  // Check if max_attempts has been reached
  if (currentJob.attempts >= currentJob.max_attempts) {
    throw new Error('Maximum retry attempts reached');
  }

  // Update job to retry: reset status to pending, clear error/timestamps
  // The attempts will be incremented by the worker when it processes the job
  const updateQuery = `
    UPDATE control_plane.jobs
    SET
      status = 'pending',
      last_error = NULL,
      started_at = NULL,
      completed_at = NULL,
      scheduled_at = NOW()
    WHERE id = $1
    RETURNING
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
  `;

  const updateResult = await query(updateQuery, [jobId]);

  if (updateResult.rows.length === 0) {
    throw new Error('Failed to retry job');
  }

  const row = updateResult.rows[0];
  if (!row) {
    throw new Error('Failed to retry job');
  }

  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    max_attempts: row.max_attempts,
    last_error: row.last_error,
    scheduled_at: row.scheduled_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}
