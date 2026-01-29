# Maven Flow Memory & Architecture Improvement Plan
## Next-Mavens-Flow Comprehensive Audit

**Date:** 2026-01-24
**Purpose:** Comprehensive audit and improvement plan for next-mavens-flow memory system and architecture

---

## Executive Summary

Based on comprehensive audit (37+ bug patterns found) and research into 2025-2026 AI memory best practices, this plan implements a **hybrid memory architecture** that balances token efficiency with maintainability.

**Memory Format Decision:**
- **TXT** for story memory (human-readable, git-friendly)
- **Enhanced JSON** for PRDs (with hashes, rollback capability)
- **TOON-style compression** for consolidated memory only (45-52% token savings)
- **Binary index** for fast lookups

**Critical Architecture Principle:** We're using **Claude Code** as the main coding tool. Commands and hooks are just helping Claude Code work, so everything must be **compatible with Claude Code's native architecture**.

---

## Current State Analysis

### What Works Well ✓

| Component | Status | Notes |
|-----------|--------|-------|
| 3-layer memory system | ✓ Good | Story, consolidated, progress files |
| Hook-based quality enforcement | ✓ Excellent | Zero-tolerance policies for 'any', gradients |
| Multi-PRD architecture | ✓ Good | Per-story per-step MCP assignment |
| 8 specialist agents | ✓ Good | Clear responsibilities (dev, refactor, quality, security, etc.) |
| File-based persistence | ✓ Good | Survives session restarts |
| Git-based history | ✓ Good | All memory tracked |

### Critical Issues Found (37+ Bug Patterns)

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| **P0** | No MCP validation before agent spawning | Agents spawn without required tools | Pre-flight MCP check hook |
| **P0** | ESLint shows ALL errors, not boundary violations | Wastes time on irrelevant errors | Git-aware file filtering |
| **P0** | Windows path handling broken | Hooks fail on Windows | Cross-platform path normalization |
| **P0** | Memory file creation not implemented | System loses context between sessions | Implement memory creation hook |
| **P1** | JSON updates have no rollback | Corrupted PRDs break entire flow | Safe update with backup |
| **P1** | Session reset has no warning | Users can lose work accidentally | Interactive confirmation |
| **P1** | Mobile PRD path mismatch | PRDs not detected by flow | Fix path patterns |

### Current Hook Analysis

**post-tool-use-quality.sh** (365 lines):
- ✓ Comprehensive zero-tolerance checks ('any', gradients, secrets)
- ✓ Auto-fix capability for relative imports
- ✌ Scans entire file instead of just changed portions
- ✌ No git-aware filtering

**stop-comprehensive-check.sh** (463 lines):
- ✓ Full codebase quality validation
- ✓ Agent task generation for fixes
- ✌ ESLint runs on ALL files (not just changed)
- ✌ No incremental checking support

---

## Implementation Strategy

### Development Approach

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Iteration** | Incremental iterations | One item at a time, test, feedback, next |
| **Hook Language** | Mixed (Bash + JavaScript) | Bash for simple, JavaScript for complex (JSON/APIs) |
| **Feature Flags** | No | Implement directly - simpler, faster |

### Implementation Order

Implement one item completely, test it, get feedback, then move to the next item:

1. **P0-1:** MCP validation hook (JavaScript - JSON validation)
2. **P0-2:** ESLint git-aware filtering (Bash - simple grep/fix)
3. **P0-3:** Windows path normalization (JavaScript - cross-platform paths)
4. **P0-4:** Memory file creation (Bash - file operations)
5. **P1-1:** JSON update with rollback (JavaScript - JSON handling)
6. **P1-2:** Session reset warning (Bash - simple prompt)

Then move to Phase 2 items, etc.

---

## Implementation Plan

### Phase 1: Critical Bug Fixes (Week 1-2)

#### 1.1 MCP Availability Validation

**New File:** `.claude/hooks/pre-mcp-validation.js` (JavaScript)

```javascript
// Validates MCPs are available before spawning agents
// Checks story's mcpTools against available MCPs
// Blocks agent spawn if required MCPs missing
```

**Why P0:** Currently agents spawn even if required MCPs (like supabase) aren't available, leading to silent failures.

#### 1.2 Fix ESLint Boundary Check

