import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import type { TeamRole } from '../../shared/models/team.model';

interface ApiSuccess<T> { success: true; data: T; }

export interface AssistantChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantChatContext {
  route?: string;
  role?: TeamRole | null;
  projectName?: string;
  teamName?: string;
}

export interface AssistantChatInput {
  message: string;
  history?: AssistantChatTurn[];
  context?: AssistantChatContext;
}

export interface AssistantChatReply {
  reply: string;
  source: 'deepseek';
}

export interface AssistantStatus {
  configured: boolean;
  provider: string;
  /** Per-user weekly quota info (present for authenticated callers). */
  plan?: string;
  quota?: number;
  used?: number;
  remaining?: number;
}

/**
 * Thin HTTP client around `/api/assistant/*`. Errors arrive as standard
 * Angular HttpErrorResponse so callers can pull `error?.error?.error?.code`
 * to render typed messages (`ASSISTANT_RATE_LIMIT`, `ASSISTANT_NOT_CONFIGURED`,
 * etc.).
 */
@Injectable({ providedIn: 'root' })
export class AssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  private base(): string {
    return `${this.api.baseUrl}/api/assistant`;
  }

  status(): Observable<AssistantStatus> {
    return this.http
      .get<ApiSuccess<AssistantStatus>>(`${this.base()}/status`)
      .pipe(map((r) => r.data));
  }

  chat(input: AssistantChatInput): Observable<AssistantChatReply> {
    return this.http
      .post<ApiSuccess<AssistantChatReply>>(`${this.base()}/chat`, input)
      .pipe(map((r) => r.data));
  }
}
