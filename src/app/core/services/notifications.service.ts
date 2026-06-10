import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export type NotificationType =
  | 'INVITATION'
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'DEPLOY_READY'
  | 'DEPLOY_FAILED'
  | 'SYSTEM';

export interface NotificationAction {
  label: string;
  url: string;
}

export interface NotificationRecord {
  _id: string;
  user: string;
  team?: string;
  project?: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: string | null;
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ListResponse {
  data: NotificationRecord[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    return `${this.api.baseUrl}/api/notifications`;
  }

  list(options: { page?: number; perPage?: number; onlyUnread?: boolean } = {}):
    Observable<ListResponse> {
    let params = new HttpParams();
    if (options.page) params = params.set('page', String(options.page));
    if (options.perPage) params = params.set('perPage', String(options.perPage));
    if (options.onlyUnread) params = params.set('onlyUnread', 'true');
    return this.http
      .get<ApiSuccess<NotificationRecord[]>>(`${this.base()}`, { params })
      .pipe(
        map((r) => ({
          data: r.data,
          meta: (r.meta ?? { page: 1, perPage: 20, total: 0, totalPages: 0 }) as ListResponse['meta'],
        })),
      );
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<ApiSuccess<{ count: number }>>(`${this.base()}/unread-count`)
      .pipe(map((r) => r.data.count));
  }

  markRead(id: string): Observable<NotificationRecord> {
    return this.http
      .post<ApiSuccess<{ notification: NotificationRecord }>>(
        `${this.base()}/${id}/read`,
        {},
      )
      .pipe(map((r) => r.data.notification));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http
      .post<ApiSuccess<{ updated: number }>>(`${this.base()}/mark-all-read`, {})
      .pipe(map((r) => r.data));
  }

  remove(id: string): Observable<{ deleted: true }> {
    return this.http
      .delete<ApiSuccess<{ deleted: true }>>(`${this.base()}/${id}`)
      .pipe(map((r) => r.data));
  }
}
