/**
 * Audit Log Errors
 *
 * Custom error classes for audit log operations.
 *
 * US-001: Create Audit Logs Table - Step 7: Integration
 */

/**
 * Base audit log error
 */
export class AuditLogError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown>;
  public override cause?: unknown;

  constructor(message: string, options?: { code?: string; details?: Record<string, unknown>; cause?: unknown }) {
    super(message);
    this.name = 'AuditLogError';
    this.code = options?.code || 'AUDIT_LOG_ERROR';
    this.details = options?.details || {};
    this.cause = options?.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuditLogError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Validation error for invalid input
 */
export class AuditLogValidationError extends AuditLogError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: 'VALIDATION_ERROR', details });
    this.name = 'AuditLogValidationError';
  }
}

/**
 * Database connection error
 */
export class AuditLogConnectionError extends AuditLogError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'CONNECTION_ERROR', details: {}, cause });
    this.name = 'AuditLogConnectionError';
  }
}

/**
 * Query execution error
 */
export class AuditLogQueryError extends AuditLogError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'QUERY_ERROR', details: {}, cause });
    this.name = 'AuditLogQueryError';
  }
}

/**
 * Not found error when audit log entry doesn't exist
 */
export class AuditLogNotFoundError extends AuditLogError {
  constructor(message: string) {
    super(message, { code: 'NOT_FOUND' });
    this.name = 'AuditLogNotFoundError';
  }
}

/**
 * Provisioning Errors
 *
 * Custom error classes for project provisioning operations.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

/**
 * Base provisioning error
 */
export class ProvisioningError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details: Record<string, unknown>;
  public override cause?: unknown;

  constructor(
    message: string,
    options?: { code?: string; retryable?: boolean; details?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message);
    this.name = 'ProvisioningError';
    this.code = options?.code || 'PROVISIONING_ERROR';
    this.retryable = options?.retryable ?? true;
    this.details = options?.details || {};
    this.cause = options?.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProvisioningError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

/**
 * Project not found error
 */
export class ProjectNotFoundError extends ProvisioningError {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, { code: 'PROJECT_NOT_FOUND', retryable: false });
    this.name = 'ProjectNotFoundError';
  }
}

/**
 * Database creation error
 */
export class DatabaseCreationError extends ProvisioningError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'DATABASE_CREATION_FAILED', retryable: true, cause });
    this.name = 'DatabaseCreationError';
  }
}

/**
 * Schema creation error
 */
export class SchemaCreationError extends ProvisioningError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'SCHEMA_CREATION_FAILED', retryable: true, cause });
    this.name = 'SchemaCreationError';
  }
}

/**
 * Service registration error
 */
export class ServiceRegistrationError extends ProvisioningError {
  constructor(serviceType: string, message: string, cause?: unknown) {
    super(message, { code: 'SERVICE_REGISTRATION_FAILED', retryable: true, details: { serviceType }, cause });
    this.name = 'ServiceRegistrationError';
  }
}

/**
 * API key generation error
 */
export class ApiKeyGenerationError extends ProvisioningError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'API_KEY_GENERATION_FAILED', retryable: true, cause });
    this.name = 'ApiKeyGenerationError';
  }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends ProvisioningError {
  constructor(resourceType: string, limit: number) {
    super(
      `Quota exceeded for ${resourceType} (limit: ${limit})`,
      { code: 'QUOTA_EXCEEDED', retryable: false, details: { resourceType, limit } }
    );
    this.name = 'QuotaExceededError';
  }
}

/**
 * Region not available error
 */
export class RegionUnavailableError extends ProvisioningError {
  constructor(region: string) {
    super(`Region not available: ${region}`, { code: 'REGION_UNAVAILABLE', retryable: false });
    this.name = 'RegionUnavailableError';
  }
}

/**
 * Network error during provisioning
 */
export class ProvisioningNetworkError extends ProvisioningError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'NETWORK_ERROR', retryable: true, cause });
    this.name = 'ProvisioningNetworkError';
  }
}

/**
 * Timeout during provisioning
 */
export class ProvisioningTimeoutError extends ProvisioningError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Timeout during ${operation} (${timeoutMs}ms)`,
      { code: 'TIMEOUT', retryable: true, details: { operation, timeoutMs } }
    );
    this.name = 'ProvisioningTimeoutError';
  }
}

