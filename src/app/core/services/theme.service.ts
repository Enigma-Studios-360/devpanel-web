import { Injectable, signal } from '@angular/core';
import { readWithMigration, safeSet } from '../storage/migrate';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'devhub.theme';
const LEGACY_KEY = 'devpanel.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(this.read());
  readonly mode = this.modeSignal.asReadonly();

  init(): void {
    this.apply(this.modeSignal());
  }

  toggle(): void {
    this.set(this.modeSignal() === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    safeSet(STORAGE_KEY, mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset['theme'] = mode;
  }

  private read(): ThemeMode {
    const stored = readWithMigration(STORAGE_KEY, LEGACY_KEY);
    return stored === 'light' ? 'light' : 'dark';
  }
}
