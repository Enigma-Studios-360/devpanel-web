import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_CONFIG } from './api.config';

export interface ApiHealth {
  status: 'ok';
  uptime: number;
  timestamp: string;
  environment: string;
  database: 'connected' | 'disconnected';
}

export interface ApiHealthState {
  available: boolean;
  data: ApiHealth | null;
  error: string | null;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class ApiHealthService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(API_CONFIG);

  check(): Observable<ApiHealthState> {
    const url = `${this.apiConfig.baseUrl}/health`;
    return this.http.get<ApiSuccess<ApiHealth>>(url).pipe(
      map((res): ApiHealthState => ({
        available: true,
        data: res.data,
        error: null,
      })),
      catchError((err): Observable<ApiHealthState> => {
        const message =
          err?.message ?? 'Cannot reach the API';
        return of({ available: false, data: null, error: message });
      }),
    );
  }
}
