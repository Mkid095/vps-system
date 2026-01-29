/**
 * Audit Logs Integration Test
 *
 * Test file to verify the audit logs integration layer.
 * This can be run manually to test the integration.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 *
 * Usage:
 *   AUDIT_LOGS_DB_PASSWORD=yourpassword tsx src/test-integration.ts
 */

import {
  initializeAuditLogs,
  logAuditEvent,
  queryAuditLogs,
  queryAuditLogsByActor,
  shutdownAuditLogs,
  auditLogsHealthCheck,
  logAction,
  userActor,
  projectTarget,
  logProjectAction,
} from './index.js';
import type { RequestContext } from '../types/audit.types.js';
import type { ActorType, TargetType } from '../types/audit.types.js';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  actorId: 'test-user-123',
  projectId: 'test-project-456',
};

/**
 * Mock request context for testing
 */
const mockRequest: RequestContext = {
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Test Browser) AuditLogsTest/1.0',
};

/**
 * Test suite
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Audit Logs Integration Test');
  console.log('='.repeat(60));
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Health check
  try {
    console.log('Test 1: Health Check');
    const isHealthy = await auditLogsHealthCheck();
    if (isHealthy) {
      console.log('  ✓ Database connection is healthy');
      testsPassed++;
    } else {
      console.log('  ✗ Database connection failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('  ✗ Health check failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 2: Initialize audit logs
  try {
    console.log('Test 2: Initialize Audit Logs');
    await initializeAuditLogs({ waitForConnection: true });
    console.log('  ✓ Audit logs initialized successfully');
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Initialization failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 3: Log a simple audit event
  try {
    console.log('Test 3: Log Simple Audit Event');
    const log = await logAuditEvent({
      actorId: TEST_CONFIG.actorId,
      actorType: 'user' as ActorType,
      action: 'project.created',
      targetType: 'project' as TargetType,
      targetId: TEST_CONFIG.projectId,
      ipAddress: mockRequest.ip ?? null,
      userAgent: mockRequest.userAgent ?? null,
      metadata: {
        test_mode: true,
        source: 'integration-test',
      },
    });
    console.log('  ✓ Audit event logged');
    console.log(`    ID: ${log.id}`);
    console.log(`    Action: ${log.action}`);
    console.log(`    Created: ${log.created_at.toISOString()}`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Failed to log audit event:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 4: Log using helper function
  try {
    console.log('Test 4: Log Using Helper Function');
    const log = await logAction(
      userActor(TEST_CONFIG.actorId),
      'project.updated',
      projectTarget(TEST_CONFIG.projectId),
      {
        request: mockRequest,
        metadata: {
          changes: { name: 'Test Project Updated' },
        },
      }
    );
    console.log('  ✓ Audit event logged via helper');
    console.log(`    ID: ${log.id}`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Helper function failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 5: Log using project action helper
  try {
    console.log('Test 5: Log Using Project Action Helper');
    const log = await logProjectAction.updated(
      userActor(TEST_CONFIG.actorId),
      TEST_CONFIG.projectId,
      { status: 'active' },
      { request: mockRequest }
    );
    console.log('  ✓ Project action logged');
    console.log(`    ID: ${log.id}`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Project action helper failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 6: Log system action
  try {
    console.log('Test 6: Log System Action');
    const log = await logProjectAction.autoSuspended(
      TEST_CONFIG.projectId,
      'Usage limit exceeded',
      true,
      { request: mockRequest }
    );
    console.log('  ✓ System action logged');
    console.log(`    ID: ${log.id}`);
    console.log(`    Actor: ${log.actor_id} (${log.actor_type})`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ System action failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 7: Query audit logs
  try {
    console.log('Test 7: Query Audit Logs');
    const result = await queryAuditLogs({
      actor_id: TEST_CONFIG.actorId,
      limit: 10,
    });
    console.log('  ✓ Query successful');
    console.log(`    Found ${result.data.length} log(s)`);
    console.log(`    Total: ${result.total}`);
    if (result.data.length > 0) {
      const latestLog = result.data[0];
      if (latestLog) {
        console.log(`    Latest: ${latestLog.action} at ${latestLog.created_at.toISOString()}`);
      }
    }
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Query failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 8: Query by actor
  try {
    console.log('Test 8: Query By Actor');
    const result = await queryAuditLogsByActor(TEST_CONFIG.actorId, { limit: 5 });
    console.log('  ✓ Query by actor successful');
    console.log(`    Found ${result.data.length} log(s)`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Query by actor failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Test 9: Query by target
  try {
    console.log('Test 9: Query By Target');
    const result = await queryAuditLogsByActor(TEST_CONFIG.projectId, { limit: 5 });
    console.log('  ✓ Query by target successful');
    console.log(`    Found ${result.data.length} log(s)`);
    testsPassed++;
  } catch (error) {
    console.log('  ✗ Query by target failed:', error instanceof Error ? error.message : error);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);
  console.log();

  // Cleanup
  try {
    console.log('Shutting down audit logs...');
    await shutdownAuditLogs();
    console.log('✓ Shutdown complete');
  } catch (error) {
    console.log('✗ Shutdown failed:', error instanceof Error ? error.message : error);
  }

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

/**
 * Entry point
 */
async function main() {
  try {
    await runTests();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();
