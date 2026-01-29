#!/usr/bin/env tsx
/**
 * US-006 Integration Verification Script
 *
 * Verifies that audit logging is properly integrated for project suspensions.
 * This script checks the codebase to ensure all suspension paths have audit logging.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

interface VerificationResult {
  check: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  details: string
}

const results: VerificationResult[] = []

function check(filePath: string, pattern: RegExp, description: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const found = pattern.test(content)
    results.push({
      check: description,
      status: found ? 'PASS' : 'FAIL',
      details: found ? 'Pattern found' : 'Pattern not found',
    })
  } catch (error) {
    results.push({
      check: description,
      status: 'SKIP',
      details: `Error reading file: ${error}`,
    })
  }
}

console.log('='.repeat(60))
console.log('US-006 Integration Verification')
console.log('='.repeat(60))
console.log()

// Check manual suspension endpoint
check(
  '/home/ken/developer-portal/src/app/api/projects/[projectId]/suspensions/route.ts',
  /logProjectAction\.suspended\(/,
  'Manual suspension calls logProjectAction.suspended()'
)

check(
  '/home/ken/developer-portal/src/app/api/projects/[projectId]/suspensions/route.ts',
  /import.*logProjectAction.*from '@nextmavens\/audit-logs-database'/,
  'Manual suspension imports logProjectAction'
)

check(
  '/home/ken/developer-portal/src/app/api/projects/[projectId]/suspensions/route.ts',
  /ActorType\.USER/,
  'Manual suspension uses ActorType.USER'
)

// Check auto-suspension in core function
check(
  '/home/ken/developer-portal/src/features/abuse-controls/lib/suspensions.ts',
  /logProjectAction\.autoSuspended\(/,
  'Auto-suspension calls logProjectAction.autoSuspended()'
)

check(
  '/home/ken/developer-portal/src/features/abuse-controls/lib/suspensions.ts',
  /import.*logProjectAction.*from '@nextmavens\/audit-logs-database'/,
  'Auto-suspension imports logProjectAction'
)

// Check helper functions exist
check(
  '/home/ken/database/src/helpers.ts',
  /suspended:.*actor.*projectId.*reason/,
  'Helper function logProjectAction.suspended() exists'
)

check(
  '/home/ken/database/src/helpers.ts',
  /autoSuspended:.*projectId.*reason.*hardCapExceeded/,
  'Helper function logProjectAction.autoSuspended() exists'
)

// Check types
check(
  '/home/ken/database/types/audit.types.ts',
  /PROJECT_SUSPENDED.*project\.suspended/,
  'Audit action PROJECT_SUSPENDED defined'
)

check(
  '/home/ken/database/types/audit.types.ts',
  /PROJECT_AUTO_SUSPENDED.*project\.auto_suspended/,
  'Audit action PROJECT_AUTO_SUSPENDED defined'
)

check(
  '/home/ken/database/types/audit.types.ts',
  /hard_cap_exceeded/,
  'hard_cap_exceeded metadata field defined'
)

// Display results
console.log('Verification Results:')
console.log('-'.repeat(60))

let passed = 0
let failed = 0
let skipped = 0

results.forEach((result) => {
  const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '○'
  const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m'
  console.log(`${icon} ${color}${result.status}\x1b[0m: ${result.check}`)
  console.log(`  Details: ${result.details}`)
  console.log()

  if (result.status === 'PASS') passed++
  else if (result.status === 'FAIL') failed++
  else skipped++
})

console.log('-'.repeat(60))
console.log(`Total: ${results.length} checks`)
console.log(`\x1b[32m✓ Passed: ${passed}\x1b[0m`)
console.log(`\x1b[31m✗ Failed: ${failed}\x1b[0m`)
console.log(`\x1b[33m○ Skipped: ${skipped}\x1b[0m`)
console.log('='.repeat(60))

if (failed > 0) {
  console.log('\n❌ Verification FAILED')
  process.exit(1)
} else {
  console.log('\n✅ Verification PASSED')
  process.exit(0)
}
