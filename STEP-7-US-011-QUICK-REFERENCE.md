# Auth Service API Integration - Quick Reference

## Overview
The Auth Service API integration provides a type-safe, fully-featured client for managing end-users through the auth service.

## Architecture

### Two-Layer Design
1. **Base Client** (`@/lib/api/auth-service-client.ts`)
   - Low-level HTTP client for auth service
   - Handles API communication
   - Singleton pattern with lazy initialization

2. **Studio Client** (`@/features/studio/lib/auth-service-client.ts`)
   - Studio-specific wrapper
   - Handles developer portal authentication
   - Provides convenient factory functions

## Usage

### Server-Side (API Routes)
```typescript
import { requireAuthServiceClient } from '@/lib/api/auth-service-client'

// Get the client (throws if not configured)
const client = requireAuthServiceClient()

// List users
const users = await client.listEndUsers({
  limit: 50,
  offset: 0,
  status: 'active',
  sort_by: 'created_at',
  sort_order: 'desc'
})

// Get single user
const user = await client.getEndUser(userId)

// Disable user
await client.disableEndUser({
  userId: '123',
  reason: 'Violation of terms'
})

// Enable user
await client.enableEndUser({ userId: '123' })

// Update metadata
await client.updateEndUserMetadata({
  userId: '123',
  metadata: { role: 'admin' }
})

// Delete user
await client.deleteEndUser({
  userId: '123',
  reason: 'Account closed by request'
})

// Reset password
await client.resetEndUserPassword({
  userId: '123',
  email: 'user@example.com'
})

// Get sessions
const sessions = await client.getEndUserSessions(userId)

// Revoke session
await client.revokeEndUserSession({
  userId: '123',
  sessionId: '456'
})
```

### Client-Side (React Components)
```typescript
import { getAuthServiceClient } from '@/lib/api/auth-service-client'

// Get the client (returns undefined if not configured)
const client = getAuthServiceClient()

if (!client) {
  // Handle unconfigured client
  throw new Error('Auth service not configured')
}

// Use the same methods as server-side
const users = await client.listEndUsers({ limit: 50 })
```

### Studio-Specific (With Developer Portal Token)
```typescript
import { createStudioClientFromRequest } from '@/features/studio/lib/auth-service-client'
import { NextRequest } from 'next/server'

// Create client from NextRequest
export async function GET(req: NextRequest) {
  const client = createStudioClientFromRequest(req)
  const users = await client.listEndUsers()
  return Response.json(users)
}
```

## Error Handling

### Using withErrorHandling Wrapper
```typescript
import { withErrorHandling } from '@/features/studio/lib/error-handling'

const result = await withErrorHandling(
  () => client.getEndUser(userId),
  'getUserOperation'
)

if (result.error) {
  // Handle error
  console.error('Error:', result.error.message)
  return
}

// Use result.data
const user = result.data
```

### Manual Error Handling
```typescript
import {
  parseError,
  getErrorMessage,
  getErrorTitle,
  isRecoverableError,
  requiresReauth,
  StudioErrorCode
} from '@/features/studio/lib/error-handling'

try {
  const user = await client.getEndUser(userId)
} catch (error) {
  const studioError = parseError(error)

  console.log(getErrorTitle(studioError))  // e.g., "Not Found"
  console.log(getErrorMessage(studioError))  // User-friendly message

  if (isRecoverableError(studioError)) {
    // Show retry button
  }

  if (requiresReauth(studioError)) {
    // Redirect to login
  }
}
```

## Types

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

### EndUserListQuery
```typescript
interface EndUserListQuery {
  limit?: number        // Default: 50
  offset?: number       // Default: 0
  search?: string       // Search by email
  status?: 'active' | 'disabled' | 'deleted'
  auth_provider?: 'email' | 'google' | 'github' | 'microsoft'
  created_after?: string   // ISO date string
  created_before?: string  // ISO date string
  last_sign_in_after?: string   // ISO date string
  last_sign_in_before?: string  // ISO date string
  sort_by?: 'created_at' | 'last_sign_in_at' | 'email' | 'name'
  sort_order?: 'asc' | 'desc'
}
```

## API Endpoints

The client expects the following endpoints to be implemented in the auth-service:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/users` | List users with filtering |
| GET | `/api/auth/users/:userId` | Get user details |
| POST | `/api/auth/users/:userId/disable` | Disable user |
| POST | `/api/auth/users/:userId/enable` | Enable user |
| PATCH | `/api/auth/users/:userId/metadata` | Update metadata |
| DELETE | `/api/auth/users/:userId` | Delete user |
| POST | `/api/auth/users/:userId/reset-password` | Reset password |
| GET | `/api/auth/users/:userId/sessions` | Get user sessions |
| DELETE | `/api/auth/users/:userId/sessions/:sessionId` | Revoke session |

## Environment Variables

```bash
# Required for server-side usage
AUTH_SERVICE_URL=http://localhost:4000
AUTH_SERVICE_API_KEY=your-api-key-here
```

## Backward Compatibility

Legacy method names are supported:
- `listUsers()` → `listEndUsers()`
- `getUser()` → `getEndUser()`
- `disableUser()` → `disableEndUser()`
- etc.

## Testing

Run integration tests:
```bash
npx tsx src/features/studio/lib/__tests__/integration-test.ts
```

## Files

- **Client**: `/home/ken/developer-portal/src/lib/api/auth-service-client.ts`
- **Studio Wrapper**: `/home/ken/developer-portal/src/features/studio/lib/auth-service-client.ts`
- **Error Handling**: `/home/ken/developer-portal/src/features/studio/lib/error-handling.ts`
- **API Helpers**: `/home/ken/developer-portal/src/features/studio/lib/api-helpers.ts`
- **Types**: `/home/ken/developer-portal/src/lib/types/auth-user.types.ts`
- **Tests**: `/home/ken/developer-portal/src/features/studio/lib/__tests__/integration-test.ts`

## Status

✅ Integration Complete
✅ Type Safety Verified
✅ Error Handling Implemented
✅ Tests Passing
⚠️ Backend Endpoints Pending (auth-service needs to implement user management endpoints)
