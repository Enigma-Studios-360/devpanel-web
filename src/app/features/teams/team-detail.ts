import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import {
  TeamsService,
  type TeamMemberWithUser,
} from '../../core/services/teams.service';
import { SubscriptionsService, type Subscription } from '../../core/services/subscription.service';
import type { Team, TeamRole } from '../../shared/models/team.model';

@Component({
  selector: 'dp-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    LearnMoreCardComponent,
  ],
  templateUrl: './team-detail.html',
  styleUrl: './teams.scss',
})
export class TeamDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly teamsApi = inject(TeamsService);
  private readonly subsApi = inject(SubscriptionsService);

  protected readonly loading = signal(true);
  protected readonly team = signal<Team | null>(null);
  protected readonly role = signal<TeamRole | null>(null);
  protected readonly members = signal<TeamMemberWithUser[]>([]);
  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly teamId = computed(
    () => this.route.snapshot.paramMap.get('teamId') ?? '',
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const id = this.teamId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.teamsApi.get(id).toPromise(),
      this.teamsApi.members(id).toPromise(),
      this.subsApi.forTeam(id).toPromise(),
    ])
      .then(([t, m, s]) => {
        this.team.set(t?.team ?? null);
        this.role.set(t?.role ?? null);
        this.members.set(m ?? []);
        this.subscription.set(s ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudo cargar la información del equipo.');
        this.loading.set(false);
      });
  }

  memberName(m: TeamMemberWithUser): string {
    return typeof m.user === 'string' ? m.user : m.user.name;
  }

  memberEmail(m: TeamMemberWithUser): string {
    return typeof m.user === 'string' ? '' : m.user.email;
  }
}
