/**
 * Provision Project - Validation
 *
 * Validation functions for project provisioning.
 *
 * US-004: Implement Provision Project Job - Step 7: Data Layer
 */

import { query } from '../../pool.js';

/**
 * Verify that the project exists and is eligible for provisioning
 *
 * @param projectId - Project identifier
 * @throws Error if project doesn't exist or is not eligible
 */
export async function verifyProjectExists(projectId: string): Promise<void> {
  try {
    const result = await query(
      `
      SELECT id, status, provisioning_status
      FROM control_plane.projects
      WHERE id = $1
      `,
      [projectId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = result.rows[0] as {
      id: string;
      status: string;
      provisioning_status: string | null;
    };

    // Check if project is already provisioned
    if (project.provisioning_status === 'completed') {
      throw new Error(`Project already provisioned: ${projectId}`);
    }

    // Check if project is in a valid state for provisioning
    if (project.status === 'suspended' || project.status === 'deleted') {
      throw new Error(
        `Project is not eligible for provisioning: ${projectId} (status: ${project.status})`
      );
    }

    console.log(`[ProvisionProject] Verified project exists and is eligible: ${projectId}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Project not found')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('already provisioned')) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('not eligible')) {
      throw error;
    }
    throw new Error(`Failed to verify project existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate provisioning parameters
 *
 * @param params - Provisioning parameters
 * @throws Error if parameters are invalid
 */
export function validateProvisioningParams(params: {
  project_id: string;
  region: string;
}): void {
  if (!params.project_id || typeof params.project_id !== 'string') {
    throw new Error('Invalid or missing project_id in payload');
  }

  if (!params.region || typeof params.region !== 'string') {
    throw new Error('Invalid or missing region in payload');
  }

  // Validate project_id format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.project_id)) {
    throw new Error(`Invalid project_id format: ${params.project_id}`);
  }

  console.log(`[ProvisionProject] Validated provisioning parameters`);
}

/**
 * Check if a project has reached its quota limit
 *
 * @param projectId - Project identifier
 * @param quotaType - Type of quota to check
 * @returns True if quota exceeded, false otherwise
 */
export async function checkQuotaLimit(
  projectId: string,
  quotaType: 'databases' | 'api_keys' | 'services'
): Promise<boolean> {
  try {
    // Get project's current quota usage
    const result = await query(
      `
      SELECT
        COUNT(*) as usage_count
      FROM control_plane.project_resources
      WHERE project_id = $1
        AND resource_type = $2
      `,
      [projectId, quotaType]
    );

    const usage = result.rows[0] as { usage_count: number };
    const limit = getQuotaLimit(quotaType);

    return usage.usage_count >= limit;
  } catch (error) {
    console.error(`[ProvisionProject] Failed to check quota limit:`, error);
    // Fail open - don't block provisioning if quota check fails
    return false;
  }
}

/**
 * Get quota limit for a resource type
 *
 * @param quotaType - Type of quota
 * @returns Maximum allowed count
 */
function getQuotaLimit(quotaType: string): number {
  const limits: Record<string, number> = {
    databases: 1,
    api_keys: 10,
    services: 3,
  };

  return limits[quotaType] || 10;
}

/**
 * Update project provisioning status
 *
 * @param projectId - Project identifier
 * @param status - New provisioning status
 */
export async function updateProjectProvisioningStatus(
  projectId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
): Promise<void> {
  try {
    await query(
      `
      UPDATE control_plane.projects
      SET
        provisioning_status = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [status, projectId]
    );

    console.log(`[ProvisionProject] Updated provisioning status: ${projectId} -> ${status}`);
  } catch (error) {
    console.error(`[ProvisionProject] Failed to update provisioning status:`, error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Check if project can be provisioned in the specified region
 *
 * @param region - Target region
 * @returns True if region is available, false otherwise
 */
export function isRegionAvailable(region: string): boolean {
  // In production, this would check against available regions
  const availableRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

  return availableRegions.includes(region);
}
