/**
 * Backup History Types
 *
 * Type definitions for the backup_history table in the control_plane schema.
 * These types ensure type-safe backup history management throughout the application.
 *
 * US-004: Record Backup in History
 */

/**
 * Backup history status enumeration
 * Defines the possible states of a backup record
 */
export enum BackupHistoryStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted'
}

/**
 * Backup history type enumeration
 * Defines the types of backups in the history
 */
export enum BackupHistoryType {
  EXPORT = 'export',
  MANUAL = 'manual'
}

/**
 * Complete backup history structure
 * Represents a row in the backup_history table
 */
export interface BackupHistory {
  /** Unique identifier for the backup history record */
  id: string;

  /** Reference to the project that owns this backup */
  project_id: string;

  /** Backup type: export or manual */
  type: BackupHistoryType;

  /** File reference identifier (Telegram file ID or storage path) */
  file_id: string;

  /** Backup size in bytes */
  size: number;

  /** Current status: active, expired, or deleted */
  status: BackupHistoryStatus;

  /** Timestamp when the backup was created */
  created_at: Date;

  /** Timestamp when the backup expires (default: 30 days from creation) */
  expires_at: Date;
}

/**
 * Input interface for creating a new backup history record
 * All fields except id, status, and timestamps are required
 */
export interface BackupHistoryInput {
  /** Reference to the project that owns this backup */
  project_id: string;

  /** Backup type: export or manual */
  type: BackupHistoryType;

  /** File reference identifier (Telegram file ID or storage path) */
  file_id: string;

  /** Backup size in bytes */
  size: number;

  /** Optional expiration date (defaults to 30 days from creation) */
  expires_at?: Date;

  /** Optional status (defaults to 'active') */
  status?: BackupHistoryStatus;
}

/**
 * Query parameters for filtering backup history
 * Used in API endpoints and search functions
 */
export interface BackupHistoryQuery {
  /** Filter by project ID */
  project_id?: string;

  /** Filter by backup type */
  type?: BackupHistoryType;

  /** Filter by status */
  status?: BackupHistoryStatus;

  /** Filter by creation date range */
  created_before?: Date;
  created_after?: Date;

  /** Filter by expiration date range */
  expires_before?: Date;
  expires_after?: Date;

  /** Filter by size range */
  min_size?: number;
  max_size?: number;

  /** Pagination limit */
  limit?: number;

  /** Pagination offset */
  offset?: number;
}

/**
 * Paginated backup history response
 */
export interface BackupHistoryResponse {
  /** Array of backup history records */
  data: BackupHistory[];

  /** Total number of records matching the query */
  total: number;

  /** Number of records per page */
  limit: number;

  /** Number of records skipped */
  offset: number;

  /** Whether there are more records available */
  has_more: boolean;
}

/**
 * Backup history summary statistics
 */
export interface BackupHistoryStats {
  /** Total number of backup records */
  total_backups: number;

  /** Total size of all backups in bytes */
  total_size: number;

  /** Breakdown by backup type */
  by_type: {
    export: number;
    manual: number;
  };

  /** Breakdown by status */
  by_status: {
    active: number;
    expired: number;
    deleted: number;
  };

  /** Oldest backup timestamp */
  oldest_backup?: Date;

  /** Newest backup timestamp */
  newest_backup?: Date;

  /** Number of backups expiring within 7 days */
  expiring_soon: number;
}

/**
 * Backup history creation result
 * Returned when a backup is successfully recorded
 */
export interface BackupHistoryResult {
  /** The created backup history record */
  backup: BackupHistory;

  /** Success flag */
  success: boolean;

  /** Optional error message if creation failed */
  error?: string;
}
