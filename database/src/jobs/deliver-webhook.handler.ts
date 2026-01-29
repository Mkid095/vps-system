/**
 * Deliver Webhook Job Handler
 *
 * Background job handler for delivering webhook notifications to external endpoints.
 * Handles HTTP POST requests to webhook URLs with retry logic and failure tracking.
 *
 * US-006: Implement Deliver Webhook Job - Step 1: Foundation
 *
 * Features:
 * - POSTs payload to webhook URL with configurable headers
 * - Implements retry logic with exponential backoff (up to 5 attempts)
 * - Records delivery status to the jobs table
 * - Marks webhooks as disabled after 5 consecutive failures
 * - Tracks delivery statistics and performance metrics
 * - Handles various error conditions gracefully
 */

import { query } from '../pool.js';
import type { JobHandler, JobExecutionResult, JobPayload } from '../../types/jobs.types.js';
import type {
  DeliverWebhookPayload,
  WebhookDeliveryResult,
  WebhookDeliveryStatus,
} from './types.webhook.js';
import {
  WebhookDeliveryErrorType,
  WebhookRetryConfig,
} from './types.webhook.js';

/**
 * Default retry configuration for webhook delivery
 * - Max attempts: 5
 * - Initial delay: 1 second
 * - Backoff multiplier: 2 (exponential)
 * - Max delay: 5 minutes
 * - Jitter enabled: true
 */
const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  max_attempts: 5,
  initial_delay: 1000, // 1 second
  backoff_multiplier: 2,
  max_delay: 300000, // 5 minutes
  enable_jitter: true,
};

/**
 * Maximum consecutive failures before disabling a webhook
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Sensitive header names that should be redacted in logs
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'x-auth-token',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'x-xsrf-token',
] as const;

/**
 * Security configuration constants
 */
const SECURITY_CONFIG = {
  // Maximum webhook payload size in bytes (10MB)
  MAX_PAYLOAD_SIZE: 10 * 1024 * 1024,

  // Maximum timeout for webhook delivery in milliseconds (5 minutes)
  MAX_TIMEOUT: 300000,

  // Minimum timeout for webhook delivery in milliseconds (1 second)
  MIN_TIMEOUT: 1000,

  // Allowed URL protocols
  ALLOWED_PROTOCOLS: ['https:'],

  // Blocked private IP ranges (CIDR notation)
  BLOCKED_IP_RANGES: [
    '127.0.0.0/8',       // Loopback
    '10.0.0.0/8',        // Private network
    '172.16.0.0/12',     // Private network
    '192.168.0.0/16',    // Private network
    '169.254.169.254/32', // Cloud metadata services
    '::1/128',           // IPv6 loopback
    'fc00::/7',          // IPv6 private
    'fe80::/10',         // IPv6 link-local
  ],

  // Blocked hostnames
  BLOCKED_HOSTNAMES: [
    'localhost',
    'metadata.google.internal',
    'instance-data',
  ],

  // Maximum header value size in bytes (8KB)
  MAX_HEADER_SIZE: 8 * 1024,

  // Maximum total headers size in bytes (64KB)
  MAX_HEADERS_TOTAL_SIZE: 64 * 1024,
} as const;

/**
 * Deliver webhook job handler
 *
 * This handler executes the webhook delivery process:
 * 1. Validates the webhook configuration and payload
 * 2. Attempts to deliver the webhook to the target URL
 * 3. Implements retry logic with exponential backoff on failure
 * 4. Records delivery status and statistics
 * 5. Disables webhook after 5 consecutive failures
 * 6. Returns delivery result with status and metadata
 *
 * Retry configuration:
 * - Max attempts: 5 (configurable via payload.max_attempts)
 * - Retry interval: Exponential backoff (1s, 2s, 4s, 8s, 16s...)
 * - Maximum delay: 5 minutes between retries
 * - Jitter: Enabled to prevent thundering herd
 *
 * @param payload - Job payload containing webhook delivery parameters
 * @returns Job execution result with delivery status and details
 */
