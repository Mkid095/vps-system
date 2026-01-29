# flow-convert - PRD Conversion and Maintenance Tool

## Overview

`flow-convert` is a dual-mode tool for managing PRD (Product Requirement Document) files in the Maven Flow workflow:

1. **Convert Mode**: Convert markdown PRDs to JSON format
2. **Repair Mode**: Validate and repair existing JSON PRDs

---

## Quick Start

```bash
# Convert markdown PRD to JSON
flow-convert docs/prd-my-feature.md

# Repair/validate existing JSON PRD
flow-convert --fix docs/prd-my-feature.json

# Validate without modifying
flow-convert --fix --validate-only my-feature

# Repair all JSON PRDs
flow-convert --all --fix
```

---

## Mode 1: Convert (Markdown → JSON)

Converts markdown PRD files to the JSON format required by the Maven Flow workflow.

### Usage

```bash
flow-convert <markdown-file>
```

### Example

```bash
flow-convert docs/prd-authentication.md
```

### What It Does

1. Reads the markdown PRD file
2. Triggers the `flow-convert` skill in Claude Code
3. Generates `docs/prd-[feature].json` with:
   - User stories with mavenSteps (1-11)
   - MCP tool assignments per story
   - Related PRDs with dependency tracking
   - Acceptance criteria including "Typecheck passes"

### Output File

The JSON file is saved as `docs/prd-[feature-name].json`

### Conversion Flow

```
Markdown PRD (.md)
       ↓
   flow-convert skill
       ↓
   Scans existing PRDs
       ↓
   Loads consolidated memories
       ↓
   Analyzes feature relationships
       ↓
   Validates available MCPs
       ↓
   Generates JSON PRD
       ↓
docs/prd-[feature].json
```

---

## Mode 2: Repair/Validate (JSON Maintenance)

Validates and repairs existing JSON PRD files to ensure they comply with the schema and best practices.

### Usage

```bash
# Repair mode (fixes issues)
flow-convert --fix <json-file>

# Validate-only mode (no modifications)
flow-convert --fix --validate-only <json-file>

# Batch repair all PRDs
flow-convert --all --fix
```

### What It Checks/Fixes

#### Validation Checks

- **Required fields**: project, branchName, description, userStories
- **Story fields**: id, title, description, acceptanceCriteria, mavenSteps, priority, passes, notes
- **mavenSteps validation**:
  - Must be integers between 1-11
  - No duplicate steps
  - No out-of-range values
- **mcpTools validation**:
  - Step-based keys (step1, step2, etc.)
  - MCP references must exist
  - Proper array format
- **Acceptance criteria**: Must include "Typecheck passes"
- **Priority validation**: Unique priorities across stories

#### Auto-Repairs

When `--fix` is used, the following issues are automatically repaired:

1. **Fix mavenSteps**:
   - Remove non-integer values
   - Remove out-of-range values (not 1-11)
   - Remove duplicates
   - Sort in ascending order

2. **Fix mcpTools**:
   - Remove MCPs that don't exist in available MCPs
   - Remove empty step arrays
   - Remove mcpTools object if completely empty

3. **Fix acceptanceCriteria**:
   - Add "Typecheck passes" if missing

4. **Add missing default fields**:
   - `relatedPRDs: []`
   - `consolidatedMemory: ""`
   - `lessonsLearned: ""`
   - `notes: ""` for each story

5. **Reorder stories**: Sort by priority

### Memory Synchronization

The repair mode also synchronizes memory with related PRDs:

- Verifies related PRD files exist
- Updates related PRD status (complete/incomplete)
- Detects circular dependencies
- Checks memorial file existence for complete PRDs

---

## Command Reference

### Syntax

```bash
flow-convert [flags] <file>
flow-convert --all [flags]
```

### Flags

| Flag | Alias | Mode | Description |
|------|-------|------|-------------|
| `--fix` | `--repair` | Repair | Enable repair/validate mode |
| `--validate-only` | - | Repair | Validate without modifying |
| `--verbose` | `-v` | Both | Show detailed output |
| `--all` | - | Repair | Process all PRDs in docs/ |
| `--help` | `-h` | Both | Show help message |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation failed |
| 2 | Repair/conversion failed |
| 3 | Lock acquisition failed |
| 4 | File I/O error |
| 5 | Invalid input |

---

## File Format

### JSON PRD Schema

