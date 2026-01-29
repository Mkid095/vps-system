/**
 * Provision Project - Service Registration
 *
 * Handles registration of projects with external services
 * (auth, realtime, storage) during provisioning.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

import { query } from '../../pool.js';
import type { ProvisionProjectPayload } from '../types.js';

/**
 * Register project with authentication service
 *
 * @param params - Provisioning parameters
 * @returns Auth service registration details
 * @throws Error if registration fails
 */
export async function registerAuthService(
  params: ProvisionProjectPayload
): Promise<{
  enabled: boolean;
  tenant_id: string;
  endpoint: string;
  project_id: string;
}> {
  const tenantId = `auth_${params.project_id}`;

  try {
    console.log(`[ProvisionProject] Registering with auth service: ${tenantId}`);

    // In a real implementation, this would make an API call to the auth service
    // For now, we'll record the registration in the database

    // Insert service registration record
    await query(
      `
      INSERT INTO control_plane.project_services (
        project_id,
        service_type,
        service_id,
        config,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (project_id, service_type) DO UPDATE
      SET
        service_id = EXCLUDED.service_id,
        config = EXCLUDED.config,
        status = EXCLUDED.status,
        updated_at = NOW()
      `,
      [
        params.project_id,
        'auth',
        tenantId,
        JSON.stringify({
          enabled: true,
          endpoint: `https://auth.example.com/tenants/${tenantId}`,
          region: params.region,
        }),
        'active',
      ]
    );

    console.log(`[ProvisionProject] Successfully registered with auth service`);

    return {
      enabled: true,
      tenant_id: tenantId,
      endpoint: `https://auth.example.com/tenants/${tenantId}`,
      project_id: params.project_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to register with auth service:`, errorMessage);
    throw new Error(`Failed to register with auth service: ${errorMessage}`);
  }
}

/**
 * Register project with realtime service
 *
 * @param params - Provisioning parameters
 * @returns Realtime service registration details
 * @throws Error if registration fails
 */
export async function registerRealtimeService(
  params: ProvisionProjectPayload
): Promise<{
  enabled: boolean;
  tenant_id: string;
  endpoint: string;
  project_id: string;
}> {
  const tenantId = `realtime_${params.project_id}`;

  try {
    console.log(`[ProvisionProject] Registering with realtime service: ${tenantId}`);

    // Insert service registration record
    await query(
      `
      INSERT INTO control_plane.project_services (
        project_id,
        service_type,
        service_id,
        config,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (project_id, service_type) DO UPDATE
      SET
        service_id = EXCLUDED.service_id,
        config = EXCLUDED.config,
        status = EXCLUDED.status,
        updated_at = NOW()
      `,
      [
        params.project_id,
        'realtime',
        tenantId,
        JSON.stringify({
          enabled: true,
          endpoint: `wss://realtime.example.com/tenants/${tenantId}`,
          region: params.region,
        }),
        'active',
      ]
    );

    console.log(`[ProvisionProject] Successfully registered with realtime service`);

    return {
      enabled: true,
      tenant_id: tenantId,
      endpoint: `wss://realtime.example.com/tenants/${tenantId}`,
      project_id: params.project_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to register with realtime service:`, errorMessage);
    throw new Error(`Failed to register with realtime service: ${errorMessage}`);
  }
}

/**
 * Register project with storage service
 *
 * @param params - Provisioning parameters
 * @returns Storage service registration details
 * @throws Error if registration fails
 */
export async function registerStorageService(
  params: ProvisionProjectPayload
): Promise<{
  enabled: boolean;
  tenant_id: string;
  endpoint: string;
  bucket_name: string;
  project_id: string;
}> {
  const tenantId = `storage_${params.project_id}`;
  const bucketName = `tenant-${params.project_id}`;

  try {
    console.log(`[ProvisionProject] Registering with storage service: ${tenantId}`);

    // Insert service registration record
    await query(
      `
      INSERT INTO control_plane.project_services (
        project_id,
        service_type,
        service_id,
        config,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (project_id, service_type) DO UPDATE
      SET
        service_id = EXCLUDED.service_id,
        config = EXCLUDED.config,
        status = EXCLUDED.status,
        updated_at = NOW()
      `,
      [
        params.project_id,
        'storage',
        tenantId,
        JSON.stringify({
          enabled: true,
          endpoint: `https://storage.example.com/tenants/${tenantId}`,
          bucket_name: bucketName,
          region: params.region,
        }),
        'active',
      ]
    );

    console.log(`[ProvisionProject] Successfully registered with storage service`);

    return {
      enabled: true,
      tenant_id: tenantId,
      endpoint: `https://storage.example.com/tenants/${tenantId}`,
      bucket_name: bucketName,
      project_id: params.project_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to register with storage service:`, errorMessage);
    throw new Error(`Failed to register with storage service: ${errorMessage}`);
  }
}

/**
 * Disable a service for a project
 *
 * @param projectId - Project identifier
 * @param serviceType - Type of service to disable
 * @throws Error if disable fails
 */
export async function disableService(
  projectId: string,
  serviceType: 'auth' | 'realtime' | 'storage'
): Promise<void> {
  try {
    await query(
      `
      UPDATE control_plane.project_services
      SET
        status = 'disabled',
        updated_at = NOW()
      WHERE project_id = $1 AND service_type = $2
      `,
      [projectId, serviceType]
    );

    console.log(`[ProvisionProject] Disabled ${serviceType} service for project: ${projectId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ProvisionProject] Failed to disable service:`, errorMessage);
    throw new Error(`Failed to disable ${serviceType} service: ${errorMessage}`);
  }
}

/**
 * Get all services registered for a project
 *
 * @param projectId - Project identifier
 * @returns Array of registered services
 */
export async function getProjectServices(projectId: string): Promise<
  Array<{
    service_type: string;
    service_id: string;
    status: string;
    config: Record<string, unknown>;
  }>
> {
  try {
    const result = await query(
      `
      SELECT service_type, service_id, status, config
      FROM control_plane.project_services
      WHERE project_id = $1
      `,
      [projectId]
    );

    return result.rows as Array<{
      service_type: string;
      service_id: string;
      status: string;
      config: Record<string, unknown>;
    }>;
  } catch (error) {
    console.error(`[ProvisionProject] Failed to get project services:`, error);
    return [];
  }
}
