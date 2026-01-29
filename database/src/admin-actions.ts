/**
 * Admin Actions Service
 *
 * Service for logging break glass admin actions.
 * Provides functions to create, query, and validate admin actions.
 *
 * US-003: Implement Break Glass Authentication - Step 1: Foundation
 *
 * @example
 * ```typescript
 * import { logAdminAction, queryAdminActions } from '@nextmavens/audit-logs-database';
 *
 * // Log an admin action
 * await logAdminAction({
 *   session_id: 'session-uuid-123',
 *   action: AdminActionType.UNLOCK_PROJECT,
 *   target_type: 'project',
 *   target_id: 'project-uuid-456',
 *   before_state: { status: 'SUSPENDED' },
 *   after_state: { status: 'ACTIVE' },
 * });
 * ```
 */

import { query } from './pool.js';
import type {
  AdminAction,
  CreateAdminActionInput,
  AdminActionQuery,
  AdminActionResponse,
  AdminActionStats,
  TargetHistory,
} from '../types/admin-actions.types.js';

/**
 * Log an admin action during a break glass session
 *
 * @param input - Action creation parameters
 * @returns The created admin action
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const action = await logAdminAction({
 *   session_id: 'session-uuid-123',
 *   action: AdminActionType.UNLOCK_PROJECT,
 *   target_type: 'project',
 *   target_id: 'project-uuid-456',
 *   before_state: { status: 'SUSPENDED' },
 *   after_state: { status: 'ACTIVE' },
 * });
 * ```
 */
export async function logAdminAction(
  input: CreateAdminActionInput
): Promise<AdminAction> {
  const {
    session_id,
    action,
    target_type,
    target_id,
    before_state,
    after_state,
  } = input;

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

  const adminAction = result.rows[0];
  if (!adminAction) {
    throw new Error('Failed to log admin action');
  }

  return adminAction;
}

/**
 * Query admin actions with filters
 *
 * @param query_params - Query parameters for filtering
 * @returns Paginated list of admin actions
 *
 * @example
 * ```typescript
 * const result = await queryAdminActions({
 *   session_id: 'session-uuid-123',
 *   limit: 10,
 * });
 * ```
 */
export async function queryAdminActions(
  query_params: AdminActionQuery
): Promise<AdminActionResponse> {
  const {
    session_id,
    action,
    target_type,
    target_id,
    created_after,
    created_before,
    limit = 100,
    offset = 0,
    order_by = 'created_at',
    order_direction = 'DESC',
  } = query_params;

  const conditions: string[] = [];
  const params: Array<string | number | Date> = [];
  let paramIndex = 1;

  if (session_id) {
    conditions.push(`session_id = $${paramIndex}`);
    params.push(session_id);
    paramIndex++;
  }

  if (action) {
    conditions.push(`action = $${paramIndex}`);
    params.push(action);
    paramIndex++;
  }

  if (target_type) {
    conditions.push(`target_type = $${paramIndex}`);
    params.push(target_type);
    paramIndex++;
  }

  if (target_id) {
    conditions.push(`target_id = $${paramIndex}`);
    params.push(target_id);
    paramIndex++;
  }

  if (created_after) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(created_after);
    paramIndex++;
  }

  if (created_before) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(created_before);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query(
    `
    SELECT COUNT(*) as total
    FROM control_plane.admin_actions
    ${whereClause}
    `,
    params
  );

  const total = parseInt((countResult.rows[0]?.total as string) || '0', 10);

  // Get paginated results
  const orderByClause = `${order_by} ${order_direction}`;
  const dataResult = await query<AdminAction>(
    `
    SELECT *
    FROM control_plane.admin_actions
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, limit, offset]
  );

  return {
    actions: dataResult.rows,
    total,
    offset,
    limit,
  };
}

/**
 * Query admin actions with session details
 *
 * @param query_params - Query parameters for filtering
 * @returns Paginated list of admin actions with session details
 *
 * @example
 * ```typescript
 * const result = await queryAdminActionsWithSession({
 *   session_id: 'session-uuid-123',
 *   limit: 10,
 * });
 * ```
 */
export async function queryAdminActionsWithSession(
  query_params: AdminActionQuery
): Promise<AdminActionResponse> {
  const {
    session_id,
    action,
    target_type,
    target_id,
    created_after,
    created_before,
    limit = 100,
    offset = 0,
    order_by = 'aa.created_at',
    order_direction = 'DESC',
  } = query_params;

  const conditions: string[] = ['aa.session_id = s.id'];
  const params: Array<string | number | Date> = [];
  let paramIndex = 1;

  if (session_id) {
    conditions.push(`aa.session_id = $${paramIndex}`);
    params.push(session_id);
    paramIndex++;
  }

  if (action) {
    conditions.push(`aa.action = $${paramIndex}`);
    params.push(action);
    paramIndex++;
  }

  if (target_type) {
    conditions.push(`aa.target_type = $${paramIndex}`);
    params.push(target_type);
    paramIndex++;
  }

  if (target_id) {
    conditions.push(`aa.target_id = $${paramIndex}`);
    params.push(target_id);
    paramIndex++;
  }

  if (created_after) {
    conditions.push(`aa.created_at >= $${paramIndex}`);
    params.push(created_after);
    paramIndex++;
  }

  if (created_before) {
    conditions.push(`aa.created_at <= $${paramIndex}`);
    params.push(created_before);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await query(
    `
    SELECT COUNT(*) as total
    FROM control_plane.admin_actions aa
    INNER JOIN control_plane.admin_sessions s ON s.id = aa.session_id
    ${whereClause}
    `,
    params
  );

  const total = parseInt((countResult.rows[0]?.total as string) || '0', 10);

  // Get paginated results
  const orderByClause = `${order_by} ${order_direction}`;
  const dataResult = await query<AdminAction>(
    `
    SELECT aa.*
    FROM control_plane.admin_actions aa
    INNER JOIN control_plane.admin_sessions s ON s.id = aa.session_id
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, limit, offset]
  );

  return {
    actions: dataResult.rows,
    total,
    offset,
    limit,
  };
}

