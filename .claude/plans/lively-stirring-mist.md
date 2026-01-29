# Multi-Session Locking System for Maven Flow

## Background: What is Maven Flow?

Maven Flow is an autonomous AI development system that implements a product requirements document (PRD) completely automatically. It works by:

1. **Reading PRD files** - JSON files in `docs/prd-*.json` containing user stories
2. **Processing stories one by one** - Each story has multiple "mavenSteps" (1-10 steps)
3. **Spawning specialist agents** - For each step, it spawns a specialized agent (development, refactor, quality, security, testing, design)
4. **Tracking progress** - Stories are marked complete when all steps pass
5. **Creating memory** - After each story, it creates a memory file for context

### Current Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW STARTS                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│   Find first incomplete story (passes=false)                   │
│   from all PRD files in docs/                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│   Call Claude Code with: /flow-work-story <PRD> <STORY_ID>     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│   flow-work-story does:                                        │
│   1. Read story details from PRD                               │
│   2. Load memory from relatedPRDs                              │
│   3. Load previous story memories                              │
│   4. For EACH mavenStep in the story:                          │
│      - Determine which agent to use (development, quality, etc) │
│      - SPAWN THE AGENT to work on that step                    │
│      - Wait for agent to complete                              │
│   5. Update PRD to mark story complete (passes=true)          │
│   6. Create story memory file                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│   Check if all stories in PRD are complete                     │
│   If yes: Call /consolidate-memory                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                      ┌─────────┐
                      │  REPEAT │
                      └─────────┘
```

### What Happens Per Story

For a typical story with 4 mavenSteps:

1. **flow-work-story command is invoked** (1 Claude Code session)
2. **Memory is loaded** from relatedPRDs and previous stories
3. **Agent 1 is spawned** (e.g., development-agent for step 1)
   - Takes ~10-20 minutes to complete
4. **Agent 2 is spawned** (e.g., refactor-agent for step 3)
   - Takes ~5-15 minutes to complete
5. **Agent 3 is spawned** (e.g., quality-agent for step 5)
   - Takes ~5-10 minutes to complete
6. **Agent 4 is spawned** (e.g., testing-agent for step 10)
   - Takes ~5-10 minutes to complete
7. **Story is marked complete** in PRD
8. **Story memory is created** (takes 30-60 seconds)
9. **Next iteration begins** after 2-second sleep

**Total time: ~45-60 minutes per story**

---

## The Challenge: Single-Session Bottleneck

### Problem Statement

Currently, Maven Flow **can only run one session at a time**. If you try to run multiple flow instances in parallel:

```
Terminal 1: flow start
Terminal 2: flow start  (starts same time)
```

Both instances will:
1. Read the same PRD files
2. Find the SAME first incomplete story
3. BOTH start working on the SAME story
4. Waste resources doing duplicate work
5. Possibly corrupt the PRD file when both try to update it

### Why This Matters

The user has a project with **400+ stories**. At the current rate:
- **28 stories per day** (one session running 24/7)
- **~14 days to complete** all 400 stories

With 4 parallel sessions:
- **~100 stories per day** (4 sessions × 25 stories each)
- **~4 days to complete** all 400 stories

This is a **3-4x speedup** simply by allowing parallel execution.

### Why Can't We Just Run Multiple Sessions?

The core issue is **no coordination mechanism**. Multiple flow instances have no way to:

1. Know which stories other sessions are working on
2. Claim exclusive ownership of a story
3. Prevent other sessions from taking the same story
4. Communicate "I'm working on US-123, don't touch it"

---

## The Solution: Story Locking System

### Overview

Add a **locking mechanism** to the PRD JSON structure so that:
1. When a flow instance picks a story, it marks it as "locked"
2. Other instances see the lock and skip that story
3. When the story is complete, the lock is cleared
4. Stale locks (from crashed sessions) auto-expire

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│   TERMINAL 1                    TERMINAL 2                      │
│   Session: flow-session-...-aaa   Session: flow-session-...-bbb │
└─────────────────────────────────────────────────────────────────┘
         │                                │
         │ Scan PRDs                      │ Scan PRDs
         │                                │
         ▼                                ▼
┌─────────────────────┐        ┌─────────────────────┐
│ Find US-001         │        │ Find US-001         │
│ (passes=false)      │        │ (LOCKED by session-aaa)
└─────────────────────┘        └─────────────────────┘
         │                                │
         │ Try lock US-001                │ Skip US-001 (locked)
         │ ✓ Success!                    │
         ▼                                ▼
┌─────────────────────┐        ┌─────────────────────┐
│ Work on US-001      │        │ Find US-002         │
│ (locked by session-aaa)     │ (passes=false)      │
└─────────────────────┘        └─────────────────────┘
         │                                │
         │                                │ Try lock US-002
         │                                │ ✓ Success!
         │                                ▼
         │                       ┌─────────────────────┐
         │                       │ Work on US-002      │
         │                       │ (locked by session-bbb)
         │                       └─────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────┐        ┌─────────────────────┐
│ US-001 complete!    │        │ US-002 complete!    │
│ Clear lock          │        │ Clear lock          │
└─────────────────────┘        └─────────────────────┘
```

### Data Structure Changes

Each story in the PRD JSON will have new fields:

```json
{
  "userStories": [
    {
      "id": "US-001",
      "title": "User Login Component",
      "description": "...",
      "acceptanceCriteria": [...],
      "mavenSteps": [1, 7, 10],
      "passes": false,

      // === NEW LOCKING FIELDS ===
      "lockedBy": "flow-session-20250129-143052-abc123",
      "lockedAt": 1706543452681

      // === OPTIONAL (can add later) ===
      // "completedBy": null,
      // "completedAt": null
    }
  ]
}
```

**Field explanations:**
- `lockedBy`: Session ID that claimed this story (null if not locked)
- `lockedAt`: Timestamp when lock was acquired (milliseconds since epoch, informational only)

**V1 SIMPLIFICATION:** Skip `completedBy` and `completedAt` for now. These can be added later without breaking anything. The story memory and git history provide completion tracking.

### Session Registry (.flow/sessions.json)

NEW file to track all active sessions:

```json
{
  "sessions": [
    {
      "id": "flow-session-20250129-143052-abc123",
      "pid": 12345,
      "startedAt": 1706543452000,
      "lastHeartbeat": 1706544000000,
      "currentStory": "US-001",
      "storiesCompleted": 5
    }
  ]
}
```

