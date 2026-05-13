import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import type { PlanCode, PlanLimits } from '../../shared/models/plan.model';

interface ApiSuccess<T> { success: true; data: T; }

export interface Subscription {
  _id: string;
  team: string;
  plan: PlanCode;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  limits: PlanLimits;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  forTeam(teamId: string): Observable<Subscription> {
    return this.http
      .get<ApiSuccess<{ subscription: Subscription }>>(
        `${this.api.baseUrl}/api/teams/${teamId}/subscription`,
      )
      .pipe(map((r) => r.data.subscription));
  }

  simulateUpgrade(teamId: string, plan: PlanCode): Observable<Subscription> {
    return this.http
      .post<ApiSuccess<{ subscription: Subscription }>>(
        `${this.api.baseUrl}/api/teams/${teamId}/subscription/simulate-upgrade`,
        { plan },
      )
      .pipe(map((r) => r.data.subscription));
  }
}
