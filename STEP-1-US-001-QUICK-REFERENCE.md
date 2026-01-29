# US-001: Manual Export API - Quick Reference

## Endpoint

```
POST /api/backup/export
```

## Authentication

```
Authorization: Bearer <jwt_token>
```

## Request Body

```json
{
  "project_id": "proj-123",           // Required
  "format": "sql",                    // Optional: "sql" | "tar" (default: "sql")
  "compress": true,                   // Optional: boolean (default: true)
  "notify_email": "admin@example.com", // Optional: email for notification
  "storage_path": "/custom/path"      // Optional: custom storage path
}
```

## Response (202 Accepted)

```json
{
  "data": {
    "job_id": "uuid-v4",
    "status": "pending",
    "project_id": "proj-123",
    "created_at": "2026-01-29T15:30:00.000Z"
  }
}
```

## Check Job Status

```
GET /api/jobs/{job_id}
```

## Files Created

```
/home/ken/api-gateway/src/api/routes/backup/
├── backup.types.ts       # Type definitions
├── backup.controller.ts  # Request handler
└── index.ts              # Route configuration
```

## Security

- ✅ JWT authentication required
- ✅ Rate limited: 10 requests/minute
- ✅ Input validation (project_id, format, email)
- ✅ Command injection prevention
- ✅ Path traversal prevention

## Validation Rules

- **project_id**: Alphanumeric, hyphens, underscores only (max 100 chars)
- **format**: Must be "sql" or "tar"
- **email**: Standard email format (if provided)
- **storage_path**: No absolute paths, no ".." sequences

## Error Responses

- `400` - Validation error
- `401` - Unauthorized
- `429` - Rate limited
- `500` - Internal server error

## Testing

```bash
# Typecheck
cd /home/ken/api-gateway && pnpm run typecheck

# Build
cd /home/ken/api-gateway && pnpm run build
```

## How It Works

1. Client sends POST request to `/api/backup/export`
2. API validates input (project_id, format, email)
3. API enqueues `export_backup` job with validated payload
4. API returns job_id immediately (202 Accepted)
5. Job runs in background (generates SQL dump via pg_dump)
6. Client polls `/api/jobs/{job_id}` for status updates
7. Job handler uploads to Telegram (when US-002 implemented)

## Integration

- Uses existing `export_backup` job handler
- Integrates with job queue system
- Follows same patterns as job status API