**NOTE: No "status" field - computed dynamically**
- Session is "active" if: PID exists AND heartbeat is fresh (< 10 minutes)
- If either fails → session is dead
- This prevents status drift and confusion
- `flow status` computes liveness, doesn't trust stored value

**Purpose:**
- Global view of all running sessions
- Heartbeat for stale detection (better than timestamp math)
- Debugging: see which sessions are actually alive
- Safer reset/unlock behavior

### Memory File Structure Changes

**OLD (problematic):**
```
memory/
  abuse-controls/
    US-001.md  ← Multiple sessions could collide here
```

**NEW (session-scoped):**
```
memory/
  abuse-controls/
    .session-flow-session-20250129-143052-abc123/
      US-001.md  ← Only this session writes here
  consolidated/
    abuse-controls.md  ← Read-only for context, updated only on consolidation
```

**Why session-scoped?**
- Multiple sessions can complete stories in same PRD
- They won't overwrite each other's memory files
- Consolidation reads from all session directories

---

## Implementation Plan

### Phase 1: Core Locking Functions (Priority 1)

**File: `bin/flow.sh`**

Add these functions after line 282 (after the `format_duration` function):

#### Function 1: `is_story_locked(prd_file, story_id)`

Checks if a story is locked by ANOTHER session.

**Logic:**
1. Read the `lockedBy` field from the story
2. If null or empty → return false (not locked)
3. If it's our own session ID → return false (not locked by another)
4. If it's another session ID → check if lock is stale
5. If lock age > 4 hours → return false (stale lock)
6. Otherwise → return true (locked by another session)

**Why check for stale locks?**
If a flow session crashes (Ctrl+C, system crash, etc.), the lock won't be cleared. We need to auto-expire old locks so stories don't get stuck.

#### Function 2: `lock_story(prd_file, story_id)`

Atomically claims a story for this session.

**CRITICAL: File-level locking with flock**

The pattern `jq ... > tmp && mv` is NOT atomic under concurrent writers. We MUST use `flock` for mutual exclusion.

**Logic:**
1. Get current timestamp in milliseconds
2. Use `flock` to get exclusive lock on PRD file
3. Inside flock block:
   - Read PRD to verify story is still lockable
   - Use `jq` to update the story's `lockedBy` and `lockedAt` fields
   - Write to temp file, then `mv` to overwrite
4. Release flock
5. Verify we actually got the lock (race condition check)

**Implementation pattern:**
```bash
lock_story() {
    local prd_file="$1"
    local story_id="$2"

    local lock_file="${prd_file}.lock"
    local timestamp_ms=$(date +%s%3N)

    # CRITICAL: Use flock for file-level mutual exclusion
    (
        flock -x -w 30 200  # Exclusive lock, 30 second timeout

        # Double-check story is still available inside the lock
        local current_lock=$(jq -r ".userStories[] | select(.id == \"$story_id\") | .lockedBy // \"\"" "$prd_file")
        if [ -n "$current_lock" ] && [ "$current_lock" != "null" ] && [ "$current_lock" != "$SESSION_ID" ]; then
            # Story got locked while we were waiting
            exit 1
        fi

        # Update the lock
        jq "(.userStories[] | select(.id == \"$story_id\")) |=
            .lockedBy = \"$SESSION_ID\" |
            .lockedAt = $timestamp_ms" "$prd_file" > "${prd_file}.tmp" && mv "${prd_file}.tmp" "$prd_file"

    ) 200>"$lock_file"

    return $?
}
```

**Why flock is mandatory:**
- Two sessions can read the same PRD simultaneously
- Both generate temp files
- Both `mv` successfully
- Last writer wins → silent corruption

**flock guarantees:**
- Only one session mutates a PRD at a time
- Story-level locks actually mean something
- No silent corruption under concurrent load

#### Function 3: `unlock_story(prd_file, story_id)`

Clears the lock on a story.

**CRITICAL: Must use flock here too**

**Logic:**
1. Get flock on PRD file
2. Inside flock block:
   - Verify lock belongs to our session
   - Use `jq` to set `lockedBy` and `lockedAt` to null
3. Release flock

**Implementation pattern:**
```bash
unlock_story() {
    local prd_file="$1"
    local story_id="$2"

    local lock_file="${prd_file}.lock"

    (
        flock -x -w 10 200

        # Only unlock if we own it
        jq "(.userStories[] | select(.id == \"$story_id\" and .lockedBy == \"$SESSION_ID\")) |=
            .lockedBy = null |
            .lockedAt = null" "$prd_file" > "${prd_file}.tmp" && mv "${prd_file}.tmp" "$prd_file"

    ) 200>"$lock_file"
}
```

**Why safety check + flock?**
- Prevents accidentally unlocking stories claimed by other sessions
- Prevents race condition where lock changes between check and unlock

#### Function 4: Session Registry Management

**NEW: register_session()**

Called when flow starts. Registers this session in `.flow/sessions.json`.

```bash
register_session() {
    local registry_file=".flow/sessions.json"
    local registry_dir=$(dirname "$registry_file")
    local pid=$$
    local timestamp_ms=$(date +%s%3N)

    mkdir -p "$registry_dir"

    # Use flock to safely update registry
    (
        flock -x -w 10 200

        # Read existing registry or create new
        if [ -f "$registry_file" ]; then
            registry=$(cat "$registry_file")
        else
            registry='{"sessions":[]}'
        fi

        # Add this session (NO status field - computed dynamically)
        registry=$(echo "$registry" | jq ".sessions += [
            {
                \"id\": \"$SESSION_ID\",
                \"pid\": $pid,
                \"startedAt\": $timestamp_ms,
                \"lastHeartbeat\": $timestamp_ms,
                \"currentStory\": null,
                \"storiesCompleted\": 0
            }
        ]")

        echo "$registry" > "${registry_file}.tmp" && mv "${registry_file}.tmp" "$registry_file"

    ) 200>"${registry_file}.lock"
}
```

**NEW: update_session_heartbeat()**

Called manually OR by background loop.

```bash
update_session_heartbeat() {
    local registry_file=".flow/sessions.json"
    local story_id="${1:-}"
    local timestamp_ms=$(date +%s%3N)

    # Fast update - no need for flock on read, then flock on write
    if [ -f "$registry_file" ]; then
        (
            flock -x -w 5 200

            jq "(.sessions[] | select(.id == \"$SESSION_ID\")) |=
                .lastHeartbeat = $timestamp_ms |
                .currentStory = \"$story_id\"" "$registry_file" > "${registry_file}.tmp" && mv "${registry_file}.tmp" "$registry_file"

        ) 200>"${registry_file}.lock"
    fi
}
```

