# Maven Flow Troubleshooting Guide

## Table of Contents

- [PRD Conversion Issues](#prd-conversion-issues)
- [PRD Lock Issues](#prd-lock-issues)
- [Validation Failures](#validation-failures)
- [MCP Configuration](#mcp-configuration)
- [Backup & Restore](#backup--restore)
- [Common Errors](#common-errors)

---

## PRD Conversion Issues

### Conversion Fails to Generate JSON

**Symptoms**: Running `flow-convert docs/prd-feature.md` doesn't create JSON file.

**Possible Causes**:

1. **Markdown file has invalid format**
   - Ensure frontmatter exists with required fields
   - Check for proper YAML syntax

2. **Claude Code skill not triggered**
   - Verify skill exists: `.claude/skills/flow-convert/SKILL.md`
   - Try manually: In Claude Code, paste PRD and say "convert this prd"

3. **Docs directory doesn't exist**
   ```bash
   mkdir -p docs
   ```

**Solution**:
```bash
# Verify markdown file structure
cat docs/prd-feature.md | head -20

# Check if skill exists
ls -la .claude/skills/flow-convert/SKILL.md

# Manual conversion via skill
# In Claude Code:
# 1. Paste PRD content
# 2. Type: convert this prd
```

---

## PRD Lock Issues

### Lock Acquisition Failed

**Error**:
```
ERROR: PRD is locked by session [session-id] (PID: [pid])
```

**Causes**:
- Another process is working on the PRD
- Previous process crashed leaving stale lock

**Solutions**:

1. **Wait for the other process** to complete
2. **Check lock info**:
   ```bash
   source .claude/lib/lock.sh
   get_prd_lock_info "docs/prd-feature.json"
   ```
3. **Clean up stale locks**:
   ```bash
   source .claude/lib/lock.sh
   cleanup_stale_locks
   ```
4. **Force unlock** (use caution):
   ```bash
   source .claude/lib/lock.sh
   force_unlock_prd "docs/prd-feature.json"
   ```

### List Active Locks

```bash
source .claude/lib/lock.sh
list_active_locks
```

### Lock Timeout

Default timeout is **5 minutes** (300 seconds). To change:

```bash
export FLOW_HEARTBEAT_TIMEOUT=600  # 10 minutes
flow-convert --fix docs/prd-feature.json
```

---

## Validation Failures

### Common Validation Errors

#### Error: `mavenSteps must be between 1-11`

**Cause**: Story has mavenSteps value outside 1-11 range

**Solution**:
```bash
flow-convert --fix docs/prd-feature.json
```

#### Error: `missing "Typecheck passes" in acceptanceCriteria`

**Cause**: Story acceptance criteria missing typecheck requirement

**Solution**:
```bash
flow-convert --fix docs/prd-feature.json
```

#### Error: `MCP not found in available MCPs`

**Cause**: Story references MCP that isn't configured

**Solution**:
```bash
# Remove invalid MCPs
flow-convert --fix docs/prd-feature.json

# Or add the MCP to settings.json
# Edit: ~/.claude/settings.json or .claude/settings.json
```

#### Error: `priority must be a number >= 1`

**Cause**: Story has invalid or missing priority

**Solution**: Manually edit the JSON or run with `--fix`

---

## MCP Configuration

### Discover Available MCPs

```bash
node -e "
const prdUtils = require('.claude/hooks/prd-utils.js');
const mcps = prdUtils.discoverMCPs();
console.log(JSON.stringify(mcps, null, 2));
"
```

### Add MCP to Configuration

Edit settings file:

**User-level**: `~/.claude/settings.json`
**Project-level**: `.claude/settings.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"]
    }
  }
}
```

### Verify MCP is Available

```bash
# Check Claude Code settings
cat ~/.claude/settings.json | jq '.mcpServers | keys'

# Check project settings
cat .claude/settings.json | jq '.mcpServers | keys'
```

---

## Backup & Restore

### Backup Location

Backups are stored in: `.claude/.prd-backups/`

### List Backups for a PRD

```bash
node -e "
const prdUtils = require('.claude/hooks/prd-utils.js');
const backups = prdUtils.listBackups('docs/prd-feature.json');
console.log(backups);
"
```

### Restore from Backup

```bash
node -e "
const prdUtils = require('.claude/hooks/prd-utils.js');
const result = prdUtils.restoreBackup(
  'docs/prd-feature.json',
  'prd-feature.json.2024-01-29T12-34-56.bak'
);
console.log(result);
"
```

### Manual Restore

```bash
# Find backup file
ls -la .claude/.prd-backups/prd-feature.json.*

# Copy backup to original
cp .claude/.prd-backups/prd-feature.json.TIMESTAMP.bak docs/prd-feature.json
```

---

## Common Errors

### Exit Code 1: Validation Failed

**Meaning**: PRD has schema validation errors

**Action**: Run with `--fix` to auto-repair, or manually fix errors

```bash
flow-convert --fix docs/prd-feature.json --verbose
```

### Exit Code 2: Repair Failed

**Meaning**: Auto-repair encountered an error

**Action**: Check verbose output, manual intervention may be needed

```bash
flow-convert --fix docs/prd-feature.json --verbose
```

### Exit Code 3: Lock Acquisition Failed

**Meaning**: PRD is locked by another process

**Action**: See [PRD Lock Issues](#prd-lock-issues)

### Exit Code 4: File I/O Error

**Meaning**: File not found or permission denied

**Action**:
```bash
# Check file exists
ls -la docs/prd-feature.json

# Check permissions
chmod 644 docs/prd-feature.json
```

### Exit Code 5: Invalid Input

**Meaning**: Invalid arguments or unknown flag

**Action**: Check usage
```bash
flow-convert --help
```

---

## Circular Dependencies

### Detect Circular Dependencies

```bash
flow-convert --fix docs/prd-feature.json
```

Look for warnings like:
```
[WARN] Circular dependency detected: prd-A.json -> prd-B.json -> prd-A.json
```

### Resolve Circular Dependencies

1. **Review the dependency relationship**
2. **Break the cycle** by:
   - Removing unnecessary dependency
   - Merging features into one PRD
   - Creating a shared dependency

### Example of Circular Dependency

```
prd-auth.json depends on prd-users.json
prd-users.json depends on prd-auth.json
```

**Fix**: Create a shared `prd-user-base.json` that both depend on.

---

## Debug Mode

### Enable Verbose Output

```bash
flow-convert --fix docs/prd-feature.json --verbose
```

### Enable Claude Debug Logs

```bash
export ANTHROPIC_LOG=debug
flow-convert --fix docs/prd-feature.json
```

### Check Lock Files

```bash
# List all locks
ls -la .flow-locks/

# Check specific lock
cat .flow-locks/[hash]-prd.lock.data
```

---

## Performance Issues

### Slow Conversion

**Possible Causes**:
1. Large PRD with many stories
2. Many related PRDs to scan
3. Slow MCP discovery

**Solutions**:
1. Split large PRDs into smaller features
2. Reduce related PRDs
3. Cache MCP configuration

### Lock Timeout Too Short

Increase timeout for long-running operations:

```bash
export FLOW_HEARTBEAT_TIMEOUT=600  # 10 minutes
```

---

## Getting Help

### Check Version

```bash
flow-convert --help
```

### Run Tests

```bash
./bin/test-flow-convert.sh
```

### View Logs

Check `.claude/debug/` for debug logs.

### Report Issues

Include:
1. Command run
2. Error message
3. Verbose output (`--verbose`)
4. PRD file (sanitized)
