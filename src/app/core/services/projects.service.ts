import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import type { Project, ProjectStatus } from '../../shared/models/project.model';
import type { PlanCode, PlanLimits } from '../../shared/models/plan.model';

interface ApiSuccess<T> { success: true; data: T; meta?: Record<string, unknown>; }

export interface CreateProjectInput {
  name: string;
  description?: string;
  stack?: string[];
  status?: ProjectStatus;
  dueDate?: string;
  repositoryUrl?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  stack?: string[];
  status?: ProjectStatus;
  dueDate?: string;
  repositoryUrl?: string;
  color?: string;
}

export interface ProjectDashboard {
  project: Project;
  metrics: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    reviewTasks: number;
    blockedTasks: number;
    completedTasks: number;
    overdueTasks: number;
    documentationPercent: number;
  };
  recentActivity: Array<{
    _id: string;
    type: string;
    message: string;
    createdAt: string;
    actor?: { name: string; avatarUrl?: string };
  }>;
  plan: { code: PlanCode; limits: PlanLimits };
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  listByTeam(teamId: string): Observable<Project[]> {
    return this.http
      .get<ApiSuccess<Project[]>>(
        `${this.api.baseUrl}/api/teams/${teamId}/projects`,
      )
      .pipe(map((r) => r.data));
  }

  create(teamId: string, input: CreateProjectInput): Observable<Project> {
    return this.http
      .post<ApiSuccess<{ project: Project }>>(
        `${this.api.baseUrl}/api/teams/${teamId}/projects`,
        input,
      )
      .pipe(map((r) => r.data.project));
  }

  get(projectId: string): Observable<Project> {
    return this.http
      .get<ApiSuccess<{ project: Project }>>(
        `${this.api.baseUrl}/api/projects/${projectId}`,
      )
      .pipe(map((r) => r.data.project));
  }

  update(projectId: string, input: UpdateProjectInput): Observable<Project> {
    return this.http
      .patch<ApiSuccess<{ project: Project }>>(
        `${this.api.baseUrl}/api/projects/${projectId}`,
        input,
      )
      .pipe(map((r) => r.data.project));
  }

  archive(projectId: string): Observable<Project> {
    return this.http
      .post<ApiSuccess<{ project: Project }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/archive`,
        {},
      )
      .pipe(map((r) => r.data.project));
  }

  dashboard(projectId: string): Observable<ProjectDashboard> {
    return this.http
      .get<ApiSuccess<ProjectDashboard>>(
        `${this.api.baseUrl}/api/projects/${projectId}/dashboard`,
      )
      .pipe(map((r) => r.data));
  }
}