**MANDATORY: Background heartbeat loop**

**CRITICAL: Long mavenSteps can exceed 10 minutes**
Without background loop, live sessions will look dead and their locks will be stolen.

```bash
# MANDATORY: Start at session registration
start_heartbeat_loop() {
    while true; do
        sleep 60
        update_session_heartbeat "$(cat .flow-current-story 2>/dev/null || echo "working")"
    done &
    HEARTBEAT_LOOP_PID=$!
    echo "$HEARTBEAT_LOOP_PID" > .flow-heartbeat-pid
}

# MANDATORY: Kill in cleanup
kill_heartbeat_loop() {
    if [ -f ".flow-heartbeat-pid" ]; then
        local pid=$(cat .flow-heartbeat-pid)
        kill "$pid" 2>/dev/null
        rm -f .flow-heartbeat-pid
    fi
}
```

**Why mandatory?**
- Manual updates before agent spawns are NOT sufficient
- Long mavenSteps (10-20+ min) exceed 10-minute heartbeat threshold
- Without loop, other sessions will steal locks from slow-but-alive agents
- Background loop is the ONLY safe approach

**NEW: deregister_session()**

Called when flow exits. Removes session from registry.

```bash
deregister_session() {
    local registry_file=".flow/sessions.json"

    if [ -f "$registry_file" ]; then
        (
            flock -x -w 10 200

            # Remove this session from registry
            jq ".sessions |= map(select(.id != \"$SESSION_ID\"))" "$registry_file" > "${registry_file}.tmp" && mv "${registry_file}.tmp" "$registry_file"

        ) 200>"${registry_file}.lock"
    fi
}
```

**NEW: get_stale_sessions()**

