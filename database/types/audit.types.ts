/**
 * Audit Log Types
 *
 * Type definitions for the audit_logs table in the control_plane schema.
 * These types ensure type-safe audit logging throughout the application.
 *
 * US-001: Create Audit Logs Table
 */

/**
 * Actor type enumeration
 * Defines who can perform actions in the system
 */
export enum ActorType {
  USER = 'user',
  PROJECT = 'project',
  SYSTEM = 'system',
  API_KEY = 'api_key'
}

/**
 * Target type enumeration
 * Defines the types of resources that can be audited
 */
export enum TargetType {
  PROJECT = 'project',
  USER = 'user',
  API_KEY = 'api_key',
  SECRET = 'secret',
  JOB = 'job',
  ORGANIZATION = 'organization',
  TEAM = 'team',
  ADMIN_SESSION = 'admin_session'
}

/**
 * Action enumeration
 * Defines the types of actions that can be logged
 */
export enum AuditAction {
  // Project actions
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  PROJECT_SUSPENDED = 'project.suspended',
  PROJECT_AUTO_SUSPENDED = 'project.auto_suspended',

  // API Key actions
  KEY_CREATED = 'key.created',
  KEY_ROTATED = 'key.rotated',
  KEY_REVOKED = 'key.revoked',

  // User actions
  USER_INVITED = 'user.invited',
  USER_REMOVED = 'user.removed',
  USER_ROLE_CHANGED = 'user.role_changed',

  // Secret actions
  SECRET_CREATED = 'secret.created',
  SECRET_ACCESSED = 'secret.accessed',
  SECRET_ROTATED = 'secret.rotated'
}

/**
 * Audit log metadata structure
 * Additional context information stored as JSONB
 */
export interface AuditLogMetadata {
  [key: string]: unknown;
  // Common metadata fields
  changes?: Record<string, unknown>;
  reason?: string;
  hard_cap_exceeded?: boolean;
  key_type?: string;
  scopes?: string[];
  role?: string;
  organization?: string;
  secret_name?: string;
  old_value?: unknown;
  new_value?: unknown;
}

/**
 * Complete audit log entry structure
 * Represents a row in the audit_logs table
 */
export interface AuditLog {
  id: string;
  actor_id: string;
  actor_type: ActorType;
  action: AuditAction | string; // Allow custom actions
  target_type: TargetType | string; // Allow custom targets
  target_id: string;
  metadata: AuditLogMetadata;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: Date;
}

/**
 * Input interface for creating a new audit log entry
 * All fields except id and created_at are required
 */
export interface CreateAuditLogInput {
  actor_id: string;
  actor_type: ActorType;
  action: AuditAction | string;
  target_type: TargetType | string;
  target_id: string;
  metadata?: AuditLogMetadata;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
}

/**
 * Query parameters for filtering audit logs
 * Used in API endpoints and search functions
 */
export interface AuditLogQuery {
  actor_id?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  request_id?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Paginated audit log response
 */
export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Request context for automatic IP and user agent extraction
 */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Audit log service interface
 * Defines the contract for audit logging operations
 */
export interface IAuditLogService {
  create(input: CreateAuditLogInput): Promise<AuditLog>;
  findByActor(actorId: string, query?: AuditLogQuery): Promise<AuditLogResponse>;
  findByTarget(targetId: string, query?: AuditLogQuery): Promise<AuditLogResponse>;
  findByAction(action: string, query?: AuditLogQuery): Promise<AuditLogResponse>;
  query(query: AuditLogQuery): Promise<AuditLogResponse>;
}
