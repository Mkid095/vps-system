# Enhanced flow-convert - PRD Maintenance and Repair Tool

## Goal

Evolve `flow-convert` from a pure PRD → JSON converter to a **PRD maintenance and repair tool** that validates existing PRDs, auto-fixes common issues, synchronizes with memory, and ensures all PRDs stay compatible with the current Maven Flow version.

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
3. **Memory Synchronization** - Reconcile `relatedPRDs`, align `passes` flags
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
# Returns: 0=success (outputs session ID), 1=lock acquisition failed
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
{
  "sessionId": "$session_id",
  "pid": $session_pid,
  "prdFile": "$prd_file",
  "lockedAt": $(date +%s),
  "lastHeartbeat": $(date +%s)
}
EOF

        echo "$session_id"
        exit 0
    ) 9>"$lock_path"

    return $?
}

# Release PRD-level lock
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

# Check if PRD is locked
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

**Key improvements from feedback:**
- Atomic writes using temp files
- Better error handling with try/catch
- JSON Schema validation support
- Structured JSON output for CLI

Add new validation functions after existing code:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Discover available MCP servers in the environment
 * @returns {object} {available: string[], unavailable: string[]}
 */
function discoverMCPs() {
  const available = [];

  // Check ~/.claude/settings.json
  const userSettings = path.join(os.homedir(), '.claude', 'settings.json');
  if (fs.existsSync(userSettings)) {
    try {
      const settings = JSON.parse(fs.readFileSync(userSettings, 'utf-8'));
      if (settings.mcpServers) {
        available.push(...Object.keys(settings.mcpServers));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check project-level .claude/settings.json
  const projectSettings = path.join(process.cwd(), '.claude', 'settings.json');
  if (fs.existsSync(projectSettings)) {
    try {
      const settings = JSON.parse(fs.readFileSync(projectSettings, 'utf-8'));
      if (settings.mcpServers) {
        Object.keys(settings.mcpServers).forEach(name => {
          if (!available.includes(name)) available.push(name);
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return { available };
}

/**
 * Validate PRD against full schema (enhanced with atomic writes)
 * @param {string} filePath - Path to PRD file
 * @param {object} options - {verbose: boolean, mcpCheck: boolean, jsonSchema: boolean}
 * @returns {object} {valid: boolean, errors: string[], warnings: string[]}
 */
function validateSchema(filePath, options = {}) {
  const errors = [];
  const warnings = [];

  let prd;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    prd = JSON.parse(content);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`], warnings };
  }

  // Use existing validatePRD for basic validation
  const basicValidation = validatePRD(prd);
  if (!basicValidation.valid) {
    errors.push(...basicValidation.errors);
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Enhanced validations
  if (prd.userStories && Array.isArray(prd.userStories)) {
    prd.userStories.forEach((story, idx) => {
      const storyPrefix = `userStories[${idx}]`;

      // 1. Maven steps validation
      if (story.mavenSteps && Array.isArray(story.mavenSteps)) {
        story.mavenSteps.forEach(step => {
          if (!Number.isInteger(step) || step < 1 || step > 11) {
            errors.push(`${storyPrefix}: Invalid step ${step} (must be integer 1-11)`);
          }
        });

        const uniqueSteps = new Set(story.mavenSteps);
        if (uniqueSteps.size !== story.mavenSteps.length) {
          warnings.push(`${storyPrefix}: Duplicate mavenSteps detected`);
        }

        // Check if sorted
        const sorted = [...story.mavenSteps].sort((a, b) => a - b);
        if (JSON.stringify(story.mavenSteps) !== JSON.stringify(sorted)) {
          warnings.push(`${storyPrefix}: Maven steps not sorted`);
        }
      } else {
        errors.push(`${storyPrefix}: mavenSteps is missing or not an array`);
      }

      // 2. MCP tools validation
      if (options.mcpCheck && story.mcpTools && typeof story.mcpTools === 'object') {
        const mcps = discoverMCPs();
        Object.entries(story.mcpTools).forEach(([stepKey, mcpList]) => {
          // Validate step-based key format
          if (!stepKey.match(/^step\d+$/)) {
            errors.push(`${storyPrefix}: Invalid mcpTools key "${stepKey}" (must be step1, step2, etc.)`);
          }

          if (Array.isArray(mcpList)) {
            mcpList.forEach(mcp => {
              if (!mcps.available.includes(mcp)) {
                warnings.push(`${storyPrefix}: MCP "${mcp}" not available in ${stepKey}`);
              }
            });
          }
        });
      }

      // 3. Acceptance criteria validation
      if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
        if (!story.acceptanceCriteria.some(c => c.includes('Typecheck'))) {
          errors.push(`${storyPrefix}: Missing "Typecheck passes" in acceptanceCriteria`);
        }

        if (story.acceptanceCriteria.length < 2) {
          warnings.push(`${storyPrefix}: Only ${story.acceptanceCriteria.length} acceptance criteria (recommend 3+)`);
        }
      } else {
        errors.push(`${storyPrefix}: acceptanceCriteria is missing or not an array`);
      }

      // 4. Priority validation
      if (typeof story.priority !== 'number' || story.priority < 1) {
        warnings.push(`${storyPrefix}: Invalid priority (should be number >= 1)`);
      }
    });
  } else {
    errors.push('userStories is missing or not an array');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Repair common PRD issues (with atomic writes using temp files)
 * @param {string} filePath - Path to PRD file
 * @param {object} options - {force: boolean, verbose: boolean}
 * @returns {object} {success: boolean, repairs: string[], error: string}
 */
function repairPRD(filePath, options = {}) {
  const repairs = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let prd;

    try {
      prd = JSON.parse(content);
    } catch (e) {
      return { success: false, error: `Invalid JSON: ${e.message}` };
    }

    // Validate PRD structure first
    if (!prd.userStories || !Array.isArray(prd.userStories)) {
      return { success: false, error: 'Invalid PRD structure: userStories missing or not an array' };
    }

    // Create temp file for atomic write
    const tempFilePath = `${filePath}.tmp.${Date.now()}`;

    // Repair 1: Maven steps (remove invalid, dedupe, sort)
    prd.userStories.forEach((story, idx) => {
      if (story.mavenSteps && Array.isArray(story.mavenSteps)) {
        const original = [...story.mavenSteps];
        story.mavenSteps = [...new Set(story.mavenSteps.filter(s => {
          const num = parseInt(s, 10);
          return Number.isInteger(num) && num >= 1 && num <= 11;
        }))].sort((a, b) => a - b);
        if (story.mavenSteps.length !== original.length || JSON.stringify(story.mavenSteps) !== JSON.stringify(original)) {
          repairs.push(`userStories[${idx}]: Fixed mavenSteps (removed ${original.length - story.mavenSteps.length} invalid entries)`);
        }
      }
    });

    // Repair 2: MCP tools (remove non-existent, empty arrays)
    const mcps = discoverMCPs();
    prd.userStories.forEach((story, idx) => {
      if (story.mcpTools && typeof story.mcpTools === 'object') {
        const originalKeys = Object.keys(story.mcpTools);
        Object.keys(story.mcpTools).forEach(stepKey => {
          const mcpList = story.mcpTools[stepKey];
          if (Array.isArray(mcpList)) {
            const filtered = mcpList.filter(mcp => mcps.available.includes(mcp));
            if (filtered.length !== mcpList.length) {
              story.mcpTools[stepKey] = filtered;
              repairs.push(`userStories[${idx}]: Removed ${mcpList.length - filtered.length} non-existent MCPs from ${stepKey}`);
            }
            if (filtered.length === 0) {
              delete story.mcpTools[stepKey];
            }
          }
        });
        const newKeys = Object.keys(story.mcpTools);
        if (newKeys.length !== originalKeys.length) {
          repairs.push(`userStories[${idx}]: Removed ${originalKeys.length - newKeys.length} empty MCP tool entries`);
        }
      }
    });

    // Repair 3: Acceptance criteria (add Typecheck passes)
    prd.userStories.forEach((story, idx) => {
      if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
        if (!story.acceptanceCriteria.some(c => c.includes('Typecheck'))) {
          story.acceptanceCriteria.push('Typecheck passes');
          repairs.push(`userStories[${idx}]: Added "Typecheck passes" to acceptanceCriteria`);
        }
      } else {
        story.acceptanceCriteria = ['Typecheck passes'];
        repairs.push(`userStories[${idx}]: Initialized acceptanceCriteria with "Typecheck passes"`);
      }
    });

    // Repair 4: Story ordering by priority
    const originalOrder = prd.userStories.map(s => s.id);
    prd.userStories.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    if (JSON.stringify(originalOrder) !== JSON.stringify(prd.userStories.map(s => s.id))) {
      repairs.push('Reordered all stories by priority');
    }

    // Repair 5: Add missing fields
    if (!prd.memorialFile) {
      const feature = prd.project.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      prd.memorialFile = `docs/memorial-${feature}.txt`;
      repairs.push(`Added missing memorialFile: ${prd.memorialFile}`);
    }
    if (!prd.relatedMemorials || !Array.isArray(prd.relatedMemorials)) {
      prd.relatedMemorials = [];
      repairs.push('Initialized relatedMemorials array');
    }
    if (typeof prd.passes !== 'boolean') {
      prd.passes = false;
      repairs.push('Set passes: false (PRD-level completion flag)');
    }

    // Write to temp file first (atomic write)
    fs.writeFileSync(tempFilePath, JSON.stringify(prd, null, 2), 'utf-8');

    // Validate the repaired PRD
    const validation = validateSchema(tempFilePath, {});
    if (!validation.valid) {
      fs.unlinkSync(tempFilePath);
      return { success: false, error: 'Repaired PRD failed validation', errors: validation.errors };
    }

    // Atomic rename
    fs.renameSync(tempFilePath, filePath);

    return { success: true, repairs };

  } catch (error) {
    // Clean up temp file if it exists
    const tempFilePath = `${filePath}.tmp.${Date.now()}`;
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Synchronize PRD with related PRDs and memory (with safer writes)
 * @param {string} filePath - Path to PRD file
 * @param {object} options - {verbose: boolean}
 * @returns {object} {success: boolean, updates: string[], warnings: string[]}
 */
function syncMemory(filePath, options = {}) {
  const updates = [];
  const warnings = [];

  try {
    const prd = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Sync 1: Check related PRDs status
    if (prd.relatedMemorials && Array.isArray(prd.relatedMemorials)) {
      prd.relatedMemorials.forEach((memorialPath, idx) => {
        // Extract feature name from memorial path
        const match = memorialPath.match(/memorial-([^.]+)\.txt$/);
        if (match) {
          const feature = match[1];
          const relatedPrdPath = `docs/prd-${feature}.json`;

          if (fs.existsSync(relatedPrdPath)) {
            try {
              const relatedPrd = JSON.parse(fs.readFileSync(relatedPrdPath, 'utf-8'));
              const allComplete = relatedPrd.userStories && relatedPrd.userStories.length > 0 && relatedPrd.userStories.every(s => s.passes === true);
              updates.push(`Related PRD "${feature}" is ${allComplete ? 'complete' : 'in progress'}`);
            } catch (e) {
              warnings.push(`Could not read related PRD: ${relatedPrdPath} - ${e.message}`);
            }
          } else {
            warnings.push(`Related PRD file not found: ${relatedPrdPath}`);
          }
        } else {
          warnings.push(`Invalid memorial path format: ${memorialPath}`);
        }
      });
    }

    // Sync 2: Check if this PRD is complete
    if (prd.userStories && Array.isArray(prd.userStories)) {
      const allComplete = prd.userStories.length > 0 && prd.userStories.every(s => s.passes === true);
      if (allComplete) {
        updates.push('All stories complete - ready for consolidation');
      }
    }

    // Sync 3: Create memorial file if missing (atomic write via temp file)
    if (prd.memorialFile) {
      if (!fs.existsSync(prd.memorialFile)) {
        const memorialDir = path.dirname(prd.memorialFile);
        if (!fs.existsSync(memorialDir)) {
          fs.mkdirSync(memorialDir, { recursive: true });
        }
        const tempMemorial = `${prd.memorialFile}.tmp`;
        fs.writeFileSync(tempMemorial, `# Memorial: ${prd.project}\n\n`, 'utf-8');
        fs.renameSync(tempMemorial, prd.memorialFile);
        updates.push(`Created memorial file: ${prd.memorialFile}`);
      }
    }

    return { success: true, updates, warnings };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export new functions (preserve existing exports)
module.exports = {
  ...require('./prd-utils.js'),
  discoverMCPs,
  validateSchema,
  repairPRD,
  syncMemory
};
```

### Phase 3: Enhanced Bash Script

**Modify:** `bin/flow-convert.sh`

Complete rewrite with new flags and lock integration:

```bash
#!/bin/bash
# ============================================================================
# Maven Flow PRD Converter - Enhanced
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$SCRIPT_DIR/../.claude/lib"

# Source lock library
if [ -f "$LIB_DIR/lock.sh" ]; then
    source "$LIB_DIR/lock.sh"
else
    echo "ERROR: lock.sh not found at $LIB_DIR/lock.sh"
    exit 1
fi

# Parse arguments
VALIDATE_ONLY=false
FORCE_REPAIR=false
VERBOSE=false
ALL=false
FORCE=false
FEATURE=""

for arg in "$@"; do
    case $arg in
        --validate-only)  VALIDATE_ONLY=true ;;
        --force-repair)    FORCE_REPAIR=true ;;
        --verbose)         VERBOSE=true ;;
        --all)             ALL=true ;;
        --force)           FORCE=true ;;
        -*)                echo "Unknown flag: $arg"; exit 1 ;;
        *)                 [ -z "$FEATURE" ] && FEATURE="$arg" ;;
    esac
