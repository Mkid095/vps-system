/**
 * Admin Sessions Service
 *
 * Service for managing break glass admin sessions.
 * Provides functions to create, validate, and query admin sessions.
 *
 * US-003: Implement Break Glass Authentication - Step 1: Foundation
 *
 * @example
 * ```typescript
 * import { createAdminSession, validateAdminSession } from '@nextmavens/audit-logs-database';
 *
 * // Create a break glass session
 * const session = await createAdminSession({
 *   admin_id: 'admin-uuid-123',
 *   reason: 'Production incident - locked out of project',
 *   access_method: AccessMethod.OTP,
 * });
 *
 * // Validate a session
 * const validation = await validateAdminSession(session.id);
 * if (!validation.valid) {
 *   console.error('Session expired or invalid:', validation.reason);
 * }
 * ```
 */

import { query } from './pool.js';
import type {
  AdminSession,
  CreateAdminSessionInput,
  AdminSessionQuery,
  AdminSessionResponse,
  AdminSessionValidation,
  AdminSessionStats,
} from '../types/admin-sessions.types.js';
import { AccessMethod } from '../types/admin-sessions.types.js';

/**
 * Create a new admin session for break glass access
 *
 * @param input - Session creation parameters
 * @returns The created admin session
 * @throws Error if database operation fails
 *
 * @example
 * ```typescript
 * const session = await createAdminSession({
 *   admin_id: 'admin-uuid-123',
 *   reason: 'Production incident - locked out of project',
 *   access_method: AccessMethod.OTP,
 * });
 * ```
 */
export async function createAdminSession(
  input: CreateAdminSessionInput
): Promise<AdminSession> {
  const { admin_id, reason, access_method, granted_by, expires_at } = input;

  // Validate reason length
  if (reason.length < 10) {
    throw new Error('Reason must be at least 10 characters long');
  }

  // Validate access method
  if (!Object.values(AccessMethod).includes(access_method as AccessMethod)) {
    throw new Error(`Invalid access method: ${access_method}`);
  }

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
    throw new Error('Failed to create admin session');
  }

  return session;
}

/**
 * Validate an admin session
 *
 * Checks if a session exists and has not expired.
 *
 * @param sessionId - The session ID to validate
 * @returns Validation result with session details if valid
 *
 * @example
 * ```typescript
 * const validation = await validateAdminSession('session-uuid-123');
 * if (!validation.valid) {
 *   console.error('Session invalid:', validation.reason);
 * }
 * ```
 */
export async function validateAdminSession(
  sessionId: string
): Promise<AdminSessionValidation> {
  const result = await query<AdminSession>(
    `
    SELECT *
    FROM control_plane.admin_sessions
    WHERE id = $1
    `,
    [sessionId]
  );

  const session = result.rows[0];

  if (!session) {
    return {
      valid: false,
      reason: 'not_found',
    };
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      reason: 'expired',
      session,
    };
  }

  // Calculate time until expiration
  const expires_in_seconds = Math.floor(
    (new Date(session.expires_at).getTime() - Date.now()) / 1000
  );

  return {
    valid: true,
    session,
    expires_in_seconds,
  };
}

/**
 * Query admin sessions with filters
 *
 * @param query_params - Query parameters for filtering
 * @returns Paginated list of admin sessions
 *
 * @example
 * ```typescript
 * const result = await queryAdminSessions({
 *   admin_id: 'admin-uuid-123',
 *   active: true,
 *   limit: 10,
 * });
 * ```
 */
