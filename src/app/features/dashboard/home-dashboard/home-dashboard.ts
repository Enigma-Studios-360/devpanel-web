import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../../core/i18n/t.pipe';
import {
  ApiHealthService,
  type ApiHealthState,
} from '../../../core/services/api-health.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LearnMoreCardComponent } from '../../../shared/components/learn-more-card/learn-more-card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton';
import {
  WhatsNewComponent,
  type WhatsNewItem,
} from '../../../shared/components/whats-new/whats-new';
import {
  DashboardService,
  type DashboardOverview,
  type DashboardRecentProject,
  type DashboardMyTask,
  type DashboardActivityEntry,
} from '../../../core/services/dashboard.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { TutorialService } from '../../../core/tutorial/tutorial.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { formatDate, formatUptime } from '../../../shared/utils/format-date';

@Component({
  selector: 'dp-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    PageHeaderComponent,
    LearnMoreCardComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    SkeletonComponent,
    WhatsNewComponent,
  ],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
})
export class HomeDashboardComponent {
  private readonly health = inject(ApiHealthService);
  private readonly dashboardApi = inject(DashboardService);
  private readonly auth = inject(AuthStateService);
  private readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);

  // --- State ----------------------------------------------------------------

  protected readonly healthState = signal<ApiHealthState | null>(null);
  protected readonly healthLoading = signal<boolean>(true);

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly overviewLoading = signal<boolean>(true);
  protected readonly overviewError = signal<string | null>(null);

  // Demo data seeding (only shown when the workspace is empty)
  protected readonly seeding = signal<boolean>(false);
  protected readonly seedError = signal<string | null>(null);

  // --- Derived --------------------------------------------------------------

  /** Human greeting that adapts to the time of day. */
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Trabajando hasta tarde';
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  protected readonly userFirstName = computed(() => {
    const full = this.auth.user()?.name ?? '';
    return full.split(' ')[0] ?? full;
  });

  /** Cards shown in the "What's new" banner. Bump release id to re-surface. */
  protected readonly whatsNewItems: WhatsNewItem[] = [
    {
      id: 'assistant',
      icon: 'pi-sparkles',
      title: 'Asistente con IA',
      description: 'Pregúntale a Clippy lo que quieras: FAQ instantánea + DeepSeek.',
      tone: 'ai',
    },
    {
      id: 'stack',
      icon: 'pi-microchip',
      title: 'Detección automática de stack',
      description: 'DevHub analiza tu repo y deduce qué tecnologías usas.',
      route: ['/app/teams'],
    },
    {
      id: 'deploy',
      icon: 'pi-cloud-upload',
      title: 'Deploy Wizard a Vercel',
      description: 'De idea a producción en 4 pasos. Con estado en vivo.',
      route: ['/app/teams'],
    },
  ];

  constructor() {
    this.refreshHealth();
    this.refreshOverview();
    this.bootstrapTour();
  }

  // --- Loaders --------------------------------------------------------------

  refreshHealth(): void {
    this.healthLoading.set(true);
    this.health.check().subscribe((res) => {
      this.healthState.set(res);
      this.healthLoading.set(false);
    });
  }

  refreshOverview(): void {
    this.overviewLoading.set(true);
    this.overviewError.set(null);
    this.dashboardApi.overview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.overviewLoading.set(false);
      },
      error: () => {
        this.overviewError.set(
          'No se pudo cargar el resumen. ¿Está el backend corriendo?',
        );
        this.overviewLoading.set(false);
      },
    });
  }

  /**
   * Smart auto-start logic:
   *  - First visit → onboarding-flow (the guided end-to-end tour).
   *  - Otherwise → leave the user alone (they can re-trigger from help).
   */
  private bootstrapTour(): void {
    if (!this.tutorial.hasCompleted('onboarding-flow')) {
      this.tutorial.maybeAutoStartFirstTime('onboarding-flow');
    }
  }

  /**
   * Empty-state CTA: create a team + project + tasks so the user has
   * something realistic to navigate. After it lands we refresh the
   * overview so the widgets repopulate.
   */
  seedDemoData(): void {
    if (this.seeding()) return;
    this.seeding.set(true);
    this.seedError.set(null);
    this.dashboardApi.seedDemo().subscribe({
      next: () => {
        this.seeding.set(false);
        this.refreshOverview();
      },
      error: (err: HttpErrorResponse) => {
        this.seeding.set(false);
        this.seedError.set(
          (err?.error as { error?: { message?: string } } | undefined)?.error?.message ??
            'No se pudo crear el playground demo.',
        );
      },
    });
  }

  // --- View helpers ---------------------------------------------------------

  formatUptime(value: number | undefined): string {
    return formatUptime(value);
  }

  formatDate(value?: string): string {
    return formatDate(value);
  }

  /** Relative formatter ("hace X min") — shared with project-overview. */
  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }

  trackProject = (_i: number, p: DashboardRecentProject): string => p._id;
  trackTask    = (_i: number, t: DashboardMyTask): string => t._id;
  trackActivity = (_i: number, a: DashboardActivityEntry): string => a._id;

  /** True when the user has nothing in the workspace yet. */
  protected readonly isEmptyWorkspace = computed(() => {
    const o = this.overview();
    if (!o) return false;
    return o.stats.totalTeams === 0 && o.stats.totalProjects === 0;
  });
}
