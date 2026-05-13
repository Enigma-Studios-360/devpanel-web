import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'dp-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="dp-page-header">
      <div class="dp-page-header__text">
        <h1 class="dp-page-header__title">{{ title }}</h1>
        @if (subtitle) {
          <p class="dp-page-header__subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="dp-page-header__actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      .dp-page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid var(--dp-border);
        margin-bottom: 1.5rem;

        &__title {
          font-size: 22px;
          font-weight: 600;
          color: var(--dp-text);
        }
        &__subtitle {
          color: var(--dp-text-muted);
          margin-top: 0.25rem;
          font-size: 13px;
        }
        &__actions { display: flex; gap: 0.5rem; align-items: center; }
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
}
