/**
 * Provision Project Job Types
 *
 * Type definitions specific to the provision_project job handler.
 * These types define the payload structure and interfaces for project provisioning.
 *
 * US-004: Implement Provision Project Job - Step 1: Foundation
 */

/**
 * Provision project job payload
 * Contains all necessary parameters for provisioning a new tenant project
 */
export interface ProvisionProjectPayload {
  /** Unique identifier for the project being provisioned */
  project_id: string;

  /** Target region for infrastructure deployment */
  region: string;

  /** Database configuration options */
  database?: {
    engine?: 'postgresql' | 'mysql';
    version?: string;
    size?: string;
    storage_gb?: number;
  };

  /** Service integration flags */
  services?: {
    /** Enable auth service integration */
    auth?: boolean;
    /** Enable realtime service integration */
    realtime?: boolean;
    /** Enable storage service integration */
    storage?: boolean;
  };

  /** API key generation options */
  api_keys?: {
    /** Number of keys to generate */
    count?: number;
    /** Key prefix for identification */
    prefix?: string;
  };

  /** Optional owner/user ID */
  owner_id?: string;

  /** Organization ID for multi-tenant support */
  organization_id?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provision project result
 * Returns the details of the provisioned infrastructure
 */
export interface ProvisionProjectResult {
  /** Successfully provisioned project ID */
  project_id: string;

  /** Provisioned database connection details (without password for security) */
  database: {
    host: string;
    port: number;
    database_name: string;
    schema_name: string;
  };

  /** Registered service details */
  services: {
    auth?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
    };
    realtime?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
    };
    storage?: {
      enabled: boolean;
      tenant_id: string;
      endpoint: string;
      bucket_name: string;
    };
  };

  /** Generated API keys */
  api_keys: Array<{
    key_id: string;
    key_prefix: string;
    created_at: Date;
  }>;

  /** Provisioning metadata */
  metadata: {
    provisioned_at: Date;
    region: string;
    owner_id?: string;
    organization_id?: string;
  };
}

/**
 * Provision project error types
 */
export enum ProvisionProjectErrorType {
  /** Project not found or doesn't exist */
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',

  /** Database creation failed */
  DATABASE_CREATION_FAILED = 'DATABASE_CREATION_FAILED',

  /** Schema creation failed */
  SCHEMA_CREATION_FAILED = 'SCHEMA_CREATION_FAILED',

  /** Service registration failed */
  SERVICE_REGISTRATION_FAILED = 'SERVICE_REGISTRATION_FAILED',

  /** API key generation failed */
  API_KEY_GENERATION_FAILED = 'API_KEY_GENERATION_FAILED',

  /** Insufficient permissions */
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  /** Quota exceeded */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /** Network or connectivity issue */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Timeout during provisioning */
  TIMEOUT = 'TIMEOUT',

  /** Unknown or unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Provision project progress stages
 * Used for tracking multi-step provisioning progress
 */
export enum ProvisionProjectStage {
  /** Initializing provisioning process */
  INITIALIZING = 'initializing',

  /** Creating tenant database */
  CREATING_DATABASE = 'creating_database',

  /** Creating tenant schema */
  CREATING_SCHEMA = 'creating_schema',

  /** Registering with auth service */
  REGISTERING_AUTH = 'registering_auth',

  /** Registering with realtime service */
  REGISTERING_REALTIME = 'registering_realtime',

  /** Registering with storage service */
  REGISTERING_STORAGE = 'registering_storage',

  /** Generating API keys */
  GENERATING_API_KEYS = 'generating_api_keys',

  /** Finalizing provisioning */
  FINALIZING = 'finalizing',

  /** Provisioning complete */
  COMPLETED = 'completed',

  /** Provisioning failed */
  FAILED = 'failed',
}