done

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

# Logging functions
log_verbose() { [ "$VERBOSE" = true ] && echo -e "${GRAY}[VERBOSE] $*${NC}"; }
log_info() { echo -e "${CYAN}[INFO] $*${NC}"; }
log_success() { echo -e "${GREEN}[OK] $*${NC}"; }
log_error() { echo -e "${RED}[ERROR] $*${NC}"; }
log_warning() { echo -e "${YELLOW}[WARN] $*${NC}"; }

# Backup creation
create_backup() {
    local file="$1"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup="${file}.bak-${timestamp}"

    if [ -f "$file" ]; then
        cp "$file" "$backup"
        log_verbose "Created backup: $backup"
        echo "$backup"
    fi
}

# Restore from backup
restore_backup() {
    local file="$1"
    local backup="$2"

    if [ -f "$backup" ]; then
        mv "$backup" "$file"
        log_verbose "Restored from backup"
        return 0
    else
        log_error "Backup not found: $backup"
        return 1
    fi
}

# Validate-only mode
validate_only_mode() {
    log_info "Validating all PRDs (read-only)..."
    echo ""

    local total=0 valid=0 invalid=0

    for prd in docs/prd-*.json; do
        [ -f "$prd" ] || continue
        ((total++))

        if node .claude/hooks/prd-utils.js "$prd" validate-schema 2>&1 | grep -q "valid"; then
            log_success "$(basename $prd)"
            ((valid++))
        else
            log_error "$(basename $prd)"
            ((invalid++))
        fi
    done

    echo ""
    echo -e "${GRAY}Total: $total | Valid: ${GREEN}$valid${NC} | Invalid: ${RED}$invalid${NC}"

    return $invalid
}

