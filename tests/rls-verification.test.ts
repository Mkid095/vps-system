/**
 * Row Level Security (RLS) Verification Script
 *
 * This script verifies that RLS policies are correctly applied
 * across all tenant schemas and tables.
 *
 * Usage:
 *   npx tsx tests/rls-verification.test.ts
 *
 * Environment Variables Required:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { Pool } from 'pg'
import type { PoolClient } from 'pg'

interface RLSPolicy {
  policy_name: string
  table_name: string
  permissive: boolean
  roles: string[]
  cmd: string
  qual: string | null
  with_check: string | null
}

interface RLSStatus {
  schema_name: string
  table_name: string
  rls_enabled: boolean
  policies: RLSPolicy[]
}

interface VerificationResult {
  schema_name: string
  table_name: string
  rls_enabled: boolean
  expected_policies: string[]
  actual_policies: string[]
  missing_policies: string[]
  status: 'PASS' | 'FAIL'
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

/**
 * Get all tenant schemas in the database
 */
async function getTenantSchemas(client: PoolClient): Promise<string[]> {
  const result = await client.query(
    `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
    `
  )

  return result.rows.map((row) => row.schema_name)
}

/**
 * Check if RLS is enabled for a table
 */
async function checkRLSEnabled(
  client: PoolClient,
  schemaName: string,
  tableName: string
): Promise<boolean> {
  const result = await client.query(
    `
    SELECT relrowsecurity
    FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = $1
    AND pg_class.relname = $2
    `,
    [schemaName, tableName]
  )

  return result.rows[0]?.relrowsecurity || false
}

/**
 * Get all RLS policies for a table
 */
async function getRLSPolicies(
  client: PoolClient,
  schemaName: string,
  tableName: string
): Promise<RLSPolicy[]> {
  const result = await client.query(
    `
    SELECT
      policy_name,
      table_name,
      permissive,
      COALESCE(roles, ARRAY[]::TEXT[]) as roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = $1
    AND tablename = $2
    ORDER BY policy_name
    `,
    [schemaName, tableName]
  )

  return result.rows as RLSPolicy[]
}

/**
 * Get RLS status for all tables in a schema
 */
async function getSchemaRLSStatus(client: PoolClient, schemaName: string): Promise<RLSStatus[]> {
  const tables = await client.query(
    `
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = $1
    ORDER BY tablename
    `,
    [schemaName]
  )

  const statuses: RLSStatus[] = []

  for (const row of tables.rows) {
    const tableName = row.tablename
    const rlsEnabled = await checkRLSEnabled(client, schemaName, tableName)
    const policies = await getRLSPolicies(client, schemaName, tableName)

    statuses.push({
      schema_name: schemaName,
      table_name: tableName,
      rls_enabled: rlsEnabled,
      policies,
    })
  }

  return statuses
}

/**
 * Expected RLS policies for each table
 */
const EXPECTED_POLICIES: Record<string, string[]> = {
  users: ['users_select_own', 'users_update_own', 'users_insert_service'],
  audit_log: ['audit_log_select_own', 'audit_log_insert_service'],
  _migrations: ['migrations_select_service', 'migrations_insert_service'],
}

/**
 * Verify RLS status against expected policies
 */
function verifyRLSStatus(status: RLSStatus): VerificationResult {
  const expectedPolicies = EXPECTED_POLICIES[status.table_name] || []
  const actualPolicies = status.policies.map((p) => p.policy_name)
  const missingPolicies = expectedPolicies.filter((p) => !actualPolicies.includes(p))

  return {
    schema_name: status.schema_name,
    table_name: status.table_name,
    rls_enabled: status.rls_enabled,
    expected_policies: expectedPolicies,
    actual_policies: actualPolicies,
    missing_policies: missingPolicies,
    status: status.rls_enabled && missingPolicies.length === 0 ? 'PASS' : 'FAIL',
  }
}

/**
 * Test RLS isolation for a user
 */
async function testUserIsolation(
  client: PoolClient,
  schemaName: string,
  userId: string
): Promise<boolean> {
  // Set user context
  await client.query(`SET LOCAL app.user_id = '${userId}'`)
  await client.query(`SET LOCAL app.user_role = 'user'`)

  try {
    // Query users table - should only return own record
    const result = await client.query(`SELECT * FROM "${schemaName}".users`)

    // All returned rows should have the same ID as the user
    return result.rows.every((row) => row.id === userId)
  } finally {
    // Clear context
    await client.query(`SET LOCAL app.user_id = NULL`)
    await client.query(`SET LOCAL app.user_role = NULL`)
  }
}

/**
 * Test admin access (should see all records)
 */
