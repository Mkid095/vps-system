/**
 * Job Queue System - Export Verification Test
 *
 * Verifies that all queue exports are properly configured and can be imported.
 *
 * US-002: Create Job Queue System - Step 2: Package Manager
 */

import { describe, it } from 'vitest';
import {
  enqueueJob,
  scheduleJob,
  getJob,
  JobQueue,
  type JobQueueOptions,
  type EnqueueJobResult,
} from '../jobs/queue.js';
import type { Job, JobStatus, JobType, JobPayload } from '../../types/jobs.types.js';

describe('Job Queue - Export Verification', () => {
  it('should export enqueueJob function', () => {
    // Verify enqueueJob is exported
    if (typeof enqueueJob !== 'function') {
      throw new Error('enqueueJob is not exported or not a function');
    }
  });

  it('should export scheduleJob function', () => {
    // Verify scheduleJob is exported
    if (typeof scheduleJob !== 'function') {
      throw new Error('scheduleJob is not exported or not a function');
    }
  });

  it('should export getJob function', () => {
    // Verify getJob is exported
    if (typeof getJob !== 'function') {
      throw new Error('getJob is not exported or not a function');
    }
  });

  it('should export JobQueue class', () => {
    // Verify JobQueue class is exported
    if (typeof JobQueue !== 'function') {
      throw new Error('JobQueue is not exported or not a class/function');
    }
  });

  it('should export JobQueueOptions type', () => {
    // This is a compile-time check - if it compiles, the type is exported
    const options: JobQueueOptions = {
      project_id: 'test-project-123',
      delay: 1000,
      max_attempts: 3,
      priority: 10,
    };
    if (!options) {
      throw new Error('JobQueueOptions type not properly exported');
    }
  });

  it('should export EnqueueJobResult type', () => {
    // This is a compile-time check - if it compiles, the type is exported
    const result: EnqueueJobResult = {
      id: 'test-id',
      type: 'test-job',
      status: 'pending' as JobStatus,
      scheduled_at: new Date(),
      created_at: new Date(),
    };
    if (!result) {
      throw new Error('EnqueueJobResult type not properly exported');
    }
  });

  it('should have proper type definitions for Job', () => {
    // Compile-time check for Job type
    const job: Job = {
      id: 'test-id',
      project_id: 'test-project-123',
      type: 'test-job' as JobType,
      payload: { test: 'data' } as JobPayload,
      status: 'pending' as JobStatus,
      attempts: 0,
      max_attempts: 3,
      last_error: null,
      scheduled_at: new Date(),
      started_at: null,
      completed_at: null,
      created_at: new Date(),
    };
    if (!job) {
      throw new Error('Job type not properly defined');
    }
  });
});
