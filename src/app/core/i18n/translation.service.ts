import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService, type LanguageCode } from './language.service';

type Dictionary = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  private readonly dictSignal = signal<Dictionary>({});
  private readonly cache = new Map<LanguageCode, Dictionary>();

  readonly ready = computed(() => Object.keys(this.dictSignal()).length > 0);

  constructor() {
    // Load whenever the language changes.
    effect(() => {
      const code = this.language.current();
      void this.load(code);
    });
  }

  /**
   * Resolves a dotted key like "dashboard.apiStatus.connected".
   * Falls back to the key itself if missing.
   */
  t(key: string): string {
    const dict = this.dictSignal();
    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object' ? (acc as Dictionary)[part] : undefined,
        dict,
      );
    return typeof value === 'string' ? value : key;
  }

  async load(code: LanguageCode): Promise<void> {
    if (this.cache.has(code)) {
      this.dictSignal.set(this.cache.get(code)!);
      return;
    }
    try {
      const dict = await firstValueFrom(
        this.http.get<Dictionary>(`/i18n/${code}.json`),
      );
      this.cache.set(code, dict);
      this.dictSignal.set(dict);
    } catch (e) {
      console.warn(`[i18n] Failed to load ${code}.json`, e);
    }
  }
}
