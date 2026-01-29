#!/usr/bin/env node

/**
 * Migration Runner
 *
 * Simple PostgreSQL migration runner for audit logs database schema.
 *
 * Usage:
 *   node migrate.js up    # Run all pending migrations
 *   node migrate.js down  # Rollback last migration
 *   node migrate.js status # Show migration status
 *
 * Environment Variables:
 *   DATABASE_URL: PostgreSQL connection string
 *   AUDIT_LOGS_DB_HOST: Database host (default: localhost)
 *   AUDIT_LOGS_DB_PORT: Database port (default: 5432)
 *   AUDIT_LOGS_DB_NAME: Database name (default: postgres)
 *   AUDIT_LOGS_DB_USER: Database user (default: postgres)
 *   AUDIT_LOGS_DB_PASSWORD: Database password (required)
 */

import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

interface Migration {
  id: string;
  name: string;
  filename: string;
  up: string;
}

/**
 * Get database connection from environment variables
 */
function getConnectionConfig() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (DATABASE_URL) {
    return DATABASE_URL;
  }

  const host = process.env.AUDIT_LOGS_DB_HOST || 'localhost';
  const port = parseInt(process.env.AUDIT_LOGS_DB_PORT || '5432', 10);
  const database = process.env.AUDIT_LOGS_DB_NAME || 'postgres';
  const user = process.env.AUDIT_LOGS_DB_USER || 'postgres';
  const password = process.env.AUDIT_LOGS_DB_PASSWORD;

  if (!password) {
    console.error('ERROR: Database password not set');
    console.error('Set DATABASE_URL or AUDIT_LOGS_DB_PASSWORD environment variable');
    process.exit(1);
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

/**
 * Create migrations table if it doesn't exist
 */
async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_id TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Load all migration files
 */
function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname, 'migrations');

  try {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files.map((filename): Migration => {
      const filepath = join(migrationsDir, filename);
      const content = readFileSync(filepath, 'utf-8');
      const match = filename.match(/^(\d+)_(.+)\.sql$/);

      if (!match) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }

      return {
        id: match[1] as string,
        name: match[2] as string,
        filename,
        up: content
      };
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error('ERROR: Migrations directory not found');
      console.error('Expected directory:', migrationsDir);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations(client: Client): Promise<Set<string>> {
  const result = await client.query('SELECT migration_id FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.migration_id));
}

/**
 * Run pending migrations
 */
async function up(): Promise<void> {
  console.log('Running migrations...\n');

  const client = new Client(getConnectionConfig());

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await ensureMigrationsTable(client);

    const migrations = loadMigrations();
    const executed = await getExecutedMigrations(client);

    const pending = migrations.filter((m) => !executed.has(m.id));

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s)\n`);

    for (const migration of pending) {
      console.log(`Running migration: ${migration.filename}`);

      try {
        await client.query('BEGIN');

        await client.query(migration.up);

        await client.query({
          text: 'INSERT INTO schema_migrations (migration_id) VALUES ($1)',
          values: [migration.id]
        });

        await client.query('COMMIT');

        console.log(`  ✓ Migration completed: ${migration.filename}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Migration failed: ${migration.filename}`);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  } finally {
    await client.end();
  }
}

/**
 * Show migration status
 */
async function status(): Promise<void> {
  console.log('Checking migration status...\n');

  const client = new Client(getConnectionConfig());

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await ensureMigrationsTable(client);

    const migrations = loadMigrations();
    const executed = await getExecutedMigrations(client);

    console.log('Migration Status:\n');
    console.log('ID   Status  Name');
    console.log('---  ------  ----');

    for (const migration of migrations) {
      const status = executed.has(migration.id) ? '✓ Done' : '○ Pending';
      console.log(`${migration.id.padEnd(4)} ${status.padEnd(7)} ${migration.name}`);
    }

    console.log(`\nTotal: ${executed.size}/${migrations.length} executed`);
  } finally {
    await client.end();
  }
}

/**
 * Main entry point
 */
async function main() {
  const command = process.argv[2] || 'up';

  switch (command) {
    case 'up':
      await up();
      break;
    case 'status':
      await status();
      break;
    default:
      console.error('Unknown command:', command);
      console.error('\nUsage: node migrate.js [up|status]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nMigration failed:', error.message);
  process.exit(1);
});
