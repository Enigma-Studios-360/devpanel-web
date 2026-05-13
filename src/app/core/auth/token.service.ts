import { Injectable } from '@angular/core';

const STORAGE_KEY = 'devpanel.token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  get(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  }

  set(token: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, token);
  }

  clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
}