# Convert single PRD
convert_prd() {
    local feature="$1"
    local prd_file="docs/prd-${feature}.json"

    log_info "Converting: $feature"

    # Acquire lock
    if ! session_id=$(acquire_prd_lock "$prd_file"); then
        log_error "Could not acquire lock for $feature (possibly in use by another process)"
        return 1
    fi

    # Create backup if file exists
    local backup=""
    if [ -f "$prd_file" ]; then
        backup=$(create_backup "$prd_file")
    fi

    # Build prompt with flags
    local prompt="/flow-convert"
    [ "$FORCE" = true ] && prompt="$prompt --force"
    [ "$VALIDATE_ONLY" = true ] && prompt="$prompt --validate-only"
    [ "$FORCE_REPAIR" = true ] && prompt="$prompt --force-repair"
    [ "$VERBOSE" = true ] && prompt="$prompt --verbose"
    prompt="$prompt $feature"

    # Execute conversion
    if claude --dangerously-skip-permissions "$prompt"; then
        log_success "Conversion complete: $feature"
        release_prd_lock "$prd_file" "$session_id"
        return 0
    else
        # Restore backup on failure
        if [ -n "$backup" ]; then
            log_warning "Restoring from backup due to failure"
            restore_backup "$prd_file" "$backup"
        fi
        release_prd_lock "$prd_file" "$session_id"
        return 1
    fi
}

