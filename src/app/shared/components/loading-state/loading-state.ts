import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'dp-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-loading" [class.dp-loading--inline]="inline">
      <span class="dp-loading__spinner" aria-hidden="true"></span>
      @if (label) {
        <span class="dp-loading__label">{{ label }}</span>
      }
    </div>
  `,
  styles: [
    `
      .dp-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 2rem;
        color: var(--dp-text-muted);

        &--inline {
          flex-direction: row;
          padding: 0;
        }

        &__spinner {
          width: 22px;
          height: 22px;
          border: 2px solid var(--dp-border);
          border-top-color: var(--dp-accent-blue);
          border-radius: 50%;
          animation: dp-spin 0.7s linear infinite;
        }

        &__label { font-size: 13px; }
      }
      @keyframes dp-spin { to { transform: rotate(360deg); } }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() label?: string;
  @Input() inline = false;
}
