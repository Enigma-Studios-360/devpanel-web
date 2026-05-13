import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TPipe } from '../../../core/i18n/t.pipe';
import {
  ApiHealthService,
  type ApiHealthState,
} from '../../../core/services/api-health.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { StatsCardComponent } from '../../../shared/components/stats-card/stats-card';
import { LearnMoreCardComponent } from '../../../shared/components/learn-more-card/learn-more-card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge';
import { formatUptime } from '../../../shared/utils/format-date';
import { TutorialService } from '../../../core/tutorial/tutorial.service';
import { TeamsService } from '../../../core/services/teams.service';

@Component({
  selector: 'dp-home-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TPipe,
    PageHeaderComponent,
    StatsCardComponent,
    LearnMoreCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
})
export class HomeDashboardComponent {
  private readonly health = inject(ApiHealthService);
  private readonly tutorial = inject(TutorialService);
  private readonly teamsApi = inject(TeamsService);

  protected readonly state = signal<ApiHealthState | null>(null);
  protected readonly loading = signal<boolean>(true);

  constructor() {
    this.refresh();
    this.bootstrapTour();
  }

  /**
   * Smart auto-start logic:
   *  - If the user has never seen the welcome tour → run it.
   *  - Otherwise, if they have NO teams yet AND haven't done the teams tour → run that.
   *  - Otherwise, do nothing (they can re-trigger from the help button).
   */
  private bootstrapTour(): void {
    if (!this.tutorial.hasCompleted('welcome-tour')) {
      this.tutorial.maybeAutoStartFirstTime('welcome-tour');
      return;
    }
    // Already saw welcome — nudge them toward creating their first team
    if (!this.tutorial.hasCompleted('teams-tour')) {
      this.teamsApi.list().subscribe({
        next: (teams) => {
          if (teams.length === 0) {
            this.tutorial.maybeAutoStartFirstTime('teams-tour');
          }
        },
      });
    }
  }

  refresh(): void {
    this.loading.set(true);
    this.health.check().subscribe((res) => {
      this.state.set(res);
      this.loading.set(false);
    });
  }

  formatUptime(value: number | undefined): string {
    return formatUptime(value);
  }
}
