import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TutorialService } from './tutorial.service';

/**
 * Tours that only make sense inside a `/app/projects/:id/...` scope.
 * Launching them from the dashboard or teams list would land the user on
 * a page with none of the targets visible — better to surface a soft hint.
 */
const PROJECT_SCOPED_TOURS: ReadonlySet<string> = new Set([
  'projects-tour',
  'tasks-tour',
  'docs-tour',
  'github-tour',
  'deploy-tour',
]);

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
          <div class="dp-help__header">
            <span>Guías disponibles</span>
            <button
              type="button"
              class="dp-help__reset"
              (click)="resetAll()"
              title="Borra tu progreso y lanza el onboarding desde cero"
            >
              <i class="pi pi-replay"></i>
              Reiniciar
            </button>
          </div>
          <ul>
            @for (t of tutorial.catalog; track t.id) {
              <li>
                <button
                  type="button"
                  class="dp-help__item"
                  [class.dp-help__item--disabled]="!isAvailableForCurrentRoute(t.id)"
                  [title]="
                    !isAvailableForCurrentRoute(t.id)
                      ? 'Abre un proyecto primero para esta guía'
                      : ''
                  "
                  (click)="run(t.id)"
                >
                  <i [class]="'pi ' + (t.icon ?? 'pi-play')"></i>
                  <div>
                    <strong>{{ t.name }}</strong>
                    @if (t.summary) {
                      <span class="dp-help__summary">{{ t.summary }}</span>
                    }
                    <span class="dp-help__hint">
                      @if (!isAvailableForCurrentRoute(t.id)) {
                        <i class="pi pi-info-circle"></i>
                        Abre un proyecto primero
                      } @else if (tutorial.hasCompleted(t.id)) {
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
  private readonly router = inject(Router);
  protected readonly open = signal(false);
  private readonly currentPath = signal(
    this.router.url.split('?')[0] ?? '/',
  );

  constructor() {
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        this.currentPath.set(evt.urlAfterRedirects.split('?')[0]);
      }
    });
  }

  /**
   * Some tours assume the user is already inside a `/app/projects/:id/...`
   * route. From dashboard or teams list the targets won't exist — we want
   * the help menu to make that obvious rather than start a tour that
   * silently falls into "missing" fallback after fallback.
   */
  isAvailableForCurrentRoute(tourId: string): boolean {
    if (!PROJECT_SCOPED_TOURS.has(tourId)) return true;
    return this.currentPath().startsWith('/app/projects/');
  }

  toggle(): void { this.open.update((v) => !v); }
  close(): void { this.open.set(false); }

  run(id: string): void {
    if (!this.isAvailableForCurrentRoute(id)) return; // soft no-op
    this.close();
    this.tutorial.start(id);
  }

  /**
   * Wipe progress AND launch the master onboarding flow immediately so
   * the user can replay everything without having to navigate back to
   * the dashboard themselves.
   */
  resetAll(): void {
    this.close();
    this.tutorial.resetAll();
    void this.router.navigate(['/app/dashboard']).then(() => {
      // Defer slightly so the dashboard renders its anchors first.
      setTimeout(() => this.tutorial.start('onboarding-flow'), 250);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(evt: MouseEvent): void {
    if (!this.open()) return;
    const root = (evt.target as HTMLElement)?.closest('.dp-help');
    if (!root) this.close();
  }
}
