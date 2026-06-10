import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import { TokenService } from '../auth/token.service';

interface ApiSuccess<T> { success: true; data: T; }

export const DOC_SECTION_KEYS = [
  'overview',
  'stack',
  'installation',
  'env',
  'commands',
  'database',
  'deploy',
  'commonErrors',
  'contributors',
] as const;

export type DocSectionKey = (typeof DOC_SECTION_KEYS)[number];

export interface DocSection {
  title: string;
  content: string;
  completed: boolean;
}

export interface ProjectDoc {
  _id: string;
  project: string;
  sections: Record<DocSectionKey, DocSection>;
  completionPercent: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedReadme {
  markdown: string;
  projectName: string;
  completionPercent: number;
}

export type DocSectionPatch = Partial<{
  title: string;
  content: string;
  completed: boolean;
}>;

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly token = inject(TokenService);

  get(projectId: string): Observable<ProjectDoc> {
    return this.http
      .get<ApiSuccess<{ doc: ProjectDoc }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/docs`,
      )
      .pipe(map((r) => r.data.doc));
  }

  update(
    projectId: string,
    sections: Partial<Record<DocSectionKey, DocSectionPatch>>,
  ): Observable<ProjectDoc> {
    return this.http
      .patch<ApiSuccess<{ doc: ProjectDoc }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/docs`,
        { sections },
      )
      .pipe(map((r) => r.data.doc));
  }

  generateReadme(projectId: string): Observable<GeneratedReadme> {
    return this.http
      .post<ApiSuccess<GeneratedReadme>>(
        `${this.api.baseUrl}/api/projects/${projectId}/docs/generate-readme`,
        {},
      )
      .pipe(map((r) => r.data));
  }

  /** Fill all 9 sections from the linked GitHub repo using DeepSeek. */
  generateWithAi(projectId: string): Observable<ProjectDoc> {
    return this.http
      .post<ApiSuccess<{ doc: ProjectDoc }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/docs/generate-ai`,
        {},
      )
      .pipe(map((r) => r.data.doc));
  }

  /**
   * Triggers a browser download. We bypass HttpClient because we want the
   * Blob response with `text/markdown` content-type to flow into a saved
   * file rather than be parsed as JSON.
   */
  async downloadReadme(projectId: string): Promise<{ filename: string }> {
    const url = `${this.api.baseUrl}/api/projects/${projectId}/docs/download-readme`;
    const headers: Record<string, string> = {};
    const token = this.token.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      // The backend returns JSON for errors; for download success it returns markdown.
      let message = 'No se pudo descargar el README';
      let code: string | undefined;
      try {
        const body = await res.json();
        message = body?.error?.message ?? message;
        code = body?.error?.code;
      } catch {
        // not json
      }
      const err = new Error(message) as Error & { status: number; code?: string };
      err.status = res.status;
      err.code = code;
      throw err;
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] ?? 'README.md';

    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(downloadUrl);

    return { filename };
  }
}

// Friendly metadata used by the docs editor UI
export const DOC_SECTION_META: Record<
  DocSectionKey,
  { label: string; icon: string; hint: string }
> = {
  overview: {
    label: 'Visión general',
    icon: 'pi-compass',
    hint: '¿Qué hace este proyecto? Una descripción de 2-3 párrafos.',
  },
  stack: {
    label: 'Stack tecnológico',
    icon: 'pi-code',
    hint: 'Lenguajes, frameworks, bases de datos y servicios externos.',
  },
  installation: {
    label: 'Instalación',
    icon: 'pi-download',
    hint: 'Pasos para clonar e instalar dependencias localmente.',
  },
  env: {
    label: 'Variables de entorno',
    icon: 'pi-key',
    hint: 'Lista de variables necesarias (sin valores reales).',
  },
  commands: {
    label: 'Comandos',
    icon: 'pi-terminal',
    hint: 'Cómo arrancar dev, build, test, lint, etc.',
  },
  database: {
    label: 'Base de datos',
    icon: 'pi-database',
    hint: 'Motor, conexión, modelos principales, migraciones.',
  },
  deploy: {
    label: 'Deploy',
    icon: 'pi-cloud-upload',
    hint: 'Cómo se publica a producción y en qué hosting.',
  },
  commonErrors: {
    label: 'Errores comunes',
    icon: 'pi-exclamation-triangle',
    hint: 'Errores típicos durante setup y cómo resolverlos.',
  },
  contributors: {
    label: 'Contribuidores',
    icon: 'pi-users',
    hint: 'Personas que han colaborado y cómo contribuir.',
  },
};
