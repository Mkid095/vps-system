/**
 * Backup History Data Layer
 *
 * Provides functions for recording and managing backup history records.
 * All functions use parameterized queries for SQL injection prevention.
 *
 * US-004: Record Backup in History
 */

import { v4 as uuidv4 } from 'uuid';
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
 * Validate project_id UUID format
 */
function validateProjectId(projectId: string): void {
  if (typeof projectId !== 'string') {
    throw new Error('Project ID must be a string');
  }
  if (projectId.trim().length === 0) {
    throw new Error('Project ID cannot be empty');
  }
  // Check if it's a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    throw new Error('Project ID must be a valid UUID');
  }
}

/**
 * Validate backup type
 */
function validateBackupType(type: BackupHistoryType): void {
  if (typeof type !== 'string') {
    throw new Error('Backup type must be a string');
  }
  const validTypes = ['export', 'manual'];
  if (!validTypes.includes(type)) {
    throw new Error('Backup type must be either "export" or "manual"');
  }
}

/**
 * Validate file_id
 */
function validateFileId(fileId: string): void {
  if (typeof fileId !== 'string') {
    throw new Error('File ID must be a string');
  }
  if (fileId.trim().length === 0) {
    throw new Error('File ID cannot be empty');
  }
  if (fileId.length > VALIDATION.MAX_FILE_ID_LENGTH) {
    throw new Error(`File ID cannot exceed ${VALIDATION.MAX_FILE_ID_LENGTH} characters`);
  }
}

/**
 * Validate backup size
 */
function validateBackupSize(size: number): void {
  if (typeof size !== 'number') {
    throw new Error('Backup size must be a number');
  }
  if (!Number.isInteger(size)) {
    throw new Error('Backup size must be an integer');
  }
  if (size < VALIDATION.MIN_BACKUP_SIZE) {
    throw new Error(`Backup size must be at least ${VALIDATION.MIN_BACKUP_SIZE} bytes`);
  }
  if (size > VALIDATION.MAX_BACKUP_SIZE) {
    throw new Error(`Backup size cannot exceed ${VALIDATION.MAX_BACKUP_SIZE} bytes (10GB)`);
  }
}

/**
 * Validate backup status
 */
function validateBackupStatus(status: BackupHistoryStatus): void {
  if (typeof status !== 'string') {
    throw new Error('Backup status must be a string');
  }
  const validStatuses = ['active', 'expired', 'deleted'];
  if (!validStatuses.includes(status)) {
    throw new Error('Backup status must be one of: active, expired, deleted');
  }
}

/**
 * Validate pagination parameters
 */
function validatePagination(limit?: number, offset?: number): void {
  if (limit !== undefined) {
    if (!Number.isInteger(limit)) {
      throw new Error('Limit must be an integer');
    }
    if (limit < 1) {
      throw new Error('Limit must be at least 1');
    }
    if (limit > VALIDATION.MAX_LIMIT) {
      throw new Error(`Limit cannot exceed ${VALIDATION.MAX_LIMIT}`);
    }
  }

  if (offset !== undefined) {
    if (!Number.isInteger(offset)) {
      throw new Error('Offset must be an integer');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }
    if (offset > VALIDATION.MAX_OFFSET) {
      throw new Error(`Offset cannot exceed ${VALIDATION.MAX_OFFSET}`);
    }
  }
}

/**
 * Validate date range
 */
