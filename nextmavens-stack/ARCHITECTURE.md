# NextMavens Stack - Supabase Alternative Architecture

## Overview
Enterprise-grade, multi-tenant backend platform with real-time capabilities, similar to Supabase but self-hosted.

## Components

### 1. PostgreSQL Database (Foundation)
- Extensions: pgjwt, pgcrypto, pg_net, postgis
- Row Level Security (RLS) for multi-tenancy
- Replication slot for Realtime
- Connection pooling

### 2. Realtime Server (Elixir/Phoenix)
- Listens to PostgreSQL logical replication
- Converts database changes to WebSocket messages
- Handles broadcast channels
- Presence tracking
- JWT authentication for WebSocket connections

### 3. Auth Service (Node.js/Express)
- JWT token generation/validation
- User management
- OAuth integration (Google, GitHub)
- Magic links
- Password reset
- RLS policy helpers

### 4. PostgREST (Auto REST API)
- RESTful API auto-generated from database schema
- JWT authentication integration
- RLS aware

### 5. PgGraphile (GraphQL API)
- GraphQL API auto-generated from database
- Watch mode for schema changes
- Subscriptions support

### 6. API Gateway (Traefik + Custom)
- Request routing
- Rate limiting
- JWT validation
- Request logging
- CORS handling

### 7. Storage Services
- Cloudinary (images)
- Telegram (files)
- S3-compatible backup

### 8. Deployment & Monitoring
- Dokploy (deployment)
- Telegram notifications (alerts)
- Health monitoring

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Apps                          │
│  (Web, Mobile, Enterprise Systems)                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Traefik)                    │
│  - Routing │  - Rate Limiting │  - Auth Validation          │
└───────┬─────────┬─────────┬─────────┬──────────────────────┘
        │         │         │         │
        ▼         ▼         ▼         ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Auth    │ │ PostgREST│ │ PgGraph │ │ Realtime │
│ Service  │ │   (REST) │ │ (GraphQL)│ │(WebSocket)│
└─────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬────┘
      │            │            │            │
      └────────────┴────────────┴────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   PostgreSQL    │
              │  + RLS Policies │
              │  + Extensions   │
              └─────────────────┘
```

## Multi-Tenancy Strategy

### Tenant Isolation
- **Database Level:** RLS policies on all tables
- **Application Level:** Tenant ID in JWT claims
- **Connection Level:** Separate schemas per tenant (optional)

### RLS Policy Structure
```sql
-- Every table has tenant_id
ALTER TABLE table_name ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY tenant_isolation ON table_name
  USING (tenant_id = current_tenant_id());
```

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. PostgreSQL extensions
2. RLS base policies
3. Tenant schema updates

### Phase 2: Realtime (Week 2)
1. Realtime server deployment
2. Replication configuration
3. WebSocket endpoint
4. Presence system

### Phase 3: API Layer (Week 3)
1. PgGraphile deployment
2. API Gateway enhancements
3. Rate limiting

### Phase 4: Storage (Week 4)
1. Telegram file storage
2. Cloudinary integration
3. S3 backup

### Phase 5: Monitoring (Week 5)
1. Dokploy webhooks
2. Telegram alerts
3. Health dashboards

## Environment Variables

### Shared
```
POSTGRESQL_HOST=nextmavens-db-m4sxnf
POSTGRESQL_PORT=5432
POSTGRESQL_DB=nextmavens
POSTGRESQL_USER=nextmavens
POSTGRESQL_PASSWORD=your_secure_password_here
JWT_SECRET=your-production-secret-key
```

### Realtime
```
REALTIME_PORT=4003
REALTIME_JWT_SECRET=your-jwt-secret
POSTGRESQL_REPLICATION_SLOT=nextmavens_slot
```

### PgGraphile
```
GRAPHILE_PORT=4004
GRAPHILE_SCHEMA=public
GRAPHILE_JWT_SECRET=your-jwt-secret
```

### Telegram Storage
```
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHANNEL_ID=-1003876778158
```

## API Endpoints

### Auth Service
```
POST   /api/auth/signup       - Create user
POST   /api/auth/login        - Login
POST   /api/auth/logout       - Logout
POST   /api/auth/refresh      - Refresh token
GET    /api/auth/me           - Current user
POST   /api/auth/reset        - Password reset
```

### PostgREST
```
GET    /:table                - List records
GET    /:table?id=eq.1        - Get record
POST   /:table                - Create record
PATCH  /:table?id=eq.1        - Update record
DELETE /:table?id=eq.1        - Delete record
```

### PgGraphile
```
POST   /graphql               - GraphQL endpoint
GET    /graphql               - GraphQL playground
```

### Realtime
```
WS     /realtime/v1          - WebSocket endpoint
```

### Telegram Storage
```
POST   /storage/upload       - Upload file
GET    /storage/:file_id     - Download file
DELETE /storage/:file_id     - Delete file
```

## Security Considerations

1. **JWT Tokens**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (30 days)
   - Token rotation on refresh

2. **Row Level Security**
   - All tables have RLS enabled
   - Tenant isolation enforced at DB level
   - Admin bypass with role checks

3. **API Gateway**
   - Rate limiting per tenant
   - Request size limits
   - IP whitelisting for sensitive operations

4. **WebSocket Security**
   - JWT required for connection
   - Channel-level authorization
   - Automatic disconnection on token expiry

## Monitoring & Alerts

1. **Deployment Failures** → Telegram
2. **Database Connection Issues** → Telegram
3. **High Error Rates** → Telegram
4. **Service Health Checks** → Dashboard

## Scalability

1. **Database**
   - Connection pooling (PgBouncer)
   - Read replicas for analytics

2. **Realtime**
   - Horizontal scaling with Redis pub/sub
   - Multiple instances behind load balancer

3. **API Services**
   - Stateless design
   - Container orchestration ready

## Backup Strategy

1. **Database**: Daily automated backups to Telegram/S3
2. **Files**: Telegram channel + Cloudinary
3. **Configuration**: Git version control
