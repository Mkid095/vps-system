/**
 * Deliver Webhook Job Types
 *
 * Type definitions specific to the deliver_webhook job handler.
 * These types define the payload structure, delivery status, and interfaces for webhook delivery.
 *
 * US-006: Implement Deliver Webhook Job - Step 1: Foundation
 */

/**
 * Deliver webhook job payload
 * Contains all necessary parameters for delivering a webhook notification
 */
export interface DeliverWebhookPayload {
  /** Unique identifier for the webhook configuration */
  webhook_id: string;

  /** Target URL to send the webhook to */
  webhook_url: string;

  /** HTTP method to use for delivery (typically POST) */
  method?: 'POST' | 'PUT' | 'PATCH';

  /** Request headers to include in the webhook delivery */
  headers?: Record<string, string>;

  /** Request body/payload to send to the webhook URL */
  payload: Record<string, unknown>;

  /** Project ID associated with this webhook (for tracking) */
  project_id?: string;

  /** Webhook event type (e.g., 'user.created', 'deployment.completed') */
  event_type?: string;

  /** Unique identifier for the event that triggered this webhook */
  event_id?: string;

  /** Maximum number of delivery attempts */
  max_attempts?: number;

  /** Timeout for webhook delivery in milliseconds (default: 30000) */
  timeout?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Webhook delivery status
 * Tracks the current state of a webhook delivery attempt
 */
export enum WebhookDeliveryStatus {
  /** Webhook is pending delivery */
  PENDING = 'pending',

  /** Webhook delivery is in progress */
  DELIVERING = 'delivering',

  /** Webhook was delivered successfully */
  DELIVERED = 'delivered',

  /** Webhook delivery failed (will be retried) */
  FAILED = 'failed',

  /** Webhook delivery failed permanently (max attempts reached) */
  PERMANENTLY_FAILED = 'permanently_failed',

  /** Webhook has been disabled due to consecutive failures */
  DISABLED = 'disabled',
}

/**
 * Webhook delivery result
 * Contains details about the webhook delivery attempt
 */
export interface WebhookDeliveryResult {
  /** Unique identifier for the webhook */
  webhook_id: string;

  /** Delivery status */
  status: WebhookDeliveryStatus;

  /** HTTP status code received from webhook URL (if any) */
  http_status_code?: number;

  /** Response body received from webhook URL (if any) */
  response_body?: string;

  /** Error message if delivery failed */
  error?: string;

  /** Number of delivery attempts made */
  attempts: number;

  /** Timestamp of successful delivery (if applicable) */
  delivered_at?: Date;

  /** Next retry timestamp (if retry is scheduled) */
  next_retry_at?: Date;

  /** Delivery metadata */
  metadata: {
    /** Event type that triggered this webhook */
    event_type?: string;

    /** Event ID */
    event_id?: string;

    /** Project ID */
    project_id?: string;

    /** Webhook URL */
    webhook_url: string;

    /** Delivery duration in milliseconds */
    duration_ms: number;

    /** Additional metadata */
    [key: string]: unknown;
  };
}

/**
 * Webhook delivery error types
 * Categorizes different types of webhook delivery failures
 */
export enum WebhookDeliveryErrorType {
  /** Invalid webhook URL format */
  INVALID_URL = 'INVALID_URL',

  /** Webhook URL is not reachable */
  URL_NOT_REACHABLE = 'URL_NOT_REACHABLE',

  /** Connection timeout */
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',

  /** DNS resolution failed */
  DNS_FAILED = 'DNS_FAILED',

  /** SSL/TLS certificate error */
  CERTIFICATE_ERROR = 'CERTIFICATE_ERROR',

  /** HTTP error (4xx, 5xx) */
  HTTP_ERROR = 'HTTP_ERROR',

  /** Request timeout */
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  /** Rate limited by webhook endpoint */
  RATE_LIMITED = 'RATE_LIMITED',

  /** Webhook returned invalid response */
  INVALID_RESPONSE = 'INVALID_RESPONSE',

  /** Webhook has been disabled */
  WEBHOOK_DISABLED = 'WEBHOOK_DISABLED',

  /** Maximum retry attempts exceeded */
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',

  /** Unknown or unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Webhook retry configuration
 * Defines retry behavior for failed webhook deliveries
 */
export interface WebhookRetryConfig {
  /** Maximum number of retry attempts (default: 5) */
  max_attempts: number;

  /** Initial retry delay in milliseconds (default: 1000) */
  initial_delay: number;

  /** Exponential backoff multiplier (default: 2) */
  backoff_multiplier: number;

  /** Maximum retry delay in milliseconds (default: 300000 = 5 minutes) */
  max_delay: number;

  /** Enable jitter to prevent thundering herd (default: true) */
  enable_jitter: boolean;
}

/**
 * Webhook delivery attempt
 * Tracks a single delivery attempt
 */
export interface WebhookDeliveryAttempt {
  /** Attempt number */
  attempt_number: number;

  /** Timestamp of the attempt */
  attempted_at: Date;

  /** HTTP status code received */
  http_status_code?: number;

  /** Error message if failed */
  error?: string;

  /** Duration of the attempt in milliseconds */
  duration_ms: number;

  /** Success flag */
  success: boolean;
}

/**
 * Webhook statistics
 * Aggregated statistics for webhook delivery performance
 */
export interface WebhookStatistics {
  /** Total number of webhooks delivered */
  total_delivered: number;

  /** Total number of webhooks failed */
  total_failed: number;

  /** Total number of webhooks permanently failed */
  total_permanently_failed: number;

  /** Average delivery time in milliseconds */
  average_delivery_time_ms: number;

  /** Success rate (0-1) */
  success_rate: number;

  /** Last delivery timestamp */
  last_delivery_at?: Date;

  /** Last failure timestamp */
  last_failure_at?: Date;
}
