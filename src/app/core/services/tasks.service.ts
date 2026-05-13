import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from './api.config';
import type {
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
} from '../../shared/models/task.model';

interface ApiSuccess<T> { success: true; data: T; }

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignees?: string[];
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assignees?: string[];
  dueDate?: string;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_CONFIG);

  listByProject(projectId: string): Observable<Task[]> {
    return this.http
      .get<ApiSuccess<Task[]>>(`${this.api.baseUrl}/api/projects/${projectId}/tasks`)
      .pipe(map((r) => r.data));
  }

  create(projectId: string, input: CreateTaskInput): Observable<Task> {
    return this.http
      .post<ApiSuccess<{ task: Task }>>(
        `${this.api.baseUrl}/api/projects/${projectId}/tasks`,
        input,
      )
      .pipe(map((r) => r.data.task));
  }

  get(taskId: string): Observable<Task> {
    return this.http
      .get<ApiSuccess<{ task: Task }>>(`${this.api.baseUrl}/api/tasks/${taskId}`)
      .pipe(map((r) => r.data.task));
  }

  update(taskId: string, input: UpdateTaskInput): Observable<Task> {
    return this.http
      .patch<ApiSuccess<{ task: Task }>>(
        `${this.api.baseUrl}/api/tasks/${taskId}`,
        input,
      )
      .pipe(map((r) => r.data.task));
  }

  changeStatus(taskId: string, status: TaskStatus): Observable<Task> {
    return this.http
      .patch<ApiSuccess<{ task: Task }>>(
        `${this.api.baseUrl}/api/tasks/${taskId}/status`,
        { status },
      )
      .pipe(map((r) => r.data.task));
  }

  listComments(taskId: string): Observable<TaskComment[]> {
    return this.http
      .get<ApiSuccess<TaskComment[]>>(`${this.api.baseUrl}/api/tasks/${taskId}/comments`)
      .pipe(map((r) => r.data));
  }

  addComment(taskId: string, message: string): Observable<TaskComment> {
    return this.http
      .post<ApiSuccess<{ comment: TaskComment }>>(
        `${this.api.baseUrl}/api/tasks/${taskId}/comments`,
        { message },
      )
      .pipe(map((r) => r.data.comment));
  }
}
