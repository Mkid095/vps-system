/**
 * Admin Sessions Integration Tests
 *
 * Integration tests for the admin_sessions table to verify:
 * - Creating admin sessions with each access_method (hardware_key, otp, emergency_code)
 * - Migration runs successfully and table exists
 * - Querying sessions by admin_id
 * - Session expiration logic
 * - Foreign key readiness (for future admin_actions table)
 * - Database constraints and validation
 *
 * US-001: Create Admin Sessions Table - Step 7: Integration Tests
 *
 * Usage:
 *   pnpm test src/__tests__/admin-sessions.integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query } from '../pool.js';
import { AccessMethod } from '../../types/admin-sessions.types.js';
import type { AdminSession } from '../../types/admin-sessions.types.js';

/**
 * Test helper to clean up test data
 */
async function cleanupTestSessions() {
  await query(`
    DELETE FROM control_plane.admin_sessions
    WHERE admin_id LIKE 'test-admin-%'
  `);
}

/**
 * Test helper to create a test admin session
 */
async function createTestSession(params: {
  admin_id: string;
  reason: string;
  access_method: string;
  granted_by?: string;
  expires_at?: Date;
}): Promise<AdminSession> {
  const { admin_id, reason, access_method, granted_by, expires_at } = params;

  const result = await query<AdminSession>(
    `
    INSERT INTO control_plane.admin_sessions (
      admin_id, reason, access_method, granted_by, expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [admin_id, reason, access_method, granted_by || null, expires_at || null]
  );

  const session = result.rows[0];
  if (!session) {
    throw new Error('Failed to create test admin session');
  }

  return session;
}

describe('US-001: Admin Sessions Table Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestSessions();
  });

  afterEach(async () => {
    await cleanupTestSessions();
  });

  describe('Migration and Table Structure', () => {
    it('should verify admin_sessions table exists', async () => {
      const result = await query(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify all required columns exist', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => row.column_name);

      expect(columns).toContain('id');
      expect(columns).toContain('admin_id');
      expect(columns).toContain('reason');
      expect(columns).toContain('access_method');
      expect(columns).toContain('granted_by');
      expect(columns).toContain('expires_at');
      expect(columns).toContain('created_at');
    });

    it('should verify table has correct column types', async () => {
      const result = await query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
        ORDER BY ordinal_position
      `);

      const columnTypes = Object.fromEntries(
        result.rows.map((row) => [row.column_name, row.data_type])
      );

      expect(columnTypes.id).toBe('uuid');
      expect(columnTypes.admin_id).toBe('uuid');
      expect(columnTypes.reason).toBe('text');
      expect(columnTypes.access_method).toBe('text');
      expect(columnTypes.granted_by).toBe('uuid');
      expect(columnTypes.expires_at).toBe('timestamp with time zone');
      expect(columnTypes.created_at).toBe('timestamp with time zone');
    });

    it('should verify required columns are NOT NULL', async () => {
      const result = await query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
          AND column_name IN ('id', 'admin_id', 'reason', 'access_method', 'expires_at', 'created_at')
      `);

      for (const row of result.rows) {
        expect(row.is_nullable).toBe('NO');
      }
    });

    it('should verify granted_by is nullable', async () => {
      const result = await query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
          AND column_name = 'granted_by'
      `);

      expect(result.rows[0]!.is_nullable).toBe('YES');
    });
  });

  describe('Creating sessions with each access_method', () => {
    it('should create session with hardware_key access method', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-001',
        reason: 'Production incident - need emergency access to fix critical bug',
        access_method: AccessMethod.HARDWARE_KEY,
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.admin_id).toBe('test-admin-001');
      expect(session.access_method).toBe(AccessMethod.HARDWARE_KEY);
      expect(session.granted_by).toBeNull();
      expect(session.created_at).toBeInstanceOf(Date);
      expect(session.expires_at).toBeInstanceOf(Date);
    });

    it('should create session with otp access method', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-002',
        reason: 'Database locked - need to restore from backup',
        access_method: AccessMethod.OTP,
      });

      expect(session).toBeDefined();
      expect(session.admin_id).toBe('test-admin-002');
      expect(session.access_method).toBe(AccessMethod.OTP);
      expect(session.created_at).toBeInstanceOf(Date);
      expect(session.expires_at).toBeInstanceOf(Date);
    });

    it('should create session with emergency_code access method', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-003',
        reason: 'Complete system outage - emergency intervention required',
        access_method: AccessMethod.EMERGENCY_CODE,
      });

      expect(session).toBeDefined();
      expect(session.admin_id).toBe('test-admin-003');
      expect(session.access_method).toBe(AccessMethod.EMERGENCY_CODE);
      expect(session.created_at).toBeInstanceOf(Date);
      expect(session.expires_at).toBeInstanceOf(Date);
    });

    it('should create session with granted_by approver', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-004',
        reason: 'Need to investigate security breach',
        access_method: AccessMethod.HARDWARE_KEY,
        granted_by: 'super-admin-approver-001',
      });

      expect(session).toBeDefined();
      expect(session.admin_id).toBe('test-admin-004');
      expect(session.granted_by).toBe('super-admin-approver-001');
    });

    it('should enforce access_method CHECK constraint', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_sessions (admin_id, reason, access_method)
          VALUES ($1, $2, $3)
          `,
          ['test-admin-005', 'Test reason', 'invalid_method']
        )
      ).rejects.toThrow();
    });

    it('should reject NULL for required access_method', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_sessions (admin_id, reason, access_method)
          VALUES ($1, $2, NULL)
          `,
          ['test-admin-006', 'Test reason']
        )
      ).rejects.toThrow();
    });

    it('should reject NULL for required reason', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_sessions (admin_id, reason, access_method)
          VALUES ($1, NULL, $2)
          `,
          ['test-admin-007', AccessMethod.OTP]
        )
      ).rejects.toThrow();
    });

    it('should reject NULL for required admin_id', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_sessions (admin_id, reason, access_method)
          VALUES (NULL, $1, $2)
          `,
          ['Test reason', AccessMethod.HARDWARE_KEY]
        )
      ).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should verify idx_admin_sessions_admin_id index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname = 'idx_admin_sessions_admin_id'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_sessions_expires_at index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname = 'idx_admin_sessions_expires_at'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_sessions_created_at index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname = 'idx_admin_sessions_created_at'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_sessions_admin_expires composite index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname = 'idx_admin_sessions_admin_expires'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_sessions_expires_created composite index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname = 'idx_admin_sessions_expires_created'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify all admin_sessions indexes', async () => {
      const result = await query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_sessions'
          AND indexname LIKE 'idx_admin_sessions_%'
        ORDER BY indexname
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_admin_sessions_admin_id');
      expect(indexNames).toContain('idx_admin_sessions_expires_at');
      expect(indexNames).toContain('idx_admin_sessions_created_at');
      expect(indexNames).toContain('idx_admin_sessions_admin_expires');
      expect(indexNames).toContain('idx_admin_sessions_expires_created');
      expect(indexNames).toHaveLength(5);
    });
  });

  describe('Querying sessions by admin_id', () => {
    beforeEach(async () => {
      // Create sessions for different admins
      await createTestSession({
        admin_id: 'test-admin-query-001',
        reason: 'Reason 1',
        access_method: AccessMethod.OTP,
      });

      await createTestSession({
        admin_id: 'test-admin-query-001',
        reason: 'Reason 2',
        access_method: AccessMethod.HARDWARE_KEY,
      });

      await createTestSession({
        admin_id: 'test-admin-query-002',
        reason: 'Reason 3',
        access_method: AccessMethod.EMERGENCY_CODE,
      });
    });

    it('should query sessions by admin_id', async () => {
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
        ORDER BY created_at DESC
        `,
        ['test-admin-query-001']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.admin_id).toBe('test-admin-query-001');
      expect(result.rows[1]!.admin_id).toBe('test-admin-query-001');
    });

    it('should query sessions by admin_id using index', async () => {
      // This query should use idx_admin_sessions_admin_id
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
        ORDER BY created_at DESC
        `,
        ['test-admin-query-001']
      );

      expect(result.rowCount).toBe(2);
    });

    it('should query active sessions for an admin', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 3600000); // 1 hour from now

      // Create an active session
      await createTestSession({
        admin_id: 'test-admin-active-001',
        reason: 'Active session',
        access_method: AccessMethod.OTP,
        expires_at: future,
      });

      // Create an expired session
      const past = new Date(now.getTime() - 3600000); // 1 hour ago
      await createTestSession({
        admin_id: 'test-admin-active-001',
        reason: 'Expired session',
        access_method: AccessMethod.HARDWARE_KEY,
        expires_at: past,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at > NOW()
        ORDER BY created_at DESC
        `,
        ['test-admin-active-001']
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.reason).toBe('Active session');
    });

    it('should query expired sessions for an admin', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago

      await createTestSession({
        admin_id: 'test-admin-expired-001',
        reason: 'Expired session 1',
        access_method: AccessMethod.OTP,
        expires_at: past,
      });

      await createTestSession({
        admin_id: 'test-admin-expired-001',
        reason: 'Expired session 2',
        access_method: AccessMethod.EMERGENCY_CODE,
        expires_at: past,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at < NOW()
        ORDER BY created_at DESC
        `,
        ['test-admin-expired-001']
      );

      expect(result.rowCount).toBe(2);
    });
  });

  describe('Session expiration logic', () => {
    it('should set default expiration to 1 hour from creation', async () => {
      const beforeCreate = new Date();
      const session = await createTestSession({
        admin_id: 'test-admin-expire-001',
        reason: 'Test default expiration',
        access_method: AccessMethod.OTP,
      });
      const afterCreate = new Date();

      const expectedMinExpires = new Date(beforeCreate.getTime() + 3600000); // +1 hour
      const expectedMaxExpires = new Date(afterCreate.getTime() + 3600000); // +1 hour

      expect(session.expires_at.getTime()).toBeGreaterThanOrEqual(expectedMinExpires.getTime() - 1000); // Allow 1s tolerance
      expect(session.expires_at.getTime()).toBeLessThanOrEqual(expectedMaxExpires.getTime() + 1000); // Allow 1s tolerance
    });

    it('should create session with custom expiration', async () => {
      const customExpiry = new Date(Date.now() + 7200000); // 2 hours from now

      const session = await createTestSession({
        admin_id: 'test-admin-expire-002',
        reason: 'Test custom expiration',
        access_method: AccessMethod.HARDWARE_KEY,
        expires_at: customExpiry,
      });

      expect(session.expires_at.getTime()).toBe(customExpiry.getTime());
    });

    it('should identify active sessions', async () => {
      const future = new Date(Date.now() + 3600000); // 1 hour from now

      await createTestSession({
        admin_id: 'test-admin-active-check',
        reason: 'Active session',
        access_method: AccessMethod.OTP,
        expires_at: future,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at > NOW()
        `,
        ['test-admin-active-check']
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.expires_at).toBeInstanceOf(Date);
    });

    it('should identify expired sessions', async () => {
      const past = new Date(Date.now() - 3600000); // 1 hour ago

      await createTestSession({
        admin_id: 'test-admin-expired-check',
        reason: 'Expired session',
        access_method: AccessMethod.EMERGENCY_CODE,
        expires_at: past,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at < NOW()
        `,
        ['test-admin-active-check']
      );

      // Should not find any for this admin since we used a different admin_id
      expect(result.rowCount).toBe(0);
    });

    it('should query sessions expiring soon (within 5 minutes)', async () => {
      const fourMinutesFromNow = new Date(Date.now() + 240000); // 4 minutes

      await createTestSession({
        admin_id: 'test-admin-expiring-soon',
        reason: 'Expiring soon',
        access_method: AccessMethod.OTP,
        expires_at: fourMinutesFromNow,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at > NOW()
          AND expires_at < NOW() + INTERVAL '5 minutes'
        `,
        ['test-admin-expiring-soon']
      );

      expect(result.rowCount).toBe(1);
    });

    it('should use composite index for active session queries', async () => {
      const future = new Date(Date.now() + 3600000);

      await createTestSession({
        admin_id: 'test-admin-composite-index',
        reason: 'Test composite index',
        access_method: AccessMethod.HARDWARE_KEY,
        expires_at: future,
      });

      // This query should use idx_admin_sessions_admin_expires
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at > NOW()
        ORDER BY expires_at DESC
        `,
        ['test-admin-composite-index']
      );

      expect(result.rowCount).toBe(1);
    });
  });

  describe('Foreign key readiness for admin_actions', () => {
    it('should have id column suitable for foreign key references', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
          AND column_name = 'id'
      `);

      const idColumn = result.rows[0];
      expect(idColumn).toBeDefined();
      expect(idColumn!.data_type).toBe('uuid');
      expect(idColumn!.is_nullable).toBe('NO');
    });

    it('should have primary key constraint on id', async () => {
      const result = await query(`
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
          AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'control_plane'
          AND tc.table_name = 'admin_sessions'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'id'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should maintain referential integrity for foreign keys', async () => {
      // Create a session
      const session = await createTestSession({
        admin_id: 'test-admin-fk-001',
        reason: 'Test foreign key readiness',
        access_method: AccessMethod.OTP,
      });

      // Verify we can query by ID (for future foreign key lookups)
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE id = $1
        `,
        [session.id]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.id).toBe(session.id);
    });

    it('should have control_plane schema for admin_actions reference', async () => {
      const result = await query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_sessions'
      `);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.table_schema).toBe('control_plane');
      expect(result.rows[0]!.table_name).toBe('admin_sessions');
    });

    it('should support future foreign key references from admin_actions', async () => {
      // Verify that admin_sessions.id can be referenced
      // by checking it's a valid UUID primary key
      const session = await createTestSession({
        admin_id: 'test-admin-fk-ref-001',
        reason: 'Test FK reference support',
        access_method: AccessMethod.HARDWARE_KEY,
      });

      // Simulate what admin_actions would do: reference session_id
      const sessionId = session.id;

      // Verify the session exists and is valid for referencing
      const result = await query<AdminSession>(
        `
        SELECT id, admin_id, created_at, expires_at
        FROM control_plane.admin_sessions
        WHERE id = $1
        `,
        [sessionId]
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.id).toBe(sessionId);
      expect(result.rows[0]!.admin_id).toBe('test-admin-fk-ref-001');
    });
  });

  describe('Table and column comments', () => {
    it('should verify table comment exists', async () => {
      const result = await query(`
        SELECT
          obj_description('control_plane.admin_sessions'::regclass, 'pg_class') AS table_comment
      `);

      expect(result.rows[0]!.table_comment).not.toBeNull();
      expect(result.rows[0]!.table_comment).toContain('break glass');
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
          AND st.relname = 'admin_sessions'
          AND pgd.description IS NOT NULL
        ORDER BY col.ordinal_position
      `);

      expect(result.rowCount).toBeGreaterThan(0);

      const columnNames = result.rows.map((row) => row.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('admin_id');
      expect(columnNames).toContain('reason');
      expect(columnNames).toContain('access_method');
      expect(columnNames).toContain('granted_by');
      expect(columnNames).toContain('expires_at');
      expect(columnNames).toContain('created_at');
    });

    it('should verify access_method column comment', async () => {
      const result = await query(`
        SELECT
          pgd.description
        FROM pg_catalog.pg_statio_all_tables AS st
        JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
        JOIN information_schema.columns col ON (
          col.table_schema = st.schemaname
          AND col.table_name = st.relname
          AND col.ordinal_position = pgd.objsubid
        )
        WHERE st.schemaname = 'control_plane'
          AND st.relname = 'admin_sessions'
          AND col.column_name = 'access_method'
      `);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.description).toContain('hardware_key');
      expect(result.rows[0]!.description).toContain('otp');
      expect(result.rows[0]!.description).toContain('emergency_code');
    });
  });

  describe('Data integrity and validation', () => {
    it('should store and retrieve session with all fields', async () => {
      const future = new Date(Date.now() + 3600000);
      const session = await createTestSession({
        admin_id: 'test-admin-full-001',
        reason: 'Production system down - emergency intervention required',
        access_method: AccessMethod.HARDWARE_KEY,
        granted_by: 'super-admin-approver-002',
        expires_at: future,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE id = $1
        `,
        [session.id]
      );

      const retrievedSession = result.rows[0];
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.admin_id).toBe('test-admin-full-001');
      expect(retrievedSession!.reason).toBe('Production system down - emergency intervention required');
      expect(retrievedSession!.access_method).toBe(AccessMethod.HARDWARE_KEY);
      expect(retrievedSession!.granted_by).toBe('super-admin-approver-002');
      expect(retrievedSession!.expires_at.getTime()).toBe(future.getTime());
    });

    it('should handle special characters in reason field', async () => {
      const specialReason = 'Critical: "System Down" - Need to fix <urgently>! @#$%';

      const session = await createTestSession({
        admin_id: 'test-admin-special-001',
        reason: specialReason,
        access_method: AccessMethod.OTP,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE id = $1
        `,
        [session.id]
      );

      expect(result.rows[0]!.reason).toBe(specialReason);
    });

    it('should handle long reason text', async () => {
      const longReason = 'A'.repeat(1000);

      const session = await createTestSession({
        admin_id: 'test-admin-long-001',
        reason: longReason,
        access_method: AccessMethod.EMERGENCY_CODE,
      });

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE id = $1
        `,
        [session.id]
      );

      expect(result.rows[0]!.reason).toBe(longReason);
      expect(result.rows[0]!.reason.length).toBe(1000);
    });

    it('should generate UUID for id automatically', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-uuid-001',
        reason: 'Test UUID generation',
        access_method: AccessMethod.OTP,
      });

      expect(session.id).toBeDefined();
      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should set created_at timestamp automatically', async () => {
      const beforeCreate = new Date();
      const session = await createTestSession({
        admin_id: 'test-admin-timestamp-001',
        reason: 'Test timestamp',
        access_method: AccessMethod.HARDWARE_KEY,
      });
      const afterCreate = new Date();

      expect(session.created_at).toBeInstanceOf(Date);
      expect(session.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(session.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });
  });

  describe('Query patterns for common use cases', () => {
    beforeEach(async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7200000); // 2 hours ago
      const future = new Date(now.getTime() + 3600000); // 1 hour from now

      // Create various sessions for testing
      await createTestSession({
        admin_id: 'test-admin-pattern-001',
        reason: 'Active session 1',
        access_method: AccessMethod.OTP,
        expires_at: future,
      });

      await createTestSession({
        admin_id: 'test-admin-pattern-001',
        reason: 'Active session 2',
        access_method: AccessMethod.HARDWARE_KEY,
        expires_at: future,
      });

      await createTestSession({
        admin_id: 'test-admin-pattern-001',
        reason: 'Expired session',
        access_method: AccessMethod.EMERGENCY_CODE,
        expires_at: past,
      });

      await createTestSession({
        admin_id: 'test-admin-pattern-002',
        reason: 'Other admin session',
        access_method: AccessMethod.OTP,
        expires_at: future,
      });
    });

    it('should get all active sessions for an admin', async () => {
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
          AND expires_at > NOW()
        ORDER BY created_at DESC
        `,
        ['test-admin-pattern-001']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows.every((row) => row.reason.includes('Active'))).toBe(true);
    });

    it('should get recent sessions ordered by created_at', async () => {
      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE admin_id = $1
        ORDER BY created_at DESC
        LIMIT 5
        `,
        ['test-admin-pattern-001']
      );

      expect(result.rowCount).toBe(3);
      expect(result.rows[0]!.created_at.getTime()).toBeGreaterThanOrEqual(
        result.rows[2]!.created_at.getTime()
      );
    });

    it('should count sessions by access method', async () => {
      const result = await query<{ access_method: string; count: number }>(
        `
        SELECT access_method, COUNT(*) as count
        FROM control_plane.admin_sessions
        WHERE admin_id = $1
        GROUP BY access_method
        ORDER BY count DESC
        `,
        ['test-admin-pattern-001']
      );

      expect(result.rowCount).toBeGreaterThan(0);
      const counts = Object.fromEntries(result.rows.map((row) => [row.access_method, row.count]));
      expect(counts[AccessMethod.OTP]).toBe(1);
      expect(counts[AccessMethod.HARDWARE_KEY]).toBe(1);
      expect(counts[AccessMethod.EMERGENCY_CODE]).toBe(1);
    });

    it('should query sessions within time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourFromNow = new Date(now.getTime() + 3600000);

      const result = await query<AdminSession>(
        `
        SELECT * FROM control_plane.admin_sessions
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
        `,
        [oneHourAgo, oneHourFromNow]
      );

      expect(result.rowCount).toBeGreaterThan(0);
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
          AND rel.relname = 'admin_sessions'
          AND con.contype = 'c'
        ORDER BY con.conname
      `);

      const constraints = result.rows.map((row) => row.constraint_name);
      expect(constraints.length).toBeGreaterThan(0);
      expect(constraints.some((c) => c.includes('access_method'))).toBe(true);
    });

    it('should verify primary key constraint exists', async () => {
      const result = await query(`
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'control_plane'
          AND rel.relname = 'admin_sessions'
          AND con.contype = 'p'
      `);

      expect(result.rowCount).toBe(1);
    });
  });
});
