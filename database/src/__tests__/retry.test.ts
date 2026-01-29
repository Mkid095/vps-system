/**
 * Retry Job Function Tests
 *
 * Tests for the retryJob function to ensure it can be imported
 * and used correctly.
 *
 * US-011: Create Job Retry API - Step 2: Package Manager Migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { retryJob } from '../jobs/retry.js';
import { query } from '../pool.js';

// Mock the pool module
vi.mock('../pool.js', () => ({
  query: vi.fn(),
}));

describe('retryJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be exported and can be imported', () => {
    expect(typeof retryJob).toBe('function');
  });

  it('should throw error if job not found', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);

    await expect(retryJob('non-existent-job')).rejects.toThrow('Job not found');
  });

  it('should throw error if max_attempts reached', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        id: 'job-123',
        type: 'test_job',
        payload: {},
        status: 'failed',
        attempts: 3,
        max_attempts: 3,
        last_error: 'Test error',
        scheduled_at: new Date(),
        started_at: new Date(),
        completed_at: new Date(),
        created_at: new Date(),
      }],
    } as never);

    await expect(retryJob('job-123')).rejects.toThrow('Maximum retry attempts reached');
  });

  it('should reset job to pending when retry is allowed', async () => {
    const mockJob = {
      id: 'job-123',
      type: 'test_job',
      payload: { test: 'data' },
      status: 'pending',
      attempts: 2,
      max_attempts: 3,
      last_error: null,
      scheduled_at: new Date(),
      started_at: null,
      completed_at: null,
      created_at: new Date(),
    };

    // Mock select query to return job
    vi.mocked(query).mockResolvedValueOnce({
      rows: [mockJob],
    } as never);

    // Mock update query to return updated job
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ ...mockJob, status: 'pending', scheduled_at: new Date() }],
    } as never);

    const result = await retryJob('job-123');

    expect(result.status).toBe('pending');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('should clear error and timestamps on retry', async () => {
    const mockJob = {
      id: 'job-123',
      type: 'test_job',
      payload: { test: 'data' },
      status: 'failed',
      attempts: 1,
      max_attempts: 3,
      last_error: 'Previous error',
      scheduled_at: new Date(),
      started_at: new Date(),
      completed_at: new Date(),
      created_at: new Date(),
    };

    // Mock select query
    vi.mocked(query).mockResolvedValueOnce({
      rows: [mockJob],
    } as never);

    // Mock update query - should clear error and timestamps
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{
        ...mockJob,
        status: 'pending',
        last_error: null,
        started_at: null,
        completed_at: null,
        scheduled_at: new Date(),
      }],
    } as never);

    const result = await retryJob('job-123');

    expect(result.status).toBe('pending');
    expect(result.last_error).toBeNull();
    expect(result.started_at).toBeNull();
    expect(result.completed_at).toBeNull();
  });
});