Returns list of session IDs that are dead (PID doesn't exist OR heartbeat stale).

```bash
get_stale_sessions() {
    local registry_file=".flow/sessions.json"
    local stale_threshold_ms=$((10 * 60 * 1000))  # 10 minutes
    local current_ms=$(date +%s%3N)
    local stale_sessions=()

    if [ -f "$registry_file" ]; then
        while IFS= read -r session_id session_pid session_heartbeat; do
            local is_stale=false

            # Check BOTH: PID exists AND heartbeat fresh
            # If EITHER fails, session is stale
            if ! kill -0 "$session_pid" 2>/dev/null; then
                is_stale=true
            else
                local age_ms=$((current_ms - session_heartbeat))
                if [ $age_ms -gt $stale_threshold_ms ]; then
                    is_stale=true
                fi
            fi

            if [ "$is_stale" = true ]; then
                stale_sessions+=("$session_id")
            fi
        done < <(jq -r '.sessions[] |
            "\(.id) \(.pid) \(.lastHeartbeat)"' "$registry_file" 2>/dev/null)

        echo "${stale_sessions[@]}"
    fi
}
```

**Why check BOTH conditions?**
- `kill -0 $pid` - checks if process exists (immediate dead detection)
- Heartbeat check - catches hung processes (PID exists but not updating)
- Both must pass for session to be considered alive

**Why session registry?**
- Better stale detection (heartbeat vs timestamp math)
- Global view for debugging
- `flow status` can show which sessions are actually alive
- Safer reset (can check if session still running before clearing locks)

#### Function 5: `clear_all_session_locks()`

Cleans up ALL locks owned by this session. Called on exit.

**CRITICAL: Must use flock per PRD**

**Logic:**
1. Loop through all PRD files
2. For each PRD:
   - Get flock on that PRD
   - Clear all locks owned by our session ID
3. Called automatically when flow exits (even on crash via trap)

```bash
clear_all_session_locks() {
    if [ ! -d "docs" ]; then
        return
    fi

    for prd in docs/prd-*.json; do
        if [ -f "$prd" ]; then
            local lock_file="${prd}.lock"

            (
                flock -x -w 5 200

                # Clear all locks owned by this session
                jq "(.userStories[] | select(.lockedBy == \"$SESSION_ID\")) |=
                    .lockedBy = null |
                    .lockedAt = null" "$prd" > "${prd}.tmp" && mv "${prd}.tmp" "$prd"

            ) 200>"$lock_file"
        fi
    done
}
```

**Why needed?**
If the session is interrupted (Ctrl+C, terminal close), we need to release all our locks so other sessions can pick up those stories.

**Why flock per PRD?**
Can't hold one lock for all PRDs (deadlock risk). Clear locks one PRD at a time.

#### Function 5: `find_and_lock_story()`

**THE SINGLE AUTHORITY FOR LOCK ACQUISITION**

**CRITICAL DESIGN RULE:**
- This is the ONLY function that acquires locks
- Delete or don't use `lock_story()` elsewhere
- Single lock acquisition path = predictable behavior

**CRITICAL FIXES APPLIED:**
1. **Stdout capture (not temp files)**: Use `result=$(subshell)` pattern
2. **Session liveness validation**: Check PID + heartbeat before claiming locks
3. **Heartbeat is source of truth**: NOT time-based lock expiry
4. **Power loss safe**: Dead sessions automatically invalidate locks

**Logic:**
1. Loop through all PRD files
2. For each PRD, get flock FIRST
3. Inside flock block:
   - Build list of DEAD sessions (no PID or stale heartbeat)
   - Find first story where `passes == false` AND (not locked OR locked by DEAD session)
   - Try to lock it
   - Output result via stdout (NOT temp files)
4. Release flock
5. If we got a story, return it
6. If we didn't, continue to next PRD

```bash
find_and_lock_story() {
    local registry_file=".flow/sessions.json"
    local current_ms=$(date +%s%3N)
    local stale_heartbeat_threshold_ms=$((10 * 60 * 1000))  # 10 minutes

    # Build JSON array of dead sessions (NOT string - prevents partial match bugs)
    local dead_sessions_json="[]"
    if [ -f "$registry_file" ]; then
        while IFS= read -r session_id session_pid session_heartbeat; do
            local is_dead=false

            # CRITICAL: Check BOTH PID exists AND heartbeat fresh
            # If EITHER fails, session is dead (no OR logic)
            if ! kill -0 "$session_pid" 2>/dev/null; then
                is_dead=true
            else
                local age_ms=$((current_ms - session_heartbeat))
                if [ $age_ms -gt $stale_heartbeat_threshold_ms ]; then
                    is_dead=true
                fi
            fi

            if [ "$is_dead" = true ]; then
                dead_sessions_json=$(echo "$dead_sessions_json" | jq ". + [\"$session_id\"]")
            fi
        done < <(jq -r '.sessions[] |
            "\(.id) \(.pid) \(.lastHeartbeat)"' "$registry_file" 2>/dev/null)
    fi

    for prd in docs/prd-*.json; do
        if [ -f "$prd" ]; then
            local lock_file="${prd}.lock"

            # CRITICAL: Get flock BEFORE reading
            # Use stdout capture, NOT temp files or exit codes
            local result=$(
                flock -x -w 30 200  # Exclusive lock, 30 second timeout

                # Find first available story INSIDE the lock
                # Story is available if:
                # - passes == false (incomplete)
                # - AND (not locked OR locked by us OR locked by dead session)
                story=$(jq -r --argjson dead "$dead_sessions_json" '
                    .userStories[] |
                    select(.passes == false) |
                    select(
                        .lockedBy == null or
                        .lockedBy == "'"$SESSION_ID"'" or
                        ($dead | index(.lockedBy)) >= 0
                    ) |
                    "\(.id)|\(.title)"
                ' "$prd" 2>/dev/null | head -1)

                if [ -n "$story" ]; then
                    IFS='|' read -r story_id story_title <<< "$story"

                    # Try to lock it (still inside flock)
                    local timestamp_ms=$(date +%s%3N)
                    jq "(.userStories[] | select(.id == \"$story_id\")) |=
                        .lockedBy = \"$SESSION_ID\" |
                        .lockedAt = $timestamp_ms" "$prd" > "${prd}.tmp" 2>/dev/null && mv "${prd}.tmp" "$prd"

                    if [ $? -eq 0 ]; then
                        # Verify we still own the lock
                        local locked_by=$(jq -r ".userStories[] | select(.id == \"$story_id\") | .lockedBy" "$prd")
                        if [ "$locked_by" = "$SESSION_ID" ]; then
                            # SUCCESS: Output to stdout for parent to capture
                            echo "$prd|$story_id|$story_title"
                        fi
                    fi
                fi

            ) 200>"$lock_file"

            # Check if we got a story (stdout capture, not temp file)
            if [ -n "$result" ]; then
                echo "$result"
                return 0
            fi
        fi
    done

    # No available story
    return 1
}
```

**CRITICAL DESIGN RULES:**

1. **Single authority**: This is the ONLY function that acquires locks
   - Do NOT use `lock_story()` elsewhere
   - All lock acquisition goes through this one function
   - Single path = predictable behavior

2. **Stdout capture (NOT temp files)**:
   ```bash
   # WRONG: Temp file approach
   (
     flock ...
     echo "result" > file.tmp
   ) 200>lock
   result=$(cat file.tmp)  # Race: file might not exist

   # WRONG: Exit code approach
   (
     flock ...
     echo "result"
     exit 0
   ) 200>lock
   # Parent can't reliably capture output

   # CORRECT: Stdout capture
   result=$(
     flock ...
     echo "result"
   ) 200>lock
   # Parent gets result directly, no races
   ```

3. **Session liveness validation**:
   - Lock is valid ONLY if owning session is alive
   - Session is alive if: PID exists AND heartbeat is fresh
   - Check both before considering a lock "stale"
   - `kill -0 $pid` checks if process exists

4. **Heartbeat is source of truth**:
   - NOT time-based lock expiry (no "4 hours passed")
   - A story can legitimately take >4 hours
   - Slow agent ≠ dead session
   - If session heartbeat is fresh, lock is valid
   - If session heartbeat is stale OR PID dead, lock is invalid

5. **Power loss safety**:
   - After power loss, PID doesn't exist
   - Heartbeat stops updating
   - Next session automatically sees locks as stale
   - No manual cleanup needed
   - System self-heals on next start

### Phase 2: Modify Main Iteration Loop

**File: `bin/flow.sh`, lines 602-620**

**Current code:**
```bash
# Find first incomplete story across all PRDs
for prd in docs/prd-*.json; do
    story=$(jq -r '.userStories[] | select(.passes == false) | "\(.id)|\(.title)"' "$prd" | head -1)
    if [ -n "$story" ]; then
        # Work on this story
        break
    fi
done
```

**New code with ADAPTIVE BACKOFF:**
```bash
# Find first UNLOCKED, incomplete story across all PRDs
result=$(find_and_lock_story)

if [ -n "$result" ]; then
    IFS='|' read -r PRD_FILE STORY_ID STORY_TITLE <<< "$result"

    # We got work! Update heartbeat
    update_session_heartbeat "$STORY_ID"

    # Work on this story (no sleep - we're active)

else
    # No available stories - check if all complete or all locked
    if has_any_incomplete_stories; then
        echo -e "${YELLOW}[!] All stories locked by other sessions${NC}"
        echo -e "${GRAY}    Backing off for ${LOCK_RETRY_INTERVAL}s...${NC}"

        # CRITICAL: Adaptive backoff when IDLE
        sleep "$LOCK_RETRY_INTERVAL"

        # Update heartbeat (show we're waiting, not dead)
        update_session_heartbeat "waiting"

        continue  # Try again in next iteration
    else
        echo "All stories complete!"
        exit 0
    fi
fi
```

**Why adaptive backoff?**
- **Active work → No sleep**: When we have a story, work immediately
- **No work → Backoff sleep**: When all stories locked, wait before retrying
- **Prevents CPU spinning**: Don't peg CPU checking for available work
- **Prevents log spam**: Don't spam "all locked" messages

**Sleep rules:**
```bash
# After completing a story:
if has_available_stories; then
    sleep 0  # More work available - go immediately
else
    sleep "$LOCK_RETRY_INTERVAL"  # Nothing available - backoff
fi
```

### Phase 3: Update Story Completion Handler

**File: `bin/flow.sh`, lines 674-683`

**When a story is completed:**
1. Mark `passes = true`
2. Set `completedBy` to our session ID
3. Set `completedAt` to current timestamp
4. **Clear the lock** (set `lockedBy` and `lockedAt` to null)

**Why clear the lock on completion?**
The story is now complete, so no other session should try to work on it anyway. Clearing the lock:
- Makes the data cleaner
- Prevents confusion in status display
- Follows the principle: locks are for "in progress" work

### Phase 4: Add Cleanup on Exit

**File: `bin/flow.sh`, lines 354-359`

**Current cleanup:**
```bash
cleanup() {
    rm -f "$SESSION_FILE"
}
trap cleanup EXIT
```

**New cleanup with session deregistration:**
```bash
cleanup() {
    echo -e "${GRAY}[CLEANUP] Cleaning up session $SESSION_ID${NC}"

    # 1. Clear all our locks (uses flock internally)
    clear_all_session_locks

    # 2. Remove session from registry (uses flock internally)
    deregister_session

    # 3. Remove session file
    rm -f "$SESSION_FILE"

    # 4. NOTE: Do NOT delete .lock files
    # flock uses file descriptors, not file existence
    # Deleting lock files can break concurrent operations

    echo -e "${GREEN}[OK] Session $SESSION_ID cleaned up${NC}"
}

# Catch ALL exit signals
trap cleanup EXIT INT TERM HUP
```

**Why catch HUP too?**
- `EXIT` - Normal exit
- `INT` - Interrupt signal (Ctrl+C)
- `TERM` - Termination signal (kill command)
- `HUP` - Hangup (terminal closed)

**CRITICAL: Do NOT delete .lock files**
- `flock` uses file descriptors, not file existence
- Deleting lock files does NOT release active locks
- Deleting lock files can break concurrent `flock` attempts
- Can cause undefined behavior on some filesystems
- **Leave .lock files in place** - they are coordination points, not garbage

**Order matters:**
1. Clear locks first (so other sessions can pick up work)
2. Deregister second (so we're removed from registry)
3. Clean up session file last (local cleanup only)

### Phase 4.5: Session-Scoped Memory Files

**CRITICAL: Memory files must be session-scoped**

Current problem: Multiple sessions can complete stories in the same PRD concurrently, leading to memory file conflicts.

**Old structure (PROBLEMATIC):**
```
memory/
  abuse-controls/
    US-001.md  ← Multiple sessions could write here
    US-002.md
```

**New structure (SAFE):**
```
memory/
  abuse-controls/
    .session-flow-session-20250129-143052-abc123/
      US-001.md  ← Only this session writes here
    .session-flow-session-20250129-143100-xyz789/
      US-002.md  ← Only this session writes here
  consolidated/
    abuse-controls.md  ← Read-only for context, updated only on consolidation
```

**Implementation in flow-work-story.md:**

When creating story memory:
```bash
# OLD (problematic):
MEMORY_FILE="memory/${feature}/US-${story_number}.txt"

# NEW (session-scoped):
MEMORY_FILE="memory/${feature}/.session-${SESSION_ID}/US-${story_number}.txt"
mkdir -p "$(dirname "$MEMORY_FILE")"
```

**Why session-scoped?**
- Multiple sessions can complete stories in same PRD without collision
- Each session has its own memory directory
- Consolidation reads from all `.session-*` directories
- No overwrite conflicts

**Consolidation update:**

When consolidating memory, read from all session directories:
```bash
# Find all story memories across all sessions
find "memory/${feature}/.session-*/" -name "US-*.txt" | sort
```

### Phase 5: Update flow-status.sh

**Add two new sections: Active Sessions and Story Locks**

**Session Registry Display:**
```
Active Sessions:
  flow-session-20250129-143052-abc123 (you)
    PID: 12345
    Started: 2 minutes ago
    Heartbeat: 10 seconds ago
    Current story: US-001
    Stories completed: 5

  flow-session-20250129-143100-xyz789
    PID: 12346
    Started: 1 minute ago
    Heartbeat: 5 seconds ago
    Current story: US-003
    Stories completed: 2

Stale Sessions (heartbeat > 10 min):
  flow-session-20250129-120000-def456
    Last heartbeat: 25 minutes ago
    Consider running: flow reset --clear-stale
```

**Story Locks Display:**
```
Story Locks:
  abuse-controls:
    ✓ US-001 (you) - Detect Usage Spikes
    🔒 US-003 (flow-session-20250129-143100-xyz789) - Rate Limiting - alive
    🔒 US-005 (flow-session-20250129-115000-abc123) - Alert Rules - DEAD (reclaimable)

No locks in: user-authentication, database-migrations
```

**Implementation:**
```bash
# For each locked story, check if owner is alive
for prd in docs/prd-*.json; do
    locked_stories=$(jq -r '.userStories[] |
        select(.lockedBy != null and .lockedBy != "null") |
        "\(.id)|\(.lockedBy)"' "$prd" 2>/dev/null)

    while IFS='|' read -r story_id locked_by; do
        # Check if session is alive
        is_alive=false
        if [ -f ".flow/sessions.json" ]; then
            session_info=$(jq -r ".sessions[] | select(.id == \"$locked_by\")" \
                ".flow/sessions.json" 2>/dev/null)
            if [ -n "$session_info" ]; then
                session_pid=$(echo "$session_info" | cut -d' ' -f2)
                last_heartbeat=$(echo "$session_info" | cut -d' ' -f3)
                current_ms=$(date +%s%3N)
                age_ms=$((current_ms - last_heartbeat))

                # Check BOTH: PID exists AND heartbeat fresh
                if kill -0 "$session_pid" 2>/dev/null; then
                    if [ $age_ms -lt 600000 ]; then  # 10 minutes
                        is_alive=true
                    fi
                fi
            fi
        fi

        if [ "$is_alive" = true ]; then
            echo "    🔒 $story_id ($locked_by) - alive"
        else
            echo "    🔒 $story_id ($locked_by) - DEAD (reclaimable)"
        fi
    done
done
```

**Language rules:**
- NO "stale" - implies time-based expiry (wrong)
- Use "alive" (PID + heartbeat fresh)
- Use "DEAD (reclaimable)" for locks that can be safely taken
fi

# Show locks (existing logic)
for prd in docs/prd-*.json; do
    # ... lock display logic ...
done
```

**Why show sessions?**
- See which sessions are actually alive (vs orphaned locks)
- Debug stuck sessions
- Identify stale sessions that need cleanup
    🔒 US-005 (flow-session-20250129-115000-abc) - Alert Rules - stale (95m old)

No locks in: user-authentication, database-migrations
```

**What this shows:**
- Which PRDs have locked stories
- Which session owns each lock
- How long ago the lock was acquired
- Whether the lock is "stale" (older than 4 hours)
- Which locks are "yours" (current session)

**Why is this useful?**
User can see:
1. What other sessions are working on
2. Whether any locks are stale (need manual cleanup)
3. Which stories their own session has locked

### Phase 6: Add Manual Unlock Commands

**New command: `flow reset` enhancement**

When resetting, also clear ALL locks from all sessions:

```bash
flow reset
```

This will:
1. Delete .flow-session file (existing behavior)
2. **NEW:** Clear all `lockedBy` and `lockedAt` fields from all stories

**Why needed?**
If sessions crash and leave stale locks, user needs a way to clear them all and start fresh.

**V1 SIMPLIFICATION: Skipping `flow unlock` command**

Manual unlock is operator-heavy and risky for v1. For v1:
- Use `flow reset` to clear all locks
- Stale locks auto-heal anyway via heartbeat + PID checks
- Can add `flow unlock --force` in v2 when needed

**Why needed?**
If a single story has a stale lock (dead session), user can unlock just that one story without resetting everything.

**Why --force requirement?**
Prevents accidentally unlocking stories that are actively being worked on by legitimate (but slow) sessions.

### Phase 6.5: flow-work-story.md Changes

**CRITICAL: Workers MUST NEVER write PRD files directly**

flow-work-story.md must:
- **Verify** the lock (sanity check)
- **Do the work** (spawn agents)
- **Return result** (success/failure via exit code)
- **NEVER mutate PRD files** (bypasses scheduler's mutex)
- **NEVER manage locks** (no locking/unlocking)
- **Fail fast** if lock mismatch

**What flow-work-story SHOULD do:**

In STEP 1 (Read Story Details), add lock verification:

```bash
## STEP 1: READ STORY DETAILS

**Execute:**
cat "$1" | jq '.userStories[] | select(.id == "$2")'

**Verify lock matches:**
locked_by=$(cat "$1" | jq -r ".userStories[] | select(.id == \"$2\") | .lockedBy // \"\"")
if [ "$locked_by" != "$SESSION_ID" ]; then
    echo "ERROR: Story $2 is not locked by this session!"
    echo "Locked by: $locked_by"
    echo "This session: $SESSION_ID"
    exit 1
fi
```

**What flow-work-story SHOULD NOT do:**

- ❌ Do NOT try to acquire locks
- ❌ Do NOT try to release locks
- ❌ Do NOT try to recover from lock mismatches
- ❌ Do NOT update `lockedBy` or `lockedAt` fields
- ❌ Do NOT update `passes` field (PRD mutation!)
- ❌ Do NOT write to PRD files at all

**Why workers must NEVER write PRDs?**

```
flow.sh = Scheduler + State Manager (ONLY authority for PRD mutation)
  - Decides which story to work on
  - Manages locks (acquire, release, cleanup)
  - Handles race conditions
  - Owns ALL PRD mutations (under flock)
  - Sets passes=true, completedBy, completedAt
  - Clears locks

flow-work-story = Worker (executor)
  - Verifies it has permission (lock check)
  - Does the work (spawns agents)
  - Returns result (exit code 0 = success, 1 = failure)
  - NEVER touches PRD files
```

**On story completion - CORRECT APPROACH:**

flow-work-story returns success (exit code). flow.sh handles PRD mutation:

**In flow-work-story.md:**
```bash
## STEP 4: REPORT COMPLETION

**Execute:**
echo "Story $STORY_ID completed successfully"
exit 0  # Success code

# DO NOT update PRD here - flow.sh handles it
```

**In flow.sh (after calling flow-work-story):**
```bash
# Call Claude Code to work on this story
claude --dangerously-skip-permissions "/flow-work-story $PRD_FILE $STORY_ID"
exit_code=$?

if [ $exit_code -eq 0 ]; then
    # Story completed - update PRD under flock
    (
        flock -x -w 10 200
        timestamp_ms=$(date +%s%3N)

        # Update PRD: mark complete, set completion metadata, clear lock
        jq "(.userStories[] | select(.id == \"$STORY_ID\")) |=
            .passes = true |
            .completedBy = \"$SESSION_ID\" |
            .completedAt = $timestamp_ms |
            .lockedBy = null |
            .lockedAt = null" "$PRD_FILE" > tmp.json && mv tmp.json "$PRD_FILE"

    ) 200>"${PRD_FILE}.lock"

    STORIES_COMPLETED=$((STORIES_COMPLETED + 1))
fi
```

**Why this separation?**

1. **Race condition prevention**: All PRD writes happen under flock in flow.sh
2. **Single authority**: Only flow.sh mutates PRDs, never workers
3. **Power loss safety**: If worker crashes, flow.sh still controls the lock
4. **Split-brain prevention**: flow.sh confirms completion before clearing lock
5. **Mutex guarantee**: Only one session updates a PRD at a time

### Phase 7: Migration for Existing PRDs

**New script: `bin/migrate-prd-locks.sh`**

Existing PRDs don't have the locking fields. This script adds them:

```bash
#!/bin/bash
# Add lock fields to existing PRDs

for prd in docs/prd-*.json; do
    if [ -f "$prd" ]; then
        # Check if already migrated
        has_locks=$(jq '.userStories[0].lockedBy // "none"' "$prd")

        if [ "$has_locks" = "none" ]; then
            # Add lock fields to all stories
            jq '(.userStories[]) |=
                .lockedBy = null |
                .lockedAt = null |
                .completedBy = null |
                .completedAt = null' "$prd" > tmp.json && mv tmp.json "$prd"
            echo "✓ Migrated $prd"
        fi
    done
```

**Run once after installing the updated flow:**
```bash
migrate-prd-locks
```

### Phase 8: Session ID Enhancement

**File: `bin/flow.sh`, line 227**

**Current session ID:**
```bash
SESSION_ID="${PROJECT_NAME}-$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)"
```

**New session ID (more descriptive):**
```bash
TIMESTAMP_PART=$(date +%Y%m%d-%H%M%S)
RANDOM_PART=$(head /dev/urandom | tr -dc a-z0-9 | head -c 6)
SESSION_ID="flow-session-${TIMESTAMP_PART}-${RANDOM_PART}"
```

**Example:**
- Old: `next-mavens-flow-a1b2c3d4`
- New: `flow-session-20250129-143052-abc123`

**Why change?**
- Easier to read (human-readable timestamp)
- Easier to debug (can see when session started)
- More descriptive (clearly a flow session)

---

## Configuration Options

Add these environment variables for configurability:

```bash
# Heartbeat threshold (milliseconds) - sessions older than this are considered stale
# Default: 10 minutes (600000 ms)
FLOW_HEARTBEAT_THRESHOLD_MS=${FLOW_HEARTBEAT_THRESHOLD_MS:-600000}

# Lock retry interval (seconds) - wait time when all stories locked
FLOW_LOCK_RETRY_INTERVAL=${FLOW_LOCK_RETRY_INTERVAL:-5}

# Enable/disable locking (for testing or single-session mode)
FLOW_LOCKING_ENABLED=${FLOW_LOCKING_ENABLED:-true}
```

**NOTE: Removed FLOW_LOCK_TIMEOUT_HOURS**
- Lock expiry is now based on heartbeat, NOT time
- If session heartbeat is fresh, lock is valid (even after 12 hours)
- If session heartbeat is stale OR PID dead, lock is invalid
- This prevents "slow agent = dead session" false positives

---

## Performance Optimization

While implementing the locking system, also apply this quick win:

**File: `bin/flow.sh`, line 23**

**Change:**
```bash
SLEEP_SECONDS=2  # Current: 2 second delay between iterations
```

**To:**
```bash
SLEEP_SECONDS=0  # No delay - faster execution
```

**Impact:**
- 2 seconds saved per story
- For 28 stories: 56 seconds saved
- For 400 stories: ~13 minutes saved

Not huge, but every bit helps, and there's no downside.

---

## Testing Strategy

### Test 1: Basic Locking
```bash
# Terminal 1
cd /path/to/project
flow start

# Terminal 2 (simultaneously)
cd /path/to/project
flow start
```

**Expected:**
- Terminal 1 locks US-001, works on it
- Terminal 2 skips US-001, locks US-002, works on it
- Both work on different stories in parallel

### Test 2: Lock Display
```bash
flow status
```

**Expected output:**
```
Story Locks:
  abuse-controls:
    ✓ US-001 (flow-session-20250129-143052-abc123) - Detect Usage Spikes - 2m ago
    🔒 US-003 (flow-session-20250129-143100-xyz789) - Rate Limiting - 1m ago
```

### Test 3: Stale Lock Handling
1. Start flow, let it lock a story
2. Kill the flow process (simulate crash)
3. Wait 4+ hours
4. Start flow again

**Expected:**
- Old lock is recognized as stale
- Story is available for locking
- New session locks and works on it

### Test 4: Reset Clearing Locks
1. Start multiple flow instances
2. Run `flow reset`

**Expected:**
- All locks are cleared
- All stories are available
- Confirmation message shows how many locks were cleared

### Test 5: Manual Unlock
```bash
flow unlock US-001
```

**Expected:**
- Story US-001 is unlocked
- Confirmation message displayed

---

## Summary of Changes

### Files to Modify

1. **`bin/flow.sh`** - Core locking logic
   - Add `is_story_locked()` function (checks session liveness)
   - Add `register_session()`, `start_heartbeat_loop()`, `kill_heartbeat_loop()` functions
   - Add `update_session_heartbeat()` function
   - Add `deregister_session()` function
   - Add `find_and_lock_story()` function (ONLY lock acquisition path)
   - Add `clear_all_session_locks()` function (with flock per PRD)
   - Modify iteration loop to use `find_and_lock_story()` with adaptive backoff
   - Update story completion handler (under flock, sets passes=true, clears lock)
   - Update cleanup handler to call `clear_all_session_locks()` and `kill_heartbeat_loop()`
   - Enhance reset command to clear all locks
   - Set `SLEEP_SECONDS=0` for speed
   - Add trap for EXIT, INT, TERM, HUP signals
   - Start heartbeat loop at session start
   - Kill heartbeat loop in cleanup

2. **`bin/flow-status.sh`** - Session and lock display
   - Add "Active Sessions" section (computes liveness from PID + heartbeat)
   - Add "Dead Sessions" section (heartbeat > 10 min or PID dead)
   - Add "Story Locks" section with "alive/dead" language (NOT "stale")
   - Show which locks are "yours" vs "other sessions"

3. **`.claude/commands/flow-work-story.md`** - Lock verification ONLY
   - Add lock VERIFICATION in STEP 1 (fail if mismatch)
   - Use session-scoped memory paths: `memory/{feature}/.session-{SESSION_ID}/`
   - Do NOT manage locks (no locking/unlocking)
   - Do NOT mutate PRD files (return exit code only)

### Files to Create

1. **`bin/migrate-prd-locks.sh`** - Migration script
   - Add lock fields to existing PRDs

### Data Structure Changes

**V1 SIMPLIFICATION:**
- Each story in PRD JSON gets 2 new fields: `lockedBy`, `lockedAt`
- Skip `completedBy` and `completedAt` for now (can add later)

**Session registry structure (no status field - computed dynamically):**
```json
{
  "sessions": [{
    "id": "flow-session-20250129-143052-abc123",
    "pid": 12345,
    "startedAt": 1706543452000,
    "lastHeartbeat": 1706544000000,
    "currentStory": "US-001",
    "storiesCompleted": 5
  }]
}
```
  }]
}
```

**Memory file structure changes:**
```
memory/
  {feature}/
    .session-{SESSION_ID}/
      US-{number}.txt  ← Session-scoped
  consolidated/
    {feature}.md  ← Updated only on consolidation