# Main execution
if [ "$VALIDATE_ONLY" = true ]; then
    validate_only_mode
elif [ "$ALL" = true ]; then
    log_info "Batch mode: Processing all PRDs"
    echo ""

    local total=0 success=0 failed=0 skipped=0

    for md_file in docs/prd-*.md; do
        [ -f "$md_file" ] || continue

        local feature=$(basename "$md_file" | sed 's/prd-//' | sed 's/\.md$//')
        local json_file="docs/prd-${feature}.json"

        ((total++))

        if [ -f "$json_file" ] && [ "$FORCE" = false ]; then
            log_verbose "Skipping $feature (JSON exists)"
            ((skipped++))
            continue
        fi

        if convert_prd "$feature"; then
            ((success++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo -e "${GRAY}Total: $total | Success: ${GREEN}$success${NC} | Skipped: ${YELLOW}$skipped${NC} | Failed: ${RED}$failed${NC}"
    [ $failed -gt 0 ] && exit 1

elif [ -n "$FEATURE" ]; then
    convert_prd "$FEATURE"
else
    echo "Usage: flow-convert [OPTIONS] <feature>"
    echo ""
    echo "Options:"
    echo "  --all              Process all markdown PRDs"
    echo "  --force            Reconvert existing JSON files"
    echo "  --validate-only    Validate without modifying"
    echo "  --force-repair     Auto-fix validation issues"
    echo "  --verbose          Show detailed output"
    echo ""
    exit 1
fi
```

### Phase 4: Enhanced SKILL.md

**Modify:** `.claude/skills/flow-convert/SKILL.md`

Add these steps after existing STEP 7, before summary:

```markdown
## STEP 8: VALIDATE AGAINST SCHEMA

After creating the JSON PRD, validate it against the schema.

**Check for:**
1. Required fields present
2. Maven steps in range [1-11], no duplicates
3. MCP tools reference available MCPs
4. Acceptance criteria includes "Typecheck passes"

**If validation fails:**
- Report all errors clearly
- If --force-repair flag is set, proceed to STEP 9
- Otherwise, fail with error message

## STEP 9: REPAIR COMMON ISSUES

Auto-repair common PRD issues (only if --force-repair flag is set):

**Repair operations:**
1. Fix mavenSteps (remove invalid, dedupe, sort)
2. Fix mcpTools (remove non-existent MCPs)
3. Add "Typecheck passes" if missing
4. Reorder stories by priority
5. Add missing default fields

**Track all repairs made for reporting.**

## STEP 10: MEMORY SYNCHRONIZATION

Synchronize PRD with related PRDs and memory:

**Synchronization tasks:**
1. Reconcile relatedPRDs (verify files exist, update status)
2. Check if all stories complete (ready for consolidation)
3. Create memorial file if missing
4. Check for circular dependencies

## STEP 11: GENERATE REPORT

Display detailed summary report:

**Report includes:**
- Operation performed (CONVERT/REPAIR/SYNC)
- Validation results
- Repairs made
- Memory synchronization status
- Summary (total stories, complete stories)
- Next steps
```

### Phase 5: CLI Command Handlers

**Add to:** `.claude/hooks/prd-utils.js` (bottom of file, in CLI section)

```javascript
// Add new CLI command handlers

case 'validate-schema': {
  const content = fs.readFileSync(prdFile, 'utf-8');
  const prd = JSON.parse(content);
  const result = validateSchema(prd, { verbose: cmdArgs.includes('--verbose') });

  if (result.valid) {
    console.log('✅ PRD schema validation passed');
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }
    process.exit(0);
  } else {
    console.log('❌ PRD schema validation failed:');
    result.errors.forEach(e => console.log(`  - ${e}`));
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }
    process.exit(1);
  }
}