**Modify:** `.claude/maven-flow/hooks/stop-comprehensive-check.sh` (Bash)

**Change:**
```bash
# OLD: Check all files
pnpm eslint --quiet "$PROJECT_ROOT/src"

# NEW: Only check changed files in current session
git diff --name-only --cached | grep -E '\.(ts|tsx)$' | xargs eslint
```

**Expected:** 90% faster ESLint checks (30-60s → 2-5s)

#### 1.3 Windows Path Normalization

**New File:** `.claude/hooks/path-utils.js` (JavaScript)

```javascript
// Cross-platform path normalization
// Converts Git Bash paths (/c/Users/...) to Windows (C:\Users\...)
// Handles PowerShell, CMD, and Bash
```

**Why P0:** Hooks fail on Windows due to path format differences.

#### 1.4 Memory File Creation Implementation

**New File:** `.claude/maven-flow/hooks/create-memory.sh` (Bash)

```bash
# Creates story memory files after each story completion
# Format: docs/[feature]/story-US-[###]-[title].txt
# Includes: implemented, decisions, integration points, lessons
```

**Why P0:** Memory file creation is specified in flow.md but not implemented as a hook.

#### 1.5 JSON Update with Rollback

**New File:** `.claude/hooks/prd-utils.js` (JavaScript)

```javascript
// Safe PRD updates with automatic rollback
// Creates backup before update
// Validates JSON before committing
// Rolls back on error
```

**Why P1:** A corrupted PRD file breaks the entire flow system.

#### 1.6 Session Reset Warning

**Modify:** `bin/flow.sh` reset command (Bash)

```bash
# Check for uncommitted changes
# Check for incomplete stories
# Interactive confirmation before reset
```

---

### Phase 2: Memory System Enhancement (Week 3-4)

#### 2.1 Hash-Based Context Updates

**New File:** `.claude/hooks/memory-cache.js` (JavaScript)

```javascript
class MemoryCache {
  // Track file hashes to detect changes
  // Skip reading unchanged files (60-70% token savings)
  // Cache stored in .claude/.memory-cache.json
}
```

**Benefit:** 60-70% reduction in token usage for unchanged content

#### 2.2 Session Restoration

**New Files:**
- `.claude/hooks/session-save.sh` (Bash)
- `.claude/hooks/session-restore.sh` (Bash)

```bash
# Save session state for auto-restore
# Current PRD, story, step, timestamp
# Auto-restore if session < 24 hours old
```

#### 2.3 Dependency Graph for Impact Analysis

**New File:** `.claude/hooks/dependency-graph.js` (JavaScript)

```javascript
class DependencyGraph {
  // Build feature dependency graph from PRDs
  // Get impact of changes before making them
  // Warn about breaking changes
}
```

#### 2.4 TOON Compression

**New File:** `.claude/hooks/toon-compress.js` (JavaScript)

```javascript
// Token-Oriented Object Notation
// 52% smaller than JSON
// Use ONLY for consolidated memory files
```

---

### Phase 3: Architecture Improvements (Week 5-6)

#### 3.1 Dry-Run Mode

**Modify:** `bin/flow.sh` (Bash)

```bash
/flow start --dry-run
# Shows what would happen without making changes
```

#### 3.2 Incremental Quality Checking

**New File:** `.claude/maven-flow/hooks/incremental-check.sh` (Bash)

```bash
# Only check files changed since last good commit
# Faster feedback for large codebases
```

---

### Phase 4: Quality Enhancements (Week 7-8)

#### 4.1 Better Error Reporting

**New File:** `.claude/hooks/error-reporter.js` (JavaScript)

```javascript
const ERROR_FIXES = {
  'any': { message, fix, example },
  'relative-import': { message, fix, example }
};
```

#### 4.2 Automatic Agent Selection

**New File:** `.claude/hooks/agent-selector.js` (JavaScript)

```javascript
// Map violations to specialist agents
// 'any' → quality-agent
// 'large-component' → refactor-agent
```

---

## Files to Create/Modify

### New Files (11)

