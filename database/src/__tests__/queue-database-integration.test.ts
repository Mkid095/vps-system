/**
 * Job Queue Database Integration Tests
 *
 * Integration tests for the job queue system to verify:
 * - Queue properly connects to control_plane.jobs table
 * - Database operations (insert, select) work correctly
 * - Jobs table schema is compatible with queue operations
 * - enqueueJob properly inserts records into jobs table
 * - All database queries use proper indexes (status, scheduled_at)
 *
 * US-002: Create Job Queue System - Step 7: Integration - Data Layer
 *
 * Usage:
 *   pnpm test src/__tests__/queue-database-integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query, getClient } from '../pool.js';
import { JobStatus } from '../../types/jobs.types.js';
import { enqueueJob, scheduleJob, getJob, JobQueue } from '../jobs/queue.js';
import type { Job, JobPayload } from '../../types/jobs.types.js';

/**
 * Test helper to clean up test jobs
 */
async function cleanupTestJobs() {
  await query(`
    DELETE FROM control_plane.jobs
    WHERE type LIKE 'test-%'
  `);
}

/**
 * Test helper to verify index usage
 */
async function getIndexUsage(): Promise<{
  status_index_exists: boolean;
  scheduled_at_index_exists: boolean;
  composite_index_exists: boolean;
}> {
  const result = await query(`
    SELECT
      indexname,
      tablename
    FROM pg_indexes
    WHERE schemaname = 'control_plane'
      AND tablename = 'jobs'
      AND (
        indexname = 'idx_jobs_status'
        OR indexname = 'idx_jobs_scheduled_at'
        OR indexname = 'idx_jobs_status_scheduled_at'
      )
  `);

  const indexes = {
    status_index_exists: false,
    scheduled_at_index_exists: false,
    composite_index_exists: false,
  };

  for (const row of result.rows) {
    if (row.indexname === 'idx_jobs_status') {
      indexes.status_index_exists = true;
    }
    if (row.indexname === 'idx_jobs_scheduled_at') {
      indexes.scheduled_at_index_exists = true;
    }
    if (row.indexname === 'idx_jobs_status_scheduled_at') {
      indexes.composite_index_exists = true;
    }
  }

  return indexes;
}

/**
 * Test helper to check if a query uses an index
 * Uses EXPLAIN ANALYZE to verify index usage
 */
async function verifyIndexUsage(
  queryText: string,
  values: unknown[] = []
): Promise<{ uses_index: boolean; plan: string }> {
  const explainQuery = `EXPLAIN ${queryText}`;
  const result = await query(explainQuery, values);
  const plan = result.rows.map((row) => JSON.stringify(row)).join('\n');

  // Check if the plan mentions index scans
  const usesIndex =
    plan.includes('Index Scan') ||
    plan.includes('Bitmap Index Scan') ||
    plan.includes('idx_jobs');

  return { uses_index: usesIndex, plan };
}

