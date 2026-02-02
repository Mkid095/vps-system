# Refresh Token Rotation - Implementation & Testing Guide

## Overview

The NextMavens platform implements refresh token rotation to maintain secure, persistent user sessions across the Auth Service and Developer Portal. Refresh tokens allow clients to obtain new access tokens without requiring users to re-enter credentials.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Refresh Token Flow                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Initial Login/Signup                                            │
│     ┌──────────┐                                                    │
│     │  Client  │──── POST /api/auth/login ─────▶                    │
│     └──────────┘                                    │              │
│                                                        │              │
│                                                        ▼              │
│  2. Auth Service Issues Tokens                         │              │
│     ┌─────────────────────────────────────────────┐   │              │
│     │ accessToken: JWT (15min expiry)             │◀──┘              │
│     │ refreshToken: JWT (30d expiry)              │                  │
│     └─────────────────────────────────────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│  3. Client Stores Tokens                                             │
│     ┌─────────────────────────────────────────────┐                  │
│     │ localStorage.accessToken = <JWT>            │                  │
│     │ localStorage.refreshToken = <JWT>           │                  │
│     └─────────────────────────────────────────────┘                  │
│                          │                                           │
│                          ▼                                           │
│  4. Access Token Expires (15 minutes)                                │
│     ┌──────────┐                                                    │
│     │  Client  │──── POST /api/auth/refresh ────▶                    │
│     └──────────┘   Body: { refreshToken }          │                 │
│                                                        │             │
│                                                        ▼             │
│  5. Auth Service Validates & Issues New Tokens        │             │
│     ┌─────────────────────────────────────────────┐   │             │
│     │ Verify JWT signature & expiration           │◀──┘             │
│     │ Check user still exists                     │                  │
│     │ Verify tenant/project status                │                  │
│     │ Issue NEW accessToken (15min)               │                  │
│     │ Issue NEW refreshToken (30d) - ROTATION     │                  │
│     └─────────────────────────────────────────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Token Specifications

### Auth Service Tokens

| Token Type | Secret | Expiration | Payload | Endpoint |
|------------|--------|------------|---------|----------|
| **Access Token** | `JWT_SECRET` | 15 minutes | `{ userId, tenantId, role }` | - |
| **Refresh Token** | `JWT_SECRET` | 30 days | `{ userId, tenantId }` | `/api/auth/refresh` |

**Implementation:** `/auth-service/auth.routes.js`

```javascript
const generateTokens = (userId, tenantId, role = 'user') => {
  const accessToken = jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, tenantId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};
```

### Developer Portal Tokens

| Token Type | Secret | Expiration | Payload | Endpoint |
|------------|--------|------------|---------|----------|
| **Access Token** | `JWT_SECRET` | 1 hour | `{ id, email, project_id }` | - |
| **Refresh Token** | `REFRESH_SECRET` | 7 days | `{ id }` | `/api/developer/refresh` |

**Implementation:** `/developer-portal/src/lib/auth.ts`

```typescript
export function generateAccessToken(developer: Developer, projectId: string): string {
  return jwt.sign(
    { id: developer.id, email: developer.email, project_id: projectId },
    getJwtSecret(),
    { expiresIn: '1h' }
  )
}

export function generateRefreshToken(developerId: string): string {
  return jwt.sign(
    { id: developerId },
    getRefreshSecret(),
    { expiresIn: '7d' }
  )
}
```

---

## Token Rotation Strategy

### Current Implementation: Graceful Transition

The platform uses a **graceful transition** approach to token rotation:

1. **Old tokens remain valid** until their natural expiration
2. **New tokens are issued** on each refresh request
3. **No immediate invalidation** of old tokens
4. **Client should update** to new tokens after successful refresh

**Benefits:**
- Allows multiple concurrent sessions (mobile + web)
- No sudden logout if refresh fails temporarily
- Simpler implementation without token blacklist

**Trade-offs:**
- Old compromised tokens remain valid until expiration
- No immediate session revocation capability

### Future Enhancement: Immediate Invalidation

For enhanced security, consider implementing:

1. **Token Versioning:** Add `version` claim to tokens
2. **Token Storage:** Store active refresh tokens in database
3. **Blacklist:** Invalidate old tokens on refresh
4. **Cleanup:** Remove expired tokens from storage

---

## Endpoint Specifications

### POST /api/auth/refresh (Auth Service)

**Location:** `/auth-service/auth.routes.js:232`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing refreshToken
- `401 Unauthorized`: Invalid/expired refreshToken, user not found
- `500 Internal Server Error`: Database or server error

### POST /api/developer/refresh (Developer Portal)

**Location:** `/developer-portal/src/app/api/developer/refresh/route.ts`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing refreshToken
- `401 Unauthorized`: Invalid/expired refreshToken, developer not found
- `403 Forbidden`: No active project, project suspended/archived/deleted
- `500 Internal Server Error`: Database or server error

---

## Client Implementation Pattern

### JavaScript/TypeScript Client

