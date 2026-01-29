/**
 * Provision Project - Retry Logic
 *
 * Retry wrapper with exponential backoff for provisioning operations.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration for provisioning operations
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 5000, // 5 seconds
  maxDelayMs: 60000, // 1 minute
  backoffMultiplier: 2,
};

/**
 * Retry options for specific operations
 */
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  database: {
    maxAttempts: 3,
    initialDelayMs: 10000, // 10 seconds
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  },
  schema: {
    maxAttempts: 3,
    initialDelayMs: 5000, // 5 seconds
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  service: {
    maxAttempts: 2,
    initialDelayMs: 3000, // 3 seconds
    maxDelayMs: 15000,
    backoffMultiplier: 2,
  },
  api_keys: {
    maxAttempts: 2,
    initialDelayMs: 2000, // 2 seconds
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
};

/**
 * Result type for retry attempts
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

/**
 * Execute an operation with retry logic
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param operationName - Name of the operation for logging
 * @returns Result with data or error
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let lastError: Error | undefined;
  let currentDelay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`[Retry] Executing ${operationName} (attempt ${attempt}/${config.maxAttempts})`);

      const result = await operation();
      const totalTimeMs = Date.now() - startTime;

      console.log(`[Retry] ${operationName} succeeded on attempt ${attempt}`);

      return {
        success: true,
        data: result,
        attempts: attempt,
        totalTimeMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(
        `[Retry] ${operationName} failed on attempt ${attempt}: ${lastError.message}`
      );

      // Check if error is retryable
      const isRetryable = isRetryableError(lastError);

      if (!isRetryable) {
        console.log(`[Retry] ${operationName} error is not retryable, aborting`);
        break;
      }

      // If this is the last attempt, don't wait
      if (attempt < config.maxAttempts) {
        const delay = Math.min(currentDelay, config.maxDelayMs);
        console.log(`[Retry] Waiting ${delay}ms before retry...`);
        await sleep(delay);
        currentDelay = Math.floor(currentDelay * config.backoffMultiplier);
      }
    }
  }

  const totalTimeMs = Date.now() - startTime;

  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalTimeMs,
  };
}

/**
 * Check if an error is retryable
 *
 * @param error - The error to check
 * @returns True if error is retryable, false otherwise
 */
function isRetryableError(error: Error): boolean {
  // Check for custom provisioning errors
  const provisioningError = error as { retryable?: boolean };
  if (typeof provisioningError.retryable === 'boolean') {
    return provisioningError.retryable;
  }

  // Check error message for known retryable patterns
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return true;
  }

  // Database errors
  if (message.includes('database') || message.includes('schema')) {
    return true;
  }

  // Temporary errors
  if (message.includes('temporary') || message.includes('unavailable') || message.includes('busy')) {
    return true;
  }

  // Default to not retryable for unknown errors
  return false;
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute multiple operations in parallel with individual retry logic
 *
 * @param operations - Array of operations to execute
 * @param operationNames - Array of operation names for logging
 * @returns Array of results
 */
export async function withRetryParallel<T>(
  operations: Array<() => Promise<T>>,
  operationNames: string[],
  configs?: RetryConfig[]
): Promise<RetryResult<T>[]> {
  const promises = operations.map((operation, index) => {
    const config = configs?.[index] || DEFAULT_RETRY_CONFIG;
    const name = operationNames[index] || `operation_${index}`;
    return withRetry(operation, config, name);
  });

  return Promise.all(promises);
}

/**
 * Execute operations sequentially, stopping on first failure
 *
 * @param operations - Array of operations to execute
 * @param operationNames - Array of operation names for logging
 * @param config - Retry configuration
 * @returns Object with success status and results
 */
export async function withRetrySequential<T>(
  operations: Array<() => Promise<T>>,
  operationNames: string[],
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{
  success: boolean;
  results: Array<RetryResult<T>>;
  failedAt?: string;
}> {
  const results: Array<RetryResult<T>> = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const operationName = operationNames[i];

    if (!operation) {
      throw new Error(`Operation at index ${i} is undefined`);
    }

    const result = await withRetry(operation, config, operationName || `operation_${i}`);
    results.push(result);

    if (!result.success) {
      return {
        success: false,
        results,
        failedAt: operationName || `operation_${i}`,
      };
    }
  }

  return {
    success: true,
    results,
  };
}

/**
 * Calculate delay for next retry with exponential backoff
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Check if operation should be retried based on attempt count
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns True if should retry, false otherwise
 */
export function shouldRetry(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return attempt < config.maxAttempts;
}
