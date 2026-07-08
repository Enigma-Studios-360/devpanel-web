import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import { TokenService } from '../auth/token.service';
import type { PlanCode } from '../../shared/models/plan.model';

interface ApiSuccess<T> { success: true; data: T; }

export interface ProjectFile {
  _id: string;
  project: string;
  task?: string;
  uploadedBy: { _id: string; name: string; email: string } | string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

/** Team-wide storage meter: every file across the team counts against the plan. */
export interface StorageUsage {
  usedBytes: number;
  limitBytes: number;
  plan: PlanCode;
}

export interface FilesPage {
  files: ProjectFile[];
  usage: StorageUsage;
}

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly token = inject(TokenService);

  list(projectId: string): Observable<FilesPage> {
    return this.http
      .get<ApiSuccess<FilesPage>>(
        `${this.api.baseUrl}/api/projects/${projectId}/files`,
      )
      .pipe(map((r) => r.data));
  }

  upload(
    projectId: string,
    file: File,
    taskId?: string,
  ): Observable<{ file: ProjectFile; usage: StorageUsage }> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (taskId) form.append('taskId', taskId);
    return this.http
      .post<ApiSuccess<{ file: ProjectFile; usage: StorageUsage }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/files`,
        form,
      )
      .pipe(map((r) => r.data));
  }

  remove(fileId: string): Observable<{ deleted: boolean; usage: StorageUsage }> {
    return this.http
      .delete<ApiSuccess<{ deleted: boolean; usage: StorageUsage }>>(
        `${this.api.baseUrl}/api/files/${fileId}`,
      )
      .pipe(map((r) => r.data));
  }

  /**
   * Triggers a browser download. Same pattern as DocsService.downloadReadme:
   * we bypass HttpClient because we want the raw Blob (any mime type) to flow
   * into a saved file instead of being parsed as JSON.
   */
  async download(file: ProjectFile): Promise<void> {
    const url = `${this.api.baseUrl}/api/files/${file._id}/download`;
    const headers: Record<string, string> = {};
    const token = this.token.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      let message = 'No se pudo descargar el archivo';
      try {
        const body = await res.json();
        message = body?.error?.message ?? message;
      } catch {
        // not json
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(downloadUrl);
  }
}
