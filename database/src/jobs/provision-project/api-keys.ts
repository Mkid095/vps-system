/**
 * Provision Project - API Key Generation
 *
 * Handles API key generation and management for projects.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 * US-004: Implement Provision Project Job - Step 10: Security Fixes
 */

import { query } from '../../pool.js';
import { randomBytes, scrypt } from 'crypto';
import type { ProvisionProjectPayload } from '../types.js';
import { ApiKeyGenerationError } from '../../errors.js';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// API key hash salt - should be unique per deployment
// In production, generate a random salt at deployment time
const API_KEY_SALT = process.env.API_KEY_SALT || 'change-me-in-production-32-bytes-long-salt';

/**
 * Generated API key result
 */
export interface GeneratedApiKey {
  key_id: string;
  key_prefix: string;
  key_value: string;
  created_at: Date;
  last_used: null;
  expires_at: null;
}

/**
 * Generate API keys for a project
 *
 * @param params - Provisioning parameters
 * @returns Array of generated API keys
 * @throws ApiKeyGenerationError if key generation fails
 */
export async function generateApiKeys(
  params: ProvisionProjectPayload
): Promise<GeneratedApiKey[]> {
  const keyCount = params.api_keys?.count || 1;
  const keyPrefix = params.api_keys?.prefix || 'nm';
  const apiKeys: GeneratedApiKey[] = [];

  try {
    console.log(`[ProvisionProject] Generating ${keyCount} API keys for project: ${params.project_id}`);

    for (let i = 0; i < keyCount; i++) {
      // Generate unique key ID
      const keyId = `${keyPrefix}_${params.project_id}_${i + 1}`;

      // Generate secure random key value (64 bytes for better security)
      const keyValue = generateSecureApiKey(keyPrefix, 64);

      // Hash the key for secure storage
      const hashedKey = await hashApiKey(keyValue);

      // Insert into database
      await query(
        `
        INSERT INTO control_plane.api_keys (
          id,
          project_id,
          key_value,
          key_prefix,
          name,
          scopes,
          is_active,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `,
        [
          keyId,
          params.project_id,
          hashedKey, // Store hashed value
          keyPrefix,
          `${keyPrefix}_${params.project_id}_${i + 1}`,
          ['read', 'write'], // Default scopes
          true,
          params.owner_id || 'system',
        ]
      );

      // Return the key value (only time it's visible)
      apiKeys.push({
        key_id: keyId,
        key_prefix: keyPrefix,
        key_value: keyValue, // Return unhashed value to user
        created_at: new Date(),
        last_used: null,
        expires_at: null,
      });
    }

    console.log(`[ProvisionProject] Successfully generated ${apiKeys.length} API keys`);

    return apiKeys;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to generate API keys:`, errorMessage);
    throw new ApiKeyGenerationError(`Failed to generate API keys`);
  }
}

/**
 * Generate a secure random API key
 *
 * @param prefix - Key prefix (e.g., 'nm' for NextMavens)
 * @param bytes - Number of random bytes to generate
 * @returns Secure random API key
 */
function generateSecureApiKey(prefix: string, bytes: number): string {
  // Generate random bytes and convert to hex
  // Increased to 64 bytes (512 bits) for stronger security
  const randomValue = randomBytes(bytes).toString('hex');

  // Format: prefix_randomvalue only - removed timestamp for better entropy
  const key = `${prefix}_${randomValue}`;

  return key;
}

/**
 * Hash an API key for secure storage using scrypt
 *
 * @param keyValue - The API key to hash
 * @returns Hashed API key with salt
 */
async function hashApiKey(keyValue: string): Promise<string> {
  try {
    // Use scrypt (memory-hard KDF) instead of SHA-256
    // This is resistant to brute-force attacks
    const derivedKey = (await scryptAsync(
      keyValue,
      API_KEY_SALT,
      64 // 64 bytes output
    )) as Buffer;

    return derivedKey.toString('hex');
  } catch (error) {
    throw new ApiKeyGenerationError('Failed to hash API key');
  }
}

/**
 * Validate an API key format
 *
 * @param keyValue - The API key to validate
 * @returns True if valid format, false otherwise
 */
export function validateApiKeyFormat(keyValue: string): boolean {
  // API keys should be in format: prefix_randomhex (timestamp removed for security)
  const parts = keyValue.split('_');

  if (parts.length !== 2) {
    return false;
  }

  const prefix = parts[0];
  const randomValue = parts[1];

  // Validate prefix (alphanumeric, 2-10 chars)
  if (!prefix || !/^[a-z0-9]{2,10}$/i.test(prefix)) {
    return false;
  }

  // Validate random value (hex, at least 64 chars for 32 bytes)
  if (!randomValue || !/^[0-9a-f]{64,}$/i.test(randomValue)) {
    return false;
  }

  return true;
}

/**
 * Revoke an API key
 *
 * @param keyId - ID of the key to revoke
 * @throws Error if revocation fails
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  try {
    await query(
      `
      UPDATE control_plane.api_keys
      SET
        is_active = false,
        revoked_at = NOW()
      WHERE id = $1
      `,
      [keyId]
    );

    console.log(`[ProvisionProject] Revoked API key: ${keyId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to revoke API key:`, errorMessage);
    throw new Error(`Failed to revoke API key: ${errorMessage}`);
  }
}

/**
 * Get active API keys for a project
 *
 * @param projectId - Project identifier
 * @returns Array of active API keys (without key values)
 */
export async function getProjectApiKeys(projectId: string): Promise<
  Array<{
    id: string;
    key_prefix: string;
    name: string;
    scopes: string[];
    is_active: boolean;
    last_used: Date | null;
    created_at: Date;
  }>
> {
  try {
    const result = await query(
      `
      SELECT
        id,
        key_prefix,
        name,
        scopes,
        is_active,
        last_used,
        created_at
      FROM control_plane.api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC
      `,
      [projectId]
    );

    return result.rows as Array<{
      id: string;
      key_prefix: string;
      name: string;
      scopes: string[];
      is_active: boolean;
      last_used: Date | null;
      created_at: Date;
    }>;
  } catch (error) {
    console.error(`[ProvisionProject] Failed to get project API keys:`, error);
    return [];
  }
}
