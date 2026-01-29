/**
 * Database Connection Pool
 *
 * PostgreSQL connection pool configuration for audit logs service.
 * Provides efficient connection management and query execution.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

/**
 * Database pool configuration
 */
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

/**
 * Database connection pool singleton
 */
class DatabasePool {
  private pool: Pool | null = null;
  private config: PoolConfig;

  constructor() {
    this.config = this.getConfig();
  }

  /**
   * Get database configuration from environment variables
   */
  private getConfig(): PoolConfig {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (DATABASE_URL) {
      return { connectionString: DATABASE_URL };
    }

    const host = process.env.AUDIT_LOGS_DB_HOST || 'localhost';
    const port = parseInt(process.env.AUDIT_LOGS_DB_PORT || '5432', 10);
    const database = process.env.AUDIT_LOGS_DB_NAME || 'postgres';
    const user = process.env.AUDIT_LOGS_DB_USER || 'postgres';
    const password = process.env.AUDIT_LOGS_DB_PASSWORD;

    if (!password) {
      throw new Error(
        'Database password not set. Set DATABASE_URL or AUDIT_LOGS_DB_PASSWORD environment variable.'
      );
    }

    return {
      host,
      port,
      database,
      user,
      password,
      max: parseInt(process.env.AUDIT_LOGS_DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.AUDIT_LOGS_DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.AUDIT_LOGS_DB_CONN_TIMEOUT || '2000', 10),
    };
  }

  /**
   * Get or create connection pool
   */
  getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool(this.config);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
      });

      // Log pool connection events
      this.pool.on('connect', () => {
        // Silent on connect to avoid noise
      });

      this.pool.on('remove', () => {
        // Silent on remove to avoid noise
      });
    }

    return this.pool;
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
    const pool = this.getPool();
    return pool.query<T>(text, values);
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient() {
    const pool = this.getPool();
    return pool.connect();
  }

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const pool = this.getPool();
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

/**
 * Global database pool instance
 */
const dbPool = new DatabasePool();

/**
 * Get the database pool instance
 */
export function getPool(): Pool {
  return dbPool.getPool();
}

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
  return dbPool.query<T>(text, values);
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
  return dbPool.getClient();
}

/**
 * Close database connections
 */
export async function closeDatabase(): Promise<void> {
  await dbPool.close();
}

/**
 * Get database pool statistics
 */
export function getDatabaseStats() {
  return dbPool.getStats();
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check');
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row?.health_check === 1;
  } catch {
    return false;
  }
}
