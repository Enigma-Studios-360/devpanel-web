import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import {
  ProjectsService,
  type UserProjectItem,
} from '../../core/services/projects.service';

/**
 * Global "Proyectos" page: lists every project across all the user's teams,
 * each tagged with its team name. Reachable from the sidebar without first
 * picking a team.
 */
@Component({
  selector: 'dp-all-projects',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './all-projects.html',
  styleUrl: './projects.scss',
})
export class AllProjectsComponent {
  private readonly projectsApi = inject(ProjectsService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly projects = signal<UserProjectItem[]>([]);
  protected readonly error = signal<string | null>(null);

  protected readonly activeCount = computed(
    () => this.projects().filter((p) => p.status !== 'ARCHIVED').length,
  );

  constructor() {
    this.projectsApi.listAll().subscribe({
      next: (p) => {
        this.projects.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los proyectos.');
        this.loading.set(false);
      },
    });
  }

  goTeams(): void {
    void this.router.navigate(['/app/teams']);
  }
}
