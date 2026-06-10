import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject, type Observable } from 'rxjs';
import { TUTORIALS } from './tutorials';
import type {
  Tutorial,
  TutorialAction,
  TutorialEventKey,
  TutorialStep,
} from './tutorial.types';
import { PermissionsService } from '../auth/permissions.service';
import { readWithMigration, safeSet, safeRemove } from '../storage/migrate';

const COMPLETED_KEY = 'devhub.tutorial.completed';
const COMPLETED_LEGACY_KEY = 'devpanel.tutorial.completed';
/**
 * Separate key from COMPLETED_KEY: tracks whether we already AUTO-STARTED
 * a tour for this user, regardless of whether they completed or skipped it.
 *
 * Why: if we used COMPLETED_KEY for the auto-start guard, a user who ESC'd
 * out of the welcome tour would see it pop up every single time they hit
 * the dashboard until they clicked through to the end. Tracking auto-start
 * separately means "we already proposed it once; don't be annoying."
 */
const AUTOSTART_KEY = 'devhub.tutorial.autostarted';
const AUTOSTART_LEGACY_KEY = 'devpanel.tutorial.autostarted';

/**
 * Buffer window for the action stream. Components that subscribe within
 * this window after a tour action emits will still receive it — covers
 * the case where the action is fired during a router.navigate() and the
 * destination component is lazy-loaded (the subscription wires up AFTER
 * the emit).
 */
