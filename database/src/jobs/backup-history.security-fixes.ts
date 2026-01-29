/**
 * Backup History Security Fixes
 *
 * This file contains security improvements for the backup history feature
 * based on the security audit findings in STEP-10-US-004-SECURITY-AUDIT.md
 *
 * CRITICAL: These fixes should be applied before production deployment
 */

import { v4 as uuidv4 } from 'uuid';
import { validate as uuidValidate } from 'uuid';
import { query } from '../pool.js';
import type {
  BackupHistory,
  BackupHistoryInput,
  BackupHistoryQuery,
  BackupHistoryResponse,
  BackupHistoryResult,
  BackupHistoryStatus,
  BackupHistoryType,
} from './types.backup.js';

/**
 * Audit log entry structure
 */
interface AuditLogEntry {
  operation: 'record_backup' | 'query_history' | 'mark_expired' | 'mark_deleted' | 'cleanup_expired';
  userId: string;
  projectId: string;
  backupId?: string;
  timestamp: Date;
  success: boolean;
  details: Record<string, unknown>;
}

/**
 * Rate limiter interface (to be implemented with Redis or in-memory cache)
 */
interface RateLimiter {
  checkLimit(userId: string, operation: string): Promise<boolean>;
  incrementUsage(userId: string, operation: string): Promise<void>;
}

/**
 * In-memory rate limiter implementation
 * NOTE: Use Redis for production deployments
 */
class InMemoryRateLimiter implements RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly REQUESTS_PER_MINUTE = 60;
  private readonly REQUESTS_PER_HOUR = 1000;
  private readonly MINUTE_WINDOW = 60 * 1000;
  private readonly HOUR_WINDOW = 60 * 60 * 1000;

  async checkLimit(userId: string, operation: string): Promise<boolean> {
    const key = `${userId}:${operation}`;
    const now = Date.now();

    const record = this.requests.get(key);

    if (!record) {
      return true;
    }

    // Check minute window
    if (now - record.resetTime < this.MINUTE_WINDOW && record.count >= this.REQUESTS_PER_MINUTE) {
      return false;
    }

    // Check hour window
    if (now - record.resetTime < this.HOUR_WINDOW && record.count >= this.REQUESTS_PER_HOUR) {
      return false;
    }

    return true;
  }

  async incrementUsage(userId: string, operation: string): Promise<void> {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now - record.resetTime >= this.HOUR_WINDOW) {
      this.requests.set(key, { count: 1, resetTime: now });
    } else {
      record.count++;
    }
  }

  // Clean up old entries
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now - record.resetTime >= this.HOUR_WINDOW) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter();

// Cleanup rate limiter every hour
setInterval(() => {
  (rateLimiter as InMemoryRateLimiter)['cleanup']();
}, 60 * 60 * 1000);

/**
 * Validation constants
 */
const VALIDATION = {
  /** Maximum file_id length */
  MAX_FILE_ID_LENGTH: 500,
  /** Minimum file_id length */
  MIN_FILE_ID_LENGTH: 1,
  /** Maximum backup size in bytes (10GB) */
  MAX_BACKUP_SIZE: 10 * 1024 * 1024 * 1024,
  /** Minimum backup size (0 bytes allowed for empty backups) */
  MIN_BACKUP_SIZE: 0,
  /** Default expiration period in milliseconds (30 days) */
  DEFAULT_EXPIRATION_MS: 30 * 24 * 60 * 60 * 1000,
  /** Maximum limit for pagination */
  MAX_LIMIT: 1000,
  /** Default limit for pagination */
  DEFAULT_LIMIT: 50,
  /** Maximum offset for pagination */
  MAX_OFFSET: 100000,
} as const;

/**
 * SECURITY FIX #1: Verify user has access to a project
 *
 * Checks if the user is the project owner or a member of the project.
 *
 * @param projectId - The project ID to check access for
 * @param userId - The user ID to verify
 * @returns True if user has access, false otherwise
 */
async function verifyProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (!userId || typeof userId !== 'string') {
    return false;
  }

  // Validate both IDs are UUIDs
  if (!uuidValidate(projectId) || !uuidValidate(userId)) {
    return false;
  }

  const queryText = `
    SELECT 1
    FROM control_plane.projects
    WHERE id = $1 AND owner_id = $2
    UNION
    SELECT 1
    FROM control_plane.project_members
    WHERE project_id = $1 AND user_id = $2
    LIMIT 1
  `;

  try {
    const result = await query(queryText, [projectId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Security] Failed to verify project access:', error);
    return false;
  }
}

