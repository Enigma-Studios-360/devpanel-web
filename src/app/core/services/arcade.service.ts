import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

/**
 * Snapshot that the game client (DevCrafting, Unity) reports at the end of
 * each in-game day. Null when the user has never played.
 */
export interface ArcadeProgress {
  _id: string;
  user: string | { _id: string; name: string };
  game: string;
  day: number;
  totalStars: number;
  money: number;
  rank: string;
  ticketsResolved: number;
  ticketsLost?: number;
  lastPlayedAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ArcadeService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  progress(): Observable<ArcadeProgress | null> {
    return this.http
      .get<ApiSuccess<{ progress: ArcadeProgress | null }>>(
        `${this.api.baseUrl}/api/arcade/progress`,
      )
      .pipe(map((r) => r.data.progress));
  }

  leaderboard(): Observable<ArcadeProgress[]> {
    return this.http
      .get<ApiSuccess<{ entries: ArcadeProgress[] }>>(
        `${this.api.baseUrl}/api/arcade/leaderboard`,
      )
      .pipe(map((r) => r.data.entries));
  }
}
