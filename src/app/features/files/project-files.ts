import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { TPipe } from '../../core/i18n/t.pipe';

import {
  FilesService,
  type ProjectFile,
  type StorageUsage,
} from '../../core/services/files.service';
import { ProjectsService } from '../../core/services/projects.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import type { Project } from '../../shared/models/project.model';

const MB = 1024 * 1024;

@Component({
  selector: 'dp-project-files',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    LearnMoreCardComponent,
    TPipe,
  ],
  templateUrl: './project-files.html',
  styleUrl: './project-files.scss',
})
export class ProjectFilesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly filesApi = inject(FilesService);
  private readonly projectsApi = inject(ProjectsService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly project = signal<Project | null>(null);
  protected readonly files = signal<ProjectFile[]>([]);
  protected readonly usage = signal<StorageUsage | null>(null);

  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly dragOver = signal(false);

  protected readonly deleteTarget = signal<ProjectFile | null>(null);
  protected readonly deleting = signal(false);
  protected readonly downloadingId = signal<string | null>(null);

  protected readonly usagePercent = computed(() => {
    const u = this.usage();
    if (!u || u.limitBytes <= 0) return 0;
    return Math.min(100, Math.round((u.usedBytes / u.limitBytes) * 100));
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.filesApi.list(id).toPromise(),
      this.projectsApi.getWithRole(id).toPromise(),
    ])
      .then(([page, projectAndRole]) => {
        this.files.set(page?.files ?? []);
        this.usage.set(page?.usage ?? null);
        this.project.set(projectAndRole?.project ?? null);
        this.permissions.setRole(projectAndRole?.userRole ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudieron cargar los archivos.');
        this.loading.set(false);
      });
  }

  // --- Upload -------------------------------------------------------------

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.upload(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (!this.permissions.canUploadFiles()) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (!this.permissions.canUploadFiles()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  private upload(file: File): void {
    if (this.uploading()) return;
    this.uploadError.set(null);

    if (file.size > 10 * MB) {
      this.uploadError.set('El archivo excede el límite de 10 MB por archivo.');
      return;
    }

    this.uploading.set(true);
    this.filesApi.upload(this.projectId(), file).subscribe({
      next: ({ file: created, usage }) => {
        this.files.update((list) => [created, ...list]);
        this.usage.set(usage);
        this.uploading.set(false);
      },
      error: (err) => {
        this.uploading.set(false);
        const code = err?.error?.error?.code;
        if (code === 'PLAN_LIMIT_REACHED') {
          this.uploadError.set(
            err?.error?.error?.message ??
              'Tu equipo alcanzó el límite de almacenamiento de su plan.',
          );
        } else {
          this.uploadError.set(
            err?.error?.error?.message ?? 'No se pudo subir el archivo.',
          );
        }
      },
    });
  }

  // --- Download -----------------------------------------------------------

  async download(file: ProjectFile): Promise<void> {
    if (this.downloadingId()) return;
    this.downloadingId.set(file._id);
    this.uploadError.set(null);
    try {
      await this.filesApi.download(file);
    } catch (err: unknown) {
      this.uploadError.set(
        (err as Error).message ?? 'No se pudo descargar el archivo.',
      );
    } finally {
      this.downloadingId.set(null);
    }
  }

  // --- Delete -------------------------------------------------------------

  askDelete(file: ProjectFile): void {
    this.deleteTarget.set(file);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.filesApi.remove(target._id).subscribe({
      next: ({ usage }) => {
        this.files.update((list) => list.filter((f) => f._id !== target._id));
        this.usage.set(usage);
        this.deleting.set(false);
        this.deleteTarget.set(null);
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.uploadError.set(
          err?.error?.error?.message ?? 'No se pudo eliminar el archivo.',
        );
      },
    });
  }

  // --- Presentation helpers -------------------------------------------------

  formatSize(bytes: number): string {
    if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  formatUsage(u: StorageUsage): string {
    return `${this.formatSize(u.usedBytes)} de ${u.limitBytes / MB} MB`;
  }

  fileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi-image';
    if (mimeType.startsWith('video/')) return 'pi-video';
    if (mimeType === 'application/pdf') return 'pi-file-pdf';
    if (
      mimeType.includes('zip') ||
      mimeType.includes('compressed') ||
      mimeType.includes('tar')
    )
      return 'pi-box';
    if (
      mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('javascript') ||
      mimeType.includes('xml')
    )
      return 'pi-file-edit';
    return 'pi-file';
  }

  uploaderName(file: ProjectFile): string {
    const u = file.uploadedBy;
    if (u && typeof u === 'object') return u.name;
    return '—';
  }
}