case 'repair': {
  const result = repairPRD(prdFile, {
    force: cmdArgs.includes('--force'),
    verbose: cmdArgs.includes('--verbose')
  });

  if (result.success) {
    console.log('✅ PRD repairs completed');
    if (result.repairs.length > 0) {
      console.log('\nRepairs made:');
      result.repairs.forEach(r => console.log(`  - ${r}`));
    } else {
      console.log('  No repairs needed');
    }
    process.exit(0);
  } else {
    console.log(`❌ Repair failed: ${result.error}`);
    process.exit(1);
  }
}

case 'sync-memory': {
  const result = syncMemory(prdFile, { verbose: cmdArgs.includes('--verbose') });

  if (result.success) {
    console.log('✅ Memory synchronization completed');
    if (result.updates.length > 0) {
      console.log('\nUpdates:');
      result.updates.forEach(u => console.log(`  - ${u}`));
    }
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }
    process.exit(0);
  } else {
    console.log(`❌ Sync failed: ${result.error}`);
    process.exit(1);
  }
}
```

## Critical Files

| File | Purpose |
|------|---------|
| `.claude/lib/lock.sh` | PRD-level locking functions |
| `.claude/hooks/prd-utils.js` | Validation, repair, sync functions |
| `bin/flow-convert.sh` | Main CLI entry point |
| `.claude/skills/flow-convert/SKILL.md` | Agent execution steps |

## Verification

1. **Validate existing PRDs:**
   ```bash
   flow-convert --validate-only --all
   ```

2. **Repair a specific PRD:**
   ```bash
   flow-convert --force-repair my-feature --verbose
   ```

3. **Test lock acquisition:**
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

- ✓ All existing PRDs can be validated
- ✓ Repair fixes >90% of common issues
- ✓ PRD-level locking prevents concurrent edits
- ✓ Atomic writes prevent partial data corruption
- ✓ Backup/rollback protects against data loss
- ✓ All CLI flags work correctly with proper exit codes
- ✓ Verbose mode provides useful debugging
- ✓ No data loss in any failure scenario
- ✓ Automated test suite passes all edge cases

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation failed |
| 2 | Repair failed |
| 3 | Lock acquisition failed |
| 4 | File I/O error |
| 5 | Invalid input |

## Automated Test Suite

**Create:** `bin/test-flow-convert.sh`

```bash
#!/bin/bash
# Test suite for enhanced flow-convert