```

---

## Expected Results

### Before (Single Session)
```
Day 1: 28 stories completed
Day 2: 28 stories completed
Day 3: 28 stories completed
Day 4: 28 stories completed
...
Day 14: 28 stories completed (TOTAL: 392 stories)
```

### After (4 Parallel Sessions)
```
Day 1: 100 stories completed (25 per session)
Day 2: 100 stories completed
Day 3: 100 stories completed
Day 4:  84 stories completed (TOTAL: 384 stories)
```

**Speedup: ~3.5x faster**

---

## Implementation Checklist

### Critical (MUST HAVE - System Won't Work Without These)
- [ ] Add `flock` to ALL lock/unlock operations (prevents corruption under concurrent writes)
- [ ] Add session registry functions (`register_session`, `update_session_heartbeat`, `deregister_session`)
- [ ] Implement `find_and_lock_story()` with flock (atomic check-and-lock)
  - [ ] Use stdout capture (NOT temp files or exit codes)
  - [ ] Check session liveness (PID + heartbeat) before claiming locks
  - [ ] Heartbeat is source of truth (NOT time-based lock expiry)
- [ ] Implement `clear_all_session_locks()` with flock per PRD
- [ ] Add adaptive backoff sleep (sleep when idle, NOT when working)
- [ ] Implement session-scoped memory files (prevents memory conflicts)
- [ ] Separate lock authority: flow.sh manages locks and PRD mutations, flow-work-story only verifies
- [ ] Workers NEVER write PRDs (only return exit codes)

### Core Locking
- [ ] DELETE `lock_story()` and `unlock_story()` functions (use only find_and_lock_story)
- [ ] Modify iteration loop to use `find_and_lock_story()`
- [ ] Update story completion handler in flow.sh (under flock)
  - [ ] Set passes=true
  - [ ] Set completedBy, completedAt
  - [ ] Clear lock
- [ ] Update cleanup handler (call `clear_all_session_locks()` and `deregister_session()`)
- [ ] Add trap for EXIT, INT, TERM, HUP signals
- [ ] Do NOT delete .lock files (they are coordination points)
- [ ] Modify iteration loop to use `find_and_lock_story()`
- [ ] Update story completion handler in flow.sh (under flock)
  - [ ] Set passes=true
  - [ ] Set completedBy, completedAt
  - [ ] Clear lock
- [ ] Update cleanup handler (call `clear_all_session_locks()` and `deregister_session()`)
- [ ] Add trap for EXIT, INT, TERM, HUP signals
- [ ] Do NOT delete .lock files (they are coordination points, not garbage)

### Status & Monitoring
- [ ] Update flow-status.sh to display sessions (PID, heartbeat, current story)
- [ ] Update flow-status.sh to display locks with age
- [ ] Add PID liveness check (`kill -0 $pid`) for immediate dead session detection
- [ ] Add stale session detection (heartbeat timeout)

### Manual Management
- [ ] Add `flow unlock <story-id>` command
- [ ] Enhance `flow reset` to clear all locks

### Migration & Config
- [ ] Create migrate-prd-locks.sh script
- [ ] Update session ID format (timestamp-based)
- [ ] Set `SLEEP_SECONDS=0` for speed
- [ ] Set `LOCK_RETRY_INTERVAL` for adaptive backoff

### Testing
- [ ] Test stdout capture from subshells (result=$(subshell) pattern)
- [ ] Test with 2 parallel sessions (basic locking)
- [ ] Test flock prevents corruption (concurrent write test)
- [ ] Test PID liveness check (`kill -0 $pid`)
- [ ] Test stale lock handling (kill session, try to re-lock)
- [ ] Test power loss scenario (reboot, see locks auto-invalidate)
- [ ] Test flow status display (sessions + locks)
- [ ] Test flow reset clearing locks
- [ ] Test flow unlock command
- [ ] Test session-scoped memory (2 sessions, same PRD)
- [ ] Test adaptive backoff (all stories locked scenario)
- [ ] Test cleanup on Ctrl+C (locks cleared?)
- [ ] Test cleanup on kill (locks cleared?)
- [ ] Test .lock files are NOT deleted

### Documentation
- [ ] Document usage in README
- [ ] Document architecture (flow.sh = scheduler, flow-work-story = worker)
- [ ] Document troubleshooting (stale locks, orphaned sessions)
- [ ] Document power loss handling

---

## Critical Design Rules (LOCK THESE IN)

### Rule 1: Single Authority for PRD Mutations
```
ONLY flow.sh can write to PRD files
Workers (flow-work-story) return results via exit codes ONLY
```
Why: Prevents race conditions, keeps all mutations under one mutex.

### Rule 2: Single Lock Acquisition Path
```
ONLY find_and_lock_story() can acquire locks
DO NOT implement lock_story() or unlock_story() - delete them entirely
```
Why: Single path = predictable behavior. Multiple paths = bugs.

### Rule 3: Stdout Capture, Not Temp Files
```bash
# CORRECT
result=$(
  flock ...
  echo "result"
) 200>lock

