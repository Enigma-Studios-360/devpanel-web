import { Injectable, signal } from '@angular/core';

/**
 * Tiny shared state for the global command palette (⌘K). The topbar opens
 * it; the CommandPaletteComponent reacts. Kept separate so any component can
 * trigger it without importing the (heavier) palette component.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly openSignal = signal(false);
  readonly open = this.openSignal.asReadonly();

  openPalette(): void { this.openSignal.set(true); }
  close(): void { this.openSignal.set(false); }
  toggle(): void { this.openSignal.update((v) => !v); }
}
