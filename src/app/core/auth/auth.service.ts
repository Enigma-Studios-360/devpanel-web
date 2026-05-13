import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { API_CONFIG } from '../services/api.config';
import { TokenService } from './token.service';
import { AuthStateService, type AuthUser } from './auth-state.service';

interface ApiSuccess<T> { success: true; data: T; }

interface AuthSessionPayload {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);
  private readonly token = inject(TokenService);
  private readonly state = inject(AuthStateService);

  login(creds: LoginCredentials): Observable<ApiSuccess<AuthSessionPayload>> {
    return this.http
      .post<ApiSuccess<AuthSessionPayload>>(`${this.api.baseUrl}/api/auth/login`, creds)
      .pipe(tap((res) => this.applySession(res.data)));
  }

  register(payload: RegisterPayload): Observable<ApiSuccess<AuthSessionPayload>> {
    return this.http
      .post<ApiSuccess<AuthSessionPayload>>(`${this.api.baseUrl}/api/auth/register`, payload)
      .pipe(tap((res) => this.applySession(res.data)));
  }

  logout(): Observable<unknown> {
    this.clearLocal();
    return this.http
      .post(`${this.api.baseUrl}/api/auth/logout`, {})
      .pipe(catchError(() => of(null)));
  }

  /** Called on app bootstrap when a token already exists. */
  async hydrate(): Promise<void> {
    if (!this.token.get()) return;
    try {
      const res = await firstValueFrom(
        this.http.get<ApiSuccess<{ user: AuthUser }>>(
          `${this.api.baseUrl}/api/auth/me`,
        ),
      );
      this.state.setUser(res.data.user);
    } catch (err: unknown) {
      // Only wipe the session for an actual auth failure. Network errors,
      // timeouts or 5xx during cold boot must not log the user out — let
      // them retry once the API is reachable again.
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        this.clearLocal();
      }
    }
  }

  private applySession(payload: AuthSessionPayload): void {
    this.token.set(payload.token);
    this.state.setUser(payload.user);
  }

  private clearLocal(): void {
    this.token.clear();
    this.state.clear();
  }
}