describe('US-002: Job Queue Database Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestJobs();
  });

  afterEach(async () => {
    await cleanupTestJobs();
  });

  describe('AC1: Queue connects to control_plane.jobs table', () => {
    it('should verify jobs table exists in control_plane schema', async () => {
      const result = await query(`
        SELECT table_name, table_schema
        FROM information_schema.tables
        WHERE table_schema = 'control_plane'
          AND table_name = 'jobs'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      const row = result.rows[0];
      expect(row?.table_name).toBe('jobs');
      expect(row?.table_schema).toBe('control_plane');
    });

    it('should verify jobs table has all required columns', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'jobs'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => row.column_name);

      // Verify all required columns exist
      expect(columns).toContain('id');
      expect(columns).toContain('project_id');
      expect(columns).toContain('type');
      expect(columns).toContain('payload');
      expect(columns).toContain('status');
      expect(columns).toContain('attempts');
      expect(columns).toContain('max_attempts');
      expect(columns).toContain('last_error');
      expect(columns).toContain('scheduled_at');
      expect(columns).toContain('started_at');
      expect(columns).toContain('completed_at');
      expect(columns).toContain('created_at');
    });
  });

  describe('AC2: Database operations work correctly', () => {
    it('should insert a job using enqueueJob and verify in database', async () => {
      const payload: JobPayload = {
        project_id: 'proj-123',
        region: 'us-east-1',
      };

      const result = await enqueueJob('test-provision', payload, {
        project_id: 'test-project-123',
        delay: 0,
        max_attempts: 3,
      });

      expect(result.id).toBeDefined();
      expect(result.type).toBe('test-provision');
      expect(result.status).toBe(JobStatus.PENDING);

      // Verify the job exists in the database
      const dbResult = await query<Job>(
        'SELECT * FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      expect(dbResult.rows.length).toBe(1);
      const job = dbResult.rows[0];

      expect(job?.id).toBe(result.id);
      expect(job?.type).toBe('test-provision');
      expect(job?.status).toBe(JobStatus.PENDING);
      expect(job?.attempts).toBe(0);
      expect(job?.max_attempts).toBe(3);
      expect(job?.payload).toEqual(payload);
    });

    it('should retrieve a job using getJob', async () => {
      const payload: JobPayload = {
        key_id: 'key-456',
      };

      const enqueued = await enqueueJob('test-rotate-key', payload, {
        project_id: 'test-project-123',
      });

      // Retrieve the job
      const job = await getJob(enqueued.id);

      expect(job).toBeDefined();
      expect(job!.id).toBe(enqueued.id);
      expect(job!.type).toBe('test-rotate-key');
      expect(job!.status).toBe(JobStatus.PENDING);
      expect(job!.payload).toEqual(payload);
    });

    it('should return null for non-existent job', async () => {
      const job = await getJob('00000000-0000-0000-0000-000000000000');
      expect(job).toBeNull();
    });

    it('should schedule a job for specific time', async () => {
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now
      const payload: JobPayload = {
        project_id: 'proj-789',
      };

      const result = await scheduleJob('test-backup', scheduledAt, payload, { project_id: 'test-project-123' });

      expect(result.id).toBeDefined();
      expect(result.status).toBe(JobStatus.PENDING);

      // Verify in database
      const dbResult = await query<Job>(
        'SELECT * FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      expect(dbResult.rows.length).toBe(1);
      const job = dbResult.rows[0];

      expect(job?.scheduled_at).toBeInstanceOf(Date);
      expect(job?.scheduled_at.getTime()).toBeCloseTo(
        scheduledAt.getTime(),
        -3 // Within 1 second
      );
    });
  });

  describe('AC3: Jobs table schema is compatible with queue operations', () => {
    it('should store JSONB payload correctly', async () => {
      const complexPayload: JobPayload = {
        project_id: 'proj-123',
        region: 'us-east-1',
        priority: 100,
        metadata: {
          owner: 'user-456',
          tags: ['production', 'critical'],
        },
        nested: {
          deep: {
            value: 'test',
          },
        },
      };

      const result = await enqueueJob('test-complex-payload', complexPayload, { project_id: 'test-project-123' });

      // Verify payload is stored correctly
      const dbResult = await query<Job>(
        'SELECT payload FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      const row = dbResult.rows[0];
      expect(row?.payload).toEqual(complexPayload);
    });

    it('should respect status enum constraints', async () => {
      // Valid status should work
      const result = await enqueueJob('test-status-valid', {}, { project_id: 'test-project-123' });
      expect(result.status).toBe(JobStatus.PENDING);

      // Try to insert invalid status directly (should fail)
      await expect(async () => {
        await query(`
          INSERT INTO control_plane.jobs (id, type, payload, status, max_attempts, scheduled_at)
          VALUES (gen_random_uuid(), 'test-invalid-status', '{}'::jsonb, 'invalid_status', 3, NOW())
        `);
      }).rejects.toThrow();
    });

    it('should respect attempts constraints', async () => {
      // Negative attempts should fail
      await expect(async () => {
        await query(`
          INSERT INTO control_plane.jobs (id, type, payload, status, attempts, max_attempts, scheduled_at)
          VALUES (gen_random_uuid(), 'test-negative-attempts', '{}'::jsonb, 'pending', -1, 3, NOW())
        `);
      }).rejects.toThrow();

      // Attempts exceeding max_attempts should fail
      await expect(async () => {
        await query(`
          INSERT INTO control_plane.jobs (id, type, payload, status, attempts, max_attempts, scheduled_at)
          VALUES (gen_random_uuid(), 'test-exceed-attempts', '{}'::jsonb, 'pending', 5, 3, NOW())
        `);
      }).rejects.toThrow();
    });
  });

  describe('AC4: enqueueJob properly inserts records', () => {
    it('should insert job with delay', async () => {
      const delay = 5000; // 5 seconds
      const beforeEnqueue = Date.now();

      const result = await enqueueJob('test-delayed', {}, { project_id: 'test-project-123', delay });

      const afterEnqueue = Date.now();
      const expectedScheduledAt = beforeEnqueue + delay;

      // Verify scheduled_at is approximately correct
      expect(result.scheduled_at.getTime()).toBeGreaterThanOrEqual(
        expectedScheduledAt - 100 // Allow 100ms variance
      );
      expect(result.scheduled_at.getTime()).toBeLessThanOrEqual(
        expectedScheduledAt + (afterEnqueue - beforeEnqueue) + 100
      );
    });

    it('should insert job with custom max_attempts', async () => {
      const result = await enqueueJob('test-custom-attempts', {}, { project_id: 'test-project-123', 
        max_attempts: 5,
      });

      const dbResult = await query<Job>(
        'SELECT max_attempts FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      const row = dbResult.rows[0];
      expect(row?.max_attempts).toBe(5);
    });

    it('should insert job with priority in payload', async () => {
      const result = await enqueueJob('test-priority', {}, { project_id: 'test-project-123', 
        priority: 100,
      });

      const dbResult = await query<Job>(
        'SELECT payload FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      const row2 = dbResult.rows[0];
      expect(row2?.payload.priority).toBe(100);
    });

    it('should set default values correctly', async () => {
      const result = await enqueueJob('test-defaults', {}, { project_id: 'test-project-123' });

      const dbResult = await query<Job>(
        'SELECT * FROM control_plane.jobs WHERE id = $1',
        [result.id]
      );

      const job = dbResult.rows[0];
      expect(job?.status).toBe(JobStatus.PENDING);
      expect(job?.attempts).toBe(0);
      expect(job?.max_attempts).toBe(3); // Default
      expect(job?.last_error).toBeNull();
      expect(job?.started_at).toBeNull();
      expect(job?.completed_at).toBeNull();
      expect(job?.created_at).toBeInstanceOf(Date);
    });
  });

  describe('AC5: Database queries use proper indexes', () => {
    it('should verify all required indexes exist', async () => {
      const indexes = await getIndexUsage();

      expect(indexes.status_index_exists).toBe(true);
      expect(indexes.scheduled_at_index_exists).toBe(true);
      expect(indexes.composite_index_exists).toBe(true);
    });

    it('should use index when querying by status', async () => {
      // Create some test jobs
      await enqueueJob('test-index-status-1', {}, { project_id: 'test-project-123' });
      await enqueueJob('test-index-status-2', {}, { project_id: 'test-project-123' });

      // Verify index usage
      const { uses_index } = await verifyIndexUsage(`
        SELECT * FROM control_plane.jobs
        WHERE status = 'pending'
        LIMIT 10
      `);

      expect(uses_index).toBe(true);
    });

    it('should use index when querying by scheduled_at', async () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      await scheduleJob('test-index-scheduled', scheduledAt, {}, { project_id: 'test-project-123' });

      // Verify index usage
      const { uses_index } = await verifyIndexUsage(`
        SELECT * FROM control_plane.jobs
        WHERE scheduled_at > NOW()
        ORDER BY scheduled_at
        LIMIT 10
      `);

      expect(uses_index).toBe(true);
    });

    it('should use composite index when querying by status and scheduled_at', async () => {
      await enqueueJob('test-index-composite-1', {}, { project_id: 'test-project-123' });

      // Verify composite index usage
      const { uses_index } = await verifyIndexUsage(`
        SELECT * FROM control_plane.jobs
        WHERE status = 'pending'
          AND scheduled_at <= NOW()
        ORDER BY scheduled_at
        LIMIT 10
      `);

      expect(uses_index).toBe(true);
    });
  });

  describe('AC6: JobQueue class integration', () => {
    it('should work with JobQueue class instance', async () => {
      const queue = new JobQueue();

      const result = await queue.enqueue('test-queue-instance', { test: 'data' }, { project_id: 'test-project-123' });

      expect(result.id).toBeDefined();

      // Verify in database
      const job = await queue.getJob(result.id);
      expect(job).toBeDefined();
      expect(job!.id).toBe(result.id);
    });

    it('should support multiple enqueue operations', async () => {
      const queue = new JobQueue();

      const results = await Promise.all([
        queue.enqueue('test-batch-1', { index: 1 }, { project_id: 'test-project-123' }),
        queue.enqueue('test-batch-2', { index: 2 }, { project_id: 'test-project-123' }),
        queue.enqueue('test-batch-3', { index: 3 }, { project_id: 'test-project-123' }),
      ]);

      expect(results).toHaveLength(3);
      expect(new Set(results.map((r) => r.id)).size).toBe(3); // All unique IDs

      // Verify all in database
      for (const result of results) {
        const job = await queue.getJob(result.id);
        expect(job).toBeDefined();
      }
    });
  });

  describe('AC7: Transaction support', () => {
    it('should support client from pool for transactions', async () => {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        // Insert job within transaction
        const result = await client.query<Job>(
          `
          INSERT INTO control_plane.jobs (type, payload, status, max_attempts, scheduled_at)
          VALUES ($1, $2, 'pending', 3, NOW())
          RETURNING *
          `,
          ['test-transaction', JSON.stringify({ test: 'data' })]
        );

        const row = result.rows[0];
        const jobId = row?.id;

        // Job should not be visible outside transaction
        const outsideResult = await query<Job>(
          'SELECT * FROM control_plane.jobs WHERE id = $1',
          [jobId]
        );
        expect(outsideResult.rows.length).toBe(0);

        await client.query('COMMIT');

        // Now it should be visible
        const committedResult = await query<Job>(
          'SELECT * FROM control_plane.jobs WHERE id = $1',
          [jobId]
        );
        expect(committedResult.rows.length).toBe(1);
      } finally {
        client.release();
      }
    });

    it('should rollback on error', async () => {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        // Insert job
        await client.query(
          `
          INSERT INTO control_plane.jobs (type, payload, status, max_attempts, scheduled_at)
          VALUES ($1, $2, 'pending', 3, NOW())
          `,
          ['test-rollback-1', JSON.stringify({ test: 'data1' })]
        );

        // Try to insert invalid job (will fail)
        try {
          await client.query(
            `
            INSERT INTO control_plane.jobs (type, payload, status, attempts, max_attempts, scheduled_at)
            VALUES ($1, $2, 'pending', -1, 3, NOW())
            `,
            ['test-rollback-2', JSON.stringify({ test: 'data2' })]
          );
        } catch {
          // Expected to fail
        }

        await client.query('ROLLBACK');

        // Neither job should be in database
        const result = await query(
          "SELECT * FROM control_plane.jobs WHERE type LIKE 'test-rollback-%'"
        );
        expect(result.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });
  });
});
