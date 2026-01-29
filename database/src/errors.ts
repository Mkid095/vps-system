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
