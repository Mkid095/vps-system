# NextMavens Realtime Service

Real-time WebSocket server that converts PostgreSQL database changes into WebSocket messages. Similar to Supabase Realtime.

## Features

- **PostgreSQL LISTEN/NOTIFY**: Receives database change notifications
- **WebSocket Server**: Bidirectional real-time communication
- **Multi-tenant Support**: Automatic tenant isolation
- **Presence System**: Track online users across channels
- **Broadcast**: Send messages to all connections in a tenant
- **JWT Authentication**: Secure WebSocket connections

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | WebSocket server port | `4003` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret for JWT verification | `your-secret` |

## WebSocket URL

```
wss://realtime.nextmavens.cloud/v1?token=YOUR_JWT_TOKEN
```

## WebSocket Message Types

### Subscribe to PostgreSQL Changes

```javascript
// Subscribe to a table/channel
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'users'  // or 'public:users'
}));
```

### Unsubscribe

```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channel: 'users'
}));
```

### Broadcast to Tenant

```javascript
ws.send(JSON.stringify({
  type: 'broadcast',
  payload: {
    event: 'message',
    data: { text: 'Hello everyone!' }
  }
}));
```

### Presence Tracking

```javascript
// Join presence channel
ws.send(JSON.stringify({
  type: 'presence',
  channel: 'online_users',
  payload: {
    status: 'online',
    user_agent: 'Mozilla/5.0...'
  }
}));
```

## PostgreSQL Notification Format

To send notifications from your application:

```sql
-- Simple notification
PERFORM pg_notify('users', json_build_object(
  'event', 'insert',
  'table', 'users',
  'data', row_to_json(NEW)
)::text);

-- With tenant isolation
PERFORM pg_notify('public:users', json_build_object(
  'event', 'update',
  'table', 'users',
  'tenantId', 'tenant-uuid',
  'data', row_to_json(NEW)
)::text);
```

### Using the HTTP API

```bash
curl -X POST https://realtime.nextmavens.cloud/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "users",
    "data": {"id": 1, "name": "John"},
    "tenantId": "tenant-uuid"
  }'
```

## WebSocket Events

### From Server

```javascript
// Connection established
{
  "event": "system",
  "type": "connected",
  "connectionId": "uuid",
  "timestamp": "2024-01-26T..."
}

// Subscription confirmed
{
  "event": "subscribed",
  "channel": "users",
  "timestamp": "2024-01-26T..."
}

// PostgreSQL change received
{
  "type": "postgres_change",
  "payload": {
    "data": { /* record data */ },
    "event": "INSERT",  // or UPDATE, DELETE
    "schema": "public",
    "table": "users",
    "timestamp": "2024-01-26T..."
  }
}

// Broadcast received
{
  "type": "broadcast",
  "event": "message",
  "payload": { /* custom data */ },
  "from": "user-id"
}

// Presence update
{
  "type": "presence",
  "event": "sync",  // or "state", "leave"
  "payload": {
    "user-id": {
      "user_id": "user-id",
      "tenant_id": "tenant-id",
      "online_at": "2024-01-26T...",
      "updated_at": "2024-01-26T...",
      "status": "online"
    }
  }
}
```

## Auto-trigger with PostgreSQL Triggers

Create a trigger to automatically send notifications on table changes:

```sql
-- Function to send notification
CREATE OR REPLACE FUNCTION notify_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  payload = json_build_object(
    'event', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'tenantId', NEW.tenant_id,
    'data', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END
  );

  PERFORM pg_notify(
    TG_TABLE_SCHEMA || ':' || TG_TABLE_NAME,
    payload::text
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
CREATE TRIGGER users_notify_changes
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION notify_table_changes();
```

## Client-side Example

```javascript
class NextMavensRealtime {
  constructor(url, token) {
    this.ws = new WebSocket(`${url}/v1?token=${token}`);
    this.subscriptions = new Map();

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'postgres_change':
        this.handlePostgresChange(message.payload);
        break;
      case 'broadcast':
        this.handleBroadcast(message.payload);
        break;
      case 'presence':
        this.handlePresence(message);
        break;
    }
  }

  subscribe(channel, callback) {
    this.subscriptions.set(channel, callback);

    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channel
    }));
  }

  broadcast(event, data) {
    this.ws.send(JSON.stringify({
      type: 'broadcast',
      payload: { event, data }
    }));
  }

  handlePostgresChange(payload) {
    const callback = this.subscriptions.get(payload.table);
    if (callback) {
      callback(payload);
    }
  }
}

// Usage
const realtime = new NextMavensRealtime(
  'wss://realtime.nextmavens.cloud',
  'your-jwt-token'
);

realtime.subscribe('users', (change) => {
  console.log('User changed:', change);
});
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stats` | Connection statistics |
| POST | `/api/notify` | Send PostgreSQL notification |

## Monitoring

```bash
# Check service health
curl https://realtime.nextmavens.cloud/health

# Get connection stats
curl https://realtime.nextmavens.cloud/api/stats
```

## Integration with Auth

The WebSocket requires a valid JWT token from the auth service:

```javascript
// Login first
const login = await fetch('https://auth.nextmavens.cloud/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});

const { accessToken } = await login.json();

// Connect to WebSocket with token
const ws = new WebSocket(`wss://realtime.nextmavens.cloud/v1?token=${accessToken}`);
```