const ACTION_REPLAY_WINDOW_MS = 2_000;

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly router = inject(Router);
  private readonly permissions = inject(PermissionsService);

  /** All tutorials available in the catalog. */
  readonly catalog: readonly Tutorial[] = TUTORIALS;

  /**
   * Stream of side-effect actions emitted as the user advances through a
   * tour. Components subscribe to `actions$` and react when their key
   * matches (e.g. open a modal, focus an input).
   *
   * Uses a ReplaySubject with a 2s window so lazy-loaded components that
   * mount slightly after the emit still receive the action.
   */
  private readonly actionSubject = new ReplaySubject<TutorialAction>(
    1,
    ACTION_REPLAY_WINDOW_MS,
  );
  readonly actions$: Observable<TutorialAction> = this.actionSubject.asObservable();

  private readonly activeIdSignal = signal<string | null>(null);
  private readonly indexSignal = signal(0);

  readonly activeId = this.activeIdSignal.asReadonly();
  readonly stepIndex = this.indexSignal.asReadonly();
  readonly isActive = computed(() => this.activeIdSignal() !== null);

  readonly currentTutorial = computed<Tutorial | null>(() => {
    const id = this.activeIdSignal();
    if (!id) return null;
    return this.catalog.find((t) => t.id === id) ?? null;
  });

  readonly currentStep = computed<TutorialStep | null>(() => {
    const t = this.currentTutorial();
    if (!t) return null;
    return t.steps[this.indexSignal()] ?? null;
  });

  readonly stepsTotal = computed(() => this.currentTutorial()?.steps.length ?? 0);

  /** True when the current step is the last in the tour. */
  readonly isLastStep = computed(
    () => this.indexSignal() === this.stepsTotal() - 1,
  );

  /**
   * True when the current step has a `waitFor` and is still waiting for
   * the matching event. The overlay uses this to render the "Esperando…"
   * state and to disable manual advance.
   */
  private readonly waitingForSignal = signal<TutorialEventKey | null>(null);
  readonly waitingFor = this.waitingForSignal.asReadonly();
  readonly isWaiting = computed(() => this.waitingForSignal() !== null);

  /** Start (or restart) a tutorial by id. */
  start(id: string): void {
    const tutorial = this.catalog.find((t) => t.id === id);
    if (!tutorial || tutorial.steps.length === 0) return;
    this.activeIdSignal.set(id);
    // Find the first step the current role can actually see.
    const firstAllowed = this.findNextAllowedIndex(tutorial, 0);
    if (firstAllowed === -1) {
      // No step is visible for this role — nothing to show.
      this.activeIdSignal.set(null);
      return;
    }
    this.indexSignal.set(firstAllowed);
    this.enterStep(tutorial.steps[firstAllowed]);
  }

  next(): void {
    const t = this.currentTutorial();
    if (!t) return;
    const candidate = this.indexSignal() + 1;
    const nextIdx = this.findNextAllowedIndex(t, candidate);
    if (nextIdx === -1) {
      this.complete();
      return;
    }
    this.indexSignal.set(nextIdx);
    this.enterStep(t.steps[nextIdx]);
  }

  /**
   * Unified "primary action" of the tooltip. This is what the bottom-right
   * button does in every step:
   *   - If the step has a `cta`, navigate there first.
   *   - Then either advance to the next step OR mark the tour as complete
   *     if this was the last one.
   */
  proceed(): void {
    const tour = this.currentTutorial();
    if (!tour) return;
    const idx = this.indexSignal();
    const step = tour.steps[idx];
    if (!step) return;

    const isLast = this.isLastStep();
    let navigatedByCta = false;

    if (step.cta) {
      const queryParams = step.cta.query;
      void this.router.navigate(
        [step.cta.route],
        queryParams ? { queryParams } : {},
      );
      navigatedByCta = true;
    }

    // Fire side-effect action (e.g. "open the create-team modal").
    // ReplaySubject with a 2s window covers the lazy-load race.
    if (step.action) {
      this.actionSubject.next(step.action);
    }

    if (isLast) {
      this.complete();
      return;
    }

    const nextIdx = this.findNextAllowedIndex(tour, idx + 1);
    if (nextIdx === -1) {
      this.complete();
      return;
    }
    this.indexSignal.set(nextIdx);
    const nextStep = tour.steps[nextIdx];
    if (nextStep) {
      // If the CTA already navigated, don't double-navigate; still arm
      // any waitFor/action the new step needs.
      this.enterStep(nextStep, { skipNavigate: navigatedByCta });
    }
  }

  previous(): void {
    const t = this.currentTutorial();
    if (!t) return;
    const candidate = this.indexSignal() - 1;
    const prevIdx = this.findPrevAllowedIndex(t, candidate);
    if (prevIdx === -1) return;
    this.indexSignal.set(prevIdx);
    this.enterStep(t.steps[prevIdx]);
  }

  /** Advance past a step whose target wasn't found in the DOM. */
  skipMissing(): void {
    this.next();
  }

  /** Skip the rest of the tutorial without marking it complete. */
  skip(): void {
    this.activeIdSignal.set(null);
    this.indexSignal.set(0);
  }

  /** Finish the tutorial and remember that the user completed it. */
  complete(): void {
    const id = this.activeIdSignal();
    if (id) this.markCompleted(id);
    this.activeIdSignal.set(null);
    this.indexSignal.set(0);
  }

  /** Stop without marking complete (e.g. on route change). */
  stop(): void {
    this.activeIdSignal.set(null);
    this.indexSignal.set(0);
  }

  hasCompleted(id: string): boolean {
    return this.readListKey(COMPLETED_KEY, COMPLETED_LEGACY_KEY).includes(id);
  }

  private hasAutoStarted(id: string): boolean {
    return this.readListKey(AUTOSTART_KEY, AUTOSTART_LEGACY_KEY).includes(id);
  }

  private markAutoStarted(id: string): void {
    const list = this.readListKey(AUTOSTART_KEY, AUTOSTART_LEGACY_KEY);
    if (!list.includes(id)) {
      list.push(id);
      safeSet(AUTOSTART_KEY, JSON.stringify(list));
    }
  }

  /**
   * Suggest the welcome tour to a brand new user. Only fires ONCE per
   * browser (regardless of whether they completed or skipped it) — the
   * help-button stays as the way to re-launch it.
   */
  maybeAutoStartFirstTime(id: string = 'welcome-tour'): void {
    if (
      this.hasCompleted(id) ||
      this.hasAutoStarted(id) ||
      this.isActive()
    ) {
      return;
    }
    this.markAutoStarted(id);
    // Defer slightly so the destination route has rendered targets.
    setTimeout(() => this.start(id), 600);
  }

  /**
   * Activate the current step's CTA: navigate to the configured route
   * (with optional query params) and advance the tour.
   */
  followCta(): void {
    const step = this.currentStep();
    if (!step?.cta) return;
    const queryParams = step.cta.query;
    void this.router.navigate([step.cta.route], queryParams ? { queryParams } : {});
    // Auto-advance so the next step is shown on the destination page.
    this.next();
  }

  /** Whether the current role is allowed to see the given step. */
  private isStepAllowedForRole(step: TutorialStep): boolean {
    if (!step.requiresRole || step.requiresRole.length === 0) return true;
    const role = this.permissions.role();
    // If we don't know the role yet (e.g. tour started before role
    // hydration), be permissive — the overlay's "missing target" fallback
    // will still give the user a way out.
    if (!role) return true;
    return step.requiresRole.includes(role);
  }

  /** Find the next step index (>= from) the role can see. -1 if none. */
  private findNextAllowedIndex(tour: Tutorial, from: number): number {
    for (let i = from; i < tour.steps.length; i++) {
      if (this.isStepAllowedForRole(tour.steps[i])) return i;
    }
    return -1;
  }

  /** Find the previous step index (<= from) the role can see. -1 if none. */
  private findPrevAllowedIndex(tour: Tutorial, from: number): number {
    for (let i = Math.min(from, tour.steps.length - 1); i >= 0; i--) {
      if (this.isStepAllowedForRole(tour.steps[i])) return i;
    }
    return -1;
  }

  /**
   * Per-step setup. Arms the optional `waitFor` and handles the optional
   * route change so a single helper owns the "entering a step" lifecycle
   * — start, next, previous and CTA-advance all delegate here.
   *
   * Special case: a step with BOTH `action` and `waitFor` fires the
   * action on entry. The primary button is disabled while waiting, so
   * if we didn't fire here the user would never see the modal open and
   * be stuck staring at "Esperando…" forever.
   *
   * The action fires through a microtask + 200ms deferral so the new
   * step's component (which may be lazy-loaded after maybeNavigate has
   * triggered a router change) gets a chance to subscribe to actions$
   * before the ReplaySubject buffer flushes.
   */
  private enterStep(step: TutorialStep, opts: { skipNavigate?: boolean } = {}): void {
    this.waitingForSignal.set(step.waitFor ?? null);
    if (!opts.skipNavigate) this.maybeNavigate(step);
    if (step.waitFor && step.action) {
      const action = step.action;
      setTimeout(() => this.actionSubject.next(action), 220);
    }
  }

  /**
   * Components call this when the user actually completes the modeled
   * action (team created, project created, etc.). If we're parked on a
   * matching `waitFor` step, advance automatically.
   *
   * Safe to call from anywhere — when no tour is active, it's a no-op.
   */
  emitEvent(key: TutorialEventKey): void {
    if (!this.isActive()) return;
    if (this.waitingForSignal() !== key) return;
    // Clear the wait BEFORE advancing so the overlay's effect sees a
    // consistent state when it re-evaluates the new step.
    this.waitingForSignal.set(null);
    this.next();
  }

  /**
   * Nuke EVERY tutorial progress flag. Used by the "Reiniciar guía"
   * action so the user can replay the onboarding from scratch.
   */
  resetAll(): void {
    safeRemove(COMPLETED_KEY);
    safeRemove(AUTOSTART_KEY);
    safeRemove(COMPLETED_LEGACY_KEY);
    safeRemove(AUTOSTART_LEGACY_KEY);
    this.activeIdSignal.set(null);
    this.indexSignal.set(0);
    this.waitingForSignal.set(null);
  }

  private maybeNavigate(step: TutorialStep): void {
    if (step.route && this.router.url.split('?')[0] !== step.route) {
      void this.router.navigateByUrl(step.route);
    }
  }

  private markCompleted(id: string): void {
    const list = this.readListKey(COMPLETED_KEY, COMPLETED_LEGACY_KEY);
    if (!list.includes(id)) {
      list.push(id);
      safeSet(COMPLETED_KEY, JSON.stringify(list));
    }
  }

  private readListKey(key: string, legacyKey: string): string[] {
    const raw = readWithMigration(key, legacyKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
}
