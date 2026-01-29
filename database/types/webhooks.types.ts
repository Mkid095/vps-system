/**
 * Webhook Types
 *
 * Type definitions for webhook configurations and delivery tracking.
 * These types ensure type-safe webhook management throughout the application.
 *
 * US-006: Implement Deliver Webhook Job - Step 7: Data Layer
 */

/**
 * Webhook HTTP methods
 */
export type WebhookHttpMethod = 'POST' | 'PUT' | 'PATCH';

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
 * Webhook configuration
 * Represents a row in the webhooks table
 */
export interface Webhook {
  /** Unique identifier for the webhook configuration */
  id: string;

  /** Project ID that owns this webhook */
  project_id: string;

  /** Event type that triggers this webhook */
  event_type: string;

  /** Target URL to send webhook notifications to */
  url: string;

  /** HTTP method to use for delivery */
  http_method: WebhookHttpMethod;

  /** Additional HTTP headers to include in webhook requests */
  headers: Record<string, string>;

  /** Whether this webhook is disabled */
  disabled: boolean;

  /** Timestamp when webhook was disabled */
  disabled_at: Date | null;

  /** Reason why webhook was disabled */
  disabled_reason: string | null;

  /** Number of consecutive delivery failures */
  consecutive_failures: number;

  /** Timestamp of last successful delivery */
  last_delivery_at: Date | null;

  /** Timestamp of last failed delivery attempt */
  last_failure_at: Date | null;

  /** Timestamp when webhook was created */
  created_at: Date;

  /** Timestamp when webhook was last updated */
  updated_at: Date;
}

/**
 * Input interface for creating a new webhook
 */
export interface CreateWebhookInput {
  /** Project ID that owns this webhook */
  project_id: string;

  /** Event type that triggers this webhook */
  event_type: string;

  /** Target URL to send webhook notifications to */
  url: string;

  /** HTTP method to use for delivery (default: POST) */
  http_method?: WebhookHttpMethod;

  /** Additional HTTP headers to include in webhook requests */
  headers?: Record<string, string>;
}

/**
 * Input interface for updating a webhook
 */
export interface UpdateWebhookInput {
  /** Target URL to send webhook notifications to */
  url?: string;

  /** HTTP method to use for delivery */
  http_method?: WebhookHttpMethod;

  /** Additional HTTP headers to include in webhook requests */
  headers?: Record<string, string>;

  /** Whether this webhook is disabled */
  disabled?: boolean;

  /** Reason why webhook is being disabled */
  disabled_reason?: string;
}

/**
 * Webhook delivery record
 * Represents a row in the webhook_deliveries table
 */
export interface WebhookDelivery {
  /** Unique identifier for the delivery attempt */
  id: string;

  /** Reference to the webhook configuration */
  webhook_id: string;

  /** Unique identifier for the event that triggered this delivery */
  event_id: string | null;

  /** Project ID associated with this delivery */
  project_id: string | null;

  /** Event type that triggered this webhook */
  event_type: string;

  /** Delivery status */
  status: WebhookDeliveryStatus;

  /** HTTP status code received from webhook endpoint */
  http_status_code: number | null;

  /** Response body received from webhook endpoint */
  response_body: string | null;

  /** Error message if delivery failed */
  error_message: string | null;

  /** Number of delivery attempts made */
  attempts: number;

  /** Timestamp of next retry attempt (if scheduled) */
  next_retry_at: Date | null;

  /** Delivery duration in milliseconds */
  duration_ms: number | null;

  /** Timestamp of successful delivery */
  delivered_at: Date | null;

  /** Timestamp when delivery record was created */
  created_at: Date;
}

/**
 * Input interface for creating a webhook delivery record
 */
export interface CreateWebhookDeliveryInput {
  /** Reference to the webhook configuration */
  webhook_id: string;

  /** Unique identifier for the event that triggered this delivery */
  event_id?: string;

  /** Project ID associated with this delivery */
  project_id?: string;

  /** Event type that triggered this webhook */
  event_type: string;

  /** Delivery status */
  status: WebhookDeliveryStatus;

  /** HTTP status code received from webhook endpoint */
  http_status_code?: number;

  /** Response body received from webhook endpoint */
  response_body?: string;

  /** Error message if delivery failed */
  error_message?: string;

  /** Number of delivery attempts made */
  attempts: number;

  /** Timestamp of next retry attempt (if scheduled) */
  next_retry_at?: Date;

  /** Delivery duration in milliseconds */
  duration_ms?: number;

  /** Timestamp of successful delivery */
  delivered_at?: Date;
}

/**
 * Query parameters for filtering webhooks
 */
export interface WebhookQuery {
  /** Filter by project ID */
  project_id?: string;

  /** Filter by event type */
  event_type?: string;

  /** Filter by disabled status */
  disabled?: boolean;

  /** Include disabled webhooks (default: false) */
  include_disabled?: boolean;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Query parameters for filtering webhook deliveries
 */
export interface WebhookDeliveryQuery {
  /** Filter by webhook ID */
  webhook_id?: string;

  /** Filter by event ID */
  event_id?: string;

  /** Filter by project ID */
  project_id?: string;

  /** Filter by delivery status */
  status?: WebhookDeliveryStatus;

  /** Filter by created after date */
  created_after?: Date;

  /** Filter by created before date */
  created_before?: Date;

  /** Limit number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
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
