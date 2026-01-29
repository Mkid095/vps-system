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
        webhook_url: params.webhook_url,
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
          error
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

    console.error(`[DeliverWebhook] Failed to deliver webhook:`, error);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Validate and parse job payload
 */
function validatePayload(payload: JobPayload): DeliverWebhookPayload {
  if (!payload.webhook_id || typeof payload.webhook_id !== 'string') {
    throw new Error('Invalid or missing webhook_id in payload');
  }

  if (!payload.webhook_url || typeof payload.webhook_url !== 'string') {
    throw new Error('Invalid or missing webhook_url in payload');
  }

  // Validate URL format
  try {
    new URL(payload.webhook_url);
  } catch {
    throw new Error(`Invalid webhook URL format: ${payload.webhook_url}`);
  }

  if (!payload.payload || typeof payload.payload !== 'object') {
    throw new Error('Invalid or missing payload in webhook data');
  }

  return payload as unknown as DeliverWebhookPayload;
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
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${responseBody}`
      );
    }

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
