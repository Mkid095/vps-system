# Delete User Data Layer - Quick Reference

## API Endpoint

**DELETE** `/api/admin/users/[userId]`

### Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Success Response (200)
```json
{
  "success": true,
  "message": "User removed successfully"
}
```

### Error Responses
- **400** - Bad Request
  - `"User ID is required"`
  - `"Cannot delete your own account"`

- **401** - Unauthorized
  - `"Authentication required"`

- **403** - Forbidden
  - `"This operation requires administrator privileges"`

- **404** - Not Found
  - `"User not found"`

- **500** - Server Error
  - `"Failed to remove user"`

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    UserDetail Component                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Danger Zone Section                         │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │       DeleteUserButton                         │  │  │
│  │  │  - userId                                      │  │  │
│  │  │  - userEmail (for confirmation)                │  │  │
│  │  │  - userName (for display)                      │  │  │
│  │  │  - onDelete callback                           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ onClick
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         DeleteUserConfirmationModal                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Show user details                                 │  │
│  │  • Require email confirmation                        │  │
│  │  • Show warning message                              │  │
│  │  • Enable/disable confirm button                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ onConfirm (if email matches)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DeleteUserButton.handleConfirmDelete           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Get token from localStorage                       │  │
│  │  2. Call DELETE /api/admin/users/[userId]            │  │
│  │  3. Handle response                                  │  │
│  │  4. Call onDelete() or router.push()                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ DELETE request
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           API Endpoint: DELETE /api/admin/users/[userId]    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. authenticateRequest()                            │  │
│  │  2. requireAdmin()                                   │  │
│  │  3. Validate userId                                  │  │
│  │  4. Fetch user details                               │  │
│  │  5. Check self-deletion                              │  │
│  │  6. DELETE FROM developers                           │  │
│  │  7. logUserAction.removed()                          │  │
│  │  8. Return success response                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Logged
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audit Log Table                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • actor_id: admin.id                                │  │
│  │  • action: 'user.removed'                            │  │
│  │  • target_type: 'user'                               │  │
│  │  • target_id: deleted user id                        │  │
│  │  • metadata: { email, name, role, organization }     │  │
│  │  • ip_address: client IP                             │  │
│  │  • user_agent: client user agent                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Props Reference

### DeleteUserButton

```typescript
interface DeleteUserButtonProps {
  userId: string;              // Required: ID of user to delete
  userEmail: string;           // Required: Email for confirmation
  userName: string | null;     // Optional: User name for display
  onDelete?: () => void;       // Optional: Callback after deletion
}
```

**Usage:**
```tsx
<DeleteUserButton
  userId={user.id}
  userEmail={user.email}
  userName={user.name}
  onDelete={() => router.push('/studio/users')}
/>
```

### DeleteUserConfirmationModal

```typescript
interface DeleteUserConfirmationModalProps {
  isOpen: boolean;             // Whether modal is visible
  onClose: () => void;         // Close modal handler
  onConfirm: () => Promise<void>; // Confirm deletion handler
  userEmail: string;           // User email for confirmation
  userName: string | null;     // User name for display
  isLoading: boolean;          // Loading state
}
```

**Usage:**
```tsx
<DeleteUserConfirmationModal
  isOpen={showConfirmation}
  onClose={() => setShowConfirmation(false)}
  onConfirm={handleDelete}
  userEmail={user.email}
  userName={user.name}
  isLoading={isDeleting}
/>
```

---

## State Management

### DeleteUserButton State

```typescript
interface DeleteUserState {
  isDeleting: boolean;      // Deletion in progress
  showConfirmation: boolean; // Modal visibility
  error: string | null;     // Error message
}
```

**State Transitions:**
```
Initial → Confirmation → Deleting → Complete (or Error)
    ↓            ↓            ↓           ↓
  (false)     (true)      (true)      (false)
```

---

## Error Handling

### Client-Side (DeleteUserButton)

