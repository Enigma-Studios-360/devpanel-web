import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { TeamRole } from '../../shared/models/team.model';

/**
 * Centralized permission contract for the current team/project scope.
 *
 * The active role is set by the component that owns the scope (e.g. the
 * project overview after the dashboard response arrives, or the teams list
 * before navigating into a team). Computed signals expose intent-level
 * predicates so templates can read `permissions.canEditTasks()` instead of
 * sprinkling `role === 'VIEWER'` checks across the codebase.
 *
 * Role contract (mirror of backend, see team-context.middleware.ts):
 *   OWNER, ADMIN              → project settings + work artifacts
 *   OWNER, ADMIN, DEVELOPER   → work artifacts (tasks, comments, docs, issues)
 *   VIEWER                    → read-only
 *
 * The backend re-validates every write, so this service is UX only. Hiding
 * a button without server enforcement would be a security bug; the reverse
 * (server blocks but UI still shows) is merely annoying.
 *
 * ## Why we clear on scope change
 *
 * Without this, a user who is OWNER on Team A and VIEWER on Team B would
 * briefly see OWNER UI on the Team B project page until the new dashboard
 * response landed. The role would be "stuck" from the previous scope.
 *
 * The fix: every NavigationEnd we extract a `scopeKey` from the URL
 * (project id or team id) and, when it changes, we wipe the role. The
 * destination component will set it again as soon as its API call lands.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly router = inject(Router);

  private readonly roleSignal = signal<TeamRole | null>(null);
  private readonly scopeSignal = signal<string | null>(null);

  readonly role = this.roleSignal.asReadonly();
  readonly scope = this.scopeSignal.asReadonly();

  constructor() {
    // Initial scope from the current URL (in case the service is created
    // mid-session, e.g. via lazy chunk).
    this.scopeSignal.set(this.deriveScope(this.router.url));

    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) return;
      const nextScope = this.deriveScope(evt.urlAfterRedirects);
      if (nextScope !== this.scopeSignal()) {
        // Scope changed (different project / team / or leaving the app
        // shell entirely). Wipe the cached role so stale OWNER markers
        // don't leak into a VIEWER scope while the new request is in flight.
        this.scopeSignal.set(nextScope);
        this.roleSignal.set(null);
      }
    });
  }

  /**
   * Extract a stable scope key from a URL. Returns the project id when
   * navigating inside `/app/projects/:id/...`, the team id when navigating
   * inside `/app/teams/:id/...`, or null otherwise. Tasks and other nested
   * routes inherit their parent project's scope.
   */
  private deriveScope(url: string): string | null {
    const path = url.split('?')[0];
    const project = path.match(/^\/app\/projects\/([^/]+)/);
    if (project) return `project:${project[1]}`;
    const team = path.match(/^\/app\/teams\/([^/]+)/);
    if (team) return `team:${team[1]}`;
    return null;
  }

  setRole(role: TeamRole | null | undefined): void {
    this.roleSignal.set(role ?? null);
  }

  clear(): void {
    this.roleSignal.set(null);
  }

  // --- Identity predicates ---------------------------------------------------

  readonly isOwner = computed(() => this.roleSignal() === 'OWNER');
  readonly isAdmin = computed(() => this.roleSignal() === 'ADMIN');
  readonly isDeveloper = computed(() => this.roleSignal() === 'DEVELOPER');
  readonly isViewer = computed(() => this.roleSignal() === 'VIEWER');

  // --- Action predicates -----------------------------------------------------

  /** Create projects, edit project settings, archive projects. */
  readonly canManageProject = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN';
  });

  /** Create / edit / move tasks, manage comments. */
  readonly canEditTasks = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN' || r === 'DEVELOPER';
  });

  /** Edit any of the 9 doc sections + generate README. */
  readonly canEditDocs = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN' || r === 'DEVELOPER';
  });

  /** Link / unlink a GitHub repository (settings-level). */
  readonly canManageGithub = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN';
  });

  /** Create GitHub issues from DevHub. */
  readonly canCreateGithubIssue = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN' || r === 'DEVELOPER';
  });

  /** Trigger simulate-upgrade on a team subscription. */
  readonly canUpgradePlan = computed(() => {
    const r = this.roleSignal();
    return r === 'OWNER' || r === 'ADMIN';
  });
}
