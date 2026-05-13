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
} from '../../core/services/github.service';
import { ProjectsService } from '../../core/services/projects.service';
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
  ],
  templateUrl: './project-github.html',
  styleUrl: './project-github.scss',
})
export class ProjectGithubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly githubApi = inject(GithubService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);

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

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    this.projectsApi.get(id).subscribe({
      next: (project) => {
        this.project.set(project);
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

  unlink(): void {
    if (this.unlinking()) return;
    const ok = typeof confirm !== 'undefined'
      ? confirm('¿Desvincular el repositorio? El proyecto seguirá existiendo, solo se quita la conexión a GitHub.')
      : true;
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
}
