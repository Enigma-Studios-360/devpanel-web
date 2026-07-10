import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { formatDate } from '../../shared/utils/format-date';

import {
  GithubService,
  type RepoInfo,
  type CommitItem,
  type BranchItem,
  type IssueItem,
  type StackDetectionResult,
  type GithubConnection,
  type MyRepo,
} from '../../core/services/github.service';
import { ProjectsService } from '../../core/services/projects.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SubscriptionsService, type Subscription } from '../../core/services/subscription.service';
import { ProjectImportComponent } from './project-import/project-import';
import type { Project } from '../../shared/models/project.model';

type Tab = 'commits' | 'branches' | 'issues';

@Component({
  selector: 'dp-project-github',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    LearnMoreCardComponent,
    ProjectImportComponent,
  ],
  templateUrl: './project-github.html',
  styleUrl: './project-github.scss',
})
export class ProjectGithubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly githubApi = inject(GithubService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly subsApi = inject(SubscriptionsService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmSvc = inject(ConfirmService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly subscription = signal<Subscription | null>(null);

  /**
   * Whether the project's team plan allows private repos. Frontend gate
   * only — the backend always re-checks `subscription.limits.canUseGithubPrivateRepos`
   * when the link is created with a private repo.
   */
  protected readonly canUsePrivateRepos = computed(
    () => this.subscription()?.limits?.canUseGithubPrivateRepos ?? false,
  );

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly loading = signal(true);
  protected readonly project = signal<Project | null>(null);
  protected readonly repo = signal<RepoInfo | null>(null);

  protected readonly linkForm = this.fb.nonNullable.group({
    input: ['', [Validators.required, Validators.minLength(3)]],
  });
  protected readonly linking = signal(false);
  protected readonly linkError = signal<string | null>(null);

  protected readonly tab = signal<Tab>('commits');
  protected readonly tabLoading = signal(false);
  protected readonly commits = signal<CommitItem[]>([]);
  protected readonly branches = signal<BranchItem[]>([]);
  protected readonly issues = signal<IssueItem[]>([]);
  protected readonly issueState = signal<'open' | 'closed' | 'all'>('open');
  protected readonly tabError = signal<string | null>(null);

  // Create issue modal
  protected readonly issueModal = signal(false);
  protected readonly issueForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(256)]],
    body: [''],
  });
  protected readonly creatingIssue = signal(false);
  protected readonly issueError = signal<string | null>(null);

  // Unlink
  protected readonly unlinking = signal(false);

  // Per-user GitHub OAuth connection
  protected readonly ghConn = signal<GithubConnection | null>(null);
  protected readonly connecting = signal(false);

  // Repo picker (repos of the connected GitHub account)
  protected readonly myRepos = signal<MyRepo[] | null>(null);
  protected readonly reposLoading = signal(false);
  protected readonly repoFilter = signal('');
  /** fullName of the repo currently being linked from the list. */
  protected readonly linkingRepo = signal<string | null>(null);

  protected readonly filteredRepos = computed(() => {
    const all = this.myRepos() ?? [];
    const q = this.repoFilter().trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.language ?? '').toLowerCase().includes(q),
    );
  });

  // Stack detection
  protected readonly stackDetection = signal<StackDetectionResult | null>(null);
  protected readonly detectingStack = signal(false);
  protected readonly detectStackError = signal<string | null>(null);

  constructor() {
    this.refresh();
    this.refreshGithubConnection();
  }

  // --- Per-user GitHub OAuth ------------------------------------------------

  refreshGithubConnection(): void {
    this.githubApi.oauthStatus().subscribe({
      next: (c) => {
        this.ghConn.set(c);
        if (c.connected) this.loadMyRepos();
      },
      error: () => this.ghConn.set(null),
    });
  }

  /** Repos of the connected account, for the one-click picker. */
  loadMyRepos(): void {
    if (this.reposLoading()) return;
    this.reposLoading.set(true);
    this.githubApi.myRepos().subscribe({
      next: (repos) => {
        this.myRepos.set(repos);
        this.reposLoading.set(false);
      },
      error: () => {
        this.myRepos.set(null);
        this.reposLoading.set(false);
      },
    });
  }

  /** One-click link straight from the picker list. */
  linkFromList(r: MyRepo): void {
    if (this.linkingRepo()) return;
    this.linkingRepo.set(r.fullName);
    this.linkError.set(null);
    this.githubApi.link(this.projectId(), r.fullName).subscribe({
      next: (repo) => {
        this.repo.set(repo);
        this.linkingRepo.set(null);
        this.loadCurrentTab();
        this.refresh();
      },
      error: (err) => {
        this.linkingRepo.set(null);
        this.linkError.set(err?.error?.error?.message ?? 'No se pudo vincular el repositorio.');
      },
    });
  }

  onRepoFilterInput(event: Event): void {
    this.repoFilter.set((event.target as HTMLInputElement).value);
  }

  /** Tras importar un ZIP, el repo quedó creado y vinculado: recarga la vista. */
  onProjectImported(): void {
    this.refresh();
  }

  /** Kick off the OAuth flow: get the authorize URL, then send the browser there. */
  connectGithub(): void {
    if (this.connecting()) return;
    this.connecting.set(true);
    this.githubApi.oauthStartUrl().subscribe({
      next: (url) => {
        window.location.href = url;
      },
      error: () => this.connecting.set(false),
    });
  }

  disconnectGithub(): void {
    this.githubApi.oauthDisconnect().subscribe({
      next: () => this.refreshGithubConnection(),
      error: () => this.refreshGithubConnection(),
    });
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    this.projectsApi.getWithRole(id).subscribe({
      next: ({ project, userRole }) => {
        this.project.set(project);
        this.permissions.setRole(userRole);
        // Best-effort: fetch subscription so we can show the private-repo
        // plan note. We don't block the page on this — if it fails the
        // form still works and the backend enforces the gate.
        if (project.team) {
          this.subsApi.forTeam(project.team).subscribe({
            next: (sub) => this.subscription.set(sub),
            error: () => this.subscription.set(null),
          });
        }
        if (project.githubOwner && project.githubRepo) {
          this.loadRepoInfo();
        } else {
          this.repo.set(null);
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadRepoInfo(): void {
    const id = this.projectId();
    this.githubApi.info(id).subscribe({
      next: (repo) => {
        this.repo.set(repo);
        this.loading.set(false);
        this.loadCurrentTab();
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  formatDate(value?: string | null): string {
    return formatDate(value ?? undefined);
  }

  // Link / Unlink ---------------------------------------------------------

  link(): void {
    if (this.linkForm.invalid || this.linking()) return;
    const value = this.linkForm.controls.input.value.trim();
    this.linking.set(true);
    this.linkError.set(null);
    this.githubApi.link(this.projectId(), value).subscribe({
      next: (repo) => {
        this.repo.set(repo);
        this.linking.set(false);
        this.linkForm.reset({ input: '' });
        this.loadCurrentTab();
        this.refresh();
      },
      error: (err) => {
        this.linking.set(false);
        this.linkError.set(err?.error?.error?.message ?? 'No se pudo vincular el repositorio.');
      },
    });
  }

  async unlink(): Promise<void> {
    if (this.unlinking()) return;
    const ok = await this.confirmSvc.ask({
      title: 'Desvincular repositorio',
      message:
        'Se eliminará la conexión entre este proyecto y el repo de GitHub. ' +
        'El proyecto y su contenido siguen intactos — solo se desconecta la integración.',
      confirmLabel: 'Desvincular',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'pi-github',
    });
    if (!ok) return;
    this.unlinking.set(true);
    this.githubApi.unlink(this.projectId()).subscribe({
      next: () => {
        this.unlinking.set(false);
        this.repo.set(null);
        this.commits.set([]);
        this.branches.set([]);
        this.issues.set([]);
        this.refresh();
      },
      error: () => {
        this.unlinking.set(false);
      },
    });
  }

  // Tabs ------------------------------------------------------------------

  selectTab(t: Tab): void {
    if (t === this.tab()) return;
    this.tab.set(t);
    this.loadCurrentTab();
  }

  loadCurrentTab(): void {
    const id = this.projectId();
    const t = this.tab();
    this.tabLoading.set(true);
    this.tabError.set(null);
    if (t === 'commits') {
      this.githubApi.commits(id).subscribe({
        next: (c) => { this.commits.set(c); this.tabLoading.set(false); },
        error: (err) => this.handleTabErr(err),
      });
    } else if (t === 'branches') {
      this.githubApi.branches(id).subscribe({
        next: (b) => { this.branches.set(b); this.tabLoading.set(false); },
        error: (err) => this.handleTabErr(err),
      });
    } else {
      this.githubApi.issues(id, this.issueState()).subscribe({
        next: (i) => { this.issues.set(i); this.tabLoading.set(false); },
        error: (err) => this.handleTabErr(err),
      });
    }
  }

  setIssueState(state: 'open' | 'closed' | 'all'): void {
    if (state === this.issueState()) return;
    this.issueState.set(state);
    this.loadCurrentTab();
  }

  private handleTabErr(err: { error?: { error?: { message?: string } } }): void {
    this.tabLoading.set(false);
    this.tabError.set(err?.error?.error?.message ?? 'No se pudo cargar.');
  }

  // Issue modal -----------------------------------------------------------

  openIssueModal(): void {
    this.issueForm.reset({ title: '', body: '' });
    this.issueError.set(null);
    this.issueModal.set(true);
  }

  closeIssueModal(): void { this.issueModal.set(false); }

  submitIssue(): void {
    if (this.issueForm.invalid || this.creatingIssue()) return;
    const v = this.issueForm.getRawValue();
    this.creatingIssue.set(true);
    this.issueError.set(null);
    this.githubApi.createIssue(this.projectId(), v.title, v.body || undefined).subscribe({
      next: (issue) => {
        this.creatingIssue.set(false);
        this.issueModal.set(false);
        // Add at top of list
        this.issues.update((arr) => [issue, ...arr]);
      },
      error: (err) => {
        this.creatingIssue.set(false);
        this.issueError.set(err?.error?.error?.message ?? 'No se pudo crear el issue.');
      },
    });
  }

  // --- Stack detection ----------------------------------------------------

  /** Pure helper so the template can render a friendly category label. */
  categoryLabel(category: string): string {
    switch (category) {
      case 'frontend':  return 'Frontend';
      case 'backend':   return 'Backend';
      case 'fullstack': return 'Fullstack';
      case 'mobile':    return 'Móvil';
      case 'language':  return 'Lenguaje';
      case 'tooling':   return 'Tooling';
      default:          return category;
    }
  }

  /** Force a re-run of the rule-based stack detection. */
  detectStack(): void {
    if (this.detectingStack()) return;
    this.detectingStack.set(true);
    this.detectStackError.set(null);
    this.githubApi.detectStack(this.projectId()).subscribe({
      next: (result) => {
        this.stackDetection.set(result);
        this.detectingStack.set(false);
      },
      error: (err) => {
        this.detectingStack.set(false);
        this.detectStackError.set(
          err?.error?.error?.message ?? 'No se pudo analizar el repositorio.',
        );
      },
    });
  }
}
