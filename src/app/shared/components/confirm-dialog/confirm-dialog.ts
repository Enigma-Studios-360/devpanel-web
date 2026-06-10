import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

/**
 * Singleton dialog that the entire app shares. Mount once at the app
 * shell. Listens to `ConfirmService.pending()` and renders a modal when
 * a request is outstanding.
 */
@Component({
  selector: 'dp-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirm.pending(); as req) {
      <div class="dp-modal__backdrop" (click)="cancel()">
        <div
          class="dp-modal dp-confirm"
          role="alertdialog"
          aria-modal="true"
          [class.dp-confirm--danger]="req.variant === 'danger'"
          (click)="$event.stopPropagation()"
        >
          <header class="dp-confirm__head">
            <span class="dp-confirm__icon">
              <i [class]="'pi ' + (req.icon || (req.variant === 'danger' ? 'pi-exclamation-triangle' : 'pi-info-circle'))"></i>
            </span>
            <div>
              <h2>{{ req.title }}</h2>
              <p>{{ req.message }}</p>
            </div>
            <button
              type="button"
              class="dp-modal__close"
              (click)="cancel()"
              aria-label="Cerrar"
            >
              <i class="pi pi-times"></i>
            </button>
          </header>

          <footer class="dp-confirm__foot">
            <button
              type="button"
              class="dp-btn dp-btn--ghost"
              (click)="cancel()"
            >
              {{ req.cancelLabel || 'Cancelar' }}
            </button>
            <button
              type="button"
              class="dp-btn"
              [class.dp-btn--danger]="req.variant === 'danger'"
              [class.dp-btn--primary]="req.variant !== 'danger'"
              (click)="accept()"
              autofocus
            >
              {{ req.confirmLabel || 'Confirmar' }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);

  cancel(): void { this.confirm.resolve(false); }
  accept(): void { this.confirm.resolve(true); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.confirm.pending()) this.cancel();
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    if (this.confirm.pending()) this.accept();
  }
}
