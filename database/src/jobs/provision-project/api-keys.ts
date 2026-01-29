/**
 * Provision Project - API Key Generation
 *
 * Handles API key generation and management for projects.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

import { query } from '../../pool.js';
import { randomBytes } from 'crypto';
import type { ProvisionProjectPayload } from '../types.js';

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
 * @throws Error if key generation fails
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

      // Generate secure random key value
      const keyValue = generateSecureApiKey(keyPrefix, 32);

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
          hashApiKey(keyValue), // Store hashed value
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
    throw new Error(`Failed to generate API keys: ${errorMessage}`);
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
  const randomValue = randomBytes(bytes).toString('hex');

  // Format: prefix_timestamp_randomvalue
  const timestamp = Date.now().toString(16);
  const key = `${prefix}_${timestamp}_${randomValue}`;

  return key;
}

/**
 * Hash an API key for secure storage
 *
 * @param keyValue - The API key to hash
 * @returns Hashed API key
 */
function hashApiKey(keyValue: string): string {
  // In production, use a proper hashing algorithm like bcrypt or argon2
  // For now, we'll use a simple SHA-256 hash
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(keyValue).digest('hex');
}

/**
 * Validate an API key format
 *
 * @param keyValue - The API key to validate
 * @returns True if valid format, false otherwise
 */
export function validateApiKeyFormat(keyValue: string): boolean {
  // API keys should be in format: prefix_timestamp_randomhex
  const parts = keyValue.split('_');

  if (parts.length !== 3) {
    return false;
  }

  const prefix = parts[0];
  const timestamp = parts[1];
  const randomValue = parts[2];

  // Validate prefix (alphanumeric, 2-10 chars)
  if (!prefix || !/^[a-z0-9]{2,10}$/i.test(prefix)) {
    return false;
  }

  // Validate timestamp (hex number)
  if (!timestamp || !/^[0-9a-f]+$/.test(timestamp)) {
    return false;
  }

  // Validate random value (hex, at least 32 chars)
  if (!randomValue || !/^[0-9a-f]{32,}$/i.test(randomValue)) {
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
