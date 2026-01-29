/**
 * Backup Types
 *
 * Type definitions for the backups table in the control_plane schema.
 * These types ensure type-safe backup management throughout the application.
 *
 * US-003: Create Backup History Table
 */

/**
 * Backup type enumeration
 * Defines the types of backups supported in the system
 */
export enum BackupType {
  DATABASE = 'database',
  STORAGE = 'storage',
  LOGS = 'logs'
}

/**
 * Complete backup structure
 * Represents a row in the backups table
 */
export interface Backup {
  id: string;
  project_id: string;
  type: BackupType;
  file_id: string;
  size: number;
  created_at: Date;
  expires_at: Date;
  restore_count?: number;
}

/**
 * Input interface for creating a new backup record
 * All fields except id and timestamps are required
 */
export interface CreateBackupInput {
  project_id: string;
  type: BackupType;
  file_id: string;
  size: number;
  expires_at?: Date; // Optional, defaults to 30 days from creation
}

/**
 * Query parameters for filtering backups
 * Used in API endpoints and search functions
 */
export interface BackupQuery {
  project_id?: string;
  type?: BackupType;
  created_before?: Date;
  created_after?: Date;
  expires_before?: Date;
  expires_after?: Date;
  min_size?: number;
  max_size?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated backup response
 */
export interface BackupResponse {
  data: Backup[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Backup summary statistics
 */
export interface BackupStats {
  total_backups: number;
  total_size: number;
  by_type: {
    database: number;
    storage: number;
    logs: number;
  };
  oldest_backup?: Date;
  newest_backup?: Date;
  expiring_soon: number; // Backups expiring within 7 days
}

/**
 * Backup retention configuration
 */
export interface BackupRetentionConfig {
  default_retention_days: number; // Default: 30 days
  cleanup_enabled: boolean;
  cleanup_interval_hours: number;
  max_backups_per_project: number; // Optional limit per project
}

/**
 * Backup file metadata
 * Additional information about the backup file
 */
export interface BackupFileMetadata {
  filename?: string;
  mime_type?: string;
  checksum?: string;
  compression?: string; // e.g., 'gzip', 'none'
  encrypted: boolean;
}

/**
 * Extended backup interface with file metadata
 * Used when returning detailed backup information
 */
export interface BackupWithMetadata extends Backup {
  metadata?: BackupFileMetadata;
}