export const deliverWebhookHandler: JobHandler = async (
  payload: JobPayload
): Promise<JobExecutionResult> => {
  const startTime = Date.now();

  try {
    // Validate and parse payload
    const params = validatePayload(payload);

    // Sanitize URL for logging
    const sanitizedUrl = sanitizeUrl(params.webhook_url);

    console.log(`[DeliverWebhook] Starting delivery for webhook: ${params.webhook_id}`);

    // Check if webhook is disabled
    const isDisabled = await checkWebhookDisabled(params.webhook_id);
    if (isDisabled) {
      return {
        success: false,
        error: 'Webhook is disabled due to consecutive failures',
      };
    }

    // Initialize delivery result
    const result: Partial<WebhookDeliveryResult> & {
      metadata: WebhookDeliveryResult['metadata'];
    } = {
      webhook_id: params.webhook_id,
      status: 'pending' as WebhookDeliveryStatus,
      attempts: 0,
      metadata: {
        event_type: params.event_type,
        event_id: params.event_id,
        project_id: params.project_id,
        webhook_url: sanitizedUrl, // Store sanitized URL
        duration_ms: 0,
      },
    };

    // Get retry configuration
    const retryConfig: WebhookRetryConfig = {
      max_attempts: params.max_attempts ?? DEFAULT_RETRY_CONFIG.max_attempts,
      initial_delay: DEFAULT_RETRY_CONFIG.initial_delay,
      backoff_multiplier: DEFAULT_RETRY_CONFIG.backoff_multiplier,
      max_delay: DEFAULT_RETRY_CONFIG.max_delay,
      enable_jitter: DEFAULT_RETRY_CONFIG.enable_jitter,
    };

    // Attempt delivery with retries
    let lastError: string | undefined;
    let deliverySuccessful = false;

    for (let attempt = 1; attempt <= retryConfig.max_attempts; attempt++) {
      result.attempts = attempt;
      result.status = 'delivering' as WebhookDeliveryStatus;

      console.log(
        `[DeliverWebhook] Attempt ${attempt}/${retryConfig.max_attempts} for webhook: ${params.webhook_id}`
      );

      try {
        // Deliver webhook
        const deliveryResult = await deliverWebhook(params, attempt);

        // Update result with success
        result.status = 'delivered' as WebhookDeliveryStatus;
        result.http_status_code = deliveryResult.statusCode;
        result.response_body = deliveryResult.body;
        result.delivered_at = new Date();
        result.metadata.duration_ms = Date.now() - startTime;

        deliverySuccessful = true;

        // Record successful delivery
        await recordWebhookDelivery(params, result as WebhookDeliveryResult);

        // Reset consecutive failure count
        await resetConsecutiveFailures(params.webhook_id);

        console.log(
          `[DeliverWebhook] Successfully delivered webhook: ${params.webhook_id} ` +
          `(status: ${deliveryResult.statusCode}, duration: ${result.metadata.duration_ms}ms)`
        );

        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';

        console.error(
          `[DeliverWebhook] Attempt ${attempt} failed for webhook: ${params.webhook_id}`,
          lastError
        );

        // Check if we should retry
        if (attempt < retryConfig.max_attempts) {
          const delay = calculateRetryDelay(attempt, retryConfig);
          result.next_retry_at = new Date(Date.now() + delay);

          console.log(
            `[DeliverWebhook] Scheduling retry in ${delay}ms for webhook: ${params.webhook_id}`
          );

          // Wait before retrying
          await sleep(delay);
        } else {
          // Max attempts reached
          result.status = 'permanently_failed' as WebhookDeliveryStatus;
          result.error = lastError;
          result.metadata.duration_ms = Date.now() - startTime;

          // Record permanent failure
          await recordWebhookDelivery(params, result as WebhookDeliveryResult);

          // Increment consecutive failure count
          const consecutiveFailures = await incrementConsecutiveFailures(params.webhook_id);

          // Check if webhook should be disabled
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            await disableWebhook(params.webhook_id);
            result.status = 'disabled' as WebhookDeliveryStatus;
            console.error(
              `[DeliverWebhook] Webhook disabled after ${consecutiveFailures} consecutive failures: ${params.webhook_id}`
            );
          }

          console.error(
            `[DeliverWebhook] Permanently failed webhook: ${params.webhook_id} ` +
            `after ${attempt} attempts`
          );
        }
      }
    }

    return {
      success: deliverySuccessful,
      error: deliverySuccessful ? undefined : lastError,
      data: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    console.error(`[DeliverWebhook] Failed to deliver webhook:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Validate and parse job payload with security checks
 */
function validatePayload(payload: JobPayload): DeliverWebhookPayload {
  if (!payload.webhook_id || typeof payload.webhook_id !== 'string') {
    throw new Error('Invalid or missing webhook_id in payload');
  }

  if (!payload.webhook_url || typeof payload.webhook_url !== 'string') {
    throw new Error('Invalid or missing webhook_url in payload');
  }

  // Validate URL with security checks
  validateWebhookUrl(payload.webhook_url);

  if (!payload.payload || typeof payload.payload !== 'object') {
    throw new Error('Invalid or missing payload in webhook data');
  }

  // Validate payload size
  const payloadSize = JSON.stringify(payload.payload).length;
  if (payloadSize > SECURITY_CONFIG.MAX_PAYLOAD_SIZE) {
    throw new Error(
      `Webhook payload exceeds maximum size of ${SECURITY_CONFIG.MAX_PAYLOAD_SIZE} bytes`
    );
  }

  // Validate timeout if provided
  if (payload.timeout !== undefined) {
    if (typeof payload.timeout !== 'number' ||
        payload.timeout < SECURITY_CONFIG.MIN_TIMEOUT ||
        payload.timeout > SECURITY_CONFIG.MAX_TIMEOUT) {
      throw new Error(
        `Timeout must be between ${SECURITY_CONFIG.MIN_TIMEOUT} and ${SECURITY_CONFIG.MAX_TIMEOUT} milliseconds`
      );
    }
  }

  // Validate headers if provided
  if (payload.headers) {
    validateHeaders(payload.headers as Record<string, string>);
  }

  return payload as unknown as DeliverWebhookPayload;
}

/**
 * Validate webhook URL for security issues
 * - Ensures HTTPS is used
 * - Blocks private IP addresses
 * - Blocks internal hostnames
 * - Prevents SSRF attacks
 */
function validateWebhookUrl(urlString: string): void {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch (error) {
    throw new Error('Invalid webhook URL format');
  }

  // Ensure only HTTPS is allowed
  if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(url.protocol as 'https:')) {
    throw new Error(
      `Webhook URL must use HTTPS protocol. Found: ${url.protocol.replace(':', '')}`
    );
  }

  // Check for blocked hostnames
  const hostname = url.hostname.toLowerCase();
  for (const blockedHostname of SECURITY_CONFIG.BLOCKED_HOSTNAMES) {
    if (hostname === blockedHostname || hostname.endsWith(`.${blockedHostname}`)) {
      throw new Error('Webhook URL hostname is not allowed');
    }
  }

  // Check for private IP ranges to prevent SSRF
  const ipAddress = url.hostname;
  if (isPrivateIp(ipAddress)) {
    throw new Error('Webhook URL cannot point to private IP addresses');
  }
}

/**
 * Check if an IP address is in a private range
 */
function isPrivateIp(ipAddress: string): boolean {
  // Check if it's an IP address (not a hostname)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

  if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
    // It's a hostname, not an IP - safe to resolve
    return false;
  }

  // Check against blocked IP ranges
  for (const blockedRange of SECURITY_CONFIG.BLOCKED_IP_RANGES) {
    if (isIpInRange(ipAddress, blockedRange)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an IP address is in a CIDR range
 */
function isIpInRange(ipAddress: string, cidr: string): boolean {
  const [range, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength || '32', 10);

  // Convert IP to integer
  const ipToInteger = (ip: string): number => {
    const parts = ip.split('.');
    return (
      (parseInt(parts[0] || '0', 10) << 24) +
      (parseInt(parts[1] || '0', 10) << 16) +
      (parseInt(parts[2] || '0', 10) << 8) +
      parseInt(parts[3] || '0', 10)
    );
  };

  const ipInt = ipToInteger(ipAddress);
  const rangeInt = ipToInteger(range || '0.0.0.0');
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix));

  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Validate webhook headers for injection and size limits
 */
function validateHeaders(headers: Record<string, string>): void {
  let totalSize = 0;

  for (const [key, value] of Object.entries(headers)) {
    // Check header name format
    if (!/^[a-zA-Z0-9-]+$/.test(key)) {
      throw new Error(`Invalid header name: ${key}`);
    }

    // Check for header injection attempts
    if (key.toLowerCase().includes('\r') || key.toLowerCase().includes('\n')) {
      throw new Error('Header name contains invalid characters');
    }
    if (value && (value.includes('\r') || value.includes('\n'))) {
      throw new Error('Header value contains invalid characters');
    }

    // Check individual header size
    const headerSize = key.length + (value?.length || 0);
    if (headerSize > SECURITY_CONFIG.MAX_HEADER_SIZE) {
      throw new Error(`Header "${key}" exceeds maximum size`);
    }

    totalSize += headerSize;
  }

  // Check total headers size
  if (totalSize > SECURITY_CONFIG.MAX_HEADERS_TOTAL_SIZE) {
    throw new Error(
      `Total headers size exceeds maximum of ${SECURITY_CONFIG.MAX_HEADERS_TOTAL_SIZE} bytes`
    );
  }
}

/**
 * Deliver webhook to target URL
 */
async function deliverWebhook(
  params: DeliverWebhookPayload,
  attemptNumber: number
): Promise<{ statusCode: number; body: string }> {
  const method = params.method || 'POST';
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'NextMavens-Webhook/1.0',
    'X-Webhook-ID': params.webhook_id,
    'X-Webhook-Attempt': attemptNumber.toString(),
    'X-Event-Type': params.event_type || 'unknown',
    ...params.headers,
  };

  const timeout = params.timeout || 30000; // 30 seconds default

  // Sanitize URL for logging
  const sanitizedUrl = sanitizeUrl(params.webhook_url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(params.webhook_url, {
      method,
      headers,
      body: JSON.stringify(params.payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();

    if (!response.ok) {
      // Sanitize error message to prevent information leakage
      const sanitizedError = sanitizeErrorMessage(
        `HTTP ${response.status}: ${response.statusText}`
      );
      throw new Error(sanitizedError);
    }

    // Log success with sanitized information
    console.log(
      `[DeliverWebhook] Successfully delivered webhook to ${sanitizedUrl} ` +
      `(status: ${response.status}, attempt: ${attemptNumber})`
    );

    return {
      statusCode: response.status,
      body: responseBody,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          `${WebhookDeliveryErrorType.REQUEST_TIMEOUT}: Webhook delivery timed out after ${timeout}ms`
        );
      }

      if (error.message.includes('ECONNREFUSED')) {
        throw new Error(
          `${WebhookDeliveryErrorType.URL_NOT_REACHABLE}: Connection refused`
        );
      }

      if (error.message.includes('ENOTFOUND')) {
        throw new Error(
          `${WebhookDeliveryErrorType.DNS_FAILED}: DNS resolution failed`
        );
      }
    }

    throw new Error(
      `${WebhookDeliveryErrorType.UNKNOWN_ERROR}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateRetryDelay(
  attemptNumber: number,
  config: WebhookRetryConfig
): number {
  // Calculate base delay with exponential backoff
  const baseDelay = Math.min(
    config.initial_delay * Math.pow(config.backoff_multiplier, attemptNumber - 1),
    config.max_delay
  );

  // Add jitter if enabled (±25% random variation)
  if (config.enable_jitter) {
    const jitter = baseDelay * 0.25;
    const randomJitter = Math.random() * jitter * 2 - jitter;
    return Math.max(0, Math.floor(baseDelay + randomJitter));
  }

  return baseDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitize headers for logging by redacting sensitive values
 * Exported for external use in logging and monitoring
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.some((sensitive) => lowerKey === sensitive)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value || '';
    }
  }

  return sanitized;
}

/**
 * Sanitize URL for logging (remove query parameters and fragments)
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '[INVALID URL]';
  }
}

/**
 * Sanitize error message to prevent information leakage
 */
function sanitizeErrorMessage(message: string): string {
  // Remove any URLs that might be in error messages
  return message.replace(/https?:\/\/[^\s]+/g, '[URL REDACTED]');
}

/**
 * Check if webhook is disabled
 */
async function checkWebhookDisabled(webhookId: string): Promise<boolean> {
  try {
    const result = await query(
      `
      SELECT disabled, disabled_at, consecutive_failures
      FROM control_plane.webhooks
      WHERE id = $1
      `,
      [webhookId]
    );

    if (result.rowCount === 0) {
      // Webhook not found - assume not disabled
      return false;
    }

    const webhook = result.rows[0] as Record<string, unknown>;
    return webhook.disabled === true;
  } catch (error) {
    // If we can't check, assume not disabled and proceed
    console.error(`[DeliverWebhook] Error checking webhook disabled status:`, error);
    return false;
  }
}

/**
 * Record webhook delivery to database
 */
async function recordWebhookDelivery(
  params: DeliverWebhookPayload,
  result: WebhookDeliveryResult
): Promise<void> {
  try {
    await query(
      `
      INSERT INTO control_plane.webhook_deliveries (
        webhook_id,
        event_id,
        event_type,
        project_id,
        status,
        http_status_code,
        response_body,
        error_message,
        attempts,
        delivered_at,
        next_retry_at,
        duration_ms,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `,
      [
        params.webhook_id,
        params.event_id,
        params.event_type,
        params.project_id,
        result.status,
        result.http_status_code,
        result.response_body,
        result.error,
        result.attempts,
        result.delivered_at,
        result.next_retry_at,
        result.metadata.duration_ms,
      ]
    );

    console.log(`[DeliverWebhook] Recorded delivery for webhook: ${params.webhook_id}`);
  } catch (error) {
    console.error(`[DeliverWebhook] Error recording webhook delivery:`, error);
    // Don't throw - recording failure shouldn't fail the job
  }
}

/**
 * Increment consecutive failure count for webhook
 */
async function incrementConsecutiveFailures(webhookId: string): Promise<number> {
  try {
    const result = await query(
      `
      UPDATE control_plane.webhooks
      SET consecutive_failures = consecutive_failures + 1,
          last_failure_at = NOW()
      WHERE id = $1
      RETURNING consecutive_failures
      `,
      [webhookId]
    );

    if (result.rowCount === 0) {
      console.warn(`[DeliverWebhook] Webhook not found for failure increment: ${webhookId}`);
      return 0;
    }

    const webhook = result.rows[0] as Record<string, unknown>;
    return webhook.consecutive_failures as number;
  } catch (error) {
    console.error(`[DeliverWebhook] Error incrementing consecutive failures:`, error);
    return 0;
  }
}

/**
 * Reset consecutive failure count for webhook
 */
async function resetConsecutiveFailures(webhookId: string): Promise<void> {
  try {
    await query(
      `
      UPDATE control_plane.webhooks
      SET consecutive_failures = 0,
          last_delivery_at = NOW()
      WHERE id = $1
      `,
      [webhookId]
    );

    console.log(`[DeliverWebhook] Reset consecutive failures for webhook: ${webhookId}`);
  } catch (error) {
    console.error(`[DeliverWebhook] Error resetting consecutive failures:`, error);
  }
}

/**
 * Disable webhook due to consecutive failures
 */
async function disableWebhook(webhookId: string): Promise<void> {
  try {
    await query(
      `
      UPDATE control_plane.webhooks
      SET disabled = true,
          disabled_at = NOW(),
          disabled_reason = 'Disabled after 5 consecutive delivery failures'
      WHERE id = $1
      `,
      [webhookId]
    );

    console.log(`[DeliverWebhook] Disabled webhook: ${webhookId}`);
  } catch (error) {
    console.error(`[DeliverWebhook] Error disabling webhook:`, error);
  }
}