```json
{
  "project": "string",
  "branchName": "string",
  "description": "string",
  "relatedPRDs": [
    {
      "prd": "prd-name.json",
      "type": "depends_on|depended_by|bidirectional",
      "status": "complete|incomplete",
      "reason": "string",
      "integration": "string"
    }
  ],
  "consolidatedMemory": "string",
  "lessonsLearned": "string",
  "userStories": [
    {
      "id": "US-001",
      "title": "string",
      "description": "string",
      "acceptanceCriteria": ["string"],
      "mavenSteps": [1, 7],
      "mcpTools": {
        "step1": ["supabase"],
        "step7": ["supabase"]
      },
      "priority": 1,
      "passes": false,
      "notes": "string"
    }
  ]
}
```

### Maven Steps Reference

| Step | Agent | Description |
|------|-------|-------------|
| 1 | development-agent | Foundation - Import UI with mock data |
| 2 | development-agent | Package Manager - Convert npm → pnpm |
| 3 | refactor-agent | Feature Structure - Restructure to feature-based |
| 4 | refactor-agent | Modularization - Modularize components >300 lines |
| 5 | quality-agent | Type Safety - No 'any' types |
| 6 | refactor-agent | UI Centralization - Centralize UI components |
| 7 | development-agent | Data Layer - Backend setup |
| 8 | security-agent | Auth Integration - Authentication flow |
| 9 | development-agent | MCP Integration - MCP integrations |
| 10 | security-agent | Security & Error Handling |
| 11 | design-agent | Mobile Design - UI/UX for mobile |

---

## Advanced Features

### PRD Locking

The tool uses PRD-level locking to prevent concurrent modifications:

- Locks acquired with heartbeat-based stale detection
- Automatic cleanup of stale locks (5-minute timeout)
- Prevents data corruption from simultaneous edits

### Backup & Rollback

Before any modification:
1. Creates backup: `docs/prd-[feature].json.bak-YYYYMMDD-HHMMSS`
2. Writes to temp file first
3. Validates temp file
4. Atomic rename to original
5. On error: restores from backup

### Circular Dependency Detection

Automatically detects circular dependencies between PRDs:

```
prd-A.json depends on prd-B.json
prd-B.json depends on prd-A.json
→ WARNING: Circular dependency detected
```

---

## Troubleshooting

### Lock Acquisition Failed

**Error**: `PRD is locked by session [session-id] (PID: [pid])`

**Solutions**:
1. Wait for the other process to complete
2. Kill the other process if it's stale
3. Force unlock: `source .claude/lib/lock.sh && force_unlock_prd "path/to/prd.json"`

### Backup Location

Backups are stored in: `.claude/.prd-backups/`

### Restore from Backup

```javascript
const prdUtils = require('.claude/hooks/prd-utils.js');
prdUtils.restoreBackup('docs/prd-feature.json', 'prd-feature.json.2024-01-29T12-34-56.bak');
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `mavenSteps must be between 1-11` | Step number out of range | Use `--fix` to auto-remove invalid steps |
| `missing "Typecheck passes"` | Missing required acceptance criteria | Use `--fix` to auto-add |
| `MCP not found in available MCPs` | Referenced MCP doesn't exist | Use `--fix` to auto-remove or add MCP |

---

## Testing

Run the test suite to verify functionality:

```bash
./bin/test-flow-convert.sh
```

The test suite covers:
- Validation of missing fields
- Repair of invalid mavenSteps
- Adding missing acceptance criteria
- Circular dependency detection
- Atomic write rollback
- Backup creation
- Lock acquisition/release
- Concurrent access prevention
- MCP discovery

---

## Integration with Maven Flow

The `flow-convert` tool integrates with the Maven Flow workflow:

1. **Write PRD** in markdown format
2. **Convert**: `flow-convert docs/prd-feature.md`
3. **Review**: Check the generated JSON
4. **Validate**: `flow-convert --fix docs/prd-feature.json`
5. **Start**: `flow start` to begin development

---

## Files

| File | Purpose |
|------|---------|
| `bin/flow-convert.sh` | Main CLI tool |
| `bin/test-flow-convert.sh` | Test suite |
| `.claude/lib/lock.sh` | Locking functions |
| `.claude/hooks/prd-utils.js` | Validation/repair functions |
| `.claude/skills/flow-convert/SKILL.md` | Conversion skill |

---

## Version History

- **v2.0** - Added repair mode, validation, memory sync, PRD locking
- **v1.0** - Initial markdown to JSON conversion
