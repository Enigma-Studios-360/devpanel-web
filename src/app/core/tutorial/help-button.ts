import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { TutorialService } from './tutorial.service';

@Component({
  selector: 'dp-help-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-help" [attr.data-tour]="'help-button'">
      <button
        type="button"
        class="dp-help__trigger"
        title="Guía interactiva"
        aria-label="Abrir menú de guías"
        (click)="toggle()"
      >
        <i class="pi pi-question-circle"></i>
      </button>

      @if (open()) {
        <div class="dp-help__pop" role="menu">
          <div class="dp-help__header">Guías disponibles</div>
          <ul>
            @for (t of tutorial.catalog; track t.id) {
              <li>
                <button
                  type="button"
                  class="dp-help__item"
                  (click)="run(t.id)"
                >
                  <i [class]="'pi ' + (t.icon ?? 'pi-play')"></i>
                  <div>
                    <strong>{{ t.name }}</strong>
                    @if (t.summary) {
                      <span class="dp-help__summary">{{ t.summary }}</span>
                    }
                    <span class="dp-help__hint">
                      @if (tutorial.hasCompleted(t.id)) {
                        <i class="pi pi-check-circle"></i>
                        completado · reiniciar
                      } @else {
                        {{ t.steps.length }} paso(s)
                      }
                    </span>
                  </div>
                </button>
              </li>
            }
          </ul>
          <footer>
            ESC cierra una guía en cualquier momento.
          </footer>
        </div>
      }
    </div>
  `,
  styleUrl: './help-button.scss',
})
export class HelpButtonComponent {
  protected readonly tutorial = inject(TutorialService);
  protected readonly open = signal(false);

  toggle(): void { this.open.update((v) => !v); }
  close(): void { this.open.set(false); }

  run(id: string): void {
    this.close();
    this.tutorial.start(id);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(evt: MouseEvent): void {
    if (!this.open()) return;
    const root = (evt.target as HTMLElement)?.closest('.dp-help');
    if (!root) this.close();
  }
}