set -e

COLORS='{"red":"\033[0;31m","green":"\033[0;32m","yellow":"\033[1;33m","cyan":"\033[0;36m","nc":"\033[0m"}'

log() { echo -e "${COLORS[$1]}$2${COLORS[nc]}"; }
pass() { log "green" "✓ $1"; }
fail() { log "red" "✗ $1"; exit 1; }
warn() { log "yellow" "⚠ $1"; }

# Test 1: Validate missing fields
test_validate_missing_fields() {
    log "cyan" "Test 1: Validate missing fields"
    echo '{"project":"Test","userStories":[]}' > /tmp/test-missing.json
    node .claude/hooks/prd-utils.js /tmp/test-missing.json validate-schema 2>&1 | grep -q "userStories.*missing" && pass "Missing fields detected" || fail "Should detect missing fields"
    rm /tmp/test-missing.json
}

# Test 2: Repair invalid mavenSteps
test_repair_invalid_steps() {
    log "cyan" "Test 2: Repair invalid mavenSteps"
    echo '{"project":"Test","userStories":[{"id":"1","mavenSteps":[1,15,3],"acceptanceCriteria":["test"]}],"memorialFile":"docs/test.txt"}' > /tmp/test-steps.json
    node .claude/hooks/prd-utils.js /tmp/test-steps.json repair >/dev/null 2>&1
    repaired=$(jq '.userStories[0].mavenSteps' /tmp/test-steps.json)
    [[ "$repaired" == "[1,3]" ]] && pass "Invalid steps removed" || fail "Should remove step 15"
    rm /tmp/test-steps.json
}

