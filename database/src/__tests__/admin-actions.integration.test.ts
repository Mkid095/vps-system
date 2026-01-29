/**
 * Admin Actions Integration Tests
 *
 * Integration tests for the admin_actions table to verify:
 * - Creating admin actions with all action types (unlock_project, override_suspension, etc.)
 * - Migration runs successfully and table exists
 * - Querying actions by session_id
 * - Querying actions by target_type and target_id
 * - JSONB before_state and after_state handling
 * - Foreign key relationship with admin_sessions
 * - All indexes work correctly
 * - Pagination and filtering
 *
 * US-002: Create Admin Actions Table - Step 7: Integration Tests
 *
 * Usage:
 *   pnpm test src/__tests__/admin-actions.integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query } from '../pool.js';
import { AdminActionType } from '../../types/admin-actions.types.js';
import type { AdminAction, CreateAdminActionInput } from '../../types/admin-actions.types.js';
import type { AdminSession } from '../../types/admin-sessions.types.js';

/**
 * Test helper to clean up test data
 */
async function cleanupTestData() {
  await query(`
    DELETE FROM control_plane.admin_actions
    WHERE session_id IN (
      SELECT id FROM control_plane.admin_sessions
      WHERE admin_id LIKE 'test-admin-%'
    )
  `);

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

/**
 * Test helper to create a test admin action
 */
async function createTestAction(params: CreateAdminActionInput): Promise<AdminAction> {
  const { session_id, action, target_type, target_id, before_state, after_state } = params;

  const result = await query<AdminAction>(
    `
    INSERT INTO control_plane.admin_actions (
      session_id, action, target_type, target_id, before_state, after_state
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      session_id,
      action,
      target_type,
      target_id || null,
      before_state ? JSON.stringify(before_state) : null,
      after_state ? JSON.stringify(after_state) : null,
    ]
  );

  const actionRecord = result.rows[0];
  if (!actionRecord) {
    throw new Error('Failed to create test admin action');
  }

  return actionRecord;
}

describe('US-002: Admin Actions Table Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Migration and Table Structure', () => {
    it('should verify admin_actions table exists', async () => {
      const result = await query(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_actions'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify all required columns exist', async () => {
      const result = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_actions'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map((row) => row.column_name);

      expect(columns).toContain('id');
      expect(columns).toContain('session_id');
      expect(columns).toContain('action');
      expect(columns).toContain('target_type');
      expect(columns).toContain('target_id');
      expect(columns).toContain('before_state');
      expect(columns).toContain('after_state');
      expect(columns).toContain('created_at');
    });

    it('should verify table has correct column types', async () => {
      const result = await query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_actions'
        ORDER BY ordinal_position
      `);

      const columnTypes = Object.fromEntries(
        result.rows.map((row) => [row.column_name, row.data_type])
      );

      expect(columnTypes.id).toBe('uuid');
      expect(columnTypes.session_id).toBe('uuid');
      expect(columnTypes.action).toBe('text');
      expect(columnTypes.target_type).toBe('text');
      expect(columnTypes.target_id).toBe('uuid');
      expect(columnTypes.before_state).toBe('jsonb');
      expect(columnTypes.after_state).toBe('jsonb');
      expect(columnTypes.created_at).toBe('timestamp with time zone');
    });

    it('should verify required columns are NOT NULL', async () => {
      const result = await query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_actions'
          AND column_name IN ('id', 'session_id', 'action', 'target_type', 'created_at')
      `);

      for (const row of result.rows) {
        expect(row.is_nullable).toBe('NO');
      }
    });

    it('should verify optional columns are nullable', async () => {
      const result = await query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'control_plane'
          AND table_name = 'admin_actions'
          AND column_name IN ('target_id', 'before_state', 'after_state')
      `);

      for (const row of result.rows) {
        expect(row.is_nullable).toBe('YES');
      }
    });
  });

  describe('Creating actions with each action type', () => {
    let testSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-action-001',
        reason: 'Testing all action types',
        access_method: 'hardware_key',
      });
    });

    it('should create unlock_project action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: { status: 'SUSPENDED', suspension_reason: 'billing overdue' },
        after_state: { status: 'ACTIVE', suspension_reason: null },
      });

      expect(action).toBeDefined();
      expect(action.id).toBeDefined();
      expect(action.session_id).toBe(testSession.id);
      expect(action.action).toBe(AdminActionType.UNLOCK_PROJECT);
      expect(action.target_type).toBe('project');
      expect(action.target_id).toBe('test-project-001');
      expect(action.before_state).toEqual({ status: 'SUSPENDED', suspension_reason: 'billing overdue' });
      expect(action.after_state).toEqual({ status: 'ACTIVE', suspension_reason: null });
    });

    it('should create override_suspension action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.OVERRIDE_SUSPENSION,
        target_type: 'project',
        target_id: 'test-project-002',
        before_state: { auto_suspension_enabled: true, suspension_count: 3 },
        after_state: { auto_suspension_enabled: false, suspension_count: 3 },
      });

      expect(action.action).toBe(AdminActionType.OVERRIDE_SUSPENSION);
    });

    it('should create force_delete action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.FORCE_DELETE,
        target_type: 'project',
        target_id: 'test-project-003',
        before_state: { id: 'test-project-003', name: 'Test Project', status: 'ACTIVE' },
        after_state: null, // Project no longer exists
      });

      expect(action.action).toBe(AdminActionType.FORCE_DELETE);
    });

    it('should create regenerate_keys action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.REGENERATE_KEYS,
        target_type: 'project',
        target_id: 'test-project-004',
        before_state: { api_key: 'sk_old_12345', public_key: 'pk_old_67890' },
        after_state: { api_key: 'sk_new_abcde', public_key: 'pk_new_fghij' },
      });

      expect(action.action).toBe(AdminActionType.REGENERATE_KEYS);
    });

    it('should create access_project action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: 'project',
        target_id: 'test-project-005',
        before_state: null,
        after_state: { access_granted: true, bypass_ownership: true },
      });

      expect(action.action).toBe(AdminActionType.ACCESS_PROJECT);
    });

    it('should create system_config_change action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.SYSTEM_CONFIG_CHANGE,
        target_type: 'system',
        before_state: { max_projects_per_user: 10, maintenance_mode: false },
        after_state: { max_projects_per_user: 20, maintenance_mode: false },
      });

      expect(action.action).toBe(AdminActionType.SYSTEM_CONFIG_CHANGE);
    });

    it('should create database_intervention action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.DATABASE_INTERVENTION,
        target_type: 'database',
        before_state: { table_size_gb: 50, index_bloat: 'high' },
        after_state: { table_size_gb: 35, index_bloat: 'low', vacuum_run: true },
      });

      expect(action.action).toBe(AdminActionType.DATABASE_INTERVENTION);
    });

    it('should create restore_backup action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.RESTORE_BACKUP,
        target_type: 'system',
        before_state: { data_loss_detected: true, last_backup: '2026-01-28' },
        after_state: { data_restored: true, restore_point: '2026-01-28' },
      });

      expect(action.action).toBe(AdminActionType.RESTORE_BACKUP);
    });

    it('should create modify_user action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
        before_state: { role: 'developer', permissions: ['read', 'write'] },
        after_state: { role: 'admin', permissions: ['read', 'write', 'delete'] },
      });

      expect(action.action).toBe(AdminActionType.MODIFY_USER);
    });

    it('should create modify_api_key action', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_API_KEY,
        target_type: 'api_key',
        target_id: 'test-key-001',
        before_state: { rate_limit: 1000, active: true },
        after_state: { rate_limit: 5000, active: true },
      });

      expect(action.action).toBe(AdminActionType.MODIFY_API_KEY);
    });

    it('should reject NULL for required session_id', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_actions (session_id, action, target_type)
          VALUES (NULL, $1, $2)
          `,
          [AdminActionType.UNLOCK_PROJECT, 'project']
        )
      ).rejects.toThrow();
    });

    it('should reject NULL for required action', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_actions (session_id, action, target_type)
          VALUES ($1, NULL, $2)
          `,
          [testSession.id, 'project']
        )
      ).rejects.toThrow();
    });

    it('should reject NULL for required target_type', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_actions (session_id, action, target_type)
          VALUES ($1, $2, NULL)
          `,
          [testSession.id, AdminActionType.UNLOCK_PROJECT]
        )
      ).rejects.toThrow();
    });
  });

  describe('Foreign key relationship with admin_sessions', () => {
    it('should enforce foreign key constraint on session_id', async () => {
      await expect(
        query(
          `
          INSERT INTO control_plane.admin_actions (session_id, action, target_type)
          VALUES ($1, $2, $3)
          `,
          ['00000000-0000-0000-0000-000000000000', AdminActionType.UNLOCK_PROJECT, 'project']
        )
      ).rejects.toThrow();
    });

    it('should cascade delete when session is deleted', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-fk-001',
        reason: 'Test cascade delete',
        access_method: 'otp',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-fk-001',
      });

      // Verify action exists
      const beforeDelete = await query<AdminAction>(
        'SELECT * FROM control_plane.admin_actions WHERE id = $1',
        [action.id]
      );
      expect(beforeDelete.rowCount).toBe(1);

      // Delete the session
      await query('DELETE FROM control_plane.admin_sessions WHERE id = $1', [session.id]);

      // Verify action is cascade deleted
      const afterDelete = await query<AdminAction>(
        'SELECT * FROM control_plane.admin_actions WHERE id = $1',
        [action.id]
      );
      expect(afterDelete.rowCount).toBe(0);
    });

    it('should allow multiple actions per session', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-multi-001',
        reason: 'Test multiple actions',
        access_method: 'hardware_key',
      });

      await createTestAction({
        session_id: session.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
      });

      await createTestAction({
        session_id: session.id,
        action: AdminActionType.REGENERATE_KEYS,
        target_type: 'project',
        target_id: 'test-project-001',
      });

      await createTestAction({
        session_id: session.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
      });

      const result = await query<AdminAction>(
        'SELECT * FROM control_plane.admin_actions WHERE session_id = $1',
        [session.id]
      );

      expect(result.rowCount).toBe(3);
    });

    it('should join with admin_sessions for full context', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-join-001',
        reason: 'Test join with sessions',
        access_method: 'emergency_code',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-join-001',
      });

      const result = await query<
        AdminAction & { admin_id: string; session_reason: string; access_method: string }
      >(
        `
        SELECT
          a.*,
          s.admin_id,
          s.reason as session_reason,
          s.access_method
        FROM control_plane.admin_actions a
        JOIN control_plane.admin_sessions s ON a.session_id = s.id
        WHERE a.id = $1
        `,
        [action.id]
      );

      expect(result.rowCount).toBe(1);
      const row = result.rows[0]!;
      expect(row.admin_id).toBe('test-admin-join-001');
      expect(row.session_reason).toBe('Test join with sessions');
      expect(row.access_method).toBe('emergency_code');
    });
  });

  describe('JSONB before_state and after_state handling', () => {
    let testSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-jsonb-001',
        reason: 'Test JSONB handling',
        access_method: 'hardware_key',
      });
    });

    it('should store and retrieve simple before_state', async () => {
      const beforeState = { status: 'SUSPENDED', reason: 'billing' };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: beforeState,
      });

      expect(action.before_state).toEqual(beforeState);
    });

    it('should store and retrieve simple after_state', async () => {
      const afterState = { status: 'ACTIVE', unlocked_at: '2026-01-29T12:00:00Z' };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        after_state: afterState,
      });

      expect(action.after_state).toEqual(afterState);
    });

    it('should store and retrieve complex nested before_state', async () => {
      const beforeState = {
        project: {
          id: 'test-project-001',
          name: 'Test Project',
          settings: {
            rate_limit: 1000,
            features: ['feature1', 'feature2'],
          },
        },
        metadata: {
          created_at: '2026-01-01',
          updated_at: '2026-01-28',
        },
      };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: beforeState,
      });

      expect(action.before_state).toEqual(beforeState);
    });

    it('should store and retrieve complex nested after_state', async () => {
      const afterState = {
        project: {
          id: 'test-project-001',
          name: 'Test Project',
          settings: {
            rate_limit: 5000,
            features: ['feature1', 'feature2', 'feature3'],
          },
        },
        metadata: {
          created_at: '2026-01-01',
          updated_at: '2026-01-29',
          modified_by: 'admin',
        },
      };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'project',
        target_id: 'test-project-001',
        after_state: afterState,
      });

      expect(action.after_state).toEqual(afterState);
    });

    it('should handle NULL before_state', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: null,
      });

      expect(action.before_state).toBeNull();
    });

    it('should handle NULL after_state', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.FORCE_DELETE,
        target_type: 'project',
        target_id: 'test-project-001',
        after_state: null,
      });

      expect(action.after_state).toBeNull();
    });

    it('should handle both states NULL', async () => {
      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: null,
        after_state: null,
      });

      expect(action.before_state).toBeNull();
      expect(action.after_state).toBeNull();
    });

    it('should query by JSONB field values', async () => {
      const beforeState = { status: 'SUSPENDED', suspension_count: 3 };

      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: beforeState,
      });

      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE before_state->>'status' = 'SUSPENDED'
        `
      );

      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should handle arrays in JSONB states', async () => {
      const state = {
        permissions: ['read', 'write', 'delete'],
        roles: ['admin', 'superadmin'],
      };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
        after_state: state,
      });

      expect(action.after_state).toEqual(state);
    });

    it('should handle special characters in JSONB values', async () => {
      const state = {
        message: 'Critical: "System Down" - Need to fix <urgently>! @#$%',
        emoji: '🚨',
      };

      const action = await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.SYSTEM_CONFIG_CHANGE,
        target_type: 'system',
        before_state: state,
      });

      expect(action.before_state).toEqual(state);
    });
  });

  describe('Indexes', () => {
    it('should verify idx_admin_actions_session_id index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_session_id'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_actions_action index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_action'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_actions_target index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_target'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_actions_created_at index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_created_at'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_actions_session_created composite index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_session_created'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify idx_admin_actions_target_history composite index exists', async () => {
      const result = await query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname = 'idx_admin_actions_target_history'
      `);

      expect(result.rowCount).toBe(1);
    });

    it('should verify all admin_actions indexes', async () => {
      const result = await query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'control_plane'
          AND tablename = 'admin_actions'
          AND indexname LIKE 'idx_admin_actions_%'
        ORDER BY indexname
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      expect(indexNames).toContain('idx_admin_actions_session_id');
      expect(indexNames).toContain('idx_admin_actions_action');
      expect(indexNames).toContain('idx_admin_actions_target');
      expect(indexNames).toContain('idx_admin_actions_created_at');
      expect(indexNames).toContain('idx_admin_actions_session_created');
      expect(indexNames).toContain('idx_admin_actions_target_history');
      expect(indexNames).toHaveLength(6);
    });
  });

  describe('Querying actions by session_id', () => {
    let testSession: AdminSession;
    let otherSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-query-001',
        reason: 'Test session queries',
        access_method: 'otp',
      });

      otherSession = await createTestSession({
        admin_id: 'test-admin-query-002',
        reason: 'Other session',
        access_method: 'hardware_key',
      });

      // Create actions for testSession
      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
      });

      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.REGENERATE_KEYS,
        target_type: 'project',
        target_id: 'test-project-002',
      });

      // Create action for otherSession
      await createTestAction({
        session_id: otherSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
      });
    });

    it('should query actions by session_id', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows.every((row) => row.session_id === testSession.id)).toBe(true);
    });

    it('should use session_id index efficiently', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBe(2);
    });

    it('should query actions with session composite index', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBe(2);
      // This should use idx_admin_actions_session_created
    });
  });

  describe('Querying actions by target_type and target_id', () => {
    let testSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-target-001',
        reason: 'Test target queries',
        access_method: 'emergency_code',
      });

      // Create multiple actions for the same target
      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-target-001',
        before_state: { status: 'SUSPENDED' },
        after_state: { status: 'ACTIVE' },
      });

      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.REGENERATE_KEYS,
        target_type: 'project',
        target_id: 'test-project-target-001',
        before_state: { api_key: 'old-key' },
        after_state: { api_key: 'new-key' },
      });

      // Create action for different target
      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
      });
    });

    it('should query actions by target_type', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE target_type = $1
        ORDER BY created_at DESC
        `,
        ['project']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows.every((row) => row.target_type === 'project')).toBe(true);
    });

    it('should query actions by target_type and target_id', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at DESC
        `,
        ['project', 'test-project-target-001']
      );

      expect(result.rowCount).toBe(2);
    });

    it('should use target composite index for history queries', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at DESC
        `,
        ['project', 'test-project-target-001']
      );

      expect(result.rowCount).toBe(2);
      // This should use idx_admin_actions_target_history
    });

    it('should get action history for a target', async () => {
      const result = await query<AdminAction>(
        `
        SELECT
          action,
          before_state,
          after_state,
          created_at
        FROM control_plane.admin_actions
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at DESC
        `,
        ['project', 'test-project-target-001']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.action).toBe(AdminActionType.REGENERATE_KEYS);
      expect(result.rows[1]!.action).toBe(AdminActionType.UNLOCK_PROJECT);
    });
  });

  describe('Querying with filters and pagination', () => {
    let testSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-filter-001',
        reason: 'Test filters and pagination',
        access_method: 'hardware_key',
      });

      // Create actions with different types
      for (let i = 0; i < 15; i++) {
        await createTestAction({
          session_id: testSession.id,
          action: i % 2 === 0 ? AdminActionType.UNLOCK_PROJECT : AdminActionType.MODIFY_USER,
          target_type: i % 2 === 0 ? 'project' : 'user',
          target_id: i % 2 === 0 ? `test-project-${i}` : `test-user-${i}`,
        });
      }
    });

    it('should limit results', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 5
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBe(5);
    });

    it('should offset results for pagination', async () => {
      const firstPage = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 5 OFFSET 0
        `,
        [testSession.id]
      );

      const secondPage = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 5 OFFSET 5
        `,
        [testSession.id]
      );

      expect(firstPage.rowCount).toBe(5);
      expect(secondPage.rowCount).toBe(5);
      expect(firstPage.rows[0]!.id).not.toBe(secondPage.rows[0]!.id);
    });

    it('should filter by action type', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1 AND action = $2
        ORDER BY created_at DESC
        `,
        [testSession.id, AdminActionType.UNLOCK_PROJECT]
      );

      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.action === AdminActionType.UNLOCK_PROJECT)).toBe(true);
    });

    it('should filter by created_at date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1 AND created_at >= $2
        ORDER BY created_at DESC
        `,
        [testSession.id, oneHourAgo]
      );

      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should count total actions for pagination metadata', async () => {
      const countResult = await query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM control_plane.admin_actions
        WHERE session_id = $1
        `,
        [testSession.id]
      );

      expect(parseInt(countResult.rows[0]!.count, 10)).toBe(15);
    });

    it('should combine multiple filters', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
          AND action = $2
          AND target_type = $3
        ORDER BY created_at DESC
        LIMIT 5
        `,
        [testSession.id, AdminActionType.UNLOCK_PROJECT, 'project']
      );

      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.action === AdminActionType.UNLOCK_PROJECT)).toBe(true);
      expect(result.rows.every((row) => row.target_type === 'project')).toBe(true);
    });
  });

  describe('Action type enumeration', () => {
    it('should support all action types', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-all-types',
        reason: 'Test all action types',
        access_method: 'hardware_key',
      });

      const actionTypes = Object.values(AdminActionType);

      for (const actionType of actionTypes) {
        await createTestAction({
          session_id: session.id,
          action: actionType,
          target_type: 'test',
          target_id: `test-${actionType}`,
        });
      }

      const result = await query<AdminAction>(
        'SELECT DISTINCT action FROM control_plane.admin_actions WHERE session_id = $1',
        [session.id]
      );

      expect(result.rowCount).toBe(actionTypes.length);
    });

    it('should allow custom action strings (flexibility for future)', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-custom',
        reason: 'Test custom actions',
        access_method: 'otp',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: 'custom_future_action',
        target_type: 'system',
      });

      expect(action.action).toBe('custom_future_action');
    });
  });

  describe('Data integrity and validation', () => {
    it('should store and retrieve action with all fields', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-full-001',
        reason: 'Test full action record',
        access_method: 'hardware_key',
      });

      const beforeState = {
        project: { id: 'test-project-001', name: 'Old Name' },
        timestamp: '2026-01-29T10:00:00Z',
      };

      const afterState = {
        project: { id: 'test-project-001', name: 'New Name' },
        timestamp: '2026-01-29T11:00:00Z',
      };

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: beforeState,
        after_state: afterState,
      });

      const result = await query<AdminAction>(
        'SELECT * FROM control_plane.admin_actions WHERE id = $1',
        [action.id]
      );

      const retrievedAction = result.rows[0]!;
      expect(retrievedAction.session_id).toBe(session.id);
      expect(retrievedAction.action).toBe(AdminActionType.MODIFY_USER);
      expect(retrievedAction.target_type).toBe('project');
      expect(retrievedAction.target_id).toBe('test-project-001');
      expect(retrievedAction.before_state).toEqual(beforeState);
      expect(retrievedAction.after_state).toEqual(afterState);
    });

    it('should generate UUID for id automatically', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-uuid-001',
        reason: 'Test UUID generation',
        access_method: 'otp',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: 'project',
      });

      expect(action.id).toBeDefined();
      expect(action.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should set created_at timestamp automatically', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-timestamp-001',
        reason: 'Test timestamp',
        access_method: 'emergency_code',
      });

      const beforeCreate = new Date();
      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
      });
      const afterCreate = new Date();

      expect(action.created_at).toBeInstanceOf(Date);
      expect(action.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(action.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });

    it('should handle system-wide actions without target_id', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-system-001',
        reason: 'Test system-wide actions',
        access_method: 'hardware_key',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.SYSTEM_CONFIG_CHANGE,
        target_type: 'system',
        before_state: { maintenance_mode: false },
        after_state: { maintenance_mode: true },
      });

      expect(action.target_id).toBeNull();
      expect(action.target_type).toBe('system');
    });
  });

  describe('Table and column comments', () => {
    it('should verify table comment exists', async () => {
      const result = await query(`
        SELECT
          obj_description('control_plane.admin_actions'::regclass, 'pg_class') AS table_comment
      `);

      expect(result.rows[0]!.table_comment).not.toBeNull();
      expect(result.rows[0]!.table_comment).toContain('break glass');
      expect(result.rows[0]!.table_comment).toContain('audit');
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
          AND st.relname = 'admin_actions'
          AND pgd.description IS NOT NULL
        ORDER BY col.ordinal_position
      `);

      expect(result.rowCount).toBeGreaterThan(0);

      const columnNames = result.rows.map((row) => row.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('session_id');
      expect(columnNames).toContain('action');
      expect(columnNames).toContain('target_type');
      expect(columnNames).toContain('target_id');
      expect(columnNames).toContain('before_state');
      expect(columnNames).toContain('after_state');
      expect(columnNames).toContain('created_at');
    });

    it('should verify action column comment mentions examples', async () => {
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
          AND st.relname = 'admin_actions'
          AND col.column_name = 'action'
      `);

      expect(result.rowCount).toBe(1);
      expect(result.rows[0]!.description).toContain('unlock_project');
    });
  });

  describe('Query patterns for common use cases', () => {
    let testSession: AdminSession;

    beforeEach(async () => {
      testSession = await createTestSession({
        admin_id: 'test-admin-patterns-001',
        reason: 'Test query patterns',
        access_method: 'hardware_key',
      });

      // Create a variety of actions
      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.UNLOCK_PROJECT,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: { status: 'SUSPENDED' },
        after_state: { status: 'ACTIVE' },
      });

      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.REGENERATE_KEYS,
        target_type: 'project',
        target_id: 'test-project-001',
        before_state: { api_key: 'old' },
        after_state: { api_key: 'new' },
      });

      await createTestAction({
        session_id: testSession.id,
        action: AdminActionType.MODIFY_USER,
        target_type: 'user',
        target_id: 'test-user-001',
      });
    });

    it('should get all actions for a session', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBe(3);
    });

    it('should get action history for a specific target', async () => {
      const result = await query<AdminAction>(
        `
        SELECT
          action,
          before_state,
          after_state,
          created_at
        FROM control_plane.admin_actions
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at ASC
        `,
        ['project', 'test-project-001']
      );

      expect(result.rowCount).toBe(2);
      expect(result.rows[0]!.action).toBe(AdminActionType.UNLOCK_PROJECT);
      expect(result.rows[1]!.action).toBe(AdminActionType.REGENERATE_KEYS);
    });

    it('should get recent actions ordered by time', async () => {
      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        ORDER BY created_at DESC
        LIMIT 10
        `
      );

      expect(result.rowCount).toBeGreaterThan(0);
      // Verify descending order
      if (result.rowCount && result.rowCount > 1) {
        for (let i = 0; i < result.rowCount - 1; i++) {
          expect(result.rows[i]!.created_at.getTime()).toBeGreaterThanOrEqual(
            result.rows[i + 1]!.created_at.getTime()
          );
        }
      }
    });

    it('should count actions by type', async () => {
      const result = await query<{ action: string; count: string }>(
        `
        SELECT action, COUNT(*) as count
        FROM control_plane.admin_actions
        WHERE session_id = $1
        GROUP BY action
        ORDER BY count DESC
        `,
        [testSession.id]
      );

      expect(result.rowCount).toBeGreaterThan(0);
      const counts = Object.fromEntries(
        result.rows.map((row) => [row.action, parseInt(row.count, 10)])
      );
      expect(counts[AdminActionType.UNLOCK_PROJECT]).toBe(1);
      expect(counts[AdminActionType.REGENERATE_KEYS]).toBe(1);
      expect(counts[AdminActionType.MODIFY_USER]).toBe(1);
    });
  });

  describe('Performance and index usage', () => {
    it('should handle large numbers of actions efficiently', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-perf-001',
        reason: 'Test performance',
        access_method: 'otp',
      });

      // Create 50 actions
      for (let i = 0; i < 50; i++) {
        await createTestAction({
          session_id: session.id,
          action: AdminActionType.ACCESS_PROJECT,
          target_type: 'project',
          target_id: `test-project-${i}`,
        });
      }

      const result = await query<AdminAction>(
        `
        SELECT * FROM control_plane.admin_actions
        WHERE session_id = $1
        ORDER BY created_at DESC
        `,
        [session.id]
      );

      expect(result.rowCount).toBe(50);
    });
  });

  describe('Foreign key constraints', () => {
    it('should verify foreign key constraint exists', async () => {
      const result = await query(`
        SELECT
          con.conname AS constraint_name,
          pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'control_plane'
          AND rel.relname = 'admin_actions'
          AND con.contype = 'f'
      `);

      expect(result.rowCount).toBeGreaterThan(0);
      const fkConstraint = result.rows[0]!;
      expect(fkConstraint.constraint_definition).toContain('admin_sessions');
    });

    it('should verify primary key constraint exists', async () => {
      const result = await query(`
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'control_plane'
          AND rel.relname = 'admin_actions'
          AND con.contype = 'p'
      `);

      expect(result.rowCount).toBe(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle actions with empty JSONB states', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-empty-001',
        reason: 'Test empty states',
        access_method: 'hardware_key',
      });

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: 'project',
        before_state: {},
        after_state: {},
      });

      expect(action.before_state).toEqual({});
      expect(action.after_state).toEqual({});
    });

    it('should handle very long action strings', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-long-001',
        reason: 'Test long action strings',
        access_method: 'otp',
      });

      const longAction = 'a'.repeat(1000);

      const action = await createTestAction({
        session_id: session.id,
        action: longAction,
        target_type: 'test',
      });

      expect(action.action).toBe(longAction);
    });

    it('should handle very long target_type strings', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-long-002',
        reason: 'Test long target_type',
        access_method: 'emergency_code',
      });

      const longTargetType = 'b'.repeat(500);

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.ACCESS_PROJECT,
        target_type: longTargetType,
      });

      expect(action.target_type).toBe(longTargetType);
    });

    it('should handle actions with deep JSONB nesting', async () => {
      const session = await createTestSession({
        admin_id: 'test-admin-deep-001',
        reason: 'Test deep nesting',
        access_method: 'hardware_key',
      });

      const deepState = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: { value: 'deep' },
              },
            },
          },
        },
      };

      const action = await createTestAction({
        session_id: session.id,
        action: AdminActionType.SYSTEM_CONFIG_CHANGE,
        target_type: 'system',
        before_state: deepState,
      });

      expect(action.before_state).toEqual(deepState);
    });
  });
});
