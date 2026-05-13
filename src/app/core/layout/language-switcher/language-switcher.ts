import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LanguageService, type LanguageCode } from '../../i18n/language.service';

@Component({
  selector: 'dp-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-lang">
      @for (code of options; track code) {
        <button
          type="button"
          class="dp-lang__btn"
          [class.dp-lang__btn--active]="lang.current() === code"
          (click)="lang.setLanguage(code)"
        >
          {{ code }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .dp-lang {
        display: inline-flex;
        background: var(--dp-surface-2);
        border: 1px solid var(--dp-border);
        border-radius: var(--dp-radius-md);
        padding: 2px;
        gap: 2px;
      }
      .dp-lang__btn {
        padding: 0.25rem 0.5rem;
        font-size: 11.5px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--dp-text-muted);
        border-radius: 6px;
        transition: background 120ms ease, color 120ms ease;
        &:hover { color: var(--dp-text); }
        &--active {
          background: var(--dp-surface);
          color: var(--dp-text);
          box-shadow: var(--dp-shadow-sm);
        }
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  protected readonly lang = inject(LanguageService);
  protected readonly options: LanguageCode[] = ['es', 'en'];
}
