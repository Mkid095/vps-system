# Health Checks and Circuit Breakers

Shared utilities for monitoring service health and implementing circuit breakers for external dependencies.

## Installation

```bash
npm install @nextmavens/health-checks
```

## Quick Start

### Basic Health Check

```javascript
import { createHealthChecker, createPostgresHealthCheck } from '@nextmavens/health-checks';

// Create a health checker for your service
const healthChecker = createHealthChecker({
  serviceName: 'my-service',
  version: '1.0.0',
  cacheTTL: 10000 // 10 seconds cache
});

// Register your database dependency
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

healthChecker.registerDependency('database', createPostgresHealthCheck(pool), {
  critical: true // Service is unhealthy if database fails
});

// Use in Express route
app.get('/health', async (req, res) => {
  const health = await healthChecker.getHealth();
  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});
```

### Circuit Breaker for External APIs

```javascript
import { CircuitBreaker } from '@nextmavens/health-checks';

// Create a circuit breaker for an external API
const apiBreaker = new CircuitBreaker('external-api', {
  timeoutMs: 5000,          // Timeout after 5 seconds
  errorThreshold: 5,        // Open circuit after 5 consecutive failures
  resetTimeoutMs: 60000,    // Retry after 1 minute
  successThreshold: 2       // Close circuit after 2 consecutive successes
});

// Use the circuit breaker
const result = await apiBreaker.execute(async () => {
  const response = await fetch('https://external-api.com/data');
  return await response.json();
});

if (result.success) {
  console.log('Request succeeded:', result.data);
} else {
  console.log('Request failed or circuit open:', result.error);
  console.log('Circuit state:', result.state);
}
```

## Pre-Built Health Checks

### PostgreSQL

```javascript
import { createPostgresHealthCheck } from '@nextmavens/health-checks';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

healthChecker.registerDependency(
  'database',
  createPostgresHealthCheck(pool),
  { critical: true }
);
```

### HTTP Endpoint

```javascript
import { createHttpHealthCheck } from '@nextmavens/health-checks';

healthChecker.registerDependency(
  'control-plane-api',
  createHttpHealthCheck('https://api.example.com/health', {
    timeout: 3000,
    expectedStatus: 200
  }),
  { critical: true }
);
```

### Redis

```javascript
import { createRedisHealthCheck } from '@nextmavens/health-checks';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

healthChecker.registerDependency(
  'redis',
  createRedisHealthCheck(redis),
  { critical: false } // Non-critical - service can continue without Redis
);
```

### Telegram Bot API

```javascript
import { createTelegramHealthCheck } from '@nextmavens/health-checks';

healthChecker.registerDependency(
  'telegram-bot',
  createTelegramHealthCheck(process.env.TELEGRAM_BOT_TOKEN),
  { critical: false }
);
```

### Telegram Storage API

```javascript
import { createTelegramStorageHealthCheck } from '@nextmavens/health-checks';

healthChecker.registerDependency(
  'telegram-storage',
  createTelegramStorageHealthCheck(
    process.env.TELEGRAM_STORAGE_API_URL,
    process.env.TELEGRAM_STORAGE_API_KEY
  ),
  { critical: true }
);
```

### Cloudinary

```javascript
import { createCloudinaryHealthCheck } from '@nextmavens/health-checks';

healthChecker.registerDependency(
  'cloudinary',
  createCloudinaryHealthCheck(process.env.CLOUDINARY_CLOUD_NAME),
  { critical: false }
);
```

## Circuit Breaker States

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOSED (Normal)                         │
│  All requests pass through                                    │
│  Track failures                                                │
│  On errorThreshold failures → OPEN                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                           OPEN (Failing)                        │
│  All requests fail fast (no waiting)                            │
│  After resetTimeout → HALF_OPEN                                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        HALF_OPEN (Recovering)                    │
│  Allow requests through                                        │
│  On success → CLOSED                                            │
│  On failure → OPEN                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Health Response Format

```json
{
  "status": "healthy",
  "service": "my-service",
  "version": "1.0.0",
  "uptime": 3600.5,
  "timestamp": "2026-02-02T14:30:00.000Z",
  "dependencies": {
    "database": {
      "name": "database",
      "status": "healthy",
      "latency": 5
    },
    "redis": {
      "name": "redis",
      "status": "healthy",
      "latency": 2
    },
    "external-api": {
      "name": "external-api",
      "status": "degraded",
      "latency": 250,
      "error": "Slow response times"
    }
  },
  "circuitBreakers": {
    "external-api": {
      "name": "external-api",
      "state": "closed",
      "requestCount": 150,
      "failureCount": 0,
      "successCount": 145,
      "lastFailureTime": null,
      "lastSuccessTime": 1706902200000,
      "openedAt": null,
      "nextRetryTime": null
    }
  }
}
```

## License

MIT
