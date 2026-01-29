/**
 * Project CRUD Audit Logging Example
 *
 * This file demonstrates how to integrate audit logging into project
 * create, update, and delete operations.
 *
 * US-003: Audit Project CRUD Operations - Step 1: Foundation
 */

import type { RequestContext } from '../types/audit.types.js';
import {
  logProjectAction,
  userActor,
  type ActorInfo,
} from '../index.js';

/**
 * Example: Project Service with Audit Logging
 *
 * This demonstrates how to add audit logging to existing project CRUD operations.
 * The pattern can be adapted to GraphQL resolvers, REST API handlers, or service methods.
 */

// ============================================================================
// Types for Project Operations
// ============================================================================

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'suspended' | 'deleted';
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  organization_id: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'active' | 'suspended' | 'deleted';
}

// ============================================================================
// Example 1: Direct Integration with Helper Functions
// ============================================================================

/**
 * Project Service with Audit Logging
 *
 * This service demonstrates the recommended pattern for integrating
 * audit logging into CRUD operations.
 */
export class ProjectServiceWithAudit {
  /**
   * Create a new project
   *
   * @param actor - The user performing the action
   * @param input - Project creation data
   * @param request - Optional request context for IP/user agent
   */
  async createProject(
    actor: ActorInfo,
    input: CreateProjectInput,
    request?: RequestContext
  ): Promise<ProjectData> {
    // 1. Perform the actual project creation
    const project = await this.performCreateProject(input);

    // 2. Log the audit event
    await logProjectAction.created(actor, project.id, {
      request,
      metadata: {
        project_name: project.name,
        organization_id: project.organization_id,
      },
    });

    // 3. Return the created project
    return project;
  }

  /**
   * Update a project
   *
   * @param actor - The user performing the action
   * @param projectId - ID of the project to update
   * @param input - Project update data
   * @param request - Optional request context for IP/user agent
   */
  async updateProject(
    actor: ActorInfo,
    projectId: string,
    input: UpdateProjectInput,
    request?: RequestContext
  ): Promise<ProjectData> {
    // 1. Get the current project state (for tracking changes)
    const currentProject = await this.getProjectById(projectId);

    // 2. Perform the actual update
    const updatedProject = await this.performUpdateProject(projectId, input);

    // 3. Calculate what changed
    const changes = this.calculateChanges(currentProject, updatedProject);

    // 4. Log the audit event with changes
    await logProjectAction.updated(actor, projectId, changes, {
      request,
      metadata: {
        project_name: updatedProject.name,
        organization_id: updatedProject.organization_id,
      },
    });

    // 5. Return the updated project
    return updatedProject;
  }

  /**
   * Delete a project
   *
   * @param actor - The user performing the action
   * @param projectId - ID of the project to delete
   * @param request - Optional request context for IP/user agent
   */
  async deleteProject(
    actor: ActorInfo,
    projectId: string,
    request?: RequestContext
  ): Promise<void> {
    // 1. Get the project before deletion (for audit record)
    const project = await this.getProjectById(projectId);

    // 2. Perform the actual deletion
    await this.performDeleteProject(projectId);

    // 3. Log the audit event
    await logProjectAction.deleted(actor, projectId, {
      request,
      metadata: {
        project_name: project.name,
        organization_id: project.organization_id,
        deleted_status: project.status,
      },
    });
  }

  // ==========================================================================
  // Private Helper Methods (simulated database operations)
  // ==========================================================================

