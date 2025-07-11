import type { ProjectType } from '@/app/types/index';
import { AssociationClient } from './associationClient';

export interface CreateProjectInput {
  name: string;
  description: string;
  slug: string;
  organizationId: string;
  visibility: 'public' | 'private';
  status: 'active' | 'archived';
}

// Export individual methods for direct use
export const updateProject = (id: string, data: Partial<ProjectType>) => ProjectService.updateProject(id, data);

export class ProjectService {
  static async getProject(id: string): Promise<ProjectType | null> {
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch project');
      }
      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  static async createProject(data: CreateProjectInput): Promise<ProjectType | null> {
    try {
      // Validate project slug uniqueness within the organization
      const isSlugUnique = await AssociationClient.validateProjectSlug(
        data.organizationId,
        data.slug
      );
      if (!isSlugUnique) {
        throw new Error('A project with this name already exists in the organization');
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create project');
      }

      const { data: newProject } = await response.json();
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  static async updateProject(id: string, data: Partial<ProjectType>): Promise<ProjectType | null> {
    try {
      // If slug is being updated, validate its uniqueness
      if (data.slug && data.organizationId) {
const isSlugUnique = await AssociationClient.validateProjectSlug(
          data.organizationId,
          data.slug,
          id
        );
        if (!isSlugUnique) {
          throw new Error('A project with this name already exists in the organization');
        }
      }

      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update project');
      }
      
      const { data: updatedProject } = await response.json();
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  static async deleteProject(id: string, organizationId?: string): Promise<boolean> {
    try {
      // Get project details first to check if it exists
      const project = await this.getProject(id);
      if (!project) {
        throw new Error('Project not found');
      }

      // If organizationId is provided, verify ownership
      if (organizationId) {
        const belongsToOrg = project.organizationId === organizationId;
        if (!belongsToOrg) {
          throw new Error('Project does not belong to this organization');
        }
      }

      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete project');
      }

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}
