/**
 * Health Check and Circuit Breaker Type Definitions
 */

// ============================================================================
// CIRCUIT BREAKER TYPES
// ============================================================================

export declare const CircuitState: {
  CLOSED: 'closed';
  OPEN: 'open';
  HALF_OPEN: 'half-open';
};

export type CircuitStateType = typeof CircuitState[keyof typeof CircuitState];

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

export interface CircuitBreakerResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  state: string;
  latency: number;
}

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

export declare class CircuitBreaker<T = any> {
  constructor(name: string, config: CircuitBreakerConfig);
  execute(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>>;
  getStats(): CircuitBreakerStats;
  reset(): void;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface DependencyHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version?: string;
  uptime: number;
  timestamp: string;
  dependencies?: Record<string, DependencyHealth>;
  circuitBreakers?: Record<string, CircuitBreakerStats>;
}

export type HealthCheckFunction = () => Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}>;

export interface HealthCheckerConfig {
  serviceName: string;
  version?: string;
  cacheTTL?: number;
}

export declare class HealthChecker {
  constructor(config: HealthCheckerConfig);
  registerDependency(
    name: string,
    checkFn: HealthCheckFunction,
    options?: { critical?: boolean; circuitBreaker?: boolean }
  ): void;
  unregisterDependency(name: string): void;
  getHealth(forceRefresh?: boolean): Promise<HealthResponse>;
  clearCache(): void;
  getCircuitBreaker(name: string): CircuitBreaker | undefined;
  getAllCircuitBreakers(): Map<string, CircuitBreaker>;
}

export declare function createHealthChecker(config: HealthCheckerConfig): HealthChecker;

// ============================================================================
// PRE-BUILT HEALTH CHECKS
// ============================================================================

export declare function createPostgresHealthCheck(pool: any): HealthCheckFunction;
export declare function createHttpHealthCheck(
  url: string,
  options?: { timeout?: number; expectedStatus?: number }
): HealthCheckFunction;
export declare function createRedisHealthCheck(redisClient: any): HealthCheckFunction;
export declare function createTelegramHealthCheck(botToken: string): HealthCheckFunction;
export declare function createTelegramStorageHealthCheck(apiUrl: string, apiKey: string): HealthCheckFunction;
export declare function createCloudinaryHealthCheck(cloudName: string): HealthCheckFunction;
