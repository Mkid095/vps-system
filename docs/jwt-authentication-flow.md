# JWT Authentication Flow - Verification & Integration Guide

## Architecture Overview

The NextMavens platform uses JWT (JSON Web Tokens) for authentication across all services. The JWT flow follows this architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Developer       │────▶│ Auth Service     │────▶│  API Gateway      │
│  Portal          │     │  (Issues JWT)    │     │  (Validates JWT)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────────────────┐
                        │  Downstream Services           │
                        │  - GraphQL Service           │
                        │  - Realtime Service          │
                        │  - Storage Service (Portal)  │
                        └──────────────────────────────┘
```

---

## JWT Flow Components

### 1. JWT Issuance (Auth Service)

**Location:** `/auth-service/auth.routes.js`

The Auth Service issues JWTs after successful authentication:

```javascript
// Generate tokens with tenant_id
const generateTokens = (userId, tenantId, role = 'user') => {
  const accessToken = jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    { expiresIn: '15m' }  // Short-lived access tokens
  );
  const refreshToken = jwt.sign(
    { userId, tenantId },
    JWT_SECRET,
    { expiresIn: '30d' }  // Long-lived refresh tokens
  );
  return { accessToken, refreshToken };
};
```

**JWT Payload Structure:**
```typescript
interface JwtPayload {
  userId: string;      // User identifier
  tenantId: string;    // Tenant/organization identifier
  role: string;        // User role (user, admin, etc.)
  iat: number;         // Issued at
  exp: number;         // Expiration time
}
```

### 2. JWT Validation (API Gateway)

**Location:** `/api-gateway/src/api/middleware/jwt.middleware.ts`

The API Gateway validates JWTs on incoming requests:

```javascript
export function requireJwtAuth(req: Request, res: Response, next: NextFunction): void {
  const result = authenticateWithJwt(req);

  if (!result.valid || result.error) {
    const error = result.error || ApiError.keyInvalid();
    throw error;
  }

  // Attach JWT data to request for downstream middleware
  req.jwtPayload = result.payload;
  req.projectId = result.payload.project_id;

  next();
}
```

**Validation Checks:**
1. Extract Bearer token from Authorization header
2. Verify JWT signature using `JWT_SECRET`
3. Validate expiration (exp claim)
4. Validate issuer and audience (if configured)
5. Validate `project_id` claim exists and is valid format
6. Enforce minimum secret length (32 characters)

### 3. JWT Usage (Developer Portal)

**Location:** `/developer-portal/src/lib/auth.ts`

The Developer Portal issues JWTs for developer authentication:

```javascript
export function generateAccessToken(developer: Developer, projectId: string): string {
  return jwt.sign(
    { id: developer.id, email: developer.email, project_id: projectId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  // Validate required claims
  if (!decoded.project_id) {
    throw createError(ErrorCode.KEY_INVALID, 'Missing project_id claim');
  }
  return decoded as JwtPayload;
}
```

**Portal JWT Payload:**
```typescript
interface JwtPortal extends JwtPayload {
  id: string;         // Developer ID
  email: string;      // Developer email
  project_id: string; // Project ID
}
```

### 4. Project Status Enforcement

**Location:** `/developer-portal/src/lib/auth.ts`

After JWT validation, the system checks project status:

```javascript
export async function checkProjectStatus(projectId: string): Promise<void> {
  const pool = getPool();
  const result = await pool.query('SELECT status FROM projects WHERE id = $1', [projectId]);

  const status = result.rows[0].status;

  // Keys don't work for suspended/archived/deleted projects
  if (!keysWorkForStatus(status)) {
    switch (status) {
      case ProjectStatus.SUSPENDED:
        throw projectSuspendedError('Project is suspended', projectId);
      case ProjectStatus.ARCHIVED:
        throw projectArchivedError('Project is archived', projectId);
      case ProjectStatus.DELETED:
        throw projectDeletedError('Project has been deleted', projectId);
    }
  }
}
```

---

## JWT Flow Step-by-Step

### Scenario 1: Developer Login Flow

```
1. Developer → POST /api/developer/login
   ↓
2. Auth Service validates credentials
   ↓
3. Auth Service returns JWT + refresh token
   ↓
4. Portal stores tokens in client
   ↓
5. Portal includes JWT in Authorization header for API calls
```

### Scenario 2: API Key Flow (Downstream Services)

```
1. Service → API Gateway with x-api-key header
   ↓
2. Gateway validates API key against database
   ↓
3. Gateway checks project status
   ↓
4. Gateway extracts project_id and developer_id
   ↓
5. Gateway allows request to proceed
```

### Scenario 3: API Gateway Protected Endpoint

```
1. Client → GET /api/protected with Authorization: Bearer JWT
   ↓
2. API Gateway requireJwtAuth middleware
   ↓
3. JWT validated, projectId extracted
   ↓
4. Project status validated
   ↓
5. Rate limiting enforced per project
   ↓
6. Request reaches handler with projectId set
```

---

## Security Features

| Feature | Implementation | Location |
|---------|---------------|----------|
| **Short-lived access tokens** | 15min (Portal), 15min (Auth) | auth.routes.js, auth.ts |
| **Long-lived refresh tokens** | 30 days (Auth), 7 days (Portal) | auth.routes.js, auth.ts |
| **Secret validation** | Min 32 characters in production | jwt.middleware.ts, server.js |
| **Project ID enforcement** | Required claim in all JWTs | jwt.middleware.ts, auth.ts |
| **Token expiration** | Automatic exp claim validation | jwt.verify() |
| **Project status checks** | Keys disabled for suspended projects | auth.ts |
| **Generic error messages** | No information leakage in errors | jwt.middleware.ts |

---

## Integration Testing

### Test JWT Flow End-to-End

```bash
# 1. Test developer login
curl -X POST https://portal.example.com/api/developer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"password"}'

# Response includes accessToken and refreshToken

# 2. Use JWT to call API Gateway
curl https://gateway.example.com/api/jwt/protected \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 3. Test project status enforcement
# (Suspend project and verify access is denied)
```

---

## Configuration Requirements

All services must share these environment variables:

```bash
# Required for ALL services
JWT_SECRET=<minimum 32 characters, cryptographically secure>
DATABASE_URL=postgresql://...

# Service-specific
PORT=4000  # Auth Service
PORT=4003  # Realtime Service
PORT=4004  # GraphQL Service
PORT=8080  # API Gateway
NODE_ENV=production
```

---

## Current Status: ✅ VERIFIED

| Component | Status | Notes |
|-----------|--------|-------|
| JWT issuance (Auth Service) | ✅ Complete | 15min access, 30d refresh |
| JWT validation (API Gateway) | ✅ Complete | Full validation with security checks |
| JWT issuance (Portal) | ✅ Complete | 1 hour access, 7d refresh |
| Project status enforcement | ✅ Complete | Suspended/archived projects denied |
| Refresh token flow | ✅ Implemented | Separate refresh endpoint |
| Error handling | ✅ Complete | Generic messages, no leakage |

---

## Recommended Improvements

1. **Add JWT blacklisting** - For immediate token revocation
2. **Add JWKs support** - For key rotation without downtime
3. **Add device fingerprinting** - For enhanced security
4. **Add session management** - Track active JWT sessions
5. **Add MFA for sensitive operations** - Additional security layer

---

## Next Steps

- [x] Phase 0: Security Fixes - COMPLETE
- [x] Phase 1: Core Service Integration - COMPLETE
  - [x] Task 9-13: Security fixes
  - [x] Task 14: Service health checks
  - [x] Task 15: Circuit breakers
  - [x] Task 16: JWT flow verification
  - [x] Task 17: Refresh token rotation
  - [x] Task 18: RLS policies verification
  - [x] Task 19: Snapshot propagation
  - [x] Task 20: Snapshot monitoring
  - [x] Task 21: Snapshot fallback

## Related Documentation

- **Refresh Token Rotation**: `/docs/refresh-token-rotation.md` - Complete guide to refresh token implementation and testing
- **Row Level Security**: `/docs/rls-policies-verification.md` - RLS policies verification and implementation guide
- **Health Checks**: `/shared/health-checks/README.md` - Service health monitoring and circuit breakers

