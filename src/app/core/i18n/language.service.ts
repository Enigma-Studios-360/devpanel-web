import { Injectable, signal } from '@angular/core';

export type LanguageCode = 'es' | 'en';

const STORAGE_KEY = 'devpanel.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly currentSignal = signal<LanguageCode>(this.read());
  readonly current = this.currentSignal.asReadonly();

  setLanguage(code: LanguageCode): void {
    this.currentSignal.set(code);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }

  private read(): LanguageCode {
    if (typeof localStorage === 'undefined') return 'es';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'es' ? stored : 'es';
  }
}