export async function queryAdminSessions(
  query_params: AdminSessionQuery
): Promise<AdminSessionResponse> {
  const {
    admin_id,
    access_method,
    granted_by,
    active,
    expired,
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

  if (admin_id) {
    conditions.push(`admin_id = $${paramIndex}`);
    params.push(admin_id);
    paramIndex++;
  }

  if (access_method) {
    conditions.push(`access_method = $${paramIndex}`);
    params.push(access_method);
    paramIndex++;
  }

  if (granted_by) {
    conditions.push(`granted_by = $${paramIndex}`);
    params.push(granted_by);
    paramIndex++;
  }

  if (active !== undefined) {
    if (active) {
      conditions.push(`expires_at > NOW()`);
    } else {
      conditions.push(`expires_at <= NOW()`);
    }
  }

  if (expired !== undefined) {
    if (expired) {
      conditions.push(`expires_at <= NOW()`);
    } else {
      conditions.push(`expires_at > NOW()`);
    }
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
    FROM control_plane.admin_sessions
    ${whereClause}
    `,
    params
  );

  const total = parseInt((countResult.rows[0]?.total as string) || '0', 10);

  // Get paginated results
  const orderByClause = `${order_by} ${order_direction}`;
  const dataResult = await query<AdminSession>(
    `
    SELECT *
    FROM control_plane.admin_sessions
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
    [...params, limit, offset]
  );

  return {
    sessions: dataResult.rows,
    total,
    offset,
    limit,
  };
}

/**
 * Get admin session statistics
 *
 * @returns Statistics about admin sessions
 *
 * @example
 * ```typescript
 * const stats = await getAdminSessionStats();
 * console.log('Active sessions:', stats.active_sessions);
 * console.log('Total sessions:', stats.total_sessions);
 * ```
 */
export async function getAdminSessionStats(): Promise<AdminSessionStats> {
  // Get total sessions
  const totalResult = await query(
    `SELECT COUNT(*) as count FROM control_plane.admin_sessions`
  );
  const total_sessions = parseInt((totalResult.rows[0]?.count as string) || '0', 10);

  // Get active sessions
  const activeResult = await query(
    `SELECT COUNT(*) as count FROM control_plane.admin_sessions WHERE expires_at > NOW()`
  );
  const active_sessions = parseInt((activeResult.rows[0]?.count as string) || '0', 10);

  // Get expired sessions
  const expired_sessions = total_sessions - active_sessions;

  // Get sessions by access method
  const byMethodResult = await query(
    `
    SELECT access_method, COUNT(*) as count
    FROM control_plane.admin_sessions
    GROUP BY access_method
    `
  );

  const by_access_method: Record<string, number> = {
    [AccessMethod.HARDWARE_KEY]: 0,
    [AccessMethod.OTP]: 0,
    [AccessMethod.EMERGENCY_CODE]: 0,
  };

  for (const row of byMethodResult.rows) {
    by_access_method[row.access_method as string] = parseInt((row.count as string) || '0', 10);
  }

  // Get average session duration
  const durationResult = await query(
    `
    SELECT AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_duration
    FROM control_plane.admin_sessions
    WHERE expires_at <= NOW()
    `
  );
  const avg_duration_seconds = durationResult.rows[0]?.avg_duration
    ? Math.round(parseFloat(durationResult.rows[0].avg_duration as string))
    : 3600; // Default to 1 hour

  // Get common reasons
  const reasonsResult = await query(
    `
    SELECT reason, COUNT(*) as count
    FROM control_plane.admin_sessions
    GROUP BY reason
    ORDER BY count DESC
    LIMIT 5
    `
  );

  const common_reasons = reasonsResult.rows.map((row) => ({
    reason: row.reason as string,
    count: parseInt((row.count as string) || '0', 10),
  }));

  return {
    total_sessions,
    active_sessions,
    expired_sessions,
    by_access_method: by_access_method as { [key in AccessMethod]: number },
    avg_duration_seconds,
    common_reasons,
  };
}

/**
 * Delete an admin session
 *
 * @param sessionId - The session ID to delete
 * @returns true if deleted, false if not found
 *
 * @example
 * ```typescript
 * const deleted = await deleteAdminSession('session-uuid-123');
 * if (deleted) {
 *   console.log('Session deleted successfully');
 * }
 * ```
 */
export async function deleteAdminSession(sessionId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM control_plane.admin_sessions WHERE id = $1`,
    [sessionId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Clean up expired admin sessions
 *
 * @param olderThanHours - Delete sessions expired more than this many hours ago (default: 24)
 * @returns Number of sessions deleted
 *
 * @example
 * ```typescript
 * const deleted = await cleanupExpiredSessions(24);
 * console.log(`Cleaned up ${deleted} expired sessions`);
 * ```
 */
export async function cleanupExpiredSessions(
  olderThanHours: number = 24
): Promise<number> {
  const result = await query(
    `
    DELETE FROM control_plane.admin_sessions
    WHERE expires_at < NOW() - INTERVAL '1 hour' * $1
    `,
    [olderThanHours]
  );

  return result.rowCount ?? 0;
}
