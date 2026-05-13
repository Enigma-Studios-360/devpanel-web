import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
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
const TOOLTIP_H_ESTIMATE = 180;

@Component({
  selector: 'dp-tutorial-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorial-overlay.html',
  styleUrl: './tutorial-overlay.scss',
})
export class TutorialOverlayComponent implements OnDestroy {
  protected readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);
  private routerSub?: Subscription;

  protected readonly spotlight = signal<SpotlightRect | null>(null);
  protected readonly tooltip = signal<TooltipPosition | null>(null);
  protected readonly missing = signal(false);

  protected readonly stepLabel = computed(
    () => `${this.tutorial.stepIndex() + 1} / ${this.tutorial.stepsTotal()}`,
  );

  /** Whether the current step is the LAST in the tour. */
  protected readonly isLastStep = computed(
    () => this.tutorial.stepIndex() === this.tutorial.stepsTotal() - 1,
  );

  /**
   * Label shown on the primary footer button. CTA wins over everything,
   * then "Finalizar" if last, then "Siguiente".
   */
  protected readonly primaryLabel = computed(() => {
    const step = this.tutorial.currentStep();
    if (step?.cta) return step.cta.label;
    if (this.isLastStep()) return 'Finalizar';
    return 'Siguiente';
  });

  private rafId = 0;
  private resizeListener?: () => void;

  constructor() {
    // Whenever the active step or tutorial changes, recalculate position
    effect(() => {
      const step = this.tutorial.currentStep();
      this.scheduleLocate(step);
    });

    // Stop the tutorial if the user navigates somewhere unrelated
    this.routerSub = this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) return;
      const step = this.tutorial.currentStep();
      if (!step) return;
      // If the active step has a fixed `route` and the user is no longer on
      // it, stop the tour to avoid inconsistencies.
      if (step.route && evt.urlAfterRedirects.split('?')[0] !== step.route) {
        // Give the new route a tick before deciding to skip
        setTimeout(() => this.scheduleLocate(this.tutorial.currentStep()), 250);
      } else {
        this.scheduleLocate(step);
      }
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

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (typeof window !== 'undefined' && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      window.removeEventListener('scroll', this.resizeListener, true);
    }
    cancelAnimationFrame(this.rafId);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.tutorial.isActive()) this.tutorial.skip();
  }

  /** Bottom-right button. CTA-aware. */
  proceed(): void { this.tutorial.proceed(); }
  /** Fallback when target is missing AND step has CTA (the only place we still surface a separate "Llévame allí" button). */
  goToCta(): void { this.tutorial.followCta(); }
  previous(): void { this.tutorial.previous(); }
  finish(): void { this.tutorial.complete(); }
  skip(): void { this.tutorial.skip(); }

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
        // fallback and let the user continue with the primary button (which,
        // if the step has a CTA, will navigate them to the right place).
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

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    this.spotlight.set({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    });
    this.tooltip.set(this.computeTooltip(rect, step.placement ?? 'bottom'));
    return true;
  }

  private computeTooltip(
    rect: DOMRect,
    placement: TutorialStep['placement'] = 'bottom',
  ): TooltipPosition {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = 0;
    let left = 0;
    let arrow: TooltipPosition['arrow'] = 'top';

    switch (placement) {
      case 'top':
        top = rect.top - TOOLTIP_H_ESTIMATE - TOOLTIP_GAP;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        arrow = 'bottom';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - TOOLTIP_H_ESTIMATE / 2;
        left = rect.left - TOOLTIP_W - TOOLTIP_GAP;
        arrow = 'right';
        break;
      case 'right':
        top = rect.top + rect.height / 2 - TOOLTIP_H_ESTIMATE / 2;
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

    // Keep tooltip on screen
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
    top = Math.max(12, Math.min(top, vh - TOOLTIP_H_ESTIMATE - 12));
    return { top, left, arrow };
  }

  private centeredTooltip(): TooltipPosition {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    return {
      top: vh / 2 - TOOLTIP_H_ESTIMATE / 2,
      left: vw / 2 - TOOLTIP_W / 2,
      arrow: 'top',
    };
  }
}
