import { Injectable, signal } from '@angular/core';
import { readWithMigration, safeSet } from '../storage/migrate';

export type LanguageCode = 'es' | 'en';

const STORAGE_KEY = 'devhub.lang';
const LEGACY_KEY = 'devpanel.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly currentSignal = signal<LanguageCode>(this.read());
  readonly current = this.currentSignal.asReadonly();

  setLanguage(code: LanguageCode): void {
    this.currentSignal.set(code);
    safeSet(STORAGE_KEY, code);
  }

  private read(): LanguageCode {
    const stored = readWithMigration(STORAGE_KEY, LEGACY_KEY);
    return stored === 'en' || stored === 'es' ? stored : 'es';
  }
}