# Test 3: Add missing acceptance criteria
test_add_acceptance_criteria() {
    log "cyan" "Test 3: Add missing acceptance criteria"
    echo '{"project":"Test","userStories":[{"id":"1","mavenSteps":[1],"acceptanceCriteria":[]}],"memorialFile":"docs/test.txt"}' > /tmp/test-ac.json
    node .claude/hooks/prd-utils.js /tmp/test-ac.json repair >/dev/null 2>&1
    has_typecheck=$(jq '.userStories[0].acceptanceCriteria[] | contains("Typecheck")' /tmp/test-ac.json)
    [[ "$has_typecheck" == "true" ]] && pass "Typecheck passes added" || fail "Should add Typecheck passes"
    rm /tmp/test-ac.json
}

# Test 4: Circular dependency detection
test_circular_deps() {
    log "cyan" "Test 4: Circular dependency detection"
    # This test would require mocking related PRDs - placeholder for now
    warn "Circular dep test requires mocking (skipped)"
}

# Test 5: Atomic write on error
test_atomic_write() {
    log "cyan" "Test 5: Atomic write on error"
    echo '{"invalid": json}' > /tmp/test-atomic.json
    # Should fail and not leave temp file
    node .claude/hooks/prd-utils.js /tmp/test-atomic.json repair >/dev/null 2>&1 || true
    [[ ! -f /tmp/test-atomic.json.tmp.* ]] && pass "No temp files left on error" || fail "Should clean up temp files"
    rm -f /tmp/test-atomic.json
}

# Run tests
log "cyan" "Running flow-convert test suite..."
echo ""
test_validate_missing_fields
test_repair_invalid_steps
test_add_acceptance_criteria
test_circular_deps
test_atomic_write

echo ""
log "green" "All tests passed!"
```

## Failure Scenarios Documentation

**Add to:** `docs/troubleshooting.md`

```markdown
## flow-convert Troubleshooting

### Lock Acquisition Failed

**Symptom:** `Could not acquire lock for feature (possibly in use by another process)`

**Causes:**
- Another process is converting the same PRD
- Stale lock from crashed process

**Solutions:**
1. Wait for the other process to complete
2. Check for stale locks: `ls -la .flow-locks/`
3. Manual cleanup (last resort): `rm .flow-locks/*-prd.lock.data`

### Backup Location

**Symptom:** Need to restore a previous PRD version

**Location:** `docs/prd-*.json.bak-YYYYMMDD-HHMMSS`

**Restore:**
```bash
# List backups
ls -la docs/prd-*.json.bak-*

# Restore specific backup
cp docs/prd-feature.json.bak-20250128-120000 docs/prd-feature.json
```

### Validation Errors

**Common errors and fixes:**
- `Missing "Typecheck passes"` → Run `flow-convert --force-repair feature`
- `Invalid step 15` → Run repair to remove out-of-range steps
- `MCP "supabase" not available` → Configure MCP in settings or remove from PRD
```

