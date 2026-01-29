# Auth Service API Client - Quick Reference

## Import Paths

```typescript
// Main client for developer-portal API routes
import { authServiceClient } from '@/lib/api/auth-service-client'

// Studio-specific client (uses developer portal token)
import {
  createStudioClientFromRequest,
  createStudioClientWithToken,
  StudioAuthServiceClient
} from '@/features/studio/lib'

// Types
import type {
  EndUser,
  EndUserSession,
  EndUserListQuery,
  EndUserDetailResponse,
  DisableEndUserRequest,
  EnableEndUserRequest,
  DeleteEndUserRequest,
  UpdateEndUserMetadataRequest,
  ResetEndUserPasswordRequest,
  RevokeEndUserSessionRequest
} from '@/lib/types/auth-user.types'

// Error handling
import {
  withErrorHandling,
  parseError,
  getErrorMessage,
  getErrorTitle,
  StudioErrorCode
} from '@/features/studio/lib'

// API helpers
import {
  formatDate,
  formatRelativeTime,
  getUserDisplayName,
  getSessionDeviceName,
  isSessionActive
} from '@/features/studio/lib'
```

## Usage Patterns

### In API Route (Developer Portal)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createStudioClientFromRequest } from '@/features/studio/lib'
import { withErrorHandling } from '@/features/studio/lib'

export async function GET(req: NextRequest) {
  const client = createStudioClientFromRequest(req)

  const { data, error } = await withErrorHandling(
    () => client.listEndUsers({ limit: 50 }),
    'listUsers'
  )

  if (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 401 }
    )
  }

  return NextResponse.json(data)
}
```

### Client-Side Usage

```typescript
'use client'

import { createStudioClientWithToken } from '@/features/studio/lib'

export default function UserProfile({ userId, token }: Props) {
  const client = createStudioClientWithToken(token)

  const handleDisable = async () => {
    const result = await client.disableEndUser({
      userId,
      reason: 'User request'
    })

    if (result.status === 'disabled') {
      // Handle success
    }
  }

  return <button onClick={handleDisable}>Disable User</button>
}
```

## API Methods

### List Users
```typescript
const users = await client.listEndUsers({
  limit: 50,
  offset: 0,
  search: 'john@example.com',
  status: 'active',
  auth_provider: 'email',
  sort_by: 'created_at',
  sort_order: 'desc'
})
// Returns: { users: EndUser[], total: number, limit: number, offset: number }
```

### Get Single User
```typescript
const user = await client.getEndUser(userId)
// Returns: EndUserDetailResponse
```

### Update User Metadata
```typescript
const updated = await client.updateEndUserMetadata({
  userId,
  metadata: {
    department: 'Engineering',
    role: 'Developer'
  }
})
// Returns: EndUserDetailResponse
```

### Disable User
```typescript
const result = await client.disableEndUser({
  userId,
  reason: 'Violation of terms'
})
// Returns: { user_id: string, status: 'disabled', updated_at: string }
```

### Enable User
```typescript
const result = await client.enableEndUser({ userId })
// Returns: { user_id: string, status: 'active', updated_at: string }
```

### Delete User
```typescript
const result = await client.deleteEndUser({
  userId,
  reason: 'User requested deletion'
})
// Returns: { user_id: string, deleted: boolean, deleted_at: string }
```

### Reset Password
```typescript
const result = await client.resetEndUserPassword({
  userId,
  email: 'user@example.com' // optional, sends reset email
})
// Returns: { user_id: string, email_sent: boolean, message: string }
```

### Get User Sessions
```typescript
const sessions = await client.getEndUserSessions(userId)
// Returns: { sessions: EndUserSession[], total: number }
```

### Revoke Session
```typescript
const result = await client.revokeEndUserSession({
  userId,
  sessionId
})
// Returns: { session_id: string, revoked: boolean, revoked_at: string }
```

## Error Handling

### Pattern 1: Result-based (recommended)
```typescript
const { data, error } = await withErrorHandling(
  () => client.listEndUsers(),
  'listUsers'
)

if (error) {
  console.error('Error:', getErrorMessage(error))
  console.error('Title:', getErrorTitle(error))

  if (error.code === StudioErrorCode.AUTHENTICATION_ERROR) {
    // Redirect to login
  }

  return
}

// Use data
console.log(data.users)
```

### Pattern 2: Try-catch
```typescript
try {
  const user = await client.getEndUser(userId)
  console.log(user)
} catch (err) {
  const error = parseError(err)
  console.error(getErrorMessage(error))

  if (requiresReauth(error)) {
    // Re-authenticate
  }
}
```

### Pattern 3: With throwing
```typescript
import { withErrorHandlingThrow } from '@/features/studio/lib'

try {
  const user = await withErrorHandlingThrow(
    () => client.getEndUser(userId),
    'getUser'
  )
  console.log(user)
} catch (error) {
  // Error is already parsed and logged
  console.error(error.message)
}
```

## Helper Functions

### Date Formatting
```typescript
formatDate('2024-01-15T10:30:00Z')
// Returns: "Jan 15, 2024, 10:30 AM"

formatRelativeTime('2024-01-15T10:30:00Z')
// Returns: "2 days ago" (relative to now)
```

### User Helpers
```typescript
getUserDisplayName(user)
// Returns: user.name || user.email

getUserInitials(user)
// Returns: "JD" (for "John Doe") or "JO" (for "john@example.com")
```

### Session Helpers
```typescript
isSessionActive(session)
// Returns: true if not revoked and activity within 30 days

getSessionDeviceName(session)
// Returns: "Chrome - Windows - Desktop" or similar

getSessionLocation(session)
// Returns: IP address or location string
```

## Type Definitions

### EndUser
```typescript
interface EndUser {
  user_id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  sign_in_count: number
  auth_provider: 'email' | 'google' | 'github' | 'microsoft'
  user_metadata: Record<string, unknown>
  status: 'active' | 'disabled' | 'deleted'
}
```

### EndUserSession
```typescript
interface EndUserSession {
  session_id: string
  user_id: string
  device_type?: string
  device_name?: string
  browser?: string
  ip_address?: string
  location?: string
  created_at: string
  last_activity_at: string
  is_revoked: boolean
}
```

## Environment Variables

```bash
# Required
AUTH_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_API_KEY=your-api-key-here

# Optional
JWT_SECRET=your-jwt-secret
```

## Error Codes

```typescript
enum StudioErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

## Best Practices

1. **Always use error handling** - Wrap all API calls with `withErrorHandling`
2. **Log context** - Provide meaningful context strings for debugging
3. **Check error types** - Use error code to determine appropriate action
4. **Use pagination** - Always use limit/offset for list operations
5. **Handle loading states** - Show loading indicators during API calls
6. **Cache selectively** - Consider caching user data but invalidate on changes
7. **Validate inputs** - Use validation helpers before sending to API
8. **Handle re-auth** - Check for authentication errors and redirect to login

---

For detailed implementation, see: `/home/ken/STEP-1-US-011-SUMMARY.md`
