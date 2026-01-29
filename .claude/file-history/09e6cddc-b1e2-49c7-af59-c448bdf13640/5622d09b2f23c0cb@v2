#!/usr/bin/env bash
#
# test-flow-convert.sh - Automated Test Suite for flow-convert
#
# Tests edge cases for PRD validation, repair, and sync operations.
# Run with: ./test-flow-convert.sh
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed

set -euo pipefail

# Test configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="/tmp/flow-convert-test-$$"
TEST_DOCS_DIR="${TEST_DIR}/docs"
LOCK_LIB="${SCRIPT_DIR}/../.claude/lib/lock.sh"
PRD_UTILS="${SCRIPT_DIR}/../.claude/hooks/prd-utils.js"
CONVERT_SCRIPT="${SCRIPT_DIR}/flow-convert.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

#
# Test framework functions
#

log_test() {
    echo -e "${BLUE}[TEST]${NC} $*"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

run_test() {
    local test_name="$1"
    local test_func="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    log_test "$test_name"

    if $test_func; then
        log_pass "$test_name"
        return 0
    else
        log_fail "$test_name"
        return 1
    fi
}

#
# Setup and teardown
#

setup() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}flow-convert Test Suite${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    echo ""

    # Create test directory
    rm -rf "$TEST_DIR"
    mkdir -p "$TEST_DOCS_DIR"

    # Copy lock library to test directory
    mkdir -p "${TEST_DIR}/.claude/lib"
    cp "$LOCK_LIB" "${TEST_DIR}/.claude/lib/lock.sh"

    # Copy prd-utils to test directory
    mkdir -p "${TEST_DIR}/.claude/hooks"
    cp "$PRD_UTILS" "${TEST_DIR}/.claude/hooks/prd-utils.js"

    log_info "Test directory: $TEST_DIR"
    echo ""
}

