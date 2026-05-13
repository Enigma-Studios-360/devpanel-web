import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  status?: 'ACTIVE' | 'DISABLED';
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  setUser(user: AuthUser | null): void {
    this.userSignal.set(user);
  }

  clear(): void {
    this.userSignal.set(null);
  }
}