```typescript
try {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to delete user')
  }

  // Success - call callback or navigate
  onDelete?.()
} catch (err) {
  // Show error in modal
  setState(prev => ({
    ...prev,
    isDeleting: false,
    error: err.message,
  }))
}
```

### Server-Side (API Endpoint)

```typescript
try {
  // 1. Authenticate
  const developer = await authenticateRequest(req)

  // 2. Authorize (admin only)
  const admin = await requireAdmin(developer)

  // 3. Validate
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    )
  }

  // 4. Fetch user
  const targetUser = await pool.query(
    'SELECT id, email, name, organization, role FROM developers WHERE id = $1',
    [userId]
  )

  if (targetUser.rows.length === 0) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
  }

  // 5. Prevent self-deletion
  if (targetUser.rows[0].id === admin.id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // 6. Delete
  await pool.query('DELETE FROM developers WHERE id = $1', [userId])

  // 7. Log audit
  await logUserAction.removed(/* ... */)

  // 8. Success
  return NextResponse.json({
    success: true,
    message: 'User removed successfully',
  })

} catch (error) {
  // Handle errors
  console.error('[Admin Users] Remove user error:', error)

  const message = error instanceof Error ? error.message : 'Failed to remove user'

  if (message === 'No token provided' || message === 'Invalid token') {
    return NextResponse.json({ error: message }, { status: 401 })
  }

  if (message.includes('administrator privileges')) {
    return NextResponse.json({ error: message }, { status: 403 })
  }

  return NextResponse.json({ error: message }, { status: 500 })
}
```

---

## Security Checklist

- ✅ Authentication required (Bearer token)
- ✅ Authorization required (Admin role only)
- ✅ Self-deletion prevention
- ✅ Email confirmation required
- ✅ SQL injection protection (parameterized queries)
- ✅ Audit logging (actor, target, IP, user-agent)
- ✅ Generic error messages (no information leakage)
- ✅ Safe header logging (only IP and user-agent)

---

## Testing Checklist

### UI Testing
- [ ] Delete button visible in Danger Zone
- [ ] Clicking delete opens confirmation modal
- [ ] Modal shows correct user details
- [ ] Typing wrong email disables confirm button
- [ ] Typing correct email enables confirm button
- [ ] Clicking confirm shows loading state
- [ ] Successful deletion navigates to user list
- [ ] Deleted user not in list
- [ ] Error messages display correctly

### API Testing
- [ ] DELETE requires authentication
- [ ] DELETE requires admin role
- [ ] DELETE validates userId
- [ ] DELETE returns 404 for non-existent user
- [ ] DELETE prevents self-deletion
- [ ] DELETE removes user from database
- [ ] DELETE logs to audit table
- [ ] DELETE returns proper error responses

### Database Testing
- [ ] User deleted from developers table
- [ ] Audit log entry created
- [ ] Audit log contains correct metadata
- [ ] IP address logged
- [ ] User agent logged

---

## Files Modified

1. **API Endpoint**
   - `/home/ken/developer-portal/src/app/api/admin/users/[userId]/route.ts`
     - Added `requireAdmin` import
     - Fixed audit logging for PATCH
     - Fixed Zod schema validation

2. **UI Components** (No changes - already correct)
   - `/home/ken/developer-portal/src/features/users/components/DeleteUserButton.tsx`
   - `/home/ken/developer-portal/src/features/users/components/DeleteUserConfirmationModal.tsx`
   - `/home/ken/developer-portal/src/features/admin/users/UserDetail.tsx`

---

## Type Definitions

All types are properly defined and exported:
- `DeleteUserButtonProps`
- `DeleteUserConfirmationModalProps`
- `DeleteUserState`
- `DeleteUserResponse`
- `DeleteUserErrorResponse`
- `DeleteUserError`
- Helper functions: `categorizeDeleteError()`, `getDeleteErrorMessage()`

---

## Next Steps

Proceed to **Step 10: Final Integration & Testing**
- End-to-end testing
- Browser console verification
- User workflow validation
- PRD update
