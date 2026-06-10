import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import {
  ProjectsService,
  type ProjectDashboard,
  type UpdateProjectInput,
} from '../../core/services/projects.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { formatDate } from '../../shared/utils/format-date';
import type { ProjectStatus } from '../../shared/models/project.model';

@Component({
  selector: 'dp-project-overview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
    LearnMoreCardComponent,
    EmptyStateComponent,
    TPipe,
  ],
  templateUrl: './project-overview.html',
  styleUrl: './projects.scss',
})
export class ProjectOverviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsApi = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmSvc = inject(ConfirmService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly loading = signal(true);
  protected readonly data = signal<ProjectDashboard | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly editOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly archiving = signal(false);

  protected readonly statuses: ProjectStatus[] = [
    'PLANNING', 'DEVELOPMENT', 'TESTING', 'PRODUCTION',
  ];

  protected readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: [''],
    stack: [''],
    status: ['PLANNING' as ProjectStatus],
    dueDate: [''],
    repositoryUrl: [''],
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    this.projectsApi.dashboard(id).subscribe({
      next: (d) => {
        this.data.set(d);
        this.permissions.setRole(d.userRole);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el proyecto.');
        this.loading.set(false);
      },
    });
  }

  formatDate(value?: string): string {
    return formatDate(value);
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'hace instantes';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }

  isArchived(): boolean {
    return this.data()?.project.status === 'ARCHIVED';
  }

  // Edit -----------------------------------------------------------------------

  openEdit(): void {
    const project = this.data()?.project;
    if (!project) return;
    this.editForm.reset({
      name: project.name,
      description: project.description ?? '',
      stack: (project.stack ?? []).join(', '),
      status: (project.status === 'ARCHIVED' ? 'PLANNING' : project.status) as ProjectStatus,
      dueDate: project.dueDate ? project.dueDate.slice(0, 10) : '',
      repositoryUrl: project.repositoryUrl ?? '',
    });
    this.saveError.set(null);
    this.editOpen.set(true);
  }

  closeEdit(): void { this.editOpen.set(false); }

  saveEdit(): void {
    if (this.editForm.invalid || this.saving()) return;
    const v = this.editForm.getRawValue();
    const input: UpdateProjectInput = {
      name: v.name,
      description: v.description || undefined,
      stack: v.stack
        ? v.stack.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      status: v.status,
      dueDate: v.dueDate || undefined,
      repositoryUrl: v.repositoryUrl || undefined,
    };
    this.saving.set(true);
    this.saveError.set(null);
    this.projectsApi.update(this.projectId(), input).subscribe({
      next: () => {
        this.saving.set(false);
        this.editOpen.set(false);
        this.refresh();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.error?.message ?? 'No se pudo guardar.');
      },
    });
  }

  // Archive --------------------------------------------------------------------

  async archive(): Promise<void> {
    if (this.archiving() || this.isArchived()) return;
    const ok = await this.confirmSvc.ask({
      title: 'Archivar proyecto',
      message:
        'Esto saca el proyecto del listado activo y libera un cupo del plan. ' +
        'No se borran tareas, documentación ni actividad — siempre puedes desarchivarlo después.',
      confirmLabel: 'Archivar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'pi-inbox',
    });
    if (!ok) return;
    this.archiving.set(true);
    this.projectsApi.archive(this.projectId()).subscribe({
      next: () => {
        this.archiving.set(false);
        this.refresh();
      },
      error: () => {
        this.archiving.set(false);
      },
    });
  }
}
