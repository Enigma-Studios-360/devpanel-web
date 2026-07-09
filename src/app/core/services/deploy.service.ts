import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

export type VercelFrameworkPreset =
  | 'nextjs'
  | 'angular'
  | 'vite'
  | 'create-react-app'
  | 'nuxtjs'
  | 'astro'
  | 'sveltekit'
  | 'remix'
  | 'gatsby'
  | 'vue'
  | 'svelte'
  | 'hugo'
  | 'jekyll'
  | 'eleventy'
  | 'docusaurus'
  | 'other';

export type DeployStatus = 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';

export interface DeployPrepareResult {
  framework: VercelFrameworkPreset;
  buildCommand: string;
  outputDirectory: string;
  installCommand: string;
  suggestedEnv: string[];
  branch: string;
  detectedStackId: string | null;
  detectedStackName: string | null;
  repo: { owner: string; repo: string };
  suggestedProjectName: string;
}

export interface TriggerDeployInput {
  projectName?: string;
  framework: VercelFrameworkPreset;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  rootDirectory?: string;
  branch?: string;
  envVars?: Array<{ key: string; value: string }>;
}

export interface DeploymentRecord {
  _id: string;
  project: string;
  team: string;
  triggeredBy: string | { _id: string; name: string; email?: string; avatarUrl?: string };
  provider: 'VERCEL';
  vercelDeploymentId?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  url?: string;
  /** Stable production URL (`https://<name>.vercel.app`) — what end users get. */
  publicUrl?: string;
  inspectorUrl?: string;
  status: DeployStatus;
  errorMessage?: string;
  framework?: VercelFrameworkPreset;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  rootDirectory?: string;
  gitBranch?: string;
  commitSha?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeployHistory {
  current: DeploymentRecord | null;
  history: DeploymentRecord[];
}

export interface DeployStatusProbe {
  configured: boolean;
  provider: 'VERCEL';
}

@Injectable({ providedIn: 'root' })
export class DeployService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(projectId: string): string {
    return `${this.api.baseUrl}/api/projects/${projectId}/deploy`;
  }

  /** Unscoped probe — does the backend even have Vercel configured? */
  status(): Observable<DeployStatusProbe> {
    return this.http
      .get<ApiSuccess<DeployStatusProbe>>(`${this.api.baseUrl}/api/deploy/status`)
      .pipe(map((r) => r.data));
  }

  history(projectId: string): Observable<DeployHistory> {
    return this.http
      .get<ApiSuccess<DeployHistory>>(this.base(projectId))
      .pipe(map((r) => r.data));
  }

  prepare(projectId: string): Observable<DeployPrepareResult> {
    return this.http
      .get<ApiSuccess<DeployPrepareResult>>(`${this.base(projectId)}/prepare`)
      .pipe(map((r) => r.data));
  }

  trigger(projectId: string, input: TriggerDeployInput): Observable<DeploymentRecord> {
    return this.http
      .post<ApiSuccess<{ deployment: DeploymentRecord }>>(
        `${this.base(projectId)}/trigger`,
        input,
      )
      .pipe(map((r) => r.data.deployment));
  }

  refresh(projectId: string, deploymentId: string): Observable<DeploymentRecord> {
    return this.http
      .post<ApiSuccess<{ deployment: DeploymentRecord }>>(
        `${this.base(projectId)}/${deploymentId}/refresh`,
        {},
      )
      .pipe(map((r) => r.data.deployment));
  }
}
