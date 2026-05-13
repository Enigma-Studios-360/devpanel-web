import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, type Observable } from 'rxjs';
import { TUTORIALS } from './tutorials';
import type { Tutorial, TutorialAction, TutorialStep } from './tutorial.types';

const COMPLETED_KEY = 'devpanel.tutorial.completed';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly router = inject(Router);

  /** All tutorials available in the catalog. */
  readonly catalog: readonly Tutorial[] = TUTORIALS;

  /**
   * Stream of side-effect actions emitted as the user advances through a
   * tour. Components subscribe to `actions$` and react when their key
   * matches (e.g. open a modal, focus an input).
   */
  private readonly actionSubject = new Subject<TutorialAction>();
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

  /** Start (or restart) a tutorial by id. */
  start(id: string): void {
    const tutorial = this.catalog.find((t) => t.id === id);
    if (!tutorial || tutorial.steps.length === 0) return;
    this.activeIdSignal.set(id);
    this.indexSignal.set(0);
    this.maybeNavigate(tutorial.steps[0]);
  }

  next(): void {
    const t = this.currentTutorial();
    if (!t) return;
    const nextIdx = this.indexSignal() + 1;
    if (nextIdx >= t.steps.length) {
      this.complete();
      return;
    }
    this.indexSignal.set(nextIdx);
    this.maybeNavigate(t.steps[nextIdx]);
  }

  /**
   * Unified "primary action" of the tooltip. This is what the bottom-right
   * button does in every step:
   *   - If the step has a `cta`, navigate there first.
   *   - Then either advance to the next step OR mark the tour as complete
   *     if this was the last one.
   *
   * Crucially, a CTA on the LAST step both navigates AND completes — so the
   * user finishes the tour exactly where they are supposed to act next, in
   * a single click. No more "Finalizar" that quietly throws away the CTA.
   */
  proceed(): void {
    const tour = this.currentTutorial();
    if (!tour) return;
    const idx = this.indexSignal();
    const step = tour.steps[idx];
    if (!step) return;

    const isLast = idx === tour.steps.length - 1;
    let navigatedByCta = false;

    if (step.cta) {
      const queryParams = step.cta.query;
      void this.router.navigate(
        [step.cta.route],
        queryParams ? { queryParams } : {},
      );
      navigatedByCta = true;
    }

    // Fire side-effect action (e.g. "open the create-team modal"). It runs
    // AFTER cta navigation so the component receiving it is already mounted
    // on the destination route — `Subject.next` is synchronous, so the
    // subscriber's microtask runs after the router has queued navigation.
    if (step.action) {
      this.actionSubject.next(step.action);
    }

    if (isLast) {
      this.complete();
      return;
    }

    this.indexSignal.set(idx + 1);
    if (!navigatedByCta) {
      const nextStep = tour.steps[idx + 1];
      if (nextStep) this.maybeNavigate(nextStep);
    }
  }

  previous(): void {
    const idx = this.indexSignal();
    if (idx <= 0) return;
    this.indexSignal.set(idx - 1);
    const t = this.currentTutorial();
    if (t) this.maybeNavigate(t.steps[idx - 1]);
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
    if (typeof localStorage === 'undefined') return false;
    return this.readCompleted().includes(id);
  }

  /** Suggest the welcome tour to a brand new user. */
  maybeAutoStartFirstTime(id: string = 'welcome-tour'): void {
    if (this.hasCompleted(id) || this.isActive()) return;
    // Defer slightly so the destination route has rendered targets.
    setTimeout(() => this.start(id), 600);
  }

  /**
   * Activate the current step's CTA: navigate to the configured route
   * (with optional query params) and advance the tour. The overlay will
   * relocate the spotlight on the new page automatically.
   */
  followCta(): void {
    const step = this.currentStep();
    if (!step?.cta) return;
    const queryParams = step.cta.query;
    void this.router.navigate([step.cta.route], queryParams ? { queryParams } : {});
    // Auto-advance so the next step is shown on the destination page.
    this.next();
  }

  private maybeNavigate(step: TutorialStep): void {
    if (step.route && this.router.url.split('?')[0] !== step.route) {
      void this.router.navigateByUrl(step.route);
    }
  }

  private markCompleted(id: string): void {
    if (typeof localStorage === 'undefined') return;
    const list = this.readCompleted();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(list));
    }
  }

  private readCompleted(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(COMPLETED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
}
