export type ProjectStatus =
  | 'PLANNING'
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'PRODUCTION'
  | 'ARCHIVED';

export interface Project {
  _id: string;
  team: string;
  name: string;
  slug: string;
  description?: string;
  stack: string[];
  status: ProjectStatus;
  dueDate?: string;
  repositoryUrl?: string;
  githubOwner?: string;
  githubRepo?: string;
  defaultBranch?: string;
  color?: string;
  logoUrl?: string;
  members: string[];
  createdBy: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
