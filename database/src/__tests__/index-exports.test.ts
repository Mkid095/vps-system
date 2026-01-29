/**
 * Main Index Export Verification Test
 *
 * Verifies that all queue exports are properly re-exported from the main index.
 *
 * US-002: Create Job Queue System - Step 2: Package Manager
 */

import { describe, it } from 'vitest';
import { JobStatus } from '@nextmavens/audit-logs-database';
import {
  enqueueJob,
  scheduleJob,
  getJob,
  JobQueue,
  type JobQueueOptions,
  type EnqueueJobResult,
} from '../index.js';

describe('Main Index - Queue Export Verification', () => {
  it('should export enqueueJob function', () => {
    if (typeof enqueueJob !== 'function') {
      throw new Error('enqueueJob is not exported from main index');
    }
  });

  it('should export scheduleJob function', () => {
    if (typeof scheduleJob !== 'function') {
      throw new Error('scheduleJob is not exported from main index');
    }
  });

  it('should export getJob function', () => {
    if (typeof getJob !== 'function') {
      throw new Error('getJob is not exported from main index');
    }
  });

  it('should export JobQueue class', () => {
    if (typeof JobQueue !== 'function') {
      throw new Error('JobQueue is not exported from main index');
    }
  });

  it('should export JobQueueOptions type', () => {
    const options: JobQueueOptions = {
      project_id: 'test-project-123',
      delay: 1000,
      max_attempts: 3,
      priority: 10,
    };
    if (!options) {
      throw new Error('JobQueueOptions type not properly exported from main index');
    }
  });

  it('should export EnqueueJobResult type', () => {
    const result: EnqueueJobResult = {
      id: 'test-id',
      type: 'test-job',
      status: JobStatus.PENDING,
      scheduled_at: new Date(),
      created_at: new Date(),
    };
    if (!result) {
      throw new Error('EnqueueJobResult type not properly exported from main index');
    }
  });
});
