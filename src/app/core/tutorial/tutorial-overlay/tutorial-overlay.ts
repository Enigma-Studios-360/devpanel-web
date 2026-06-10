import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TutorialService } from '../tutorial.service';
import type { TutorialStep } from '../tutorial.types';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrow: 'top' | 'bottom' | 'left' | 'right';
}

const PADDING = 8;
const TOOLTIP_GAP = 14;
const TOOLTIP_W = 320;
const TOOLTIP_H_FALLBACK = 200; // used until the tooltip renders and reports its real height

@Component({
  selector: 'dp-tutorial-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorial-overlay.html',
  styleUrl: './tutorial-overlay.scss',
})
export class TutorialOverlayComponent implements OnDestroy, AfterViewChecked {
  protected readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);
  private routerSub?: Subscription;

  protected readonly spotlight = signal<SpotlightRect | null>(null);
  protected readonly tooltip = signal<TooltipPosition | null>(null);
  protected readonly missing = signal(false);

  /**
   * Measured tooltip height. Starts as fallback estimate, then gets
   * replaced after first render with the real bounding-rect height so
   * the viewport clamp doesn't leave the card cut off at the bottom.
   */
  private tooltipHeight = TOOLTIP_H_FALLBACK;

  @ViewChild('tooltipEl') tooltipRef?: ElementRef<HTMLElement>;

  protected readonly stepLabel = computed(
    () => `${this.tutorial.stepIndex() + 1} / ${this.tutorial.stepsTotal()}`,
  );

  /** Whether the current step is the LAST in the tour. */
  protected readonly isLastStep = this.tutorial.isLastStep;
  protected readonly isWaiting = this.tutorial.isWaiting;

  /**
   * Label shown on the primary footer button.
   *
   * Priority:
   *   1. Step is parked on a waitFor → "Esperando…" (button disabled).
   *   2. Step has CTA → use CTA label (works in both normal and missing modes).
   *   3. Step is in MISSING mode and has no CTA → "Saltar paso" (or "Cerrar guía" if last).
   *   4. Step is last → "Finalizar".
   *   5. Otherwise → "Siguiente".
   */
  protected readonly primaryLabel = computed(() => {
    if (this.isWaiting()) return 'Esperando…';
    const step = this.tutorial.currentStep();
    if (step?.cta) return step.cta.label;
    if (this.missing()) {
      return this.isLastStep() ? 'Cerrar guía' : 'Saltar paso';
    }
    if (this.isLastStep()) return 'Finalizar';
    return 'Siguiente';
  });

  private rafId = 0;
  private pendingScrollSettle = 0;
  private resizeListener?: () => void;
  /** The route the active step lives on (for the "unrelated nav" guard). */
  private stepOriginRoute: string | null = null;

  constructor() {
    // Whenever the active step or tutorial changes, recalculate position
    effect(() => {
      const step = this.tutorial.currentStep();
      // Remember where this step is being shown so we can stop the tour
      // if the user navigates somewhere we didn't expect.
      this.stepOriginRoute =
        step?.route ?? this.router.url.split('?')[0] ?? null;
      this.scheduleLocate(step);
    });

    // Stop or relocate the tour as the user navigates around.
    this.routerSub = this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) return;
      const step = this.tutorial.currentStep();
      if (!step) return;
      const path = evt.urlAfterRedirects.split('?')[0];

      // Wait-for steps explicitly opt-in to navigation: the action being
      // waited for (e.g. team created) typically navigates the user to a
      // detail screen, which is exactly what we want. Skip BOTH guards.
      if (this.tutorial.isWaiting()) {
        this.scheduleLocate(step);
        return;
      }

      // Steps that spotlight a navigation link declare `advanceOnNavigate`.
      // ANY path change (including drilling into a sub-route like
      // /app/teams/abc → /app/teams/abc/projects) is treated as the
      // user pressing "Next". We deliberately use a strict !== rather
      // than the "out-of-scope" check so the wizard advances when the
      // user clicks the spotlighted link.
      if (
        step.advanceOnNavigate &&
        this.stepOriginRoute &&
        path !== this.stepOriginRoute
      ) {
        this.tutorial.next();
        return;
      }

      // Centered steps are intro/outro/celebration cards that don't
      // reference any DOM element. They survive arbitrary navigation —
      // we should never kill the tour mid-celebration just because the
      // app navigated the user to a fresh detail page (which is exactly
      // what happens after creating a team / project / task).
      if (step.centered) {
        this.scheduleLocate(step);
        return;
      }

      // Hard guard: if the active step has a fixed route and we left it,
      // stop the tour — there's no value in chasing the user around.
      if (step.route && path !== step.route) {
        this.tutorial.stop();
        return;
      }

      // Soft guard: for route-less steps (most of the project-scoped tours),
      // stop only if the new path is clearly outside the expected scope.
      // We detect "scope" as the path prefix where the step was first shown.
      if (!step.route && this.stepOriginRoute) {
        const origin = this.stepOriginRoute;
        const stillInScope = path === origin || path.startsWith(origin + '/');
        if (!stillInScope) {
          this.tutorial.stop();
          return;
        }
      }

      this.scheduleLocate(step);
    });

    // Recompute on resize/scroll while active
    this.resizeListener = () => {
      const step = this.tutorial.currentStep();
      if (step) this.scheduleLocate(step);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
      window.addEventListener('scroll', this.resizeListener, true);
    }
  }

  ngAfterViewChecked(): void {
    // Once the tooltip is in the DOM, measure its real height. This keeps
    // the viewport clamp in `computeTooltip` honest for tall content.
    const el = this.tooltipRef?.nativeElement;
    if (el) {
      const measured = el.getBoundingClientRect().height;
      if (measured > 0 && Math.abs(measured - this.tooltipHeight) > 4) {
        this.tooltipHeight = measured;
        // Re-locate so the tooltip respects its real height in the clamp.
        const step = this.tutorial.currentStep();
        if (step) this.scheduleLocate(step);
      }
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (typeof window !== 'undefined' && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      window.removeEventListener('scroll', this.resizeListener, true);
    }
    cancelAnimationFrame(this.rafId);
    if (this.pendingScrollSettle) {
      window.clearTimeout(this.pendingScrollSettle);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.tutorial.isActive()) return;
    // If we're on the last step and the user presses ESC, treat it as a
    // completed tour — they SAW everything. Otherwise it's an opt-out.
    if (this.isLastStep()) {
      this.tutorial.complete();
    } else {
      this.tutorial.skip();
    }
  }

  /**
   * Bottom-right footer button. CTA-aware AND missing-aware:
   *   - Has CTA → followCta (works whether the target is missing or not).
   *   - Missing without CTA → skip this step (or close the tour if last).
   *   - Normal → proceed.
   */
  proceed(): void {
    // While parked on a waitFor, the primary button is a no-op so the
    // user can't accidentally skip past the action we want them to do.
    // "Saltar paso" / skip() are still available via the X header button.
    if (this.tutorial.isWaiting()) return;
    const step = this.tutorial.currentStep();
    if (!step) return;
    if (step.cta) {
      this.tutorial.followCta();
      return;
    }
    if (this.missing() && !this.isLastStep()) {
      this.tutorial.skipMissing();
      return;
    }
    this.tutorial.proceed();
  }

  goToCta(): void { this.tutorial.followCta(); }
  previous(): void { this.tutorial.previous(); }
  finish(): void { this.tutorial.complete(); }
  skip(): void { this.tutorial.skip(); }

  /**
   * Advance past a `waitFor` step without abandoning the whole tour. Gives
   * the user an escape hatch if the modeled action fails or they'd rather
   * do it later, instead of being stuck on "Esperando…" forever.
   */
  skipStep(): void { this.tutorial.next(); }

  /**
   * Locate the active step's target with up to N retries — covers the case
   * where we navigated to a new route and the DOM hasn't rendered yet.
   */
  private scheduleLocate(step: TutorialStep | null): void {
    cancelAnimationFrame(this.rafId);
    if (!step) {
      this.spotlight.set(null);
      this.tooltip.set(null);
      this.missing.set(false);
      return;
    }

    // Centered steps don't need a DOM target — they render as a modal-like
    // card at the center. Used for intro / outro steps.
    if (step.centered) {
      this.spotlight.set(null);
      this.tooltip.set(this.centeredTooltip());
      this.missing.set(false);
      return;
    }

    let tries = 0;
    const tick = (): void => {
      if (this.tutorial.currentStep()?.id !== step.id) return;
      const found = this.locate(step);
      if (found) {
        this.missing.set(false);
        return;
      }
      tries += 1;
      if (tries > 12) {
        // Target not present on this page after a few frames — show a soft
        // fallback. The primary button is now context-aware (CTA / skip /
        // close) so the user is never stuck.
        this.spotlight.set(null);
        this.tooltip.set(this.centeredTooltip());
        this.missing.set(true);
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private locate(step: TutorialStep): boolean {
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!(el instanceof HTMLElement)) return false;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    // If the element is partially or fully outside the viewport, scroll it
    // into view BUT use `behavior: 'auto'` so the rect we read next is
    // accurate. With 'smooth' we'd read the pre-scroll position and the
    // spotlight would appear desfasado por ~300ms.
    const outOfView =
      rect.top < 0 ||
      rect.left < 0 ||
      rect.bottom > window.innerHeight ||
      rect.right > window.innerWidth;
    if (outOfView) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      // Re-read after the synchronous scroll.
      const after = el.getBoundingClientRect();
      this.applyRect(after, step.placement ?? 'bottom');
    } else {
      this.applyRect(rect, step.placement ?? 'bottom');
    }
    return true;
  }

  private applyRect(
    rect: DOMRect,
    placement: TutorialStep['placement'],
  ): void {
    this.spotlight.set({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    });
    this.tooltip.set(this.computeTooltip(rect, placement));
  }

  private computeTooltip(
    rect: DOMRect,
    placement: TutorialStep['placement'] = 'bottom',
  ): TooltipPosition {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = this.tooltipHeight;
    let top = 0;
    let left = 0;
    let arrow: TooltipPosition['arrow'] = 'top';

    switch (placement) {
      case 'top':
        top = rect.top - h - TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        arrow = 'bottom';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - h / 2;
        left = rect.left - TOOLTIP_W - TOOLTIP_GAP;
        arrow = 'right';
        break;
      case 'right':
        top = rect.top + rect.height / 2 - h / 2;
        left = rect.right + TOOLTIP_GAP;
        arrow = 'left';
        break;
      case 'bottom':
      default:
        top = rect.bottom + TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        arrow = 'top';
        break;
    }

    // Keep tooltip on screen (uses the real measured height when available).
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
    top = Math.max(12, Math.min(top, vh - h - 12));
    return { top, left, arrow };
  }

  private centeredTooltip(): TooltipPosition {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    return {
      top: vh / 2 - this.tooltipHeight / 2,
      left: vw / 2 - TOOLTIP_W / 2,
      arrow: 'top',
    };
  }
}