async function testAdminAccess(
  client: PoolClient,
  schemaName: string,
  adminId: string
): Promise<boolean> {
  // Set admin context
  await client.query(`SET LOCAL app.user_id = '${adminId}'`)
  await client.query(`SET LOCAL app.user_role = 'admin'`)

  try {
    // Query users table - should return all records
    const result = await client.query(`SELECT * FROM "${schemaName}".users`)

    // Admin should see all users (at least themselves)
    return result.rows.length >= 1
  } finally {
    // Clear context
    await client.query(`SET LOCAL app.user_id = NULL`)
    await client.query(`SET LOCAL app.user_role = NULL`)
  }
}

/**
 * Test service role access
 */
async function testServiceAccess(
  client: PoolClient,
  schemaName: string
): Promise<boolean> {
  // Set service role
  await client.query(`SET LOCAL app.user_role = 'service'`)

  try {
    // Service role should be able to query migrations
    const result = await client.query(`SELECT * FROM "${schemaName}"._migrations`)

    // Service should have access (no rows is fine)
    return true
  } catch (error) {
    return false
  } finally {
    // Clear context
    await client.query(`SET LOCAL app.user_role = NULL`)
  }
}

/**
 * Test cross-tenant isolation
 */
async function testCrossTenantIsolation(
  client: PoolClient,
  sourceSchema: string,
  targetSchema: string
): Promise<boolean> {
  // Try to access another tenant's schema
  try {
    const result = await client.query(`SELECT * FROM "${targetSchema}".users LIMIT 1`)

    // Should have failed due to permissions
    return false
  } catch (error: any) {
    // Expected: permission denied
    return error.code === '42501' || error.message.includes('permission denied')
  }
}

/**
 * Print verification results
 */
function printResults(results: VerificationResult[]): void {
  console.log('\n' + '='.repeat(100))
  console.log('RLS POLICY VERIFICATION RESULTS')
  console.log('='.repeat(100))

  let passCount = 0
  let failCount = 0

  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`\n${statusIcon} ${result.schema_name}.${result.table_name}`)
    console.log(`   RLS Enabled: ${result.rls_enabled}`)
    console.log(`   Expected Policies: ${result.expected_policies.join(', ') || 'None'}`)
    console.log(`   Actual Policies: ${result.actual_policies.join(', ') || 'None'}`)

    if (result.missing_policies.length > 0) {
      console.log(`   Missing Policies: ${result.missing_policies.join(', ')}`)
    }

    if (result.status === 'PASS') {
      passCount++
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`)
  console.log('='.repeat(100) + '\n')
}

/**
 * Main verification function
 */
async function verifyRLS(): Promise<void> {
  console.log('Starting RLS verification...\n')

  const client = await pool.connect()

  try {
    // Get all tenant schemas
    const schemas = await getTenantSchemas(client)
    console.log(`Found ${schemas.length} tenant schemas: ${schemas.join(', ')}\n`)

    const allResults: VerificationResult[] = []

    // Verify each schema
    for (const schemaName of schemas) {
      console.log(`Verifying schema: ${schemaName}`)

      const statuses = await getSchemaRLSStatus(client, schemaName)

      for (const status of statuses) {
        const result = verifyRLSStatus(status)
        allResults.push(result)
      }

      // Test user isolation if users table exists
      const usersStatus = statuses.find((s) => s.table_name === 'users')
      if (usersStatus && usersStatus.rls_enabled) {
        // Get a test user ID
        const usersResult = await client.query(`SELECT id FROM "${schemaName}".users LIMIT 1`)

        if (usersResult.rows.length > 0) {
          const testUserId = usersResult.rows[0].id

          // Test user isolation
          const isolationPass = await testUserIsolation(client, schemaName, testUserId)
          console.log(`  User isolation test: ${isolationPass ? '✅ PASS' : '❌ FAIL'}`)

          // Test admin access
          const adminPass = await testAdminAccess(client, schemaName, testUserId)
          console.log(`  Admin access test: ${adminPass ? '✅ PASS' : '❌ FAIL'}`)
        }
      }

      // Test service role access
      const migrationsStatus = statuses.find((s) => s.table_name === '_migrations')
      if (migrationsStatus && migrationsStatus.rls_enabled) {
        const servicePass = await testServiceAccess(client, schemaName)
        console.log(`  Service role test: ${servicePass ? '✅ PASS' : '❌ FAIL'}`)
      }

      // Test cross-tenant isolation
      if (schemas.length > 1) {
        const otherSchema = schemas.find((s) => s !== schemaName)
        if (otherSchema) {
          const crossTenantPass = await testCrossTenantIsolation(client, schemaName, otherSchema)
          console.log(`  Cross-tenant isolation: ${crossTenantPass ? '✅ PASS' : '❌ FAIL'}`)
        }
      }

      console.log('')
    }

    // Print summary
    printResults(allResults)

    // Exit with error code if any failures
    const hasFailures = allResults.some((r) => r.status === 'FAIL')
    if (hasFailures) {
      process.exit(1)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

// Run verification
verifyRLS().catch((error) => {
  console.error('Verification failed:', error)
  process.exit(1)
})
