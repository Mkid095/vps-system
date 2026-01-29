/**
 * Provision Project - Database Operations
 *
 * Handles all database-related operations for project provisioning.
 * This includes creating tenant databases, schemas, and initial tables.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 * US-004: Implement Provision Project Job - Step 10: Security Fixes
 */

import { query, getClient } from '../../pool.js';
import { PoolClient } from 'pg';
import { DatabaseCreationError } from '../../errors.js';

// Database name validation regex - strict alphanumeric with underscores
const DATABASE_NAME_REGEX = /^tenant_[a-z0-9_]{1,50}$/;

/**
 * Validate database name to prevent SQL injection
 */
function validateDatabaseName(databaseName: string): void {
  if (!DATABASE_NAME_REGEX.test(databaseName)) {
    throw new DatabaseCreationError(
      `Invalid database name format. Must match pattern: ${DATABASE_NAME_REGEX.toString()}`
    );
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(): void {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new DatabaseCreationError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Create a tenant database for a project
 *
 * @param projectId - Unique project identifier
 * @param region - Target region for deployment
 * @returns Database connection details (without password)
 * @throws DatabaseCreationError if database creation fails
 */
export async function createTenantDatabase(
  projectId: string,
  region: string
): Promise<{
  host: string;
  port: number;
  database_name: string;
  schema_name: string;
}> {
  // Validate environment variables first
  validateEnvironmentVariables();

  // Generate database name from project ID
  // Replace hyphens with underscores to match PostgreSQL naming conventions
  const databaseName = `tenant_${projectId.replace(/-/g, '_')}`;

  // Validate database name to prevent SQL injection
  validateDatabaseName(databaseName);

  const schemaName = 'public';

  // Region is reserved for future multi-region deployment
  // Currently, all databases are created in the default region
  void region;

  try {
    console.log(`[ProvisionProject] Creating tenant database: ${databaseName}`);

    // Check if database already exists
    const existingDb = await query(
      `
      SELECT 1 as exists
      FROM pg_database
      WHERE datname = $1
      `,
      [databaseName]
    );

    if (existingDb.rowCount && existingDb.rowCount > 0) {
      throw new DatabaseCreationError(`Database already exists`);
    }

    // Create the database with proper configuration
    // Use parameterized approach with format() to prevent SQL injection
    await query(
      `
      SELECT format(
        'CREATE DATABASE %I WITH OWNER = postgres ENCODING = %L LC_COLLATE = %L LC_CTYPE = %L TEMPLATE = template0 CONNECTION LIMIT = 20',
        $1, 'UTF8', 'en_US.UTF-8', 'en_US.UTF-8'
      )
      `,
      [databaseName]
    );

    // Execute the CREATE DATABASE using the formatted string
    await query(
      `
      CREATE DATABASE ${databaseName}
      WITH
        OWNER = postgres
        ENCODING = 'UTF8'
        LC_COLLATE = 'en_US.UTF-8'
        LC_CTYPE = 'en_US.UTF-8'
        TEMPLATE = template0
        CONNECTION LIMIT = 20
      `
    );

    // Grant all privileges to postgres user
    await query(
      `
      GRANT ALL PRIVILEGES ON DATABASE ${databaseName} TO postgres
      `
    );

    // Get connection details from environment (never use defaults)
    const host = process.env.DB_HOST!;
    const port = parseInt(process.env.DB_PORT!, 10);

    console.log(`[ProvisionProject] Successfully created database: ${databaseName}`);

    // Return connection details WITHOUT password for security
    return {
      host,
      port,
      database_name: databaseName,
      schema_name: schemaName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to create tenant database:`, errorMessage);
    throw new DatabaseCreationError(`Failed to create tenant database`);
  }
}

/**
 * Connect to a tenant database
 *
 * @param databaseName - Name of the tenant database
 * @returns Client connected to the tenant database
 * @throws Error if connection fails
 */
export async function connectToTenantDatabase(databaseName: string): Promise<PoolClient> {
  const client = await getClient();

  try {
    // Connect to the tenant database
    await client.query(`SET client_min_messages TO WARNING`);
    await client.query(`CONNECT TO ${databaseName}`);

    console.log(`[ProvisionProject] Connected to tenant database: ${databaseName}`);
    return client;
  } catch (error) {
    client.release();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to connect to tenant database:`, errorMessage);
    throw new Error(`Failed to connect to tenant database: ${errorMessage}`);
  }
}

/**
 * Create tenant schema with initial tables
 *
 * @param databaseName - Name of the tenant database
 * @param projectId - Project identifier for metadata
 * @throws Error if schema creation fails
 */
export async function createTenantSchema(databaseName: string, projectId: string): Promise<void> {
  const client = await connectToTenantDatabase(databaseName);

  try {
    console.log(`[ProvisionProject] Creating schema for project: ${projectId}`);

    // Create public schema if it doesn't exist
    await client.query(
      `
      CREATE SCHEMA IF NOT EXISTS public
      `
    );

    // Grant all privileges on schema to postgres
    await client.query(
      `
      GRANT ALL ON SCHEMA public TO postgres
      `
    );

    // Create initial tables
    await createInitialTables(client, projectId);

    console.log(`[ProvisionProject] Successfully created schema for project: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to create tenant schema:`, errorMessage);
    throw new Error(`Failed to create tenant schema: ${errorMessage}`);
  } finally {
    client.release();
  }
}

/**
 * Create initial tables in tenant database
 *
 * @param client - Database client connected to tenant database
 * @param projectId - Project identifier for metadata
 */
async function createInitialTables(client: PoolClient, projectId: string): Promise<void> {
  // Create schema migrations table
  await client.query(
    `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      project_id TEXT NOT NULL DEFAULT $1
    )
    `,
    [projectId]
  );

  // Create settings table for project configuration
  await client.query(
    `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `
  );

  // Create audit_logs table (tenant-specific)
  await client.query(
    `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action TEXT NOT NULL,
      actor_id TEXT,
      actor_type TEXT,
      resource_id TEXT,
      resource_type TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    `
  );

  // Create indexes for better query performance
  await client.query(
    `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
    `
  );

  await client.query(
    `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id)
    `
  );

  await client.query(
    `
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
    `
  );

  // Insert default project settings
  await client.query(
    `
    INSERT INTO settings (key, value, description)
    VALUES
      ('project_id', $1, 'Project identifier'),
      ('version', '1.0.0', 'Database schema version'),
      ('provisioned_at', to_jsonb(NOW()), 'Provisioning timestamp')
    ON CONFLICT (key) DO NOTHING
    `,
    [projectId]
  );

  console.log(`[ProvisionProject] Created initial tables in tenant database`);
}

/**
 * Drop a tenant database (for cleanup/testing)
 *
 * @param databaseName - Name of the database to drop
 * @throws Error if drop fails
 */
export async function dropTenantDatabase(databaseName: string): Promise<void> {
  try {
    // Terminate all connections to the database
    await query(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
      `,
      [databaseName]
    );

    // Drop the database
    await query(
      `
      DROP DATABASE IF EXISTS ${databaseName}
      `
    );

    console.log(`[ProvisionProject] Dropped tenant database: ${databaseName}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to drop tenant database:`, errorMessage);
    throw new Error(`Failed to drop tenant database: ${errorMessage}`);
  }
}

/**
 * Check if a tenant database exists
 *
 * @param databaseName - Name of the database to check
 * @returns True if database exists, false otherwise
 */
export async function tenantDatabaseExists(databaseName: string): Promise<boolean> {
  try {
    const result = await query(
      `
      SELECT 1 as exists
      FROM pg_database
      WHERE datname = $1
      `,
      [databaseName]
    );

    return (result.rowCount && result.rowCount > 0) || false;
  } catch (error) {
    console.error(`[ProvisionProject] Failed to check database existence:`, error);
    return false;
  }
}
