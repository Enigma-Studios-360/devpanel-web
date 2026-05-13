import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'dp-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="dp-theme-toggle"
      [attr.aria-label]="theme.mode() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      [title]="theme.mode() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
      (click)="theme.toggle()"
    >
      <i [class]="theme.mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"></i>
    </button>
  `,
  styles: [
    `
      .dp-theme-toggle {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: var(--dp-radius-md);
        color: var(--dp-text-muted);
        transition: background 120ms ease, color 120ms ease;

        &:hover {
          background: var(--dp-surface-2);
          color: var(--dp-text);
        }

        i { font-size: 14px; }
      }
    `,
  ],
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
