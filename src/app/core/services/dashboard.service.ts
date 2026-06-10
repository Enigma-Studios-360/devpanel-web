import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

export interface DashboardStats {
  totalTeams: number;
  totalProjects: number;
  activeProjects: number;
  openTasksAssignedToMe: number;
  overdueTasksAssignedToMe: number;
}

export interface DashboardRecentProject {
  _id: string;
  name: string;
  slug: string;
  status: string;
  color: string;
  teamId: string;
  teamName: string | null;
  updatedAt: string;
}

export interface DashboardMyTask {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  projectName: string | null;
  overdue: boolean;
}

export interface DashboardActivityEntry {
  _id: string;
  type: string;
  message: string;
  createdAt: string;
  actor?: { _id: string; name: string; avatarUrl?: string };
  projectId?: string | null;
  teamId?: string | null;
}

export interface DashboardOverview {
  stats: DashboardStats;
  recentProjects: DashboardRecentProject[];
  myOpenTasks: DashboardMyTask[];
  recentActivity: DashboardActivityEntry[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  overview(): Observable<DashboardOverview> {
    return this.http
      .get<ApiSuccess<DashboardOverview>>(`${this.api.baseUrl}/api/dashboard/overview`)
      .pipe(map((r) => r.data));
  }

  /** Trigger demo data creation. Returns 409 if the user already has teams. */
  seedDemo(): Observable<{ teamId: string; projectId: string; tasksCreated: number }> {
    return this.http
      .post<ApiSuccess<{ teamId: string; projectId: string; tasksCreated: number }>>(
        `${this.api.baseUrl}/api/dashboard/seed-demo`,
        {},
      )
      .pipe(map((r) => r.data));
  }
}