  private async performCreateProject(input: CreateProjectInput): Promise<ProjectData> {
    // Simulated database insert
    return {
      id: `proj_${Date.now()}`,
      name: input.name,
      description: input.description,
      status: 'active',
      organization_id: input.organization_id,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  private async performUpdateProject(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<ProjectData> {
    // Simulated database update
    const current = await this.getProjectById(projectId);
    return {
      ...current,
      ...input,
      updated_at: new Date(),
    };
  }

  private async performDeleteProject(projectId: string): Promise<void> {
    // Simulated database delete
    console.log(`Deleting project: ${projectId}`);
  }

  private async getProjectById(projectId: string): Promise<ProjectData> {
    // Simulated database fetch
    return {
      id: projectId,
      name: 'Sample Project',
      description: 'A sample project',
      status: 'active',
      organization_id: 'org_123',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Calculate changes between old and new project state
   */
  private calculateChanges(
    oldProject: ProjectData,
    newProject: ProjectData
  ): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (oldProject.name !== newProject.name) {
      changes.name = { old: oldProject.name, new: newProject.name };
    }

    if (oldProject.description !== newProject.description) {
      changes.description = { old: oldProject.description, new: newProject.description };
    }

    if (oldProject.status !== newProject.status) {
      changes.status = { old: oldProject.status, new: newProject.status };
    }

    return changes;
  }
}

// ============================================================================
// Example 2: GraphQL Resolver Integration
// ============================================================================

/**
 * GraphQL Mutation Resolver with Audit Logging
 *
 * This example shows how to integrate audit logging into GraphQL mutations.
 */
export const projectMutationsWithAudit = {
  /**
   * Create Project Mutation
   */
  createProject: async (
    _parent: unknown,
    args: { input: CreateProjectInput },
    context: { user?: { id: string }; req?: RequestContext }
  ): Promise<ProjectData> => {
    // Extract actor from authenticated context
    const actor = userActor(context.user?.id || 'unknown');

    // Use the service
    const service = new ProjectServiceWithAudit();
    return service.createProject(actor, args.input, context.req);
  },

  /**
   * Update Project Mutation
   */
  updateProject: async (
    _parent: unknown,
    args: { projectId: string; input: UpdateProjectInput },
    context: { user?: { id: string }; req?: RequestContext }
  ): Promise<ProjectData> => {
    const actor = userActor(context.user?.id || 'unknown');
    const service = new ProjectServiceWithAudit();
    return service.updateProject(actor, args.projectId, args.input, context.req);
  },

  /**
   * Delete Project Mutation
   */
  deleteProject: async (
    _parent: unknown,
    args: { projectId: string },
    context: { user?: { id: string }; req?: RequestContext }
  ): Promise<boolean> => {
    const actor = userActor(context.user?.id || 'unknown');
    const service = new ProjectServiceWithAudit();
    await service.deleteProject(actor, args.projectId, context.req);
    return true;
  },
};

// ============================================================================
// Example 3: REST API Handler Integration
// ============================================================================

/**
 * Express Route Handler with Audit Logging
 *
 * This example shows how to integrate audit logging into REST API endpoints.
 */
export class ProjectControllerWithAudit {
  /**
   * POST /api/projects - Create a new project
   */
  async createProject(
    req: { user?: { id: string }; body: CreateProjectInput; ip?: string; headers?: Record<string, string> },
    res: { json: (data: ProjectData) => void }
  ): Promise<void> {
    // Extract actor from authenticated request
    const actor = userActor(req.user?.id || 'unknown');

    // Build request context
    const requestContext: RequestContext = {
      ip: req.ip,
      headers: req.headers,
    };

    // Use the service
    const service = new ProjectServiceWithAudit();
    const project = await service.createProject(actor, req.body, requestContext);

    res.json(project);
  }

  /**
   * PUT /api/projects/:id - Update a project
   */
  async updateProject(
    req: {
      user?: { id: string };
      params: { id: string };
      body: UpdateProjectInput;
      ip?: string;
      headers?: Record<string, string>;
    },
    res: { json: (data: ProjectData) => void }
  ): Promise<void> {
    const actor = userActor(req.user?.id || 'unknown');
    const requestContext: RequestContext = {
      ip: req.ip,
      headers: req.headers,
    };

    const service = new ProjectServiceWithAudit();
    const project = await service.updateProject(
      actor,
      req.params.id,
      req.body,
      requestContext
    );

    res.json(project);
  }

  /**
   * DELETE /api/projects/:id - Delete a project
   */
  async deleteProject(
    req: {
      user?: { id: string };
      params: { id: string };
      ip?: string;
      headers?: Record<string, string>;
    },
    res: { status: (code: number) => { json: (data: { success: boolean }) => void } }
  ): Promise<void> {
    const actor = userActor(req.user?.id || 'unknown');
    const requestContext: RequestContext = {
      ip: req.ip,
      headers: req.headers,
    };

    const service = new ProjectServiceWithAudit();
    await service.deleteProject(actor, req.params.id, requestContext);

    res.status(204).json({ success: true });
  }
}

// ============================================================================
// Example 4: Wrapper Pattern (Alternative to Decorators)
// ============================================================================

/**
 * Project Service with Wrapper Functions
 *
 * This pattern provides similar benefits to decorators without
 * the complexity of decorator metadata.
 */
export class ProjectServiceWithWrappers {
  private service: ProjectServiceWithAudit;

  constructor() {
    this.service = new ProjectServiceWithAudit();
  }

  /**
   * Create with automatic audit logging
   */
  async createWithAudit(
    actor: ActorInfo,
    input: CreateProjectInput,
    request?: RequestContext
  ): Promise<ProjectData> {
    return this.service.createProject(actor, input, request);
  }

  /**
   * Update with automatic audit logging
   */
  async updateWithAudit(
    actor: ActorInfo,
    projectId: string,
    input: UpdateProjectInput,
    request?: RequestContext
  ): Promise<ProjectData> {
    return this.service.updateProject(actor, projectId, input, request);
  }

  /**
   * Delete with automatic audit logging
   */
  async deleteWithAudit(
    actor: ActorInfo,
    projectId: string,
    request?: RequestContext
  ): Promise<void> {
    return this.service.deleteProject(actor, projectId, request);
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Using the Project Service
 */
export async function exampleUsage() {
  const service = new ProjectServiceWithAudit();

  // Create a project
  const actor = userActor('user-123');
  const requestContext: RequestContext = {
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'Mozilla/5.0...',
    },
  };

  const newProject = await service.createProject(
    actor,
    {
      name: 'My Awesome Project',
      description: 'This is a test project',
      organization_id: 'org-456',
    },
    requestContext
  );

  console.log('Created project:', newProject.id);

  // Update the project
  const updatedProject = await service.updateProject(
    actor,
    newProject.id,
    {
      name: 'My Updated Project',
      status: 'suspended',
    },
    requestContext
  );

  console.log('Updated project:', updatedProject.id);

  // Delete the project
  await service.deleteProject(actor, newProject.id, requestContext);

  console.log('Deleted project:', newProject.id);
}
