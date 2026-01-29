# ADR-002: Multi-PRD Architecture

**Status:** Accepted

**Date:** 2025-01-11

## Context

**Problem:**
- Single monolithic PRD files become unwieldy as projects grow
- Different features have different development timelines and priorities
- Difficult to track progress across multiple independent features
- Merging all features into one flow creates complexity

**Observed Issues:**
- Large PRD files (1000+ lines) are difficult to navigate and maintain
- Changes to one feature block progress on others
- No clear separation of concerns between features

## Decision

**Each feature gets its own PRD JSON file: `docs/prd-[feature-name].json`**

The flow command automatically scans for all `prd-*.json` files in `docs/` and processes incomplete ones in order.

**Architecture:**
```
docs/
├── prd-user-auth.json          # User authentication feature
├── prd-task-priority.json      # Task priority feature
├── prd-notifications.json      # Notifications feature
├── progress-user-auth.txt      # Auth feature progress log
├── progress-task-priority.txt  # Priority feature progress log
└── progress-notifications.txt  # Notifications progress log
```

**Key Principles:**
1. **One PRD per feature**: Each feature has its own PRD file
2. **Independent execution**: Features can be developed in parallel
3. **Automatic discovery**: Flow command scans for all PRD files
4. **Priority ordering**: Stories execute in priority order within each PRD

## Consequences

**Benefits:**
- **Isolation**: Each feature is independent, changes don't affect others
- **Parallel development**: Multiple features can be developed simultaneously
- **Focused scope**: Each PRD is smaller and more manageable
- **Progress tracking**: Clear progress per feature via separate progress files
- **Flexible prioritization**: Can work on high-priority features first

**Trade-offs:**
- **More files**: Multiple PRD and progress files to manage
- **Cross-feature dependencies**: Must manage dependencies between features manually
- **Potential duplication**: Similar patterns may repeat across PRDs

## Alternatives Considered

### Alternative 1: Single Monolithic PRD
**Description:** One large PRD file containing all features and stories.

**Rejected because:**
- Becomes unwieldy at 1000+ lines
- Changes to one feature affect the entire file
- Cannot track progress per feature independently
- Slower to parse and load

### Alternative 2: Hierarchical PRD Structure
**Description:** Parent PRD with child PRDs for each feature.

**Rejected because:**
- Adds complexity without clear benefits
- Parent PRD becomes a synchronization point
- More difficult to implement and maintain

### Alternative 3: Database-Backed PRD Storage
**Description:** Store PRDs in a database instead of files.

**Rejected because:**
- Adds external dependency
- More complex to implement
- File-based is simpler and more portable

## Implementation

**PRD File Naming:**
- Format: `prd-[feature-name].json`
- Example: `prd-user-auth.json`, `prd-task-priority.json`

**Progress File Naming:**
- Format: `progress-[feature-name].txt`
- Example: `progress-user-auth.txt`, `progress-task-priority.txt`

**Flow Execution:**
```bash
/flow start                    # Process all incomplete PRDs
/flow status                   # Show status of all PRDs
/flow continue [feature-name]  # Continue specific PRD
/flow reset [feature-name]     # Reset specific PRD
```

**Processing Order:**
1. Scan `docs/` for all `prd-*.json` files
2. Pick first PRD with incomplete stories (alphabetically by filename)
3. Process stories in priority order
4. When PRD complete, move to next incomplete PRD
5. Continue until all PRDs are complete

## References

- `.claude/commands/flow.md` - Flow command documentation
- `.claude/skills/flow-convert/SKILL.md` - PRD conversion instructions
- `.claude/adrs/001-story-level-mcp-assignment.md` - Story-level MCP architecture
