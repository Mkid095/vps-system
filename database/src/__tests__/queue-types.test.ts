/**
 * Job Queue System - Type Verification Test
 *
 * Verifies that all queue types are properly defined without requiring database connection.
 *
 * US-002: Create Job Queue System - Step 2: Package Manager
 */

import { describe, it, expect } from 'vitest';

// Import types directly without triggering database initialization
import type {
  JobQueueOptions,
  EnqueueJobResult,
} from '../jobs/queue.js';

import type {
  Job,
  JobStatus,
  JobType,
  JobPayload,
} from '../../types/jobs.types.js';

describe('Job Queue - Type Verification', () => {
  it('should have JobQueueOptions type defined', () => {
    const options: JobQueueOptions = {
      project_id: 'test-project-123',
      delay: 1000,
      max_attempts: 3,
      priority: 10,
    };
    expect(options).toBeDefined();
    expect(options.project_id).toBe('test-project-123');
    expect(options.delay).toBe(1000);
    expect(options.max_attempts).toBe(3);
    expect(options.priority).toBe(10);
  });

  it('should have EnqueueJobResult type defined', () => {
    const result: EnqueueJobResult = {
      id: 'test-id',
      type: 'test-job',
      status: 'pending' as JobStatus,
      scheduled_at: new Date(),
      created_at: new Date(),
    };
    expect(result).toBeDefined();
    expect(result.id).toBe('test-id');
    expect(result.type).toBe('test-job');
    expect(result.status).toBe('pending');
  });

  it('should have Job type compatible with queue system', () => {
    const job: Job = {
      id: 'test-id',
      project_id: 'test-project-123',
      type: 'provision_project' as JobType,
      payload: { project_id: 'proj-123' } as JobPayload,
      status: 'pending' as JobStatus,
      attempts: 0,
      max_attempts: 3,
      last_error: null,
      scheduled_at: new Date(),
      started_at: null,
      completed_at: null,
      created_at: new Date(),
    };
    expect(job).toBeDefined();
    expect(job.type).toBe('provision_project');
  });

  it('should support priority in payload', () => {
    const payload: JobPayload = {
      project_id: 'proj-123',
      priority: 100,
    };
    expect(payload).toBeDefined();
    expect(payload.project_id).toBe('proj-123');
    expect(payload.priority).toBe(100);
  });

  it('should support delay in options', () => {
    const options: JobQueueOptions = {
      project_id: 'test-project-123',
      delay: 5000, // 5 seconds
    };
    expect(options).toBeDefined();
    expect(options.delay).toBe(5000);
  });

  it('should support max_attempts configuration', () => {
    const options: JobQueueOptions = {
      project_id: 'test-project-123',
      max_attempts: 5,
    };
    expect(options).toBeDefined();
    expect(options.max_attempts).toBe(5);
  });
});
