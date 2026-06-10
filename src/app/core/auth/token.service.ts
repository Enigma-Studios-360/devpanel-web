import { Injectable } from '@angular/core';
import { readWithMigration, safeSet, safeRemove } from '../storage/migrate';

const STORAGE_KEY = 'devhub.token';
const LEGACY_KEY = 'devpanel.token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  get(): string | null {
    return readWithMigration(STORAGE_KEY, LEGACY_KEY);
  }

  set(token: string): void {
    safeSet(STORAGE_KEY, token);
  }

  clear(): void {
    safeRemove(STORAGE_KEY);
    // Also remove the legacy key in case it lingered (defensive).
    safeRemove(LEGACY_KEY);
  }
}
