/**
 * Admin Sessions Types
 *
 * Type definitions for break glass admin sessions.
 * These sessions track emergency admin access with time-limited expiration.
 *
 * US-001: Create Admin Sessions Table (Break Glass Mode)
 *
 * @example
 * ```typescript
 * import { AdminSession, CreateAdminSessionInput, AccessMethod } from '@nextmavens/audit-logs-database';
 *
 * // Create a break glass session
 * const session: CreateAdminSessionInput = {
 *   admin_id: 'admin-uuid-123',
 *   reason: 'Production incident - locked out of project',
 *   access_method: AccessMethod.OTP,
 *   granted_by: 'super-admin-uuid-456',
 * };
 * ```
 */

/**
 * Admin session record representing a break glass access session
 */
export interface AdminSession {
  /** Unique identifier for the admin session */
  id: string;

  /** UUID of the admin who initiated the break glass session */
  admin_id: string;

  /** Reason for requiring break glass access */
  reason: string;

  /** Method used to authenticate */
  access_method: AccessMethod;

  /** UUID of the admin who approved this break glass session (optional) */
  granted_by: string | null;

  /** Session expiration timestamp (default 1 hour from creation) */
  expires_at: Date;

  /** Timestamp of when the break glass session was created */
  created_at: Date;
}

/**
 * Input for creating a new admin session
 */
export interface CreateAdminSessionInput {
  /** UUID of the admin who initiated the break glass session */
  admin_id: string;

  /** Reason for requiring break glass access (required, min 10 chars) */
  reason: string;

  /** Method used to authenticate */
  access_method: AccessMethod;

  /** UUID of the admin who approved this break glass session (optional) */
  granted_by?: string;

  /** Custom expiration time (optional, defaults to 1 hour from creation) */
  expires_at?: Date;
}

/**
 * Query parameters for fetching admin sessions
 */
export interface AdminSessionQuery {
  /** Filter by admin ID */
  admin_id?: string;

  /** Filter by access method */
  access_method?: AccessMethod;

  /** Filter by granted_by */
  granted_by?: string;

  /** Filter by active sessions (not expired) */
  active?: boolean;

  /** Filter by expired sessions */
  expired?: boolean;

  /** Filter sessions created after this timestamp */
  created_after?: Date;

  /** Filter sessions created before this timestamp */
  created_before?: Date;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Order by field (default: created_at) */
  order_by?: 'created_at' | 'expires_at';

  /** Order direction (default: DESC) */
  order_direction?: 'ASC' | 'DESC';
}

/**
 * Response format for admin session queries
 */
export interface AdminSessionResponse {
  /** Array of admin sessions */
  sessions: AdminSession[];

  /** Total count matching the query */
  total: number;

  /** Current page offset */
  offset: number;

  /** Limit used */
  limit: number;
}

/**
 * Access method enumeration for break glass authentication
 */
export enum AccessMethod {
  /** Hardware key (e.g., YubiKey) authentication */
  HARDWARE_KEY = 'hardware_key',

  /** One-time password / TOTP authentication */
  OTP = 'otp',

  /** Emergency code authentication (last resort) */
  EMERGENCY_CODE = 'emergency_code',
}

/**
 * Admin session validation result
 */
export interface AdminSessionValidation {
  /** Whether the session is valid */
  valid: boolean;

  /** Reason for validation failure (if invalid) */
  reason?: 'expired' | 'not_found' | 'invalid_format';

  /** The session record (if found) */
  session?: AdminSession;

  /** Time until expiration (in seconds, if valid) */
  expires_in_seconds?: number;
}

/**
 * Admin session statistics
 */
export interface AdminSessionStats {
  /** Total number of break glass sessions */
  total_sessions: number;

  /** Number of active sessions (not expired) */
  active_sessions: number;

  /** Number of expired sessions */
  expired_sessions: number;

  /** Break glass usage by access method */
  by_access_method: {
    [key in AccessMethod]: number;
  };

  /** Average session duration (in seconds) */
  avg_duration_seconds: number;

  /** Most common reason (frequency count) */
  common_reasons: Array<{
    reason: string;
    count: number;
  }>;
}
