import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Friendly "nothing here" placeholder used across the app.
 *
 * - `compact` switches to a denser layout for in-card use (no big icon).
 * - Provide EITHER an `actionLabel` + `(action)` event, or `routerLink` for
 *   direct navigation. The component handles both — keeps callers terse.
 */
@Component({
  selector: 'dp-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dp-empty" [class.dp-empty--compact]="compact">
      <div class="dp-empty__icon">
        <i [class]="'pi ' + icon"></i>
      </div>
      <h3 class="dp-empty__title">{{ title }}</h3>
      @if (description) {
        <p class="dp-empty__desc">{{ description }}</p>
      }

      @if (actionLabel && routerLink) {
        <a [routerLink]="routerLink" class="dp-empty__cta">
          {{ actionLabel }}
        </a>
      } @else if (actionLabel) {
        <button type="button" class="dp-empty__cta" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() icon = 'pi-inbox';
  @Input() actionLabel?: string;
  /** Optional navigation target. If set together with `actionLabel`, the CTA renders as a link. */
  @Input() routerLink?: unknown[] | string;
  /** Tighter spacing for in-card placeholders. */
  @Input() compact = false;
  @Output() action = new EventEmitter<void>();
}
