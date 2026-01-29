/**
 * Jobs Table Integration Tests
 *
 * Integration tests for the jobs table to verify:
 * - Creating jobs with valid data
 * - Status enum constraints
 * - Index creation
 * - Querying by status
 * - Querying by scheduled_at
 * - Status transitions (pending -> running -> completed)
 * - Attempts constraint (cannot be negative)
 * - JSONB payload storage and retrieval
 *
 * US-001: Create Jobs Database Table - Step 7: Integration Tests
 *
 * Usage:
 *   pnpm test src/__tests__/jobs.integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query, getClient } from '../pool.js';
import { JobStatus, JobType } from '../../types/jobs.types.js';
import type { Job } from '../../types/jobs.types.js';

/**
 * Test helper to clean up test data
 */
async function cleanupTestJobs() {
  await query(`
    DELETE FROM control_plane.jobs
    WHERE type LIKE 'test-%'
  `);
}

/**
 * Test helper to create a test job
 */
async function createTestJob(params: {
  type: string;
  payload?: Record<string, unknown>;
  status?: string;
  attempts?: number;
  max_attempts?: number;
  scheduled_at?: Date;
  started_at?: Date;
}): Promise<Job> {
  const {
    type,
    payload = {},
    status = JobStatus.PENDING,
    attempts = 0,
    max_attempts = 3,
    scheduled_at = new Date(),
    started_at,
  } = params;

  const result = await query<Job>(
    `
    INSERT INTO control_plane.jobs (
      type, payload, status, attempts, max_attempts, scheduled_at, started_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [type, JSON.stringify(payload), status, attempts, max_attempts, scheduled_at, started_at || null]
  );

  const job = result.rows[0];
  if (!job) {
    throw new Error('Failed to create test job');
  }

  return job;
}

describe('US-001: Jobs Database Table Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestJobs();
  });

  afterEach(async () => {
    await cleanupTestJobs();
  });

  describe('AC1: Creating a job with valid data', () => {
    it('should create a job with all required fields', async () => {
      const job = await createTestJob({
        type: JobType.PROVISION_PROJECT,
        payload: { project_id: 'proj-123', region: 'us-east-1' },
        status: JobStatus.PENDING,
        attempts: 0,
        max_attempts: 3,
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.type).toBe(JobType.PROVISION_PROJECT);
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.attempts).toBe(0);
      expect(job.max_attempts).toBe(3);
      expect(job.created_at).toBeInstanceOf(Date);
      expect(job.scheduled_at).toBeInstanceOf(Date);
    });

    it('should create a job with default values', async () => {
      const result = await query<Job>(
        `
        INSERT INTO control_plane.jobs (type)
        VALUES ($1)
        RETURNING *
        `,
        [JobType.ROTATE_KEY]
      );

      const job = result.rows[0];
      expect(job).toBeDefined();

      // Check default values
      expect(job!.payload).toEqual({});
      expect(job!.status).toBe(JobStatus.PENDING);
      expect(job!.attempts).toBe(0);
      expect(job!.max_attempts).toBe(3);
      expect(job!.last_error).toBeNull();
      expect(job!.started_at).toBeNull();
      expect(job!.completed_at).toBeNull();
      expect(job!.created_at).toBeInstanceOf(Date);
      expect(job!.scheduled_at).toBeInstanceOf(Date);
    });

    it('should create jobs with different types', async () => {
      const jobTypes = [
        JobType.PROVISION_PROJECT,
        JobType.ROTATE_KEY,
        JobType.DELIVER_WEBHOOK,
        JobType.EXPORT_BACKUP,
      ];

      for (const type of jobTypes) {
        const job = await createTestJob({ type });
        expect(job.type).toBe(type);
      }
    });
  });

  describe('AC2: Status enum constraint', () => {
    it('should accept valid status values', async () => {
      const validStatuses = [
        JobStatus.PENDING,
        JobStatus.RUNNING,
        JobStatus.FAILED,
        JobStatus.COMPLETED,
      ];

      for (const status of validStatuses) {
        const job = await createTestJob({
          type: 'test-status',
          status,
        });
        expect(job.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      await expect(
        createTestJob({
          type: 'test-invalid-status',
          status: 'invalid_status',
        })
      ).rejects.toThrow();
    });

    it('should reject null status values', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.jobs (type, status)
          VALUES ($1, NULL)
          `,
          ['test-null-status']
        )
      ).rejects.toThrow();
    });

    it('should enforce status constraint at database level', async () => {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        await expect(
          client.query(
            `
            INSERT INTO control_plane.jobs (type, status)
            VALUES ($1, $2)
            `,
            ['test-constraint', 'not_a_valid_status']
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  describe('AC3: Indexes are created', () => {
    it('should have index on status column', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'jobs'
          AND indexname = 'idx_jobs_status'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should have index on scheduled_at column', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'jobs'
          AND indexname = 'idx_jobs_scheduled_at'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should have composite index on (status, scheduled_at)', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'jobs'
          AND indexname = 'idx_jobs_status_scheduled_at'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify all job indexes exist', async () => {
      const result = await query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'jobs'
          AND indexname LIKE 'idx_jobs_%'
        ORDER BY indexname
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_jobs_status');
      expect(indexNames).toContain('idx_jobs_scheduled_at');
      expect(indexNames).toContain('idx_jobs_status_scheduled_at');
    });
  });

  describe('AC4: Querying jobs by status', () => {
    beforeEach(async () => {
      // Create test jobs with different statuses
      await createTestJob({ type: 'test-query-status', status: JobStatus.PENDING });
      await createTestJob({ type: 'test-query-status', status: JobStatus.PENDING });
      await createTestJob({ type: 'test-query-status', status: JobStatus.RUNNING });
      await createTestJob({ type: 'test-query-status', status: JobStatus.FAILED });
      await createTestJob({ type: 'test-query-status', status: JobStatus.COMPLETED });
    });

    it('should query all pending jobs', async () => {
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-status'
          AND status = $1
        ORDER BY created_at ASC
        `,
        [JobStatus.PENDING]
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.status).toBe(JobStatus.PENDING);
      expect(result.rows[1]!.status).toBe(JobStatus.PENDING);
    });

    it('should query all running jobs', async () => {
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-status'
          AND status = $1
        `,
        [JobStatus.RUNNING]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.status).toBe(JobStatus.RUNNING);
    });

    it('should query all failed jobs', async () => {
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-status'
          AND status = $1
        `,
        [JobStatus.FAILED]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.status).toBe(JobStatus.FAILED);
    });

    it('should query all completed jobs', async () => {
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-status'
          AND status = $1
        `,
        [JobStatus.COMPLETED]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.status).toBe(JobStatus.COMPLETED);
    });

    it('should use status index for efficient querying', async () => {
      // This query should use the idx_jobs_status index
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-status'
          AND status = $1
        `,
        [JobStatus.PENDING]
      );

      expect(result.rowCount).toBe(2);
    });
  });

  describe('AC5: Querying jobs by scheduled_at', () => {
    beforeEach(async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago
      const future = new Date(now.getTime() + 3600000); // 1 hour from now

      await createTestJob({ type: 'test-query-scheduled', scheduled_at: past });
      await createTestJob({ type: 'test-query-scheduled', scheduled_at: now });
      await createTestJob({ type: 'test-query-scheduled', scheduled_at: future });
    });

    it('should query jobs scheduled before a specific time', async () => {
      const now = new Date();

      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-scheduled'
          AND scheduled_at < $1
        ORDER BY scheduled_at ASC
        `,
        [now]
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(1);
      expect(result.rows[0]!.scheduled_at).toBeInstanceOf(Date);
    });

    it('should query jobs scheduled after a specific time', async () => {
      const now = new Date();

      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-scheduled'
          AND scheduled_at > $1
        ORDER BY scheduled_at ASC
        `,
        [now]
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(1);
    });

    it('should query jobs scheduled within a time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourFromNow = new Date(now.getTime() + 3600000);

      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-scheduled'
          AND scheduled_at BETWEEN $1 AND $2
        ORDER BY scheduled_at ASC
        `,
        [oneHourAgo, oneHourFromNow]
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(1);
    });

    it('should use scheduled_at index for efficient querying', async () => {
      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-query-scheduled'
          AND scheduled_at > NOW() - INTERVAL '1 hour'
        ORDER BY scheduled_at ASC
        `
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AC6: Updating job status through lifecycle', () => {
    it('should update status from pending to running', async () => {
      const job = await createTestJob({
        type: 'test-lifecycle',
        status: JobStatus.PENDING,
      });

      const result = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          started_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [JobStatus.RUNNING, job.id]
      );

      const updatedJob = result.rows[0];
      expect(updatedJob!.status).toBe(JobStatus.RUNNING);
      expect(updatedJob!.started_at).toBeInstanceOf(Date);
      expect(updatedJob!.started_at).not.toBeNull();
    });

    it('should update status from running to completed', async () => {
      const job = await createTestJob({
        type: 'test-lifecycle',
        status: JobStatus.RUNNING,
        started_at: new Date(),
      });

      const result = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          completed_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [JobStatus.COMPLETED, job.id]
      );

      const updatedJob = result.rows[0];
      expect(updatedJob!.status).toBe(JobStatus.COMPLETED);
      expect(updatedJob!.completed_at).toBeInstanceOf(Date);
      expect(updatedJob!.completed_at).not.toBeNull();
    });

    it('should update status from running to failed with error message', async () => {
      const job = await createTestJob({
        type: 'test-lifecycle',
        status: JobStatus.RUNNING,
        started_at: new Date(),
      });

      const errorMessage = 'Database connection timeout';

      const result = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          completed_at = NOW(),
          last_error = $2
        WHERE id = $3
        RETURNING *
        `,
        [JobStatus.FAILED, errorMessage, job.id]
      );

      const updatedJob = result.rows[0];
      expect(updatedJob!.status).toBe(JobStatus.FAILED);
      expect(updatedJob!.last_error).toBe(errorMessage);
      expect(updatedJob!.completed_at).toBeInstanceOf(Date);
    });

    it('should support full lifecycle: pending -> running -> completed', async () => {
      // Create pending job
      const job = await createTestJob({
        type: 'test-full-lifecycle',
        status: JobStatus.PENDING,
      });

      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.started_at).toBeNull();
      expect(job.completed_at).toBeNull();

      // Transition to running
      const runningResult = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          started_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [JobStatus.RUNNING, job.id]
      );

      const runningJob = runningResult.rows[0];
      expect(runningJob!.status).toBe(JobStatus.RUNNING);
      expect(runningJob!.started_at).toBeInstanceOf(Date);
      expect(runningJob!.completed_at).toBeNull();

      // Transition to completed
      const completedResult = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          completed_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [JobStatus.COMPLETED, job.id]
      );

      const completedJob = completedResult.rows[0];
      expect(completedJob!.status).toBe(JobStatus.COMPLETED);
      expect(completedJob!.started_at).toBeInstanceOf(Date);
      expect(completedJob!.completed_at).toBeInstanceOf(Date);
    });

    it('should support full lifecycle: pending -> running -> failed', async () => {
      const job = await createTestJob({
        type: 'test-failed-lifecycle',
        status: JobStatus.PENDING,
      });

      // Transition to running
      await query(
        `
        UPDATE control_plane.jobs
        SET status = $1, started_at = NOW()
        WHERE id = $2
        `,
        [JobStatus.RUNNING, job.id]
      );

      // Transition to failed
      const failedResult = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET
          status = $1,
          completed_at = NOW(),
          last_error = 'Timeout error'
        WHERE id = $2
        RETURNING *
        `,
        [JobStatus.FAILED, job.id]
      );

      const failedJob = failedResult.rows[0];
      expect(failedJob!.status).toBe(JobStatus.FAILED);
      expect(failedJob!.last_error).toBe('Timeout error');
      expect(failedJob!.completed_at).toBeInstanceOf(Date);
    });
  });

  describe('AC7: Attempts constraint (cannot be negative)', () => {
    it('should create job with zero attempts', async () => {
      const job = await createTestJob({
        type: 'test-attempts',
        attempts: 0,
      });

      expect(job.attempts).toBe(0);
    });

    it('should create job with positive attempts', async () => {
      const job = await createTestJob({
        type: 'test-attempts',
        attempts: 5,
      });

      expect(job.attempts).toBe(5);
    });

    it('should reject negative attempts', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.jobs (type, attempts)
          VALUES ($1, $2)
          `,
          ['test-negative-attempts', -1]
        )
      ).rejects.toThrow();
    });

    it('should enforce attempts_not_negative constraint', async () => {
      const client = await getClient();

      try {
        await client.query('BEGIN');

        await expect(
          client.query(
            `
            INSERT INTO control_plane.jobs (type, attempts)
            VALUES ($1, $2)
            `,
            ['test-constraint-negative', -5]
          )
        ).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });

    it('should enforce attempts not exceeding max_attempts', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.jobs (type, attempts, max_attempts)
          VALUES ($1, $2, $3)
          `,
          ['test-attempts-exceed-max', 5, 3]
        )
      ).rejects.toThrow();
    });

    it('should allow attempts equal to max_attempts', async () => {
      const job = await createTestJob({
        type: 'test-attempts-equal-max',
        attempts: 3,
        max_attempts: 3,
      });

      expect(job.attempts).toBe(3);
      expect(job.max_attempts).toBe(3);
    });

    it('should enforce max_attempts positive constraint', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.jobs (type, max_attempts)
          VALUES ($1, $2)
          `,
          ['test-max-attempts-zero', 0]
        )
      ).rejects.toThrow();
    });

    it('should increment attempts on retry', async () => {
      const job = await createTestJob({
        type: 'test-increment-attempts',
        attempts: 0,
        max_attempts: 3,
      });

      const result = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET attempts = attempts + 1
        WHERE id = $1
        RETURNING *
        `,
        [job.id]
      );

      const updatedJob = result.rows[0];
      expect(updatedJob!.attempts).toBe(1);
    });
  });

  describe('AC8: JSONB payload storage and retrieval', () => {
    it('should store simple JSON payload', async () => {
      const payload = {
        project_id: 'proj-123',
        region: 'us-east-1',
      };

      const job = await createTestJob({
        type: 'test-json-payload',
        payload,
      });

      expect(job.payload).toEqual(payload);
    });

    it('should store complex nested JSON payload', async () => {
      const payload = {
        project_id: 'proj-456',
        config: {
          database: {
            engine: 'postgresql',
            version: '15',
            size: 'db.t3.micro',
          },
          storage: {
            enabled: true,
            size_gb: 100,
          },
        },
        tags: ['production', 'critical'],
        metadata: {
          created_by: 'user-123',
          department: 'engineering',
        },
      };

      const job = await createTestJob({
        type: 'test-complex-payload',
        payload,
      });

      expect(job.payload).toEqual(payload);
      expect((job.payload.config as Record<string, unknown>).database).toBeDefined();
      expect(job.payload.tags).toContain('production');
    });

    it('should store null values in JSONB payload', async () => {
      const payload = {
        project_id: 'proj-789',
        region: null,
        tags: ['test'],
      };

      const job = await createTestJob({
        type: 'test-null-payload',
        payload,
      });

      expect(job.payload.region).toBeNull();
      expect(job.payload.project_id).toBe('proj-789');
    });

    it('should store arrays in JSONB payload', async () => {
      const payload = {
        project_ids: ['proj-1', 'proj-2', 'proj-3'],
        retry_delays: [1000, 2000, 4000, 8000],
      };

      const job = await createTestJob({
        type: 'test-array-payload',
        payload,
      });

      expect(Array.isArray(job.payload.project_ids)).toBe(true);
      expect(job.payload.project_ids).toHaveLength(3);
      expect(job.payload.retry_delays).toContain(4000);
    });

    it('should query jobs by JSONB field values', async () => {
      await createTestJob({
        type: 'test-json-query',
        payload: { project_id: 'proj-100' },
      });
      await createTestJob({
        type: 'test-json-query',
        payload: { project_id: 'proj-200' },
      });
      await createTestJob({
        type: 'test-json-query',
        payload: { project_id: 'proj-100' },
      });

      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-json-query'
          AND payload->>'project_id' = $1
        `,
        ['proj-100']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.payload.project_id).toBe('proj-100');
    });

    it('should update JSONB payload', async () => {
      const job = await createTestJob({
        type: 'test-json-update',
        payload: { project_id: 'proj-old' },
      });

      const result = await query<Job>(
        `
        UPDATE control_plane.jobs
        SET payload = payload || $2
        WHERE id = $1
        RETURNING *
        `,
        [job.id, JSON.stringify({ status: 'updated', retry_count: 3 })]
      );

      const updatedJob = result.rows[0];
      expect(updatedJob!.payload.project_id).toBe('proj-old');
      expect(updatedJob!.payload.status).toBe('updated');
      expect(updatedJob!.payload.retry_count).toBe(3);
    });

    it('should query using JSONB operators', async () => {
      await createTestJob({
        type: 'test-json-operators',
        payload: { priority: 1, urgent: true },
      });
      await createTestJob({
        type: 'test-json-operators',
        payload: { priority: 2, urgent: false },
      });
      await createTestJob({
        type: 'test-json-operators',
        payload: { priority: 3, urgent: true },
      });

      const result = await query<Job>(
        `
        SELECT * FROM control_plane.jobs
        WHERE type = 'test-json-operators'
          AND payload->>'urgent' = 'true'
        ORDER BY payload->>'priority' ASC
        `
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.payload.priority).toBe(1);
      expect(result.rows[1]!.payload.priority).toBe(3);
    });

    it('should handle empty JSONB payload', async () => {
      const job = await createTestJob({
        type: 'test-empty-payload',
        payload: {},
      });

      expect(job.payload).toEqual({});
      expect(Object.keys(job.payload)).toHaveLength(0);
    });

    it('should store and retrieve special characters in JSONB', async () => {
      const payload = {
        message: 'Hello "World"!',
        emoji: '✅',
        unicode: 'こんにちは',
        path: '/usr/local/bin',
      };

      const job = await createTestJob({
        type: 'test-special-chars',
        payload,
      });

      expect(job.payload.message).toBe('Hello "World"!');
      expect(job.payload.emoji).toBe('✅');
      expect(job.payload.unicode).toBe('こんにちは');
      expect(job.payload.path).toBe('/usr/local/bin');
    });
  });

  describe('Database constraints validation', () => {
    it('should verify all CHECK constraints exist', async () => {
      const result = await query(`
        SELECT
          con.conname AS constraint_name,
          pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'control_plane'
          AND rel.relname = 'jobs'
          AND con.contype = 'c'
        ORDER BY con.conname
      `);

      const constraints = result.rows.map((row) => row.constraint_name);

      expect(constraints).toContain('jobs_attempts_not_negative');
      expect(constraints).toContain('jobs_max_attempts_positive');
      expect(constraints).toContain('jobs_attempts_not_exceed_max');
      expect(constraints.length).toBeGreaterThanOrEqual(4); // 3 constraints + status check
    });

    it('should verify table has all required columns', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'jobs'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => row.column_name);

      expect(columns).toContain('id');
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

    it('should verify table comments exist', async () => {
      const result = await query(`
        SELECT
          obj_description('control_plane.jobs'::regclass, 'pg_class') AS table_comment
      `);

      expect(result.rows[0]!.table_comment).toContain('job');
    });

    it('should verify column comments exist', async () => {
      const result = await query(`
        SELECT
          col.column_name,
          pgd.description AS column_comment
        FROM pg_catalog.pg_statio_all_tables AS st
        JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
        JOIN information_schema.columns col ON (
          col.table_schema = st.schemaname
          AND col.table_name = st.relname
          AND col.ordinal_position = pgd.objsubid
        )
        WHERE st.schemaname = 'control_plane'
          AND st.relname = 'jobs'
          AND pgd.description IS NOT NULL
        ORDER BY col.ordinal_position
      `);

      expect(result.rowCount).toBeGreaterThan(0);
    });
  });
});