/**
 * SECURITY FIX #2: Log audit event for compliance and incident response
 *
 * Records all backup operations to an audit log table.
 *
 * @param entry - The audit log entry to record
 */
async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const auditQuery = `
    INSERT INTO control_plane.audit_log (
      operation,
      user_id,
      project_id,
      backup_id,
      timestamp,
      success,
      details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  try {
    await query(auditQuery, [
      entry.operation,
      entry.userId,
      entry.projectId,
      entry.backupId || null,
      entry.timestamp,
      entry.success,
      JSON.stringify(entry.details),
    ]);
  } catch (error) {
    // Log but don't throw - audit logging failure shouldn't break operations
    console.error('[Security] Failed to log audit event:', error);
  }
}

/**
 * SECURITY FIX #3: Generic error messages to prevent information disclosure
 *
 * All validation functions now return generic error messages.
 * Detailed errors are logged server-side for debugging.
 */

/**
 * Validate project_id UUID format
 * SECURITY FIX: Generic error messages
 */
function validateProjectId(projectId: string): void {
  if (typeof projectId !== 'string') {
    throw new Error('Invalid project ID');
  }
  if (projectId.trim().length === 0) {
    throw new Error('Invalid project ID');
  }
  // SECURITY FIX: Use proper UUID validation library
  if (!uuidValidate(projectId)) {
    throw new Error('Invalid project ID');
  }
}

/**
 * Validate backup type
 * SECURITY FIX: Generic error messages
 */
function validateBackupType(type: BackupHistoryType): void {
  if (typeof type !== 'string') {
    throw new Error('Invalid backup type');
  }
  const validTypes = ['export', 'manual'];
  if (!validTypes.includes(type)) {
    throw new Error('Invalid backup type');
  }
}

/**
 * Validate file_id
 * SECURITY FIX: Generic error messages
 */
function validateFileId(fileId: string): void {
  if (typeof fileId !== 'string') {
    throw new Error('Invalid file ID');
  }
  if (fileId.trim().length === 0) {
    throw new Error('Invalid file ID');
  }
  if (fileId.length > VALIDATION.MAX_FILE_ID_LENGTH) {
    throw new Error('Invalid file ID');
  }
}

/**
 * Validate backup size
 * SECURITY FIX: Generic error messages
 */
function validateBackupSize(size: number): void {
  if (typeof size !== 'number') {
    throw new Error('Invalid backup size');
  }
  if (!Number.isInteger(size)) {
    throw new Error('Invalid backup size');
  }
  if (size < VALIDATION.MIN_BACKUP_SIZE) {
    throw new Error('Invalid backup size');
  }
  if (size > VALIDATION.MAX_BACKUP_SIZE) {
    throw new Error('Invalid backup size');
  }
}

/**
 * Validate backup status
 * SECURITY FIX: Generic error messages
 */
function validateBackupStatus(status: BackupHistoryStatus): void {
  if (typeof status !== 'string') {
    throw new Error('Invalid backup status');
  }
  const validStatuses = ['active', 'expired', 'deleted'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid backup status');
  }
}

/**
 * Validate pagination parameters
 * SECURITY FIX: Generic error messages
 */
function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (!Number.isInteger(limit)) {
      throw new Error('Invalid pagination parameters');
    }
    if (limit < 1) {
      throw new Error('Invalid pagination parameters');
    }
    if (limit > VALIDATION.MAX_LIMIT) {
      throw new Error('Invalid pagination parameters');
    }
  }

  if (offset !== undefined) {
    if (!Number.isInteger(offset)) {
      throw new Error('Invalid pagination parameters');
    }
    if (offset < 0) {
      throw new Error('Invalid pagination parameters');
    }
    if (offset > VALIDATION.MAX_OFFSET) {
      throw new Error('Invalid pagination parameters');
    }
  }
}

/**
 * Validate date range
 * SECURITY FIX: Generic error messages
 */
function validateDateRange(date: Date, fieldName: string): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
}

/**
 * SECURITY FIX #4: Enhanced recordBackup with authorization and audit logging
 *
 * @param input - Backup history input data
 * @param requestingUserId - ID of the user making the request (REQUIRED)
 * @returns The created backup record with metadata
 */
export async function recordBackupSecure(
  input: BackupHistoryInput,
  requestingUserId: string
): Promise<BackupHistoryResult> {
  const startTime = Date.now();

  // SECURITY: Verify user is provided
  if (!requestingUserId || typeof requestingUserId !== 'string') {
    console.error('[Security] recordBackup called without user context');
    return {
      backup: {} as BackupHistory,
      success: false,
      error: 'Invalid request',
    };
  }

  // SECURITY: Verify requestingUserId is a valid UUID
  if (!uuidValidate(requestingUserId)) {
    console.error('[Security] Invalid user ID provided to recordBackup');
    return {
      backup: {} as BackupHistory,
      success: false,
      error: 'Invalid request',
    };
  }

  try {
    // Validate inputs with generic errors
    validateProjectId(input.project_id);
    validateBackupType(input.type);
    validateFileId(input.file_id);
    validateBackupSize(input.size);

    if (input.status) {
      validateBackupStatus(input.status);
    }

    if (input.expires_at) {
      validateDateRange(input.expires_at, 'expires_at');
    }

    // SECURITY: Verify user has access to this project
    const hasAccess = await verifyProjectAccess(input.project_id, requestingUserId);
    if (!hasAccess) {
      // Log failed access attempt
      await logAuditEvent({
        operation: 'record_backup',
        userId: requestingUserId,
        projectId: input.project_id,
        timestamp: new Date(),
        success: false,
        details: { reason: 'access_denied' },
      });

      return {
        backup: {} as BackupHistory,
        success: false,
        error: 'Access denied',
      };
    }

    // SECURITY: Check rate limit
    const rateLimitOk = await rateLimiter.checkLimit(requestingUserId, 'record_backup');
    if (!rateLimitOk) {
      await logAuditEvent({
        operation: 'record_backup',
        userId: requestingUserId,
        projectId: input.project_id,
        timestamp: new Date(),
        success: false,
        details: { reason: 'rate_limit_exceeded' },
      });

      return {
        backup: {} as BackupHistory,
        success: false,
        error: 'Too many requests',
      };
    }

    // Generate a unique backup ID
    const id = uuidv4();

    // Calculate expiration date (30 days from now if not provided)
    const expiresAt = input.expires_at
      ? input.expires_at
      : new Date(Date.now() + VALIDATION.DEFAULT_EXPIRATION_MS);

    // Default status to active if not provided
    const status = input.status || 'active';

    // Insert backup record with parameterized query
    const queryText = `
      INSERT INTO control_plane.backup_history (
        id,
        project_id,
        type,
        file_id,
        size,
        status,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        project_id,
        type,
        file_id,
        size,
        status,
        created_at,
        expires_at
    `;

    const values = [
      id,
      input.project_id,
      input.type,
      input.file_id,
      input.size,
      status,
      expiresAt,
    ];

    const result = await query(queryText, values);
    const row = result.rows[0];

    if (!row) {
      await logAuditEvent({
        operation: 'record_backup',
        userId: requestingUserId,
        projectId: input.project_id,
        timestamp: new Date(),
        success: false,
        details: { reason: 'database_insert_failed' },
      });

      return {
        backup: {} as BackupHistory,
        success: false,
        error: 'Failed to record backup',
      };
    }

    // SECURITY: Increment rate limit counter on success
    await rateLimiter.incrementUsage(requestingUserId, 'record_backup');

    // SECURITY: Log successful operation (sanitize sensitive data)
    await logAuditEvent({
      operation: 'record_backup',
      userId: requestingUserId,
      projectId: input.project_id,
      backupId: id,
      timestamp: new Date(),
      success: true,
      details: {
        type: input.type,
        size: input.size,
        file_id_preview: input.file_id.substring(0, 10) + '...', // Sanitize
        duration_ms: Date.now() - startTime,
      },
    });

    return {
      backup: {
        id: row.id,
        project_id: row.project_id,
        type: row.type as BackupHistoryType,
        file_id: row.file_id,
        size: row.size,
        status: row.status as BackupHistoryStatus,
        created_at: row.created_at,
        expires_at: row.expires_at,
      },
      success: true,
    };
  } catch (error) {
    // Log detailed error server-side
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Security] Failed to record backup:', {
      error: errorMessage,
      userId: requestingUserId,
      projectId: input.project_id,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // SECURITY: Log failed operation
    await logAuditEvent({
      operation: 'record_backup',
      userId: requestingUserId,
      projectId: input.project_id,
      timestamp: new Date(),
      success: false,
      details: { reason: 'exception', error: 'operation_failed' },
    });

    // Return generic error to caller
    return {
      backup: {} as BackupHistory,
      success: false,
      error: 'Failed to record backup',
    };
  }
}

/**
 * SECURITY FIX #5: Enhanced getBackupHistory with authorization and rate limiting
 *
 * @param projectId - The project ID to query backups for
 * @param requestingUserId - ID of the user making the request (REQUIRED)
 * @param options - Optional query parameters for filtering and pagination
 * @returns Paginated backup history results
 */
export async function getBackupHistorySecure(
  projectId: string,
  requestingUserId: string,
  options: BackupHistoryQuery = {}
): Promise<BackupHistoryResponse> {
  // SECURITY: Verify user is provided
  if (!requestingUserId || typeof requestingUserId !== 'string') {
    console.error('[Security] getBackupHistory called without user context');
    throw new Error('Invalid request');
  }

  // SECURITY: Verify requestingUserId is a valid UUID
  if (!uuidValidate(requestingUserId)) {
    console.error('[Security] Invalid user ID provided to getBackupHistory');
    throw new Error('Invalid request');
  }

  // Validate project ID
  validateProjectId(projectId);

  // SECURITY: Verify user has access to this project
  const hasAccess = await verifyProjectAccess(projectId, requestingUserId);
  if (!hasAccess) {
    await logAuditEvent({
      operation: 'query_history',
      userId: requestingUserId,
      projectId: projectId,
      timestamp: new Date(),
      success: false,
      details: { reason: 'access_denied' },
    });

    throw new Error('Access denied');
  }

  // SECURITY: Check rate limit
  const rateLimitOk = await rateLimiter.checkLimit(requestingUserId, 'query_history');
  if (!rateLimitOk) {
    await logAuditEvent({
      operation: 'query_history',
      userId: requestingUserId,
      projectId: projectId,
      timestamp: new Date(),
      success: false,
      details: { reason: 'rate_limit_exceeded' },
    });

    throw new Error('Too many requests');
  }

  // Validate pagination
  const limit = options.limit ?? VALIDATION.DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  validatePagination(limit, offset);

  // Build query conditions
  const conditions: string[] = ['project_id = $1'];
  const values: unknown[] = [projectId];
  let paramIndex = 2;

  // Add optional filters
  if (options.type) {
    validateBackupType(options.type);
    conditions.push(`type = $${paramIndex++}`);
    values.push(options.type);
  }

  if (options.status) {
    validateBackupStatus(options.status);
    conditions.push(`status = $${paramIndex++}`);
    values.push(options.status);
  }

  if (options.created_before) {
    validateDateRange(options.created_before, 'created_before');
    conditions.push(`created_at < $${paramIndex++}`);
    values.push(options.created_before);
  }

  if (options.created_after) {
    validateDateRange(options.created_after, 'created_after');
    conditions.push(`created_at > $${paramIndex++}`);
    values.push(options.created_after);
  }

  if (options.expires_before) {
    validateDateRange(options.expires_before, 'expires_before');
    conditions.push(`expires_at < $${paramIndex++}`);
    values.push(options.expires_before);
  }

  if (options.expires_after) {
    validateDateRange(options.expires_after, 'expires_after');
    conditions.push(`expires_at > $${paramIndex++}`);
    values.push(options.expires_after);
  }

  if (options.min_size !== undefined) {
    validateBackupSize(options.min_size);
    conditions.push(`size >= $${paramIndex++}`);
    values.push(options.min_size);
  }

  if (options.max_size !== undefined) {
    validateBackupSize(options.max_size);
    conditions.push(`size <= $${paramIndex++}`);
    values.push(options.max_size);
  }

  const whereClause = conditions.join(' AND ');

  try {
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM control_plane.backup_history
      WHERE ${whereClause}
    `;

    // Get paginated results
    const dataQuery = `
      SELECT
        id,
        project_id,
        type,
        file_id,
        size,
        status,
        created_at,
        expires_at
      FROM control_plane.backup_history
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      query(countQuery, values.slice(0, paramIndex - 2)),
      query(dataQuery, values),
    ]);

    const countRow = countResult.rows[0];
    const total = countRow ? parseInt(countRow.total || '0', 10) : 0;
    const hasMore = offset + limit < total;

    // SECURITY: Increment rate limit counter on success
    await rateLimiter.incrementUsage(requestingUserId, 'query_history');

    // SECURITY: Log successful query
    await logAuditEvent({
      operation: 'query_history',
      userId: requestingUserId,
      projectId: projectId,
      timestamp: new Date(),
      success: true,
      details: {
        result_count: dataResult.rows.length,
        total: total,
        limit: limit,
        offset: offset,
      },
    });

    return {
      data: dataResult.rows.map((row) => ({
        id: row.id,
        project_id: row.project_id,
        type: row.type as BackupHistoryType,
        file_id: row.file_id,
        size: row.size,
        status: row.status as BackupHistoryStatus,
        created_at: row.created_at,
        expires_at: row.expires_at,
      })),
      total,
      limit,
      offset,
      has_more: hasMore,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // SECURITY: Log failed query
    await logAuditEvent({
      operation: 'query_history',
      userId: requestingUserId,
      projectId: projectId,
      timestamp: new Date(),
      success: false,
      details: { reason: 'exception', error: 'operation_failed' },
    });

    console.error('[Security] Failed to get backup history:', {
      error: errorMessage,
      userId: requestingUserId,
      projectId: projectId,
      timestamp: new Date().toISOString(),
    });

    throw new Error('Failed to retrieve backup history');
  }
}

/**
 * Migration script to create audit_log table
 *
 * Run this migration before using the secure functions.
 */
export const CREATE_AUDIT_LOG_TABLE_MIGRATION = `
-- Migration: Create audit_log table
-- Description: Creates audit_log table for security compliance and incident response
-- Created: 2026-01-29
-- Security Audit: US-004 Step 10

CREATE TABLE IF NOT EXISTS control_plane.audit_log (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operation details
  operation VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  backup_id UUID,

  -- Timestamp
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  success BOOLEAN NOT NULL,

  -- Additional details (JSON)
  details JSONB NOT NULL DEFAULT '{}',

  -- Constraints
  CONSTRAINT audit_log_operation_check CHECK (operation IN (
    'record_backup',
    'query_history',
    'mark_expired',
    'mark_deleted',
    'cleanup_expired'
  ))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON control_plane.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON control_plane.audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON control_plane.audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON control_plane.audit_log(operation);

-- Create composite index for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp
  ON control_plane.audit_log(user_id, timestamp DESC);

-- Add comment
COMMENT ON TABLE control_plane.audit_log IS 'Audit log for backup operations - security compliance and incident response';

-- Add retention policy (optional: delete logs older than 1 year)
-- CREATE INDEX IF NOT EXISTS idx_audit_log_cleanup ON control_plane.audit_log(timestamp);
-- Uncomment the following line to enable automatic cleanup
-- DELETE FROM control_plane.audit_log WHERE timestamp < NOW() - INTERVAL '1 year';
`;

/**
 * Usage Example:
 *
 * ```typescript
 * import { recordBackupSecure, getBackupHistorySecure } from './backup-history.security-fixes';
 *
 * // Record a backup with security checks
 * const result = await recordBackupSecure(
 *   {
 *     project_id: 'proj-123',
 *     type: BackupHistoryType.EXPORT,
 *     file_id: 'telegram-file-123',
 *     size: 1024000,
 *   },
 *   'user-456'  // REQUIRED: requesting user ID
 * );
 *
 * if (result.success) {
 *   console.log('Backup recorded:', result.backup.id);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 *
 * // Query backup history with security checks
 * const history = await getBackupHistorySecure(
 *   'proj-123',
 *   'user-456',  // REQUIRED: requesting user ID
 *   { limit: 20, offset: 0 }
 * );
 *
 * console.log('Backup history:', history.data);
 * ```
 */