# WRONG
(
  flock ...
  echo "result" > file.tmp
) 200>lock
result=$(cat file.tmp)
```
Why: Temp files create race conditions. Stdout capture is atomic.

### Rule 4: Never Delete Lock Files
```bash
# WRONG
rm -f docs/prd-*.json.lock

# CORRECT
# Leave them in place forever
```
Why: flock uses file descriptors, not file existence. Deleting lock files breaks concurrent operations.

### Rule 5: Heartbeat + PID (Both Required)
```
Session is alive if BOTH:
  - PID exists (kill -0 $pid succeeds) AND
  - Heartbeat is fresh (< 10 minutes old)

Lock is valid if:
  - Owning session is alive (BOTH conditions)

No OR logic - BOTH must be true
```
Why: PID catches immediate crashes, heartbeat catches hung processes. Both needed for correctness.

### Rule 6: Heartbeat Is Source Of Truth
```
NO time-based lock expiry (no FLOW_LOCK_TIMEOUT_HOURS)
If heartbeat is fresh, lock is valid (even after 12 hours)
If heartbeat is stale OR PID dead, lock is invalid
```
Why: Slow agents ≠ dead sessions. Heartbeat is source of truth, not timestamps.

### Rule 7: Power Loss Is Handled Automatically
```
Don't rely on cleanup traps
Don't rely on manual unlock

