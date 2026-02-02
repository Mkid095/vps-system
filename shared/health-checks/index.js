/**
 * Health Check and Circuit Breaker Utilities
 *
 * Shared utilities for monitoring service health and implementing circuit breakers
 * for external dependencies.
 *
 * @example
 * ```javascript
 * import { createHealthChecker, CircuitBreaker } from '@nextmavens/health-checks';
 *
 * // Create a health checker for your service
 * const healthChecker = createHealthChecker({
 *   serviceName: 'my-service',
 *   version: '1.0.0'
 * });
 *
 * // Register dependencies
 * healthChecker.registerDependency('database', async () => {
 *   // Check database connection
 *   await db.query('SELECT 1');
 *   return { status: 'healthy' };
 * });
 *
 * // Create a circuit breaker for an external API
 * const apiBreaker = new CircuitBreaker('external-api', {
 *   timeoutMs: 5000,
 *   errorThreshold: 5,
 *   resetTimeoutMs: 60000
 * });
 *
 * // Use the circuit breaker
 * const result = await apiBreaker.execute(async () => {
 *   return await fetch('https://external-api.com/health');
 * });
 * ```
 */

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker states
 */
export const CircuitState = {
  CLOSED: 'closed',     // Normal operation - requests pass through
  OPEN: 'open',         // Circuit is open - requests fail fast
  HALF_OPEN: 'half-open' // Testing if service has recovered
};

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Time in milliseconds after which a request is considered timed out */
  timeoutMs: number;
  /** Number of consecutive failures before opening the circuit */
  errorThreshold: number;
  /** Time in milliseconds to wait before transitioning from OPEN to HALF_OPEN */
  resetTimeoutMs: number;
  /** Time in milliseconds to wait before transitioning from HALF_OPEN to CLOSED */
  successThreshold?: number;
}

/**
 * Circuit breaker result
 */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: string;
  latency: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  name: string;
  state: string;
  requestCount: number;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  openedAt: number | null;
  nextRetryTime: number | null;
}

/**
 * Circuit Breaker Implementation
 *
 * Prevents cascading failures by failing fast when an external service
 * is experiencing issues.
 */
export class CircuitBreaker<T = any> {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private requestCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private openedAt: number | null = null;
  private nextRetryTime: number | null = null;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function through the circuit breaker
   *
   * @param fn - The function to execute
   * @returns Promise<CircuitBreakerResult<T>>
   */
  async execute(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();

    // Check if circuit is open and we should fail fast
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextRetryTime!) {
        return {
          success: false,
          error: new Error(`Circuit breaker is OPEN for ${this.name}`),
          state: this.state,
          latency: 0
        };
      }
      // Transition to half-open to test if service has recovered
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    this.requestCount++;

    try {
      // Add timeout wrapper
      const result = await this.withTimeout(fn, this.config.timeoutMs);

      const latency = Date.now() - startTime;
      this.onSuccess();

      return {
        success: true,
        data: result,
        state: this.state,
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.onFailure();

      return {
        success: false,
        error: error as Error,
        state: this.state,
        latency
      };
    }
  }

