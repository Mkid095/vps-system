/**
 * Admin Actions Types
 *
 * Type definitions for break glass admin actions.
 * These actions track all emergency admin operations with full before/after state capture.
 *
 * US-002: Create Admin Actions Table (Break Glass Mode)
 *
 * @example
 * ```typescript
 * import { AdminAction, CreateAdminActionInput, AdminActionType } from '@nextmavens/audit-logs-database';
 *
 * // Log an admin action
 * const action: CreateAdminActionInput = {
 *   session_id: 'session-uuid-123',
 *   action: AdminActionType.UNLOCK_PROJECT,
 *   target_type: 'project',
 *   target_id: 'project-uuid-456',
 *   before_state: { status: 'SUSPENDED', suspension_reason: 'billing overdue' },
 *   after_state: { status: 'ACTIVE', suspension_reason: null },
 * };
 * ```
 */

/**
 * Admin action record representing a break glass action performed during an emergency session
 */
export interface AdminAction {
  /** Unique identifier for the admin action */
  id: string;

  /** Reference to the admin session that performed this action */
  session_id: string;

  /** Action performed */
  action: AdminActionType;

  /** Type of target that was acted upon */
  target_type: string;

  /** UUID of the specific resource that was acted upon */
  target_id: string | null;

  /** Full system state before the action was performed (JSONB) */
  before_state: Record<string, unknown> | null;

  /** Full system state after the action was performed (JSONB) */
  after_state: Record<string, unknown> | null;

  /** Timestamp of when the admin action was performed */
  created_at: Date;
}

/**
 * Input for creating a new admin action
 */
export interface CreateAdminActionInput {
  /** Reference to the admin session that performed this action */
  session_id: string;

  /** Action performed */
  action: AdminActionType | string;

  /** Type of target that was acted upon (e.g., 'project', 'api_key', 'user', 'system') */
  target_type: string;

  /** UUID of the specific resource that was acted upon (optional for system-wide actions) */
  target_id?: string | null;

  /** Full system state before the action was performed (optional) */
  before_state?: Record<string, unknown> | null;

  /** Full system state after the action was performed (optional) */
  after_state?: Record<string, unknown> | null;
}

/**
 * Query parameters for fetching admin actions
 */
export interface AdminActionQuery {
  /** Filter by session ID */
  session_id?: string;

  /** Filter by action type */
  action?: AdminActionType | string;

  /** Filter by target type */
  target_type?: string;

  /** Filter by target ID */
  target_id?: string;

  /** Filter actions created after this timestamp */
  created_after?: Date;

  /** Filter actions created before this timestamp */
  created_before?: Date;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Order by field (default: created_at) */
  order_by?: 'created_at' | 'action';

  /** Order direction (default: DESC) */
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Response format for admin action queries
 */
export interface AdminActionResponse {
  /** Array of admin actions */
  actions: AdminAction[];

  /** Total count matching the query */
  total: number;

  /** Current page offset */
  offset: number;

  /** Limit used */
  limit: number;
}

/**
 * Admin action enumeration for all break glass powers
 */
export enum AdminActionType {
  /** Unlock a suspended project */
  UNLOCK_PROJECT = 'unlock_project',

  /** Override auto-suspension for a project */
  OVERRIDE_SUSPENSION = 'override_suspension',

  /** Force delete a project immediately */
  FORCE_DELETE = 'force_delete',

  /** Regenerate system keys for a project */
  REGENERATE_KEYS = 'regenerate_keys',

  /** Access any project (bypass ownership checks) */
  ACCESS_PROJECT = 'access_project',

  /** System-wide configuration change */
  SYSTEM_CONFIG_CHANGE = 'system_config_change',

  /** Emergency database intervention */
  DATABASE_INTERVENTION = 'database_intervention',

  /** Manual backup restoration */
  RESTORE_BACKUP = 'restore_backup',

  /** User account modification */
  MODIFY_USER = 'modify_user',

  /** API key manipulation */
  MODIFY_API_KEY = 'modify_api_key',
}

/**
 * Admin action validation result
 */
export interface AdminActionValidation {
  /** Whether the action is valid */
  valid: boolean;

  /** Reason for validation failure (if invalid) */
  reason?: 'session_not_found' | 'session_expired' | 'invalid_action' | 'invalid_target';

  /** The action record (if found) */
  action?: AdminAction;
}

/**
 * Admin action statistics
 */
export interface AdminActionStats {
  /** Total number of admin actions */
  total_actions: number;

  /** Break glass usage by action type */
  by_action_type: Record<string, number>;

  /** Break glass usage by target type */
  by_target_type: {
    [key: string]: number;
  };

  /** Most common targets (frequency count) */
  common_targets: Array<{
    target_type: string;
    target_id: string;
    count: number;
  }>;

  /** Actions in the last 24 hours */
  actions_last_24h: number;

  /** Actions in the last 7 days */
  actions_last_7d: number;

  /** Actions in the last 30 days */
  actions_last_30d: number;
}

/**
 * Admin action with session details
 */
export interface AdminActionWithSession extends AdminAction {
  /** Admin ID from the associated session */
  admin_id: string;

  /** Admin's reason for break glass access */
  session_reason: string;

  /** Access method used for the session */
  access_method: string;

  /** Session expiration timestamp */
  session_expires_at: Date;
}

/**
 * Target history for auditing purposes
 */
export interface TargetHistory {
  /** Target type */
  target_type: string;

  /** Target ID */
  target_id: string;

  /** All actions performed on this target */
  actions: AdminAction[];

  /** Total action count */
  total: number;

  /** First action timestamp */
  first_action_at: Date | null;

  /** Last action timestamp */
  last_action_at: Date | null;
}