function validateDateRange(date: Date, fieldName: string): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid Date object`);
  }
}

/**
 * Record a new backup in history
 *
 * @param input - Backup history input data
 * @returns The created backup record with metadata
 *
 * @example
 * ```typescript
 * const result = await recordBackup({
 *   project_id: 'proj-123',
 *   type: BackupHistoryType.EXPORT,
 *   file_id: 'telegram-file-123',
 *   size: 1024000,
 * });
 * ```
 */
export async function recordBackup(input: BackupHistoryInput): Promise<BackupHistoryResult> {
  // Validate inputs
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

  // Generate a unique backup ID
  const id = uuidv4();

  // Calculate expiration date (30 days from now if not provided)
  const expiresAt = input.expires_at
    ? input.expires_at
    : new Date(Date.now() + VALIDATION.DEFAULT_EXPIRATION_MS);

  // Default status to active if not provided
  const status = input.status || 'active';

  // Insert backup record
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

  try {
    const result = await query(queryText, values);
    const row = result.rows[0];

    if (!row) {
      return {
        backup: {} as BackupHistory,
        success: false,
        error: 'Failed to create backup record',
      };
    }

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
    // Log error but don't expose internal details
    console.error('Failed to record backup:', error);
    return {
      backup: {} as BackupHistory,
      success: false,
      error: 'Failed to record backup',
    };
  }
}

/**
 * Get backup history for a project with optional filtering
 *
 * @param projectId - The project ID to query backups for
 * @param options - Optional query parameters for filtering and pagination
 * @returns Paginated backup history results
 *
 * @example
 * ```typescript
 * // Get all backups for a project
 * const result = await getBackupHistory('proj-123');
 *
 * // Get active export backups with pagination
 * const filtered = await getBackupHistory('proj-123', {
 *   type: BackupHistoryType.EXPORT,
 *   status: BackupHistoryStatus.ACTIVE,
 *   limit: 20,
 *   offset: 0,
 * });
 * ```
 */
export async function getBackupHistory(
  projectId: string,
  options: BackupHistoryQuery = {}
): Promise<BackupHistoryResponse> {
  // Validate project ID
  validateProjectId(projectId);

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

  try {
    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([
      query(countQuery, values.slice(0, paramIndex - 2)),
      query(dataQuery, values),
    ]);

    const countRow = countResult.rows[0];
    const total = countRow ? parseInt(countRow.total || '0', 10) : 0;
    const hasMore = offset + limit < total;

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
    console.error('Failed to get backup history:', error);
    throw new Error('Failed to retrieve backup history');
  }
}

/**
 * Get a single backup by ID
 *
 * @param id - The backup ID
 * @returns The backup record or null if not found
 *
 * @example
 * ```typescript
 * const backup = await getBackupById('backup-123');
 * if (backup) {
 *   console.log('Backup size:', backup.size);
 * }
 * ```
 */
export async function getBackupById(id: string): Promise<BackupHistory | null> {
  if (typeof id !== 'string') {
    throw new Error('Backup ID must be a string');
  }
  if (id.trim().length === 0) {
    throw new Error('Backup ID cannot be empty');
  }

  const queryText = `
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
    WHERE id = $1
  `;

  try {
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      project_id: row.project_id,
      type: row.type as BackupHistoryType,
      file_id: row.file_id,
      size: row.size,
      status: row.status as BackupHistoryStatus,
      created_at: row.created_at,
      expires_at: row.expires_at,
    };
  } catch (error) {
    console.error('Failed to get backup by ID:', error);
    throw new Error('Failed to retrieve backup');
  }
}

/**
 * Mark a backup as expired
 *
 * @param id - The backup ID
 * @returns True if updated, false if not found
 *
 * @example
 * ```typescript
 * const updated = await markBackupExpired('backup-123');
 * if (updated) {
 *   console.log('Backup marked as expired');
 * }
 * ```
 */
export async function markBackupExpired(id: string): Promise<boolean> {
  if (typeof id !== 'string') {
    throw new Error('Backup ID must be a string');
  }
  if (id.trim().length === 0) {
    throw new Error('Backup ID cannot be empty');
  }

  const queryText = `
    UPDATE control_plane.backup_history
    SET status = 'expired'
    WHERE id = $1 AND status != 'deleted'
    RETURNING id
  `;

  try {
    const result = await query(queryText, [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to mark backup as expired:', error);
    throw new Error('Failed to update backup status');
  }
}

/**
 * Mark a backup as deleted
 *
 * @param id - The backup ID
 * @returns True if updated, false if not found
 *
 * @example
 * ```typescript
 * const updated = await markBackupDeleted('backup-123');
 * if (updated) {
 *   console.log('Backup marked as deleted');
 * }
 * ```
 */
export async function markBackupDeleted(id: string): Promise<boolean> {
  if (typeof id !== 'string') {
    throw new Error('Backup ID must be a string');
  }
  if (id.trim().length === 0) {
    throw new Error('Backup ID cannot be empty');
  }

  const queryText = `
    UPDATE control_plane.backup_history
    SET status = 'deleted'
    WHERE id = $1 AND status != 'deleted'
    RETURNING id
  `;

  try {
    const result = await query(queryText, [id]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to mark backup as deleted:', error);
    throw new Error('Failed to update backup status');
  }
}

/**
 * Cleanup expired backups
 *
 * Finds all backups where expires_at < NOW() and status = 'active',
 * then updates their status to 'expired'.
 *
 * @returns Count of expired backups and list of IDs
 *
 * @example
 * ```typescript
 * const result = await cleanupExpiredBackups();
 * console.log(`Expired ${result.count} backups:`, result.ids);
 * ```
 */
export async function cleanupExpiredBackups(): Promise<{ count: number; ids: string[] }> {
  const queryText = `
    UPDATE control_plane.backup_history
    SET status = 'expired'
    WHERE expires_at < NOW() AND status = 'active'
    RETURNING id
  `;

  try {
    const result = await query(queryText);

    return {
      count: result.rows.length,
      ids: result.rows.map((row) => row.id),
    };
  } catch (error) {
    console.error('Failed to cleanup expired backups:', error);
    throw new Error('Failed to cleanup expired backups');
  }
}