```typescript
class AuthClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private refreshPromise: Promise<void> | null = null

  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken')
    this.refreshToken = localStorage.getItem('refreshToken')
  }

  async refreshAccessToken(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch('/api/developer/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        })

        if (!response.ok) {
          throw new Error('Refresh failed')
        }

        const data = await response.json()

        // Store new tokens
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
      } catch (error) {
        // Clear tokens and redirect to login
        this.clearTokens()
        window.location.href = '/login'
        throw error
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Add access token to request
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
    }

    let response = await fetch(url, { ...options, headers })

    // If access token expired, try to refresh
    if (response.status === 401) {
      await this.refreshAccessToken()

      // Retry request with new token
      headers.Authorization = `Bearer ${this.accessToken}`
      response = await fetch(url, { ...options, headers })
    }

    return response
  }

  private clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
}
```

---

## Security Considerations

### 1. Secret Key Separation

| Service | Access Secret | Refresh Secret |
|---------|--------------|----------------|
| Auth Service | `JWT_SECRET` | `JWT_SECRET` (same) |
| Developer Portal | `JWT_SECRET` | `REFRESH_SECRET` (different) |

**Recommendation:** Use separate secrets for access and refresh tokens in Auth Service for defense in depth.

### 2. Expiration Times

| Token Type | Current | Recommendation |
|------------|---------|----------------|
| Auth Access | 15 minutes | ✅ Good balance |
| Auth Refresh | 30 days | ⚠️ Consider 7-14 days |
| Portal Access | 1 hour | ✅ Good balance |
| Portal Refresh | 7 days | ✅ Good balance |

### 3. Token Storage

**Client-side:**
- Use `httpOnly` cookies for web clients (prevents XSS access)
- Use secure storage (Keychain/Keystore) for mobile apps
- Never store tokens in URLs or query parameters

**Server-side:**
- No storage needed for current implementation
- Consider storing token metadata for enhanced security

### 4. Error Messages

Current implementation uses generic error messages to prevent information leakage:

```javascript
// ❌ Bad: Leaks information
return res.status(401).json({ error: 'User with ID 123 not found' })

// ✅ Good: Generic message
return res.status(401).json({ error: 'Invalid refresh token' })
```

---

## Testing

### Manual Testing

```bash
# 1. Login to get initial tokens
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 2. Use refresh token to get new tokens
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN_FROM_STEP_1>"}

# 3. Use new access token for authenticated requests
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <NEW_ACCESS_TOKEN>"
```

### Automated Testing

**Test File:** `/tests/refresh-token-rotation.test.ts`

Run tests:
```bash
npm test -- tests/refresh-token-rotation.test.ts
```

Test Coverage:
- ✅ Successful token refresh
- ✅ Expired access token refresh
- ✅ Invalid refresh token rejection
- ✅ Expired refresh token rejection
- ✅ Token rotation (new refresh token issued)
- ✅ Project status enforcement
- ✅ Developer/project not found scenarios

---

## Current Status: ✅ IMPLEMENTED & TESTED

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Service refresh endpoint | ✅ Complete | `/api/auth/refresh` |
| Developer Portal refresh endpoint | ✅ Complete | `/api/developer/refresh` |
| Token generation | ✅ Complete | Access + Refresh tokens |
| Token validation | ✅ Complete | JWT verify + user lookup |
| Token rotation | ✅ Complete | New tokens issued on refresh |
| Project status checks | ✅ Complete | Portal checks project status |
| Error handling | ✅ Complete | Generic error messages |
| Test suite | ✅ Complete | Comprehensive test coverage |
| Client implementation guide | ✅ Complete | AuthClient pattern |

---

## Configuration Requirements

### Auth Service (.env)

```bash
JWT_SECRET=<minimum 32 characters, cryptographically secure>
DATABASE_URL=postgresql://...
PORT=4000
NODE_ENV=production
```

### Developer Portal (.env)

```bash
JWT_SECRET=<minimum 32 characters, cryptographically secure>
REFRESH_SECRET=<minimum 32 characters, different from JWT_SECRET>
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Refresh Rate:** Tokens refreshed per minute
2. **Failure Rate:** Failed refresh attempts
3. **Latency:** Average refresh response time
4. **Token Age:** Distribution of token ages at refresh time

### Logging

```javascript
// Log successful refresh
console.log('[Auth] Token refreshed', {
  userId: decoded.userId,
  tenantId: decoded.tenantId,
  tokenAge: Date.now() - decoded.iat * 1000
})

// Log failed refresh
console.error('[Auth] Refresh failed', {
  error: error.message,
  // Never log the actual token or secrets
})
```

---

## Migration Notes

### For Existing Implementations

If you're integrating refresh tokens into an existing system:

1. **Add refresh token to login/signup responses:**
   ```javascript
   const tokens = generateTokens(userId, tenantId, role)
   res.json({ user, ...tokens }) // Add accessToken, refreshToken
   ```

2. **Update client to store both tokens:**
   ```javascript
   localStorage.setItem('accessToken', data.accessToken)
   localStorage.setItem('refreshToken', data.refreshToken)
   ```

3. **Implement 401 interceptor to auto-refresh:**
   ```javascript
   if (response.status === 401) {
     await refreshAccessToken()
     return fetch(url, options) // Retry
   }
   ```

4. **Add refresh endpoint route:**
   ```javascript
   app.post('/api/auth/refresh', refreshHandler)
   ```

---

## References

- JWT Authentication Flow: `/docs/jwt-authentication-flow.md`
- Auth Service: `/auth-service/auth.routes.js`
- Developer Portal Auth: `/developer-portal/src/lib/auth.ts`
- Test Suite: `/tests/refresh-token-rotation.test.ts`
