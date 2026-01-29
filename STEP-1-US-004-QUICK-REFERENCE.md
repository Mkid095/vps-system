# US-004 Unlock Project Power - Quick Reference

## API Endpoint

```
POST /api/admin/projects/[id]/unlock
```

## Authentication

Requires break glass session token from US-003:

```bash
# Method 1: Authorization header
Authorization: Break-Glass session-uuid-123

# Method 2: Custom header
X-Break-Glass-Token: session-uuid-123

# Method 3: Query parameter
?break_glass_token=session-uuid-123

# Method 4: Request body
{ "break_glass_token": "session-uuid-123" }
```

## Request Body

```json
{
  "break_glass_token": "session-uuid-123",  // Required if not in headers
  "reason": "False positive - verified",    // Optional context
  "clear_suspension_flags": true            // Optional (default: true)
}
```

## Response

### Success (200)

```json
{
  "success": true,
  "project": {
    "id": "proj-123",
    "name": "Project Name",
    "status": "ACTIVE",
    "previous_status": "SUSPENDED",
    "unlocked_at": "2026-01-29T19:00:00Z",
    "previous_suspension": { ... }
  },
  "action_log": {
    "id": "action-456",
    "session_id": "session-123",
    "action": "unlock_project",
    "target_type": "project",
    "target_id": "proj-123",
    "before_state": { ... },
    "after_state": { ... },
    "logged_at": "2026-01-29T19:00:00Z"
  }
}
```

### Errors

- `401` - Invalid or expired break glass token
- `404` - Project not found
- `500` - Unlock operation failed

## Files

### Types
- `/home/ken/developer-portal/src/features/break-glass/types/unlock-project.types.ts`

### Middleware
- `/home/ken/developer-portal/src/features/break-glass/lib/middleware.ts`

### Service
- `/home/ken/developer-portal/src/features/break-glass/lib/unlock-project.service.ts`

### Endpoint
- `/home/ken/developer-portal/src/app/api/admin/projects/[id]/unlock/route.ts`

## Key Functions

```typescript
// Validate break glass token
import { validateBreakGlassToken } from '@/features/break-glass/lib/middleware';

const validation = await validateBreakGlassToken(request);
if (!validation.valid) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}

// Unlock project
import { unlockProject } from '@/features/break-glass/lib/unlock-project.service';

const result = await unlockProject({
  projectId: 'proj-123',
  sessionId: 'session-456',
  adminId: 'admin-789',
  reason: 'False positive verified',
  clearSuspensionFlags: true,
});
```

## Audit Trail

All unlock operations are logged to:
- Table: `control_plane.admin_actions`
- Action: `unlock_project`
- Before/after states captured as JSONB
- Linked to admin session

## Integration

Uses existing services:
- `validateAdminSession()` - Validate break glass session
- `logAdminAction()` - Log unlock operation
- `SuspensionManager.getStatus()` - Get suspension state
- `SuspensionManager.unsuspend()` - Clear suspension
