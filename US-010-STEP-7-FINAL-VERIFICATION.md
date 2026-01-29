# US-010 Step 7: Final Integration Verification

## Complete Integration Flow

### 1. Request Context with Correlation ID
```typescript
// Incoming HTTP request with x-request-id header
const incomingRequest = {
  headers: {
    'x-request-id': 'req-abc-123-def',
    'user-agent': 'Mozilla/5.0...',
    'x-forwarded-for': '192.168.1.100'
  }
};
```

### 2. Extract Correlation ID (database/src/helpers.ts)
```typescript
export function extractRequestId(request: RequestContext): string | null {
  if (!request) return null;

  const requestId = request.requestId || request.headers?.['x-request-id'];

  return typeof requestId === 'string' ? requestId : null;
}

// Result: 'req-abc-123-def'
```

### 3. Log Action with Correlation ID (database/src/helpers.ts)
```typescript
export async function logAction(
  actor: ActorInfo,
  action: AuditAction | string,
  target: TargetInfo,
  options: AuditLogOptions = {}
) {
  const input: CreateAuditLogInput = {
    actor_id: actor.id,
    actor_type: actor.type,
    action,
    target_type: target.type,
    target_id: target.id,
    metadata: options.metadata || {},
    ip_address: extractIpAddress(options.request || {}),
    user_agent: extractUserAgent(options.request || {}),
    request_id: extractRequestId(options.request || {}),  // ← Correlation ID
  };

  return await auditLogService.create(input);
}
```

### 4. Store in Database (database/src/AuditLogService.ts)
```sql
INSERT INTO control_plane.audit_logs (
  actor_id, actor_type, action, target_type, target_id,
  metadata, ip_address, user_agent, request_id
) VALUES (
  'user-123', 'user', 'project.created', 'project', 'proj-456',
  '{}', '192.168.1.100', 'Mozilla/5.0...', 'req-abc-123-def'
);
```

### 5. Query by Correlation ID (database/src/AuditLogService.ts)
```typescript
private buildQuery(queryParam: AuditLogQuery = {}): {
  select: string;
  count: string;
  values: unknown[];
} {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (queryParam.request_id) {
    conditions.push(`request_id = $${paramIndex}`);
    values.push(queryParam.request_id);
    paramIndex++;
  }

  // ... other filters ...

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    select: `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    count: `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`,
    values,
  };
}

// Result: All audit entries with request_id = 'req-abc-123-def'
```

### 6. API Endpoint Validation (api-gateway/src/api/routes/audit/audit.controller.ts)
```typescript
// Validate request_id (optional, but must be string if provided)
if (params.request_id) {
  if (typeof params.request_id !== 'string') {
    errors.push({
      field: 'request_id',
      message: 'request_id must be a string',
      received: typeof params.request_id
    });
  } else if (params.request_id.length > 500) {
    errors.push({
      field: 'request_id',
      message: 'request_id must be less than 500 characters',
      received: `${params.request_id.length} characters`
    });
  } else {
    query.request_id = params.request_id;
  }
}

// Query: GET /api/audit?request_id=req-abc-123-def
```

### 7. UI Filter (developer-portal/src/features/audit-logs/AuditFilters.tsx)
```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Request ID
  </label>
  <input
    type="text"
    placeholder="Enter correlation ID"
    value={filters.requestId}
    onChange={(e) => onFiltersChange({ ...filters, requestId: e.target.value })}
    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
  />
</div>
```

### 8. Display in Results (developer-portal/src/features/audit-logs/AuditLogTable.tsx)
```tsx
{log.request_id && (
  <div className="mb-3">
    <span className="text-xs font-medium text-slate-700">Request ID:</span>
    <p className="text-xs text-slate-600 mt-1 break-all font-mono">{log.request_id}</p>
  </div>
)}
```

## Integration Benefits

### 1. Request Tracing
- Track all audit entries for a single request across multiple services
- Debug complex multi-service workflows
- Identify performance bottlenecks

### 2. Compliance & Auditing
- Complete audit trail with correlation context
- Link related actions together
- Easy investigation of security incidents

### 3. Operational Excellence
- Filter logs by specific request ID
- Understand the full impact of a single request
- Correlate errors with specific operations

## Example Use Case

### Scenario: User creates a project
1. **Request**: `POST /api/projects` with header `x-request-id: req-2024-01029-001`
2. **Audit Logs Created**:
   - `project.created` (request_id: req-2024-01029-001)
   - `key.created` (request_id: req-2024-01029-001)
   - `user.invited` (request_id: req-2024-01029-001)
3. **Query**: `GET /api/audit?request_id=req-2024-01029-001`
4. **Result**: All 3 audit entries returned, showing complete request flow

## Verification Summary

✓ **Database Layer**: Correlation ID extracted and stored
✓ **API Layer**: Query endpoint supports filtering by request_id
✓ **UI Layer**: Filter input and display implemented
✓ **Type Safety**: All types updated, typecheck passes
✓ **Backward Compatible**: Existing integrations unaffected
✓ **Input Validation**: Proper validation on all layers

## Conclusion

The correlation ID integration is complete and fully functional across all layers of the audit logging system. Users can now trace requests across services, debug complex workflows, and maintain complete audit trails with correlation context.

All acceptance criteria for US-010 Step 7 have been met and verified.