  /**
   * Wrap a function with timeout
   */
  private async withTimeout<R>(fn: () => Promise<R>, timeoutMs: number): Promise<R> {
    return Promise.race([
      fn(),
      new Promise<R>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Service has recovered, close the circuit
      if (this.successCount >= (this.config.successThreshold || 1)) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.errorThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Service failed again in half-open state, reopen the circuit
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: string): void {
    const oldState = this.state;
    this.state = newState;

    console.log(`[CircuitBreaker:${this.name}] ${oldState} -> ${newState}`);

    if (newState === CircuitState.OPEN) {
      this.openedAt = Date.now();
      this.nextRetryTime = Date.now() + this.config.resetTimeoutMs;
      this.successCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.openedAt = null;
      this.nextRetryTime = null;
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      requestCount: this.requestCount,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
      nextRetryTime: this.nextRetryTime
    };
  }

  /**
   * Reset the circuit breaker (useful for testing)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.openedAt = null;
    this.nextRetryTime = null;
    console.log(`[CircuitBreaker:${this.name}] Reset`);
  }
}

// ============================================================================
// HEALTH CHECKER
// ============================================================================

/**
 * Health check result for a dependency
 */
export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Overall health response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version?: string;
  uptime: number;
  timestamp: string;
  dependencies?: Record<string, DependencyHealth>;
  circuitBreakers?: Record<string, CircuitBreakerStats>;
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}>;

/**
 * Health checker configuration
 */
export interface HealthCheckerConfig {
  serviceName: string;
  version?: string;
  cacheTTL?: number; // Cache TTL in milliseconds
}

/**
 * Dependency registration
 */
interface DependencyRegistration {
  checkFn: HealthCheckFunction;
  critical: boolean; // If true, service is unhealthy when this fails
}

/**
 * Health Checker Class
 *
 * Provides a standardized way to implement health checks across services
 */
export class HealthChecker {
  private dependencies: Map<string, DependencyRegistration> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private cachedHealth: HealthResponse | null = null;
  private cacheExpiry: number = 0;
  private startTime: number;

  constructor(private readonly config: HealthCheckerConfig) {
    this.startTime = Date.now();
  }

  /**
   * Register a dependency for health checking
   *
   * @param name - Unique name for the dependency
   * @param checkFn - Function that performs the health check
   * @param options - Options for the dependency
   */
  registerDependency(
    name: string,
    checkFn: HealthCheckFunction,
    options: { critical?: boolean; circuitBreaker?: boolean } = {}
  ): void {
    this.dependencies.set(name, {
      checkFn,
      critical: options.critical ?? true
    });

    // Optionally create a circuit breaker for this dependency
    if (options.circuitBreaker) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, {
        timeoutMs: 5000,
        errorThreshold: 5,
        resetTimeoutMs: 60000
      }));
    }
  }

  /**
   * Unregister a dependency
   */
  unregisterDependency(name: string): void {
    this.dependencies.delete(name);
    this.circuitBreakers.delete(name);
  }

  /**
   * Get current health status
   *
   * @param forceRefresh - Force a refresh of health status (bypass cache)
   */
  async getHealth(forceRefresh = false): Promise<HealthResponse> {
    const now = Date.now();

    // Return cached result if available and not expired
    if (!forceRefresh && this.cachedHealth && now < this.cacheExpiry) {
      return this.cachedHealth;
    }

    // Perform health checks
    const healthResponse = await this.performHealthChecks();

    // Cache the result
    this.cachedHealth = healthResponse;
    this.cacheExpiry = now + (this.config.cacheTTL || 10000);

    return healthResponse;
  }

  /**
   * Perform health checks on all registered dependencies
   */
  private async performHealthChecks(): Promise<HealthResponse> {
    const dependencies: Record<string, DependencyHealth> = {};
    const circuitBreakers: Record<string, CircuitBreakerStats> = {};

    // Check circuit breakers status
    for (const [name, breaker] of this.circuitBreakers.entries()) {
      circuitBreakers[name] = breaker.getStats();
    }

    // Check each dependency
    for (const [name, registration] of this.dependencies.entries()) {
      const breaker = this.circuitBreakers.get(name);
      let health: DependencyHealth;

      if (breaker && breaker.getStats().state === CircuitState.OPEN) {
        // Circuit is open, skip actual check and mark unhealthy
        health = {
          name,
          status: 'unhealthy',
          error: 'Circuit breaker is open',
          details: { circuitBreaker: true }
        };
      } else {
        // Perform the health check
        try {
          const startTime = Date.now();
          const checkResult = await registration.checkFn();
          const latency = Date.now() - startTime;

          health = {
            name,
            ...checkResult,
            latency
          };

          // Update circuit breaker on success
          if (breaker) {
            await breaker.execute(async () => checkResult);
          }
        } catch (error) {
          const latency = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          health = {
            name,
            status: 'unhealthy',
            latency,
            error: this.sanitizeError(errorMessage)
          };

          // Update circuit breaker on failure
          if (breaker) {
            await breaker.execute(async () => { throw error; });
          }
        }
      }

      dependencies[name] = health;
    }

    // Calculate overall health status
    const status = this.calculateOverallStatus(dependencies);

    return {
      status,
      service: this.config.serviceName,
      version: this.config.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: Object.keys(dependencies).length > 0 ? dependencies : undefined,
      circuitBreakers: Object.keys(circuitBreakers).length > 0 ? circuitBreakers : undefined
    };
  }

  /**
   * Calculate overall health status from dependencies
   */
  private calculateOverallStatus(
    dependencies: Record<string, DependencyHealth>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const deps = Object.values(dependencies);

    if (deps.length === 0) {
      return 'healthy'; // No dependencies, assume healthy
    }

    // Check if any critical dependency is unhealthy
    for (const dep of deps) {
      const registration = this.dependencies.get(dep.name);
      if (registration?.critical && dep.status === 'unhealthy') {
        return 'unhealthy';
      }
    }

    // Check if any dependency is degraded
    const hasDegraded = deps.some(dep => dep.status === 'degraded');
    if (hasDegraded) {
      return 'degraded';
    }

    // All dependencies are healthy
    return 'healthy';
  }

  /**
   * Sanitize error messages to prevent information leakage
   */
  private sanitizeError(message: string): string {
    // List of sensitive patterns to redact
    const sensitivePatterns = [
      /token/i,
      /password/i,
      /secret/i,
      /api[_-]?key/i,
      /authorization/i,
      /connection string/i,
      /:\/\//, // URLs
      /@/, // URLs with credentials
    ];

    const lowerMessage = message.toLowerCase();
    for (const pattern of sensitivePatterns) {
      if (pattern.test(lowerMessage)) {
        return 'Service unavailable'; // Generic message
      }
    }

    return message;
  }

  /**
   * Clear cached health status
   */
  clearCache(): void {
    this.cachedHealth = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get a circuit breaker by name
   */
  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return this.circuitBreakers;
  }
}

