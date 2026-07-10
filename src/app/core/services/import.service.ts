import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

export type ExclusionCategory =
  | 'SECRETO'
  | 'DEPENDENCIAS'
  | 'CONTROL_DE_VERSIONES'
  | 'BASURA_SISTEMA'
  | 'CONFIG_EDITOR'
  | 'LOGS_Y_CACHE'
  | 'DEMASIADO_GRANDE';

export interface ExcludedEntry {
  path: string;
  category: ExclusionCategory;
}

export interface ImportAnalysis {
  importId: string;
  originalName: string;
  totalEntries: number;
  keptCount: number;
  keptBytes: number;
  excluded: ExcludedEntry[];
  excludedCounts: Partial<Record<ExclusionCategory, number>>;
  suggestedRepoName: string;
  keptSample: string[];
}

export interface ImportResult {
  repoFullName: string;
  repoUrl: string;
  pushedFiles: number;
  linked: boolean;
  linkError: string | null;
  stackName: string | null;
  deployable: boolean;
  verdict: string;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  /** Sube el ZIP y devuelve el reporte de exclusiones (nada se crea aún). */
  analyze(projectId: string, zip: File): Observable<ImportAnalysis> {
    const form = new FormData();
    form.append('file', zip, zip.name);
    return this.http
      .post<ApiSuccess<{ analysis: ImportAnalysis }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/import`,
        form,
      )
      .pipe(map((r) => r.data.analysis));
  }

  /** Confirma: crea el repo en la cuenta del usuario y empuja los archivos limpios. */
  confirm(
    projectId: string,
    importId: string,
    repoName: string,
    isPrivate: boolean,
  ): Observable<ImportResult> {
    return this.http
      .post<ApiSuccess<ImportResult>>(
        `${this.api.baseUrl}/api/projects/${projectId}/import/${importId}/confirm`,
        { repoName, isPrivate },
      )
      .pipe(map((r) => r.data));
  }
}

/** Metadatos de UI por categoría de exclusión (icono, título, explicación). */
export const EXCLUSION_META: Record<
  ExclusionCategory,
  { icon: string; label: string; why: string; tone: 'danger' | 'info' | 'muted' }
> = {
  SECRETO: {
    icon: 'pi-shield',
    label: 'Secretos y contraseñas',
    why: 'Archivos como .env contienen tus llaves y contraseñas. NUNCA deben subirse a internet — guárdalos solo en tu computadora.',
    tone: 'danger',
  },
  DEPENDENCIAS: {
    icon: 'pi-box',
    label: 'Dependencias',
    why: 'node_modules, vendor y similares son regenerables: cualquiera las reinstala con un comando. Subirlas solo infla el repo.',
    tone: 'info',
  },
  CONTROL_DE_VERSIONES: {
    icon: 'pi-history',
    label: 'Historial de Git',
    why: 'La carpeta .git es el historial local; GitHub crea el suyo propio.',
    tone: 'muted',
  },
  BASURA_SISTEMA: {
    icon: 'pi-trash',
    label: 'Basura del sistema',
    why: '.DS_Store, Thumbs.db y compañía son archivos que crea tu sistema operativo; no forman parte del proyecto.',
    tone: 'muted',
  },
  CONFIG_EDITOR: {
    icon: 'pi-cog',
    label: 'Config de editor',
    why: 'Carpetas .idea/.vs guardan preferencias personales de tu editor, no del proyecto.',
    tone: 'muted',
  },
  LOGS_Y_CACHE: {
    icon: 'pi-file',
    label: 'Logs y caché',
    why: 'Archivos .log y carpetas de caché se regeneran solos; no aportan al código.',
    tone: 'muted',
  },
  DEMASIADO_GRANDE: {
    icon: 'pi-exclamation-triangle',
    label: 'Archivos muy grandes',
    why: 'GitHub no acepta archivos de más de 100 MB por la vía normal. Considera Git LFS para binarios pesados.',
    tone: 'info',
  },
};
