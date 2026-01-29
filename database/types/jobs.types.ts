/**
 * Job Types
 *
 * Type definitions for the jobs table in the control_plane schema.
 * These types ensure type-safe job management throughout the application.
 *
 * US-001: Create Jobs Database Table
 */

/**
 * Job status enumeration
 * Defines the possible states of a background job
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FAILED = 'failed',
  COMPLETED = 'completed'
}

/**
 * Job type enumeration
 * Defines the types of background jobs in the system
 */
export enum JobType {
  // Project management
  PROVISION_PROJECT = 'provision_project',
  SUSPEND_PROJECT = 'suspend_project',
  DELETE_PROJECT = 'delete_project',

  // Key management
  ROTATE_KEY = 'rotate_key',
  REVOKE_KEY = 'revoke_key',

  // Webhooks
  DELIVER_WEBHOOK = 'deliver_webhook',

  // Backup and maintenance
  EXPORT_BACKUP = 'export_backup',
  CLEANUP_OLD_BACKUPS = 'cleanup_old_backups',

  // Monitoring and enforcement
  CHECK_USAGE_LIMITS = 'check_usage_limits',
  AUTO_SUSPEND = 'auto_suspend',

  // Notifications
  SEND_NOTIFICATION = 'send_notification'
}

/**
 * Job payload structure
 * Additional job parameters stored as JSONB
 */
export interface JobPayload {
  [key: string]: unknown;
  // Common payload fields
  project_id?: string;
  user_id?: string;
  webhook_url?: string;
  webhook_id?: string;
  key_id?: string;
  delay?: number; // milliseconds
  priority?: number; // higher = more important
}

/**
 * Complete job structure
 * Represents a row in the jobs table
 */
export interface Job {
  id: string;
  project_id: string;
  type: JobType | string; // Allow custom job types
  payload: JobPayload;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

/**
 * Input interface for creating a new job
 * All fields except id, attempts, and timestamps are required or have defaults
 */
export interface CreateJobInput {
  project_id: string;
  type: JobType | string;
  payload?: JobPayload;
  scheduled_at?: Date;
  max_attempts?: number;
}

/**
 * Query parameters for filtering jobs
 * Used in API endpoints and search functions
 */
export interface JobQuery {
  type?: string;
  status?: JobStatus;
  scheduled_before?: Date;
  scheduled_after?: Date;
  created_before?: Date;
  created_after?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Paginated job response
 */
export interface JobResponse {
  data: Job[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Job execution result
 * Returned by job handlers after processing
 */
export interface JobExecutionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Job handler function type
 * Defines the contract for job execution handlers
 */
export type JobHandler = (payload: JobPayload) => Promise<JobExecutionResult>;

/**
 * Job handler registry
 * Maps job types to their handler functions
 */
export interface JobHandlerRegistry {
  [jobType: string]: JobHandler;
}

/**
 * Worker configuration options
 */
export interface WorkerOptions {
  pollInterval?: number; // milliseconds
  maxConcurrentJobs?: number;
  timeout?: number; // milliseconds per job
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  max_attempts: number;
  backoff_multiplier: number;
  initial_delay: number; // milliseconds
}
