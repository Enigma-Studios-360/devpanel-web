import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, timer } from 'rxjs';
import {
  ApiHealthService,
  type ApiHealthState,
} from '../../services/api-health.service';
import { TPipe } from '../../i18n/t.pipe';

/**
 * IDE-style status bar pinned to the bottom of the shell.
 * Mono, 10.5px, discreet — live API health · version · license · origin.
 */
@Component({
  selector: 'dp-status-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TPipe],
  template: `
    <footer class="dp-statusbar">
      @if (health(); as h) {
        <span
          class="dp-statusbar__api"
          [class.dp-statusbar__api--ok]="h.available"
          [class.dp-statusbar__api--down]="!h.available"
        >
          ● {{ (h.available ? 'statusbar.apiOk' : 'statusbar.apiDown') | t }}
        </span>
      } @else {
        <span class="dp-statusbar__api">● {{ 'statusbar.checking' | t }}</span>
      }
      <span>v0.3</span>
      <span>AGPL-3.0</span>
      <span class="dp-statusbar__right">{{ 'statusbar.madeIn' | t }}</span>
    </footer>
  `,
  styles: [
    `
      .dp-statusbar {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 150;
        display: flex;
        align-items: center;
        gap: 1.4rem;
        padding: 0.32rem 2rem;
        background: color-mix(in srgb, var(--dp-bg) 92%, transparent);
        backdrop-filter: blur(8px);
        border-top: 1px solid var(--dp-border);
        font-family: var(--dp-font-mono);
        font-size: 10.5px;
        letter-spacing: 0.04em;
        color: var(--dp-text-muted);
        user-select: none;
      }
      .dp-statusbar__api--ok { color: var(--dp-accent-green); }
      .dp-statusbar__api--down { color: var(--dp-accent-red); }
      .dp-statusbar__right { margin-left: auto; }

      @media (max-width: 640px) {
        .dp-statusbar { padding: 0.32rem 1rem; gap: 0.9rem; }
      }
    `,
  ],
})
export class StatusBarComponent {
  private readonly api = inject(ApiHealthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly health = signal<ApiHealthState | null>(null);

  constructor() {
    // Poll every 60s so a dead API flips the dot without a reload.
    timer(0, 60_000)
      .pipe(
        switchMap(() => this.api.check()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.health.set(state));
  }
}
