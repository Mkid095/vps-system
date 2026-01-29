# US-004 Provision Project Job - Quick Reference

## Files Created/Modified

### Created Files
```
/home/ken/database/src/jobs/
├── types.ts                      (4.1K) - Job-specific types
├── provision-project.handler.ts  (12K)  - Main job handler
├── registry.ts                   (2.6K) - Handler registry
└── index.ts                      (1.1K) - Module exports
```

### Modified Files
```
/home/ken/database/src/index.ts    - Added job handler exports
/home/ken/database/src/__tests__/index-exports.test.ts - Fixed test
```

## Key Components

### 1. Provision Project Handler
**File:** `src/jobs/provision-project.handler.ts`

**Main Function:**
```typescript
export const provisionProjectHandler: JobHandler
```

**Stages:**
1. INITIALIZING - Verify project exists
2. CREATING_DATABASE - Create tenant database
3. CREATING_SCHEMA - Create tenant schema
4. REGISTERING_AUTH - Register with auth service
5. REGISTERING_REALTIME - Register with realtime service
6. REGISTERING_STORAGE - Register with storage service
7. GENERATING_API_KEYS - Generate API keys
8. FINALIZING - Complete provisioning
9. COMPLETED - Successfully provisioned
10. FAILED - Provisioning failed

### 2. Job Handler Registry
**File:** `src/jobs/registry.ts`

**Functions:**
- `getJobHandler(jobType)` - Get handler by type
- `hasJobHandler(jobType)` - Check if handler exists
- `registerJobHandler(jobType, handler)` - Register new handler
- `getRegisteredJobTypes()` - List all types
- `validateRequiredHandlers(types)` - Validate required handlers

### 3. Types
**File:** `src/jobs/types.ts`

**Main Types:**
- `ProvisionProjectPayload` - Input parameters
- `ProvisionProjectResult` - Output structure
- `ProvisionProjectErrorType` - Error enumeration
- `ProvisionProjectStage` - Progress tracking

## Usage Examples

### Enqueue a Provision Job
```typescript
import { enqueueJob } from '@nextmavens/audit-logs-database';

const result = await enqueueJob('provision_project', {
  project_id: 'proj-123',
  region: 'us-east-1',
  services: {
    auth: true,
    realtime: true,
    storage: true,
  },
  api_keys: {
    count: 2,
    prefix: 'nm',
  },
});
```

### Get Job Handler Directly
```typescript
import { getJobHandler, JobType } from '@nextmavens/audit-logs-database';

const handler = getJobHandler(JobType.PROVISION_PROJECT);
const result = await handler({
  project_id: 'proj-456',
  region: 'eu-west-1',
});
```

### Use Handler Directly
```typescript
import { provisionProjectHandler } from '@nextmavens/audit-logs-database';

const result = await provisionProjectHandler({
  project_id: 'proj-789',
  region: 'ap-southeast-1',
  database: {
    engine: 'postgresql',
    version: '15',
    size: 'db.t3.micro',
  },
});
```

## Payload Structure

### Required Fields
```typescript
{
  project_id: string;  // Project identifier
  region: string;      // Target region
}
```

### Optional Fields
```typescript
{
  database?: {
    engine?: 'postgresql' | 'mysql';
    version?: string;
    size?: string;
    storage_gb?: number;
  };
  services?: {
    auth?: boolean;
    realtime?: boolean;
    storage?: boolean;
  };
  api_keys?: {
    count?: number;
    prefix?: string;
  };
  owner_id?: string;
  organization_id?: string;
  metadata?: Record<string, unknown>;
}
```

## Result Structure

```typescript
{
  project_id: string;
  database: {
    host: string;
    port: number;
    database_name: string;
    schema_name: string;
    connection_string: string;
  };
  services: {
    auth?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
    };
    realtime?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
    };
    storage?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
      bucket_name: string;
    };
  };
  api_keys: Array<{
    key_id: string;
    key_prefix: string;
    created_at: Date;
  }>;
  metadata: {
    provisioned_at: Date;
    region: string;
    owner_id?: string;
    organization_id?: string;
  };
}
```

## Error Handling

### Error Types
- `PROJECT_NOT_FOUND` - Project doesn't exist
- `DATABASE_CREATION_FAILED` - Database creation error
- `SCHEMA_CREATION_FAILED` - Schema creation error
- `SERVICE_REGISTRATION_FAILED` - Service registration error
- `API_KEY_GENERATION_FAILED` - API key generation error
- `INSUFFICIENT_PERMISSIONS` - Permission denied
- `QUOTA_EXCEEDED` - Quota limit reached
- `NETWORK_ERROR` - Network connectivity issue
- `TIMEOUT` - Operation timeout
- `UNKNOWN_ERROR` - Unexpected error

### Retry Configuration
- **Max Attempts:** 3 (default)
- **Retry Interval:** 5 minutes (300 seconds)
- **Backoff:** Exponential

## Testing

### Typecheck
```bash
cd /home/ken/database
pnpm run typecheck
```

### Integration Tests (Future)
```bash
pnpm test:integration
```

## Verification Commands

```bash
# Check files exist
ls -la src/jobs/

# Verify exports
grep -r "provisionProjectHandler" dist/

# Count lines of code
find src/jobs -name "*.ts" -exec wc -l {} + | tail -1

# Run typecheck
pnpm run typecheck
```

## Next Steps

1. **Step 2** - Package Manager Migration (if needed)
2. **Step 7** - Centralized Data Layer - Implement actual database connections
3. **Step 10** - Production Readiness - Replace placeholders with actual implementations

## Important Notes

- Service registration functions are placeholders for actual API calls
- Database creation requires proper PostgreSQL permissions
- API key generation needs secure implementation
- Progress tracking is logged but not persisted
- All database operations should be wrapped in transactions (future)

## Commit Message

```
feat: US-004 - Implement provision_project job handler foundation

- Created job types for provision_project payload and results
- Implemented provision_project job handler with retry logic
- Created job handler registry for centralized management
- Added progress tracking and error handling
- Typecheck passes

Co-Authored-By: NEXT MAVENS <info@nextmavens.com>
```
