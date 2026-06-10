import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';

interface ApiSuccess<T> { success: true; data: T; }

export interface SearchResults {
  query: string;
  teams: Array<{ _id: string; name: string; slug: string }>;
  projects: Array<{ _id: string; name: string; teamId: string; status: string }>;
  tasks: Array<{ _id: string; title: string; projectId: string; status: string }>;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  search(q: string): Observable<SearchResults> {
    return this.http
      .get<ApiSuccess<SearchResults>>(`${this.api.baseUrl}/api/search`, {
        params: { q },
      })
      .pipe(map((r) => r.data));
  }
}