/**
 * Get admin action statistics
 *
 * @returns Statistics about admin actions
 *
 * @example
 * ```typescript
 * const stats = await getAdminActionStats();
 * console.log('Total actions:', stats.total_actions);
 * console.log('Actions in last 24h:', stats.actions_last_24h);
 * ```
 */
export async function getAdminActionStats(): Promise<AdminActionStats> {
  // Get total actions
  const totalResult = await query(
    `SELECT COUNT(*) as count FROM control_plane.admin_actions`
  );
  const total_actions = parseInt((totalResult.rows[0]?.count as string) || '0', 10);

  // Get actions by type
  const byTypeResult = await query(
    `
    SELECT action, COUNT(*) as count
    FROM control_plane.admin_actions
    GROUP BY action
    `
  );

  const by_action_type: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    by_action_type[row.action as string] = parseInt((row.count as string) || '0', 10);
  }

  // Get actions by target type
  const byTargetResult = await query(
    `
    SELECT target_type, COUNT(*) as count
    FROM control_plane.admin_actions
    GROUP BY target_type
    `
  );

  const by_target_type: Record<string, number> = {};
  for (const row of byTargetResult.rows) {
    by_target_type[row.target_type as string] = parseInt((row.count as string) || '0', 10);
  }

  // Get common targets
  const targetsResult = await query(
    `
    SELECT target_type, target_id, COUNT(*) as count
    FROM control_plane.admin_actions
    WHERE target_id IS NOT NULL
    GROUP BY target_type, target_id
    ORDER BY count DESC
    LIMIT 5
    `
  );

  const common_targets = targetsResult.rows.map((row) => ({
    target_type: row.target_type as string,
    target_id: row.target_id as string,
    count: parseInt((row.count as string) || '0', 10),
  }));

  // Get actions in time ranges
  const last24hResult = await query(
    `
    SELECT COUNT(*) as count
    FROM control_plane.admin_actions
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    `
  );
  const actions_last_24h = parseInt((last24hResult.rows[0]?.count as string) || '0', 10);

  const last7dResult = await query(
    `
    SELECT COUNT(*) as count
    FROM control_plane.admin_actions
    WHERE created_at >= NOW() - INTERVAL '7 days'
    `
  );
  const actions_last_7d = parseInt((last7dResult.rows[0]?.count as string) || '0', 10);

  const last30dResult = await query(
    `
    SELECT COUNT(*) as count
    FROM control_plane.admin_actions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    `
  );
  const actions_last_30d = parseInt((last30dResult.rows[0]?.count as string) || '0', 10);

  return {
    total_actions,
    by_action_type,
    by_target_type,
    common_targets,
    actions_last_24h,
    actions_last_7d,
    actions_last_30d,
  };
}

/**
 * Get target history for auditing
 *
 * @param targetType - The target type to query
 * @param targetId - The target ID to query
 * @returns History of actions performed on the target
 *
 * @example
 * ```typescript
 * const history = await getTargetHistory('project', 'project-uuid-123');
 * console.log('Total actions:', history.total);
 * console.log('Actions:', history.actions);
 * ```
 */
export async function getTargetHistory(
  targetType: string,
  targetId: string
): Promise<TargetHistory> {
  const result = await query<AdminAction>(
    `
    SELECT *
    FROM control_plane.admin_actions
    WHERE target_type = $1 AND target_id = $2
    ORDER BY created_at DESC
    `,
    [targetType, targetId]
  );

  const actions = result.rows;
  const total = actions.length;

  const first_action_at = total > 0 ? actions[total - 1]?.created_at || null : null;
  const last_action_at = total > 0 ? actions[0]?.created_at || null : null;

  return {
    target_type: targetType,
    target_id: targetId,
    actions,
    total,
    first_action_at,
    last_action_at,
  };
}
