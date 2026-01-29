# Enhanced flow-convert - PRD Maintenance and Repair Tool

## Goal

Evolve flow-convert from a pure PRD → JSON converter to a PRD maintenance and repair tool that validates existing PRDs, auto-fixes common issues, synchronizes with memory, and ensures all PRDs stay compatible with the current Maven Flow version.

## Current State

**Existing Implementation:**
- `bin/flow-convert.sh` - Bash wrapper that calls Claude Code skill
- `.claude/skills/flow-convert/SKILL.md` - 8-step conversion (markdown → JSON)
- `.claude/hooks/prd-utils.js` - Has `validatePRD()` basic validation
- `.claude/lib/lock.sh` - Story-level locking (already implemented)

**Gaps:**
- No schema validation during conversion
- No repair capabilities for common issues
- No memory synchronization
- No lock integration with conversion process
- No validate-only mode

## Enhanced Responsibilities

1. **Conversion** - Create JSON from markdown (preserve existing)
2. **Validation & Repair** - Scan existing PRDs, validate against schema, auto-fix issues
3. **Memory Synchronization** - Reconcile relatedPRDs, align passes flags
4. **Atomic Safe Update** - PRD-level locking, backup before overwrite, rollback on error
5. **Reporting** - Detailed summaries of repairs, updates, and fixes
6. **CLI Flags** - `--validate-only`, `--force-repair`, `--verbose`

## Files to Modify

| File | Action |
|------|--------|
| `bin/flow-convert.sh` | Add new flags, PRD locking, backup/rollback logic |
| `.claude/skills/flow-convert/SKILL.md` | Add validation, repair, sync, and reporting steps |
| `.claude/lib/lock.sh` | Add PRD-level locking functions |
| `.claude/hooks/prd-utils.js` | Add `validateSchema()`, `repairPRD()`, `syncMemory()` functions |

## Implementation Plan

### Execution Flow (Component Interlink)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLI ENTRY POINT                                   │
│                     bin/flow-convert.sh [flags] <feature>                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. PARSE FLAGS                                                             │
│     --validate-only | --force-repair | --verbose | --all | --force          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. ACQUIRE PRD LOCK (lock.sh)                                              │
│     ├─ acquire_prd_lock() → flock + PID/heartbeat check                     │
│     └─ Fail → exit 3                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. CREATE BACKUP (.bak-YYYYMMDD-HHMMSS)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. EXECUTE OPERATION (SKILL.md)                                            │
│     ├─ STEP 8: validateSchema() → PRD structure, mavenSteps, mcpTools       │
│     ├─ STEP 9: repairPRD() → Atomic temp file write, validate, rename       │
│     ├─ STEP 10: syncMemory() → Related PRDs, circular deps                  │
│     └─ STEP 11: Generate report                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  SUCCESS      │               │  FAILURE      │
            │  Release lock │               │  Restore from │
            │  Exit 0       │               │  backup       │
            └───────────────┘               │  Release lock │
                                            │  Exit 1/2/4   │
                                            └───────────────┘
```

### Critical Implementation Notes

1. **Atomic Writes:** Do not overwrite original until validation & repair pass
2. **Lock Integration:** Every PRD operation must check lock
3. **Memory Sync:** Must handle `relatedPRDs` safely to prevent loops
4. **CLI Exit Codes:** Keep strict to enable automation integration

---

### Phase 1: PRD-Level Locking

**Modify:** `.claude/lib/lock.sh`

Add PRD-level locking functions (story-level already exists):

```bash
# Get lock path for a PRD
prd_lock_path() {
    local prd_file="$1"
    local prd_hash=$(echo "$prd_file" | md5sum | cut -d' ' -f1)
    echo ".flow-locks/${prd_hash}-prd.lock"
}

# Acquire PRD-level lock for conversion/repair
acquire_prd_lock() {
    local prd_file="$1"
    local session_id="${2:-manual-$$}"
    local session_pid=$$

    mkdir -p .flow-locks
    local lock_path=$(prd_lock_path "$prd_file")
    local lock_data_path="${lock_path}.data"

    (
        flock -x -n 9 || exit 1
        # Check if lock is stale or owner is dead
        if [ -f "$lock_data_path" ]; then
            local owner_pid=$(jq -r '.pid // empty' "$lock_data_path" 2>/dev/null)
            local last_heartbeat=$(jq -r '.lastHeartbeat // 0' "$lock_data_path" 2>/dev/null)
            local now=$(date +%s)
            local age=$((now - last_heartbeat))
            if [ -n "$owner_pid" ] && kill -0 "$owner_pid" 2>/dev/null && [ "$age" -lt "$FLOW_HEARTBEAT_TIMEOUT" ]; then
                exit 1  # Lock is valid, owner is alive
            fi
        fi
        # Write lock data
        cat > "$lock_data_path" <<EOF
{"sessionId":"$session_id","pid":$session_pid,"prdFile":"$prd_file","lockedAt":$(date +%s),"lastHeartbeat":$(date +%s)}
EOF
        echo "$session_id"
        exit 0
    ) 9>"$lock_path"
    return $?
}

release_prd_lock() {
    local prd_file="$1"
    local session_id="${2:-manual-$$}"
    local lock_path=$(prd_lock_path "$prd_file")
    local lock_data="${lock_path}.data"
    [ -f "$lock_data" ] || return 0
    (
        flock -x 9
        local owner=$(jq -r '.sessionId // empty' "$lock_data" 2>/dev/null)
        [ "$owner" = "$session_id" ] && rm -f "$lock_data"
    ) 9>"$lock_path"
}

