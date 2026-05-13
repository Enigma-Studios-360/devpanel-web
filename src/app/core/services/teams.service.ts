import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import type { Team, TeamMember, TeamRole } from '../../shared/models/team.model';
import type { User } from '../../shared/models/user.model';

interface ApiSuccess<T> { success: true; data: T; }

export interface TeamWithRole {
  team: Team;
  role: TeamRole;
  projectsCount: number;
  activeProjectsCount: number;
}

export interface TeamMemberWithUser extends Omit<TeamMember, 'user'> {
  user: User | string;
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  list(): Observable<TeamWithRole[]> {
    return this.http
      .get<ApiSuccess<TeamWithRole[]>>(`${this.api.baseUrl}/api/teams`)
      .pipe(map((r) => r.data));
  }

  create(name: string): Observable<Team> {
    return this.http
      .post<ApiSuccess<{ team: Team }>>(`${this.api.baseUrl}/api/teams`, { name })
      .pipe(map((r) => r.data.team));
  }

  get(teamId: string): Observable<{ team: Team; role: TeamRole }> {
    return this.http
      .get<ApiSuccess<{ team: Team; role: TeamRole }>>(`${this.api.baseUrl}/api/teams/${teamId}`)
      .pipe(map((r) => r.data));
  }

  members(teamId: string): Observable<TeamMemberWithUser[]> {
    return this.http
      .get<ApiSuccess<TeamMemberWithUser[]>>(
        `${this.api.baseUrl}/api/teams/${teamId}/members`,
      )
      .pipe(map((r) => r.data));
  }
}
