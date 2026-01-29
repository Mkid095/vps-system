/**
 * Audit Log Service
 *
 * Service implementation for creating and querying audit log entries.
 * Provides type-safe interface for audit logging operations.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 */

import type {
  AuditLog,
  CreateAuditLogInput,
  AuditLogQuery,
  AuditLogResponse,
  IAuditLogService,
  ActorType,
} from '../types/audit.types.js';
import { query } from './pool.js';
import { AuditLogError } from './errors.js';

/**
 * PostgreSQL Audit Log Service Implementation
 */
export class AuditLogService implements IAuditLogService {
  private readonly schema: string;

  constructor(schema: string = 'control_plane') {
    this.schema = schema;
  }

  /**
   * Get the fully qualified table name
   */
  private getTableName(): string {
    return `${this.schema}.audit_logs`;
  }

  /**
   * Create a new audit log entry
   */
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const tableName = this.getTableName();
    const queryText = `
      INSERT INTO ${tableName} (
        actor_id, actor_type, action, target_type, target_id,
        metadata, ip_address, user_agent, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      input.actor_id,
      input.actor_type,
      input.action,
      input.target_type,
      input.target_id,
      JSON.stringify(input.metadata || {}),
      input.ip_address || null,
      input.user_agent || null,
      input.request_id || null,
    ];

    try {
      const result = await query(queryText, values);

      if (result.rows.length === 0) {
        throw new AuditLogError('Failed to create audit log entry');
      }

      const row = result.rows[0];
      if (!row) {
        throw new AuditLogError('Failed to create audit log entry - no row returned');
      }

      return this.mapRowToAuditLog(row);
    } catch (error) {
      if (error instanceof AuditLogError) {
        throw error;
      }
      throw new AuditLogError('Failed to create audit log entry', { cause: error });
    }
  }

  /**
   * Find audit logs by actor ID
   */
  async findByActor(actorId: string, queryParam?: AuditLogQuery): Promise<AuditLogResponse> {
    const queryBuilder = this.buildQuery({
      ...queryParam,
      actor_id: actorId,
    });

    return this.executeQuery(queryBuilder);
  }

  /**
   * Find audit logs by target ID
   */
  async findByTarget(targetId: string, queryParam?: AuditLogQuery): Promise<AuditLogResponse> {
    const queryBuilder = this.buildQuery({
      ...queryParam,
      target_id: targetId,
    });

    return this.executeQuery(queryBuilder);
  }

  /**
   * Find audit logs by action
   */
  async findByAction(action: string, queryParam?: AuditLogQuery): Promise<AuditLogResponse> {
    const queryBuilder = this.buildQuery({
      ...queryParam,
      action,
    });

    return this.executeQuery(queryBuilder);
  }

  /**
   * Query audit logs with filters
   */
  async query(queryParam: AuditLogQuery): Promise<AuditLogResponse> {
    const queryBuilder = this.buildQuery(queryParam);
    return this.executeQuery(queryBuilder);
  }

  /**
   * Build SQL query from query parameters
   */
  private buildQuery(queryParam: AuditLogQuery = {}): {
    select: string;
    count: string;
    values: unknown[];
  } {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (queryParam.actor_id) {
      conditions.push(`actor_id = $${paramIndex}`);
      values.push(queryParam.actor_id);
      paramIndex++;
    }

    if (queryParam.action) {
      conditions.push(`action = $${paramIndex}`);
      values.push(queryParam.action);
      paramIndex++;
    }

    if (queryParam.target_type) {
      conditions.push(`target_type = $${paramIndex}`);
      values.push(queryParam.target_type);
      paramIndex++;
    }

    if (queryParam.target_id) {
      conditions.push(`target_id = $${paramIndex}`);
      values.push(queryParam.target_id);
      paramIndex++;
    }

    if (queryParam.request_id) {
      conditions.push(`request_id = $${paramIndex}`);
      values.push(queryParam.request_id);
      paramIndex++;
    }

    if (queryParam.start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(queryParam.start_date);
      paramIndex++;
    }

    if (queryParam.end_date) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(queryParam.end_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Pagination
    const limit = queryParam.limit || 100;
    const offset = queryParam.offset || 0;

    values.push(limit, offset);

    const tableName = this.getTableName();

    const selectQuery = `
      SELECT *
      FROM ${tableName}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${tableName}
      ${whereClause}
    `;

    return {
      select: selectQuery,
      count: countQuery,
      values,
    };
  }

  /**
   * Execute query and return paginated response
   */
  private async executeQuery(queryBuilder: {
    select: string;
    count: string;
    values: unknown[];
  }): Promise<AuditLogResponse> {
    try {
      // Execute count query
      const countResult = await query(queryBuilder.count, queryBuilder.values);
      const countRow = countResult.rows[0] as Record<string, unknown> | undefined;
      const total = parseInt((countRow?.total as string | undefined) || '0', 10);

      // Execute select query
      const selectResult = await query(queryBuilder.select, queryBuilder.values);
      const data = selectResult.rows.map((row) => this.mapRowToAuditLog(row as Record<string, unknown>));

      const limit = queryBuilder.values[queryBuilder.values.length - 2] as number;
      const offset = queryBuilder.values[queryBuilder.values.length - 1] as number;

      return {
        data,
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      };
    } catch (error) {
      throw new AuditLogError('Failed to query audit logs', { cause: error });
    }
  }

  /**
   * Map database row to AuditLog type
   */
  private mapRowToAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      actor_id: row.actor_id as string,
      actor_type: row.actor_type as ActorType,
      action: row.action as string,
      target_type: row.target_type as string,
      target_id: row.target_id as string,
      metadata: ((row.metadata as Record<string, unknown> | undefined) || {}),
      ip_address: row.ip_address as string | null,
      user_agent: row.user_agent as string | null,
      request_id: row.request_id as string | null,
      created_at: row.created_at as Date,
    };
  }
}

/**
 * Default audit log service instance
 */
export const auditLogService = new AuditLogService();
