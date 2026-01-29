/**
 * Provision Project Data Layer
 *
 * Centralized data layer for project provisioning operations.
 * Exports all database, service, API key, validation, and retry functions.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

// Database operations
export {
  createTenantDatabase,
  connectToTenantDatabase,
  createTenantSchema,
  dropTenantDatabase,
  tenantDatabaseExists,
} from './database.js';

// Service registration
export {
  registerAuthService,
  registerRealtimeService,
  registerStorageService,
  disableService,
  getProjectServices,
} from './services.js';

// API key management
export {
  generateApiKeys,
  validateApiKeyFormat,
  revokeApiKey,
  getProjectApiKeys,
  type GeneratedApiKey,
} from './api-keys.js';

// Validation
export {
  verifyProjectExists,
  validateProvisioningParams,
  checkQuotaLimit,
  updateProjectProvisioningStatus,
  isRegionAvailable,
} from './validation.js';

// Retry logic
export {
  withRetry,
  withRetryParallel,
  withRetrySequential,
  calculateRetryDelay,
  shouldRetry,
  type RetryConfig,
  type RetryResult,
} from './retry.js';