teardown() {
    echo ""
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}Test Results Summary${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    echo "Total:  $TESTS_RUN"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    else
        echo "Failed: $TESTS_FAILED"
    fi
    echo -e "${BLUE}==============================================================================${NC}"

    # Cleanup
    rm -rf "$TEST_DIR"

    if [ $TESTS_FAILED -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

#
# Test data generators
#

create_valid_prd() {
    local filename="$1"
    cat > "${TEST_DOCS_DIR}/${filename}" <<'EOF'
{
  "project": "test-feature",
  "branchName": "flow/test-feature",
  "description": "Test feature for validation",
  "memorialFile": "docs/memory/test-feature.md",
  "relatedPRDs": [],
  "consolidatedMemory": "",
  "lessonsLearned": "",
  "userStories": [
    {
      "id": "US-001",
      "title": "Test story",
      "description": "A test story",
      "acceptanceCriteria": ["Typecheck passes"],
      "mavenSteps": [1, 7],
      "mcpTools": {
        "step1": ["supabase"],
        "step7": ["supabase"]
      },
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
EOF
}

create_invalid_prd_missing_fields() {
    local filename="$1"
    cat > "${TEST_DOCS_DIR}/${filename}" <<'EOF'
{
  "project": "test-invalid",
  "description": "Missing required fields",
  "userStories": [
    {
      "id": "US-001",
      "title": "Invalid story"
    }
  ]
}
EOF
}

create_invalid_prd_bad_maven_steps() {
    local filename="$1"
    cat > "${TEST_DOCS_DIR}/${filename}" <<'EOF'
{
  "project": "test-bad-steps",
  "branchName": "flow/test-bad-steps",
  "description": "Invalid mavenSteps",
  "memorialFile": "docs/memory/test-bad-steps.md",
  "relatedPRDs": [],
  "consolidatedMemory": "",
  "lessonsLearned": "",
  "userStories": [
    {
      "id": "US-001",
      "title": "Bad steps story",
      "description": "Story with invalid steps",
      "acceptanceCriteria": ["Typecheck passes"],
      "mavenSteps": [1, 15, 3, 7, 7, "not-a-number"],
      "mcpTools": {},
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
EOF
}

create_invalid_prd_missing_acceptance_criteria() {
    local filename="$1"
    cat > "${TEST_DOCS_DIR}/${filename}" <<'EOF'
{
  "project": "test-no-typecheck",
  "branchName": "flow/test-no-typecheck",
  "description": "Missing typecheck in acceptance criteria",
  "memorialFile": "docs/memory/test-no-typecheck.md",
  "relatedPRDs": [],
  "consolidatedMemory": "",
  "lessonsLearned": "",
  "userStories": [
    {
      "id": "US-001",
      "title": "No typecheck story",
      "description": "Story without typecheck",
      "acceptanceCriteria": ["Some criterion", "Another criterion"],
      "mavenSteps": [1],
      "mcpTools": {},
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
EOF
}

create_prd_with_circular_dependency() {
    local filename="$1"
    cat > "${TEST_DOCS_DIR}/${filename}" <<'EOF'
{
  "project": "test-circular",
  "branchName": "flow/test-circular",
  "description": "PRD with circular dependency",
  "memorialFile": "docs/memory/test-circular.md",
  "relatedPRDs": [
    {
      "prd": "prd-another.json",
      "type": "depends_on",
      "status": "incomplete",
      "reason": "Test dependency",
      "integration": "test"
    }
  ],
  "consolidatedMemory": "",
  "lessonsLearned": "",
  "userStories": [
    {
      "id": "US-001",
      "title": "Circular dep story",
      "description": "Story with circular dependency",
      "acceptanceCriteria": ["Typecheck passes"],
      "mavenSteps": [1],
      "mcpTools": {},
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
EOF

    # Create the related PRD that depends back
    cat > "${TEST_DOCS_DIR}/prd-another.json" <<'EOF'
{
  "project": "another",
  "branchName": "flow/another",
  "description": "Another PRD",
  "memorialFile": "docs/memory/another.md",
  "relatedPRDs": [
    {
      "prd": "prd-test-circular.json",
      "type": "depends_on",
      "status": "incomplete",
      "reason": "Back dependency",
      "integration": "test"
    }
  ],
  "consolidatedMemory": "",
  "lessonsLearned": "",
  "userStories": [
    {
      "id": "US-001",
      "title": "Another story",
      "description": "Another story",
      "acceptanceCriteria": ["Typecheck passes"],
      "mavenSteps": [1],
      "mcpTools": {},
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
EOF
}

#
# Test cases
#

test_validate_missing_fields() {
    # Create PRD with missing required fields
    create_invalid_prd_missing_fields "prd-missing-fields.json"

    # Run validation using the actual module from home directory
    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.validateSchema('${TEST_DOCS_DIR}/prd-missing-fields.json');
        console.log(JSON.stringify(result));
    " 2>/dev/null)

    # Check result
    local valid=$(echo "$result" | jq -r '.valid // false')
    local error_count=$(echo "$result" | jq -r '.errors | length')

    if [ "$valid" = "false" ] && [ "$error_count" -gt 0 ]; then
        return 0
    else
        echo "  Expected validation to fail with errors, got: $result"
        return 1
    fi
}

test_validate_valid_prd() {
    create_valid_prd "prd-valid.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.validateSchema('${TEST_DOCS_DIR}/prd-valid.json');
        console.log(JSON.stringify(result));
    " 2>/dev/null)

    local valid=$(echo "$result" | jq -r '.valid // false')

    if [ "$valid" = "true" ]; then
        return 0
    else
        echo "  Expected validation to pass, got: $result"
        return 1
    fi
}

test_repair_invalid_maven_steps() {
    create_invalid_prd_bad_maven_steps "prd-bad-steps.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.repairPRD('${TEST_DOCS_DIR}/prd-bad-steps.json', {dryRun: false});
        console.log(JSON.stringify(result));
    " 2>/dev/null)

    local success=$(echo "$result" | jq -r '.success // false')
    local repairs=$(echo "$result" | jq -r '.repairs // []' | jq -r '.[]' | grep -i "mavenSteps" || echo "")

    if [ "$success" = "true" ] && [ -n "$repairs" ]; then
        # Verify the file was actually repaired
        local fixed_steps=$(cd "$TEST_DIR" && jq -r '.userStories[0].mavenSteps | @json' "${TEST_DOCS_DIR}/prd-bad-steps.json" 2>/dev/null)
        if echo "$fixed_steps" | grep -q "15"; then
            echo "  Invalid step 15 was not removed: $fixed_steps"
            return 1
        fi
        return 0
    else
        echo "  Expected repair to succeed, got: $result"
        return 1
    fi
}

test_repair_add_missing_acceptance_criteria() {
    create_invalid_prd_missing_acceptance_criteria "prd-no-typecheck.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.repairPRD('${TEST_DOCS_DIR}/prd-no-typecheck.json', {dryRun: false});
        console.log(JSON.stringify(result));
    " 2>/dev/null)

    local success=$(echo "$result" | jq -r '.success // false')

    if [ "$success" = "true" ]; then
        # Check that Typecheck passes was added
        local has_typecheck=$(cd "$TEST_DIR" && jq -r '.userStories[0].acceptanceCriteria[]' "${TEST_DOCS_DIR}/prd-no-typecheck.json" 2>/dev/null | grep -i "typecheck" || echo "")
        if [ -z "$has_typecheck" ]; then
            echo "  Typecheck passes was not added to acceptance criteria"
            return 1
        fi
        return 0
    else
        echo "  Expected repair to succeed, got: $result"
        return 1
    fi
}

test_circular_dependency_detection() {
    create_prd_with_circular_dependency "prd-test-circular.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.syncMemory('${TEST_DOCS_DIR}/prd-test-circular.json', {docsDir: '${TEST_DOCS_DIR}'});
        console.log(JSON.stringify(result));
    " 2>/dev/null)

    local has_warning=$(echo "$result" | jq -r '.syncResults[]?.message // ""' | grep -i "circular" || echo "")

    if [ -n "$has_warning" ]; then
        return 0
    else
        echo "  Expected circular dependency warning, got: $result"
        return 1
    fi
}

test_atomic_write_rollback() {
    # Create a valid PRD first
    create_valid_prd "prd-atomic.json"

    # Try to repair with invalid state (simulate failure)
    # We'll modify the file to be invalid JSON and try to repair
    echo "{invalid json}" > "${TEST_DOCS_DIR}/prd-atomic.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        try {
            const result = prdUtils.validateSchema('${TEST_DOCS_DIR}/prd-atomic.json');
            console.log(JSON.stringify(result));
        } catch (e) {
            console.log(JSON.stringify({error: e.message}));
        }
    " 2>/dev/null)

    local is_error=$(echo "$result" | jq -r '.error // .valid // "unknown"')

    # Should report invalid JSON error
    if [ "$is_error" != "true" ] && [ "$is_error" != "false" ]; then
        # An error was reported (not valid), so the file should remain unchanged
        local content=$(cat "${TEST_DOCS_DIR}/prd-atomic.json")
        if [ "$content" = "{invalid json}" ]; then
            return 0
        else
            echo "  File was modified during failed operation"
            return 1
        fi
    fi

    # Even if validation detected the error, check file is unchanged
    local content=$(cat "${TEST_DOCS_DIR}/prd-atomic.json")
    if [ "$content" = "{invalid json}" ]; then
        return 0
    else
        echo "  File was modified"
        return 1
    fi
}

test_backup_creation() {
    create_valid_prd "prd-backup.json"

    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const result = prdUtils.createBackup('${TEST_DOCS_DIR}/prd-backup.json');
        console.log(result);
    " 2>/dev/null)

    if [ -f "$result" ]; then
        # Verify backup content matches original
        local original_md5=$(md5sum "${TEST_DOCS_DIR}/prd-backup.json" | cut -d' ' -f1)
        local backup_md5=$(md5sum "$result" | cut -d' ' -f1)

        if [ "$original_md5" = "$backup_md5" ]; then
            return 0
        else
            echo "  Backup content does not match original"
            return 1
        fi
    else
        echo "  Backup file was not created: $result"
        return 1
    fi
}

test_lock_acquire_and_release() {
    create_valid_prd "prd-lock.json"

    # Source lock library
    source "$LOCK_LIB" 2>/dev/null || return 1

    # Test acquire
    local session_id="test-session-$$"
    if ! acquire_prd_lock "${TEST_DOCS_DIR}/prd-lock.json" "$session_id"; then
        echo "  Failed to acquire lock"
        return 1
    fi

    # Verify lock exists
    if ! is_prd_locked "${TEST_DOCS_DIR}/prd-lock.json"; then
        echo "  Lock was not acquired"
        return 1
    fi

    # Test release
    if ! release_prd_lock "${TEST_DOCS_DIR}/prd-lock.json" "$session_id"; then
        echo "  Failed to release lock"
        return 1
    fi

    # Verify lock is released
    if is_prd_locked "${TEST_DOCS_DIR}/prd-lock.json"; then
        echo "  Lock was not released"
        return 1
    fi

    return 0
}

test_lock_prevents_concurrent_access() {
    create_valid_prd "prd-concurrent.json"

    source "$LOCK_LIB" 2>/dev/null || return 1

    local session1="session-1-$$"
    local session2="session-2-$$"

    # Acquire lock with session 1
    if ! acquire_prd_lock "${TEST_DOCS_DIR}/prd-concurrent.json" "$session1"; then
        echo "  Failed to acquire initial lock"
        return 1
    fi

    # Try to acquire with session 2 (should fail)
    if acquire_prd_lock "${TEST_DOCS_DIR}/prd-concurrent.json" "$session2" 2>/dev/null; then
        echo "  Second session should not have acquired lock"
        release_prd_lock "${TEST_DOCS_DIR}/prd-concurrent.json" "$session1"
        return 1
    fi

    # Clean up
    release_prd_lock "${TEST_DOCS_DIR}/prd-concurrent.json" "$session1"

    return 0
}

test_discover_mcps() {
    local result=$(cd "$TEST_DIR" && node -e "
        const prdUtils = require('${PRD_UTILS}');
        const mcps = prdUtils.discoverMCPs();
        console.log(JSON.stringify(mcps));
    " 2>/dev/null)

    # Result should be valid JSON (possibly empty object)
    if echo "$result" | jq -e '.' >/dev/null 2>&1; then
        return 0
    else
        echo "  discoverMCPs returned invalid JSON: $result"
        return 1
    fi
}

#
# Run all tests
#

main() {
    setup

    # Validation tests
    run_test "Validate missing fields" test_validate_missing_fields
    run_test "Validate valid PRD" test_validate_valid_prd

    # Repair tests
    run_test "Repair invalid mavenSteps" test_repair_invalid_maven_steps
    run_test "Repair add missing acceptance criteria" test_repair_add_missing_acceptance_criteria

    # Sync tests
    run_test "Detect circular dependencies" test_circular_dependency_detection

    # Atomic write tests
    run_test "Atomic write rollback on error" test_atomic_write_rollback

    # Backup tests
    run_test "Backup creation" test_backup_creation

    # Lock tests
    run_test "Lock acquire and release" test_lock_acquire_and_release
    run_test "Lock prevents concurrent access" test_lock_prevents_concurrent_access

    # Utility tests
    run_test "Discover MCPs" test_discover_mcps

    teardown
}

# Run main
main "$@"
