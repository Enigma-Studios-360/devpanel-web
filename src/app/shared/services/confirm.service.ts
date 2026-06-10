import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  icon?: string;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve: (accepted: boolean) => void;
}

/**
 * Promise-based confirm dialog. Replaces native `confirm()` so we keep
 * the PrimeNG / SCSS-tokens look-and-feel and avoid the platform popup.
 *
 * Usage from a component:
 *
 *     const ok = await this.confirm.ask({
 *       title: 'Archivar proyecto',
 *       message: '¿Seguro? Esto liberará un cupo del plan.',
 *       variant: 'danger',
 *       confirmLabel: 'Archivar',
 *     });
 *     if (!ok) return;
 *
 * The actual UI lives in `dp-confirm-dialog`, mounted once at the app
 * shell level. The service exposes a `pending` signal the dialog reads.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pendingSignal = signal<ConfirmRequest | null>(null);

  readonly pending = this.pendingSignal.asReadonly();

  ask(opts: ConfirmOptions): Promise<boolean> {
    // Reject any previous outstanding confirm so we never stack multiple
    // dialogs on top of each other.
    const previous = this.pendingSignal();
    if (previous) previous.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.pendingSignal.set({ ...opts, resolve });
    });
  }

  /** Called by the dialog component when the user clicks confirm/cancel. */
  resolve(answer: boolean): void {
    const p = this.pendingSignal();
    if (!p) return;
    this.pendingSignal.set(null);
    p.resolve(answer);
  }
}
