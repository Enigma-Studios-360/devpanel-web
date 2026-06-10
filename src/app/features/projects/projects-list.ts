import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { ProjectsService } from '../../core/services/projects.service';
import { SubscriptionsService, type Subscription } from '../../core/services/subscription.service';
import { TeamsService } from '../../core/services/teams.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { TutorialService } from '../../core/tutorial/tutorial.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { formatDate } from '../../shared/utils/format-date';
import type { Project, ProjectStatus } from '../../shared/models/project.model';

@Component({
  selector: 'dp-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    LearnMoreCardComponent,
    TPipe,
  ],
  templateUrl: './projects-list.html',
  styleUrl: './projects.scss',
})
export class ProjectsListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsApi = inject(ProjectsService);
  private readonly subsApi = inject(SubscriptionsService);
  private readonly teamsApi = inject(TeamsService);
  private readonly fb = inject(FormBuilder);
  private readonly tutorial = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly permissions = inject(PermissionsService);

  protected readonly teamId = computed(
    () => this.route.snapshot.paramMap.get('teamId') ?? '',
  );

  protected readonly loading = signal(true);
  protected readonly projects = signal<Project[]>([]);
  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly modalOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly limitInfo = signal<{ max: number; active: number } | null>(null);

  protected readonly statuses: ProjectStatus[] = [
    'PLANNING', 'DEVELOPMENT', 'TESTING', 'PRODUCTION',
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: [''],
    stack: [''], // CSV input → array on submit
    status: ['PLANNING' as ProjectStatus],
    dueDate: [''],
    repositoryUrl: [''],
  });

  protected readonly activeCount = computed(
    () => this.projects().filter((p) => p.status !== 'ARCHIVED').length,
  );

  protected readonly canCreate = computed(() => {
    const sub = this.subscription();
    if (!sub) return true;
    return this.activeCount() < sub.limits.maxProjects;
  });

  constructor() {
    this.refresh();
    this.tutorial.actions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => {
        if (action.key === 'open-modal:create-project') this.openCreate();
      });
  }

  refresh(): void {
    const id = this.teamId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.projectsApi.listByTeam(id).toPromise(),
      this.subsApi.forTeam(id).toPromise(),
      this.teamsApi.get(id).toPromise(),
    ])
      .then(([projects, sub, teamWithRole]) => {
        this.projects.set(projects ?? []);
        this.subscription.set(sub ?? null);
        this.permissions.setRole(teamWithRole?.role ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudieron cargar los proyectos.');
        this.loading.set(false);
      });
  }

  formatDate(value?: string): string {
    return formatDate(value);
  }

  openCreate(): void {
    this.form.reset({
      name: '', description: '', stack: '',
      status: 'PLANNING', dueDate: '', repositoryUrl: '',
    });
    this.createError.set(null);
    this.limitInfo.set(null);
    this.modalOpen.set(true);
  }

  closeCreate(): void { this.modalOpen.set(false); }

  goToPricing(): void {
    void this.router.navigate(['/app/pricing'], {
      queryParams: { teamId: this.teamId() },
    });
    this.closeCreate();
  }

  submit(): void {
    if (this.form.invalid || this.creating()) return;
    const v = this.form.getRawValue();
    const stack = v.stack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    this.creating.set(true);
    this.createError.set(null);
    this.limitInfo.set(null);

    this.projectsApi
      .create(this.teamId(), {
        name: v.name,
        description: v.description || undefined,
        stack,
        status: v.status,
        dueDate: v.dueDate || undefined,
        repositoryUrl: v.repositoryUrl || undefined,
      })
      .subscribe({
        next: (project) => {
          this.creating.set(false);
          this.closeCreate();
          // Let the onboarding tour (if parked on waitFor) advance.
          const inTour = this.tutorial.isActive();
          this.tutorial.emitEvent('project-created');
          // During the guided tour, drop the user straight on the Kanban board
          // so the next step can open the "create task" modal there (instead of
          // making them hunt for a "Ver tareas" button on the overview).
          const dest = inTour ? 'tasks' : 'overview';
          void this.router.navigate(['/app/projects', project._id, dest]);
        },
        error: (err) => {
          this.creating.set(false);
          const code = err?.error?.error?.code;
          const msg = err?.error?.error?.message ?? 'No se pudo crear el proyecto.';
          if (code === 'PLAN_LIMIT_REACHED') {
            const details = err?.error?.error?.details ?? {};
            this.limitInfo.set({
              max: details.maxProjects ?? 1,
              active: details.activeProjects ?? this.activeCount(),
            });
          }
          this.createError.set(msg);
        },
      });
  }
}