is_prd_locked() {
    local prd_file="$1"
    local lock_path=$(prd_lock_path "$prd_file")
    local lock_data="${lock_path}.data"
    [ -f "$lock_data" ] || return 1
    # Check if lock is stale
    local owner_pid=$(jq -r '.pid // empty' "$lock_data" 2>/dev/null)
    local last_heartbeat=$(jq -r '.lastHeartbeat // 0' "$lock_data" 2>/dev/null)
    local now=$(date +%s)
    local age=$((now - last_heartbeat))
    if [ -z "$owner_pid" ] || ! kill -0 "$owner_pid" 2>/dev/null || [ "$age" -ge "$FLOW_HEARTBEAT_TIMEOUT" ]; then
        rm -f "$lock_data"  # Clean up stale lock
        return 1
    fi
    return 0
}
```

### Phase 2: Enhanced Validation Functions

**Modify:** `.claude/hooks/prd-utils.js`

Add new validation functions with atomic writes, better error handling, and JSON schema validation:

1. `discoverMCPs()` - Find available MCP servers in settings
2. `validateSchema(filePath, options)` - Full schema validation with mavenSteps, mcpTools, acceptanceCriteria checks
3. `repairPRD(filePath, options)` - Auto-fix common issues with atomic temp file writes
4. `syncMemory(filePath, options)` - Synchronize with related PRDs

Key improvements:
- Atomic writes using temp files (`filename.tmp.timestamp`)
- Validation before write ensures data integrity
- Cleanup temp files on any error
- `Number.isInteger()` checks for maven steps

### Phase 3: Enhanced Bash Script

**Modify:** `bin/flow-convert.sh`

Complete rewrite with new flags and lock integration:

**New CLI Flags:**
- `--validate-only` - Validate without modifying
- `--force-repair` - Auto-fix validation issues
- `--verbose` - Show detailed output
- `--all` - Process all PRDs
- `--force` - Reconvert existing JSON files

**Features:**
- PRD-level locking before conversion
- Backup creation (`.bak-YYYYMMDD-HHMMSS`) before any modification
- Automatic rollback on failure
- Colored output (INFO, OK, WARN, ERROR)
- Structured exit codes (0-5)

### Phase 4: Enhanced SKILL.md

**Modify:** `.claude/skills/flow-convert/SKILL.md`

Add 4 new steps after existing STEP 7:

**STEP 8: VALIDATE AGAINST SCHEMA**
- Check required fields
- Validate mavenSteps range [1-11], no duplicates
- Verify mcpTools reference available MCPs
- Ensure "Typecheck passes" in acceptanceCriteria

**STEP 9: REPAIR COMMON ISSUES** (only if `--force-repair` flag)
- Fix mavenSteps (remove invalid, dedupe, sort)
- Fix mcpTools (remove non-existent MCPs)
- Add "Typecheck passes" if missing
- Reorder stories by priority
- Add missing default fields

**STEP 10: MEMORY SYNCHRONIZATION**
- Reconcile relatedPRDs (verify files exist, update status)
- Check if all stories complete
- Create memorial file if missing
- Check for circular dependencies

**STEP 11: GENERATE REPORT**
- Operation performed (CONVERT/REPAIR/SYNC)
- Validation results
- Repairs made
- Memory synchronization status
- Summary and next steps

### Phase 5: CLI Command Handlers

**Add to:** `.claude/hooks/prd-utils.js`

Add CLI handlers for new commands:
- `validate-schema` - Run schema validation
- `repair` - Run repair operations
- `sync-memory` - Run memory synchronization

## Critical Files

| File | Purpose |
|------|---------|
| `.claude/lib/lock.sh` | PRD-level locking functions |
| `.claude/hooks/prd-utils.js` | Validation, repair, sync functions |
| `bin/flow-convert.sh` | Main CLI entry point |
| `.claude/skills/flow-convert/SKILL.md` | Agent execution steps |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation failed |
| 2 | Repair failed |
| 3 | Lock acquisition failed |
| 4 | File I/O error |
| 5 | Invalid input |

## Verification

1. **Validate existing PRDs:**
   ```bash
   flow-convert --validate-only --all
   ```

2. **Repair a specific PRD:**
   ```bash
   flow-convert --force-repair my-feature --verbose
   ```

3. **Test lock acquisition** (run in two terminals):
   ```bash
   # Terminal 1
   flow-convert large-feature &

   # Terminal 2 (should fail or wait)
   flow-convert large-feature
   ```

4. **Test backup/rollback:**
   ```bash
   # Corrupt a PRD
   echo "broken" > docs/prd-test.json

   # Should restore from backup
   flow-convert --force-repair test
   ```

5. **Verify no data loss:**
   ```bash
   # Before
   cp docs/prd-test.json docs/prd-test.json.before

   # Run repair
   flow-convert --force-repair test --verbose

   # After (should be valid JSON)
   jq . docs/prd-test.json
   ```

## Success Criteria

- All existing PRDs can be validated
- Repair fixes >90% of common issues
- PRD-level locking prevents concurrent edits
- Atomic writes prevent partial data corruption
- Backup/rollback protects against data loss
- All CLI flags work correctly with proper exit codes
- Verbose mode provides useful debugging
- No data loss in any failure scenario
- Automated test suite passes all edge cases

## Automated Test Suite

**Create:** `bin/test-flow-convert.sh`

Test edge cases:
1. Validate missing fields
2. Repair invalid mavenSteps (step 15 should be removed)
3. Add missing acceptance criteria
4. Circular dependency detection
5. Atomic write cleanup on error

## Failure Scenarios Documentation

**Add to:** `docs/troubleshooting.md`

Document:
- Lock acquisition failed (stale locks, cleanup)
- Backup location and restore procedure
- Common validation errors and fixes
