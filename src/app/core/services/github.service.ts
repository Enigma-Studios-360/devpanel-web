import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  pushedAt: string | null;
}

export interface CommitItem {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorLogin?: string;
  authorAvatar?: string;
  date: string | null;
  url: string;
}

export interface BranchItem {
  name: string;
  protected: boolean;
  sha: string;
}

export interface IssueItem {
  number: number;
  title: string;
  state: 'open' | 'closed';
  authorLogin: string;
  authorAvatar?: string;
  createdAt: string;
  url: string;
  comments: number;
  isPullRequest: boolean;
}

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(projectId: string): string {
    return `${this.api.baseUrl}/api/projects/${projectId}/github`;
  }

  link(projectId: string, input: string): Observable<RepoInfo> {
    return this.http
      .post<ApiSuccess<{ repo: RepoInfo }>>(`${this.base(projectId)}/link`, { input })
      .pipe(map((r) => r.data.repo));
  }

  unlink(projectId: string): Observable<void> {
    return this.http
      .post<ApiSuccess<{ unlinked: true }>>(`${this.base(projectId)}/unlink`, {})
      .pipe(map(() => undefined));
  }

  info(projectId: string): Observable<RepoInfo> {
    return this.http
      .get<ApiSuccess<{ repo: RepoInfo }>>(`${this.base(projectId)}/repo`)
      .pipe(map((r) => r.data.repo));
  }

  commits(projectId: string): Observable<CommitItem[]> {
    return this.http
      .get<ApiSuccess<CommitItem[]>>(`${this.base(projectId)}/commits`)
      .pipe(map((r) => r.data));
  }

  branches(projectId: string): Observable<BranchItem[]> {
    return this.http
      .get<ApiSuccess<BranchItem[]>>(`${this.base(projectId)}/branches`)
      .pipe(map((r) => r.data));
  }

  issues(
    projectId: string,
    state: 'open' | 'closed' | 'all' = 'open',
  ): Observable<IssueItem[]> {
    return this.http
      .get<ApiSuccess<IssueItem[]>>(`${this.base(projectId)}/issues`, {
        params: { state },
      })
      .pipe(map((r) => r.data));
  }

  createIssue(
    projectId: string,
    title: string,
    body?: string,
  ): Observable<IssueItem> {
    return this.http
      .post<ApiSuccess<{ issue: IssueItem }>>(`${this.base(projectId)}/issues`, {
        title,
        body,
      })
      .pipe(map((r) => r.data.issue));
  }
}