Instead:
- Sessions prove they're alive (heartbeat)
- When they stop proving it, they're dead
- Locks auto-expire when sessions die
```
Why: System self-heals on next start. No manual cleanup needed.

### Rule 8: All PRD Mutations Under flock
```bash
(
  flock -x 200
  jq "..." "$prd" > tmp.json && mv tmp.json "$prd"
) 200>"$prd.lock"
```
Why: Without flock, two sessions can corrupt the PRD file.

### Rule 9: Dead Sessions As JSON Array
```bash
# WRONG (string concatenation - partial match bug)
dead_sessions="$dead_sessions $session_id"
([.lockedBy] | inside($dead_sessions))

# CORRECT (JSON array - safe)
dead_sessions_json=$(jq ". + [\"$session_id\"]")
($dead | index(.lockedBy))
```
Why: String containment is unsafe, can have partial matches. JSON array is safe.

### Rule 10: No Status Field In Registry
```
Registry stores: id, pid, startedAt, lastHeartbeat, currentStory, storiesCompleted
NO "status" field

Status is computed dynamically:
  If PID exists AND heartbeat fresh → "alive"
  Otherwise → "dead"
```
Why: Prevents status drift. Computed value is always accurate.

### Rule 11: Heartbeat Loop Is Mandatory
```
Background heartbeat loop runs every 60s (Mandatory)
Manual updates are optional optimizations
```
Why: Long mavenSteps (10-20+ minutes) exceed heartbeat threshold. Without loop, live sessions look dead.

### Rule 12: UI Language Must Be Precise
```
WRONG: "stale (95m old)" - implies time-based expiry
CORRECT: "alive" or "dead (reclaimable)"
```
Why: Prevents confusion. A lock is valid if owner is alive, regardless of age.