| File | Language | Purpose |
|------|----------|---------|
| `.claude/hooks/pre-mcp-validation.js` | JavaScript | MCP availability check |
| `.claude/hooks/path-utils.js` | JavaScript | Cross-platform paths |
| `.claude/hooks/prd-utils.js` | JavaScript | Safe PRD updates |
| `.claude/hooks/memory-cache.js` | JavaScript | Hash-based caching |
| `.claude/hooks/session-save.sh` | Bash | Session state save |
| `.claude/hooks/session-restore.sh` | Bash | Session state restore |
| `.claude/hooks/dependency-graph.js` | JavaScript | Impact analysis |
| `.claude/hooks/toon-compress.js` | JavaScript | Token compression |
| `.claude/hooks/retry-manager.js` | JavaScript | Step retry logic |
| `.claude/hooks/error-reporter.js` | JavaScript | Enhanced errors |
| `.claude/hooks/agent-selector.js` | JavaScript | Agent mapping |

### Modified Files (5)

| File | Changes |
|------|---------|
| `.claude/maven-flow/hooks/post-tool-use-quality.sh` | Git-aware file filtering |
| `.claude/maven-flow/hooks/stop-comprehensive-check.sh` | Fixed ESLint boundaries |
| `.claude/commands/flow.md` | Integrate new hooks, fix memory creation |
| `.claude/commands/flow-convert.md` | Fix mobile PRD paths |
| `bin/flow.sh` | Add dry-run, reset warning |

---

## Language Decision Rationale

### Use JavaScript When:
- JSON parsing/validation needed (PRD utils, MCP validation)
- Cross-platform path handling required (path-utils)
- Complex data structures (dependency graph, memory cache)
- API interactions (future MCP integrations)

### Use Bash When:
- Simple file operations (session save/restore)
- Git command wrappers (incremental check)
- Hook orchestration (create-memory)
- Existing codebase is Bash

---

## Testing Strategy

### Per-Item Testing

After implementing each item:
1. **Unit test** the specific functionality
2. **Integration test** with flow command
3. **Cross-platform test** (if applicable)
4. **Get feedback** before proceeding

### Cross-Platform Test Matrix

| OS | Shell | Test Command |
|----|-------|--------------|
| Linux | Bash | `./bin/flow.sh start` |
| macOS | Zsh/Bash | `./bin/flow.sh start` |
| Windows | PowerShell | `powershell -File ".\bin\flow.ps1" start` |
| Windows | CMD | `cmd /c "bin\flow.bat start"` |
| Windows | Git Bash | `./bin/flow.sh start` |

---

## Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Token usage per session | ~8,500 | ~4,900 | 42% reduction |
| Context refreshes | ~12 | ~4 | 67% fewer |
| Files re-read unnecessarily | ~15 | ~5 | 67% reduction |
| Session continuity | 0% | 100% | Full persistence |
| Dependency analysis time | 5-10 min | <5 sec | ~100x faster |
| ESLint check time | 30-60 sec | 2-5 sec | 90% faster |

---

## Key Decisions

### Why Hybrid Memory Format?

| Format | Use Case | Reason |
|--------|----------|--------|
| TXT | Story memory | Human-readable, git diff friendly |
| JSON | PRD files | Structured data, validation, tooling |
| TOON | Consolidated memory | Token efficiency (52% savings) |
| Binary index | Fast lookups | Performance, change detection |

### Why Hook-Based Architecture?

- **Claude Code native:** Uses official hook system
- **Zero-config:** Works automatically
- **Extensible:** Easy to add new checks
- **Performance:** <100ms overhead per hook

---

## Claude Code Compatibility

**Critical:** We're building tools to help Claude Code, not replace it.

```
Claude Code (Main)
    │
    ├─→ /flow command (orchestrator)
    │       │
    │       ├─→ Task tool → development-agent
    │       ├─→ Task tool → quality-agent
    │       └─→ Task tool → security-agent
    │
    └─→ Hooks (PostToolUse, Stop)
            │
            ├─→ post-tool-use-quality.sh (enhanced)
            └─→ stop-comprehensive-check.sh (enhanced)
```

---

## References

- [MCP Memory Keeper GitHub](https://github.com/mkreyman/mcp-memory-keeper)
- [Mastering Memory Consistency 2025](https://sparkco.ai/blog/mastering-memory-consistency-in-ai-agents-2025-insights)
- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory)
- [Why JSON Prompting is Better](https://www.analyticsvidhya.com/blog/2025/08/json-prompting/)
