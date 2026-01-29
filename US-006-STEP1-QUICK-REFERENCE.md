# US-006 Quick Reference: Audit Project Suspensions

## What Was Done

Integrated comprehensive audit logging into all project suspension operations across the Maven platform.

## Key Changes

### 1. Manual Suspensions (API Endpoint)
**File**: `src/app/api/projects/[projectId]/suspensions/route.ts`

**Before**:
```typescript
await logSuspension(
  projectId,
  authorizedDeveloper.id,
  `Manual suspension: ${reason.cap_type} exceeded`,
  { /* metadata */ }
)
```

**After**:
```typescript
await logProjectAction.suspended(
  { id: authorizedDeveloper.id, type: ActorType.USER },
  projectId,
  `Manual suspension: ${reason.cap_type} exceeded`,
  {
    request: {
      ip: clientIP,
      userAgent,
    },
    metadata: {
      cap_type: reason.cap_type,
      current_value: reason.current_value,
      limit_exceeded: reason.limit_exceeded,
    },
  }
)
```

### 2. Auto-Suspensions (Core Function)
**File**: `src/features/abuse-controls/lib/suspensions.ts`

**Added** (after transaction commit):
```typescript
// Log to audit logs (non-blocking)
logProjectAction.autoSuspended(
  projectId,
  `Auto-suspended for exceeding ${reason.cap_type}`,
  true,
  {
    metadata: {
      cap_type: reason.cap_type,
      current_value: reason.current_value,
      limit_exceeded: reason.limit_exceeded,
      details: reason.details,
    },
  }
).catch((error) => {
  console.error('[Suspensions] Failed to log to audit logs:', error)
})
```

## Suspension Paths

All suspension paths now create audit logs:

1. **Manual** → POST `/api/projects/[projectId]/suspensions`
   - Action: `project.suspended`
   - Actor: User (operator/admin)
   - Metadata: cap_type, current_value, limit_exceeded, IP, user agent

2. **Auto (Background Job)** → `checkAllProjectsForSuspension()`
   - Action: `project.auto_suspended`
   - Actor: System
   - Metadata: cap_type, current_value, limit_exceeded, details, hard_cap_exceeded: true

3. **Auto (Spike Detection)** → `spike-detection.ts`
   - Inherits auto-suspension logging from `suspendProject()`

4. **Auto (Pattern Detection)** → `pattern-detection.ts`
   - Inherits auto-suspension logging from `suspendProject()`

## Audit Log Structure

### Manual Suspension
```json
{
  "action": "project.suspended",
  "actor_id": "user-123",
  "actor_type": "user",
  "target_id": "proj-456",
  "target_type": "project",
  "metadata": {
    "reason": "Manual suspension: api_requests exceeded",
    "cap_type": "api_requests",
    "current_value": 150000,
    "limit_exceeded": 100000
  }
}
```

### Auto-Suspension
```json
{
  "action": "project.auto_suspended",
  "actor_id": "system",
  "actor_type": "system",
  "target_id": "proj-789",
  "target_type": "project",
  "metadata": {
    "reason": "Auto-suspended for exceeding api_requests",
    "hard_cap_exceeded": true,
    "cap_type": "api_requests",
    "current_value": 150000,
    "limit_exceeded": 100000,
    "details": "Project exceeded api_requests limit"
  }
}
```

## Validation

✓ Typecheck passes: `pnpm typecheck`
✓ Lint passes: `npx eslint` on modified files
✓ Helper functions exist: `logProjectAction.suspended()` and `logProjectAction.autoSuspended()`
✓ All suspension paths covered

## Key Benefits

1. **Compliance**: Complete audit trail for regulatory requirements
2. **Security**: Track who suspended projects and why
3. **Operations**: Visibility into automatic suspension triggers
4. **Forensics**: Evidence for security incident investigations

## Next Steps

Step 1 is complete. Proceed to Step 2 (Package Manager Migration) or Step 10 (Final Testing).
