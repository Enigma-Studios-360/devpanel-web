import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { API_CONFIG } from '../../core/services/api.config';
import { TPipe } from '../../core/i18n/t.pipe';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { TeamsService, type TeamWithRole } from '../../core/services/teams.service';
import {
  SubscriptionsService,
  type Subscription,
} from '../../core/services/subscription.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import type { Plan, PlanCode } from '../../shared/models/plan.model';

interface ApiSuccess<T> { success: true; data: T; }

@Component({
  selector: 'dp-pricing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TPipe,
    PageHeaderComponent,
    LoadingStateComponent,
  ],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class PricingComponent {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly teamsApi = inject(TeamsService);
  private readonly subsApi = inject(SubscriptionsService);
  private readonly authState = inject(AuthStateService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly authenticated = computed(() =>
    this.authState.isAuthenticated(),
  );
  protected readonly teams = signal<TeamWithRole[]>([]);
  protected readonly selectedTeamId = signal<string>('');
  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly upgrading = signal<PlanCode | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    this.http
      .get<ApiSuccess<Plan[]>>(`${this.api.baseUrl}/api/plans`)
      .subscribe({
        next: (res) => {
          this.plans.set(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el catálogo de planes.');
          this.loading.set(false);
        },
      });

    if (this.authState.isAuthenticated()) {
      this.teamsApi.list().subscribe({
        next: (teams) => {
          this.teams.set(teams);
          const fromQuery = this.route.snapshot.queryParamMap.get('teamId') ?? '';
          const initial = fromQuery || teams[0]?.team._id || '';
          if (initial) this.onTeamChange(initial);
        },
      });
    }
  }

  onTeamChange(teamId: string): void {
    this.selectedTeamId.set(teamId);
    this.notice.set(null);
    if (!teamId) {
      this.subscription.set(null);
      return;
    }
    this.subsApi.forTeam(teamId).subscribe({
      next: (s) => this.subscription.set(s),
      error: () => this.subscription.set(null),
    });
  }

  selectedTeamRole(): string | null {
    const id = this.selectedTeamId();
    return this.teams().find((t) => t.team._id === id)?.role ?? null;
  }

  canUpgrade(): boolean {
    const role = this.selectedTeamRole();
    return role === 'OWNER' || role === 'ADMIN';
  }

  isCurrentPlan(plan: PlanCode): boolean {
    return this.subscription()?.plan === plan;
  }

  upgrade(plan: PlanCode): void {
    const teamId = this.selectedTeamId();
    if (!teamId || this.upgrading()) return;
    this.upgrading.set(plan);
    this.notice.set(null);
    this.subsApi.simulateUpgrade(teamId, plan).subscribe({
      next: (s) => {
        this.subscription.set(s);
        this.upgrading.set(null);
        this.notice.set(`Plan cambiado a ${s.plan} correctamente (simulado).`);
        // Refresh team list so projectsCount and plan stay in sync
        this.teamsApi.list().subscribe({ next: (t) => this.teams.set(t) });
      },
      error: (err) => {
        this.upgrading.set(null);
        const msg = err?.error?.error?.message ?? 'No se pudo simular el upgrade.';
        this.notice.set(msg);
      },
    });
  }
}
