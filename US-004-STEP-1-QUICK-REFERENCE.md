# US-004 Step 1 Quick Reference

## Disable User Feature - Implementation Guide

---

## Component Overview

```
DisableUserButton
    ↓ (used in)
UserDetailHeader
    ↓ (used in)
UserDetail
    ↓ (used in)
Studio Page & Dashboard Users Page
```

---

## Key Files

### Components
- `src/features/auth-users/components/DisableUserButton.tsx` - Toggle button
- `src/features/auth-users/components/UserDetail.tsx` - Main detail view
- `src/features/auth-users/components/UserDetailHeader.tsx` - Header with button
- `src/features/auth-users/components/UserList.tsx` - List with status badges

### API Routes
- `src/app/api/auth/users/[userId]/disable/route.ts` - Disable endpoint
- `src/app/api/auth/users/[userId]/enable/route.ts` - Enable endpoint

### Types
- `src/lib/types/auth-user.types.ts` - All type definitions

### Client
- `src/lib/api/auth-service-client.ts` - API client methods

---

## API Endpoints

### Disable User
```
POST /api/auth/users/[userId]/disable
Authorization: Bearer <token>
Body: { "reason": "optional reason" }
Response: { "user_id": "...", "status": "disabled", "updated_at": "..." }
```

### Enable User
```
POST /api/auth/users/[userId]/enable
Authorization: Bearer <token>
Response: { "user_id": "...", "status": "active", "updated_at": "..." }
```

---

## Status Types

```typescript
type EndUserStatus = 'active' | 'disabled' | 'deleted'
```

**Badge Colors:**
- Active: Emerald green (`bg-emerald-100 text-emerald-800`)
- Disabled: Amber yellow (`bg-amber-100 text-amber-800`)
- Deleted: Red (`bg-red-100 text-red-800`)

---

## Button States

### Active User
- Icon: `Ban` (ban icon)
- Text: "Disable User"
- Color: Amber (`bg-amber-600 hover:bg-amber-700`)

### Disabled User
- Icon: `CheckCircle` (check icon)
- Text: "Enable User"
- Color: Emerald (`bg-emerald-700 hover:bg-emerald-800`)

### Loading State
- Icon: `Loader2` (spinner)
- Button disabled
- Shows "isLoading" or "isProcessing" state

---

## Component Props

### DisableUserButton
```typescript
interface DisableUserButtonProps {
  user: EndUserDetailResponse
  onDisable: (userId: string) => Promise<void>
  onEnable: (userId: string) => Promise<void>
  isLoading?: boolean
}
```

### UserDetail
```typescript
interface UserDetailProps {
  userId: string
  onBack: () => void
  onUserUpdated?: () => void
}
```

### UserList
```typescript
interface UserListProps {
  initialFilters?: EndUserListQuery
  onViewUser?: (userId: string) => void
}
```

---

## Authorization

**Required Role:** Operator or Admin

**Middleware:** `requireOperatorOrAdmin()`

**Audit Log:** All disable/enable actions are logged with:
- Target user ID
- Reason (for disable)
- Performer email and role
- IP address
- User agent
- Timestamp

---

## Error Handling

### API Errors
- 400: Bad Request (invalid user ID)
- 401: Unauthorized (no token)
- 403: Forbidden (insufficient permissions)
- 500: Internal Server Error

**Error Messages:** Generic to prevent information leakage

---

## Integration Examples

### Using UserList
```typescript
import { UserList } from '@/features/auth-users/components/UserList'

<UserList
  initialFilters={{ status: 'active' }}
  onViewUser={(userId) => {
    // Navigate to user detail
    setSelectedUserId(userId)
  }}
/>
```

### Using UserDetail
```typescript
import { UserDetail } from '@/features/auth-users/components/UserDetail'

<UserDetail
  userId={selectedUserId}
  onBack={() => setSelectedUserId(null)}
  onUserUpdated={() => {
    // Refresh list after status change
    setUsersKey(prev => prev + 1)
  }}
/>
```

---

## State Management

### UserDetail Component
```typescript
const [user, setUser] = useState<UserDetailData | null>(null)
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

// Update user state after disable/enable
setUser((prev) =>
  prev ? { ...prev, status: data.status, updated_at: data.updated_at } : null
)
```

### DisableUserButton Component
```typescript
const [isProcessing, setIsProcessing] = useState(false)
const isDisabled = user.status === 'disabled'
```

---

## Testing Checklist

- [ ] Disable active user
- [ ] Enable disabled user
- [ ] Verify status badge in list
- [ ] Verify button state changes
- [ ] Test with non-admin user (should fail)
- [ ] Verify audit log entries
- [ ] Test error handling
- [ ] Verify loading states

---

## Quick Commands

```bash
# Typecheck
pnpm run typecheck

# Run dev server
pnpm dev

# Build
pnpm build

# Lint
pnpm lint
```

---

## Important Notes

1. **Status Persistence:** Status is stored in the auth service database
2. **Sign-in Prevention:** Disabled users cannot sign in (enforced by auth service)
3. **Audit Trail:** All actions are logged for security auditing
4. **Authorization:** Only operators and admins can disable/enable users
5. **Immediate Update:** UI updates immediately after successful API call
6. **Error Feedback:** User-friendly error messages displayed on failure

---

## Related Stories

- **US-002:** Create User List Component (provides list view)
- **US-003:** Create User Detail View (provides detail view)
- **US-011:** Integrate with Auth Service API (provides API client)
- **US-005:** Implement Delete User (next feature)

---

## Status: ✅ COMPLETE

All acceptance criteria met, typecheck passes, ready for Step 2.