/**
 * Create a health checker instance
 */
export function createHealthChecker(config: HealthCheckerConfig): HealthChecker {
  return new HealthChecker(config);
}

// ============================================================================
// PRE-BUILT HEALTH CHECKS
// ============================================================================

/**
 * Create a PostgreSQL health check function
 */
export function createPostgresHealthCheck(pool: any): HealthCheckFunction {
  return async () => {
    try {
      const result = await pool.query('SELECT NOW() as now');
      return {
        status: 'healthy',
        details: {
          databaseTime: result.rows[0].now
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  };
}

/**
 * Create an HTTP endpoint health check function
 */
export function createHttpHealthCheck(
  url: string,
  options: { timeout?: number; expectedStatus?: number } = {}
): HealthCheckFunction {
  return async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'User-Agent': 'HealthCheck/1.0' }
      });
      clearTimeout(timeoutId);

      const expectedStatus = options.expectedStatus || 200;
      if (response.status !== expectedStatus) {
        return {
          status: 'unhealthy',
          error: `Unexpected status: ${response.status}`
        };
      }

      return {
        status: 'healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'HTTP check failed'
      };
    }
  };
}

/**
 * Create a Redis health check function
 */
export function createRedisHealthCheck(redisClient: any): HealthCheckFunction {
  return async () => {
    try {
      await redisClient.ping();
      return {
        status: 'healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  };
}

/**
 * Create a Telegram Bot API health check function
 */
export function createTelegramHealthCheck(botToken: string): HealthCheckFunction {
  return async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'unhealthy',
          error: `Telegram API returned ${response.status}`
        };
      }

      const data = await response.json();
      if (!data.ok) {
        return {
          status: 'unhealthy',
          error: 'Invalid bot token'
        };
      }

      return {
        status: 'healthy',
        details: {
          botUsername: data.result.username
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Telegram API check failed'
      };
    }
  };
}

/**
 * Create a Telegram Storage API health check function
 */
export function createTelegramStorageHealthCheck(apiUrl: string, apiKey: string): HealthCheckFunction {
  return async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/api/health`, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'HealthCheck/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'unhealthy',
          error: `Storage API returned ${response.status}`
        };
      }

      return {
        status: 'healthy'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Telegram Storage API check failed'
      };
    }
  };
}

/**
 * Create a Cloudinary health check function
 */
export function createCloudinaryHealthCheck(cloudName: string): HealthCheckFunction {
  return async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Use Cloudinary's resource API to check connectivity
      const response = await fetch(
        `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,h_1,w_1.png`,
        { signal: controller.signal, method: 'HEAD' }
      );
      clearTimeout(timeoutId);

      // 404 is expected for a non-existent image, but means the API is reachable
      // Other errors mean connectivity issues
      if (response.status === 404 || response.ok) {
        return {
          status: 'healthy'
        };
      }

      return {
        status: 'unhealthy',
        error: `Cloudinary returned ${response.status}`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Cloudinary check failed'
      };
    }
  };
}

// Export all types and utilities
export {
  CircuitState,
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitBreakerResult,
  CircuitBreakerStats,
  HealthChecker,
  HealthCheckerConfig,
  HealthResponse,
  DependencyHealth,
  HealthCheckFunction,
  createHealthChecker,
  createPostgresHealthCheck,
  createHttpHealthCheck,
  createRedisHealthCheck,
  createTelegramHealthCheck,
  createTelegramStorageHealthCheck,
  createCloudinaryHealthCheck
};
