import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge';

import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { TutorialService } from '../../core/tutorial/tutorial.service';
import { TaskDetailDrawerComponent } from './task-detail-drawer';
import { formatDate } from '../../shared/utils/format-date';
import type {
  Task,
  TaskPriority,
  TaskStatus,
  Assignee,
} from '../../shared/models/task.model';
import type { Project } from '../../shared/models/project.model';

interface KanbanColumn {
  status: TaskStatus;
  label: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'dp-tasks-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    PriorityBadgeComponent,
    TaskDetailDrawerComponent,
  ],
  templateUrl: './tasks-board.html',
  styleUrl: './tasks-board.scss',
})
export class TasksBoardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksApi = inject(TasksService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly tutorial = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly project = signal<Project | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly columns: KanbanColumn[] = [
    { status: 'TODO',        label: 'Por hacer',   color: '#6B7280', icon: 'pi-circle' },
    { status: 'IN_PROGRESS', label: 'En progreso', color: '#3B82F6', icon: 'pi-spinner' },
    { status: 'REVIEW',      label: 'En revisión', color: '#8B5CF6', icon: 'pi-search' },
    { status: 'BLOCKED',     label: 'Bloqueadas',  color: '#EF4444', icon: 'pi-ban' },
    { status: 'DONE',        label: 'Hechas',      color: '#22C55E', icon: 'pi-check' },
  ];

  protected readonly priorities: TaskPriority[] = [
    'LOW', 'MEDIUM', 'HIGH', 'URGENT',
  ];

  // Modal: create
  protected readonly modalOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    description: [''],
    priority: ['MEDIUM' as TaskPriority],
    dueDate: [''],
  });

  // Drawer: detail
  protected readonly selectedTask = signal<Task | null>(null);
  protected readonly statusMenuOpen = signal(false);

  constructor() {
    this.refresh();
    // Close status menu on task switch
    effect(() => {
      void this.selectedTask();
      this.statusMenuOpen.set(false);
    });
    // Tutorial-driven actions
    this.tutorial.actions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => {
        if (action.key === 'open-modal:create-task') this.openCreate();
      });
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.tasksApi.listByProject(id).toPromise(),
      this.projectsApi.get(id).toPromise(),
    ])
      .then(([tasks, project]) => {
        this.tasks.set(tasks ?? []);
        this.project.set(project ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudieron cargar las tareas.');
        this.loading.set(false);
      });
  }

  // Column helpers
  tasksFor(status: TaskStatus): Task[] {
    return this.tasks().filter((t) => t.status === status);
  }
  countFor(status: TaskStatus): number {
    return this.tasksFor(status).length;
  }

  formatDate(value?: string): string {
    return formatDate(value);
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'DONE') return false;
    return new Date(task.dueDate).getTime() < Date.now();
  }

  assigneeNames(task: Task): string {
    const arr = task.assignees as (Assignee | string)[];
    return arr
      .map((a) => (typeof a === 'string' ? '?' : a.name.charAt(0).toUpperCase()))
      .join('');
  }

  assigneeFullNames(task: Task): string {
    const arr = task.assignees as (Assignee | string)[];
    return arr
      .map((a) => (typeof a === 'string' ? a : a.name))
      .join(', ');
  }

  // Create modal
  openCreate(): void {
    this.createForm.reset({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
    this.createError.set(null);
    this.modalOpen.set(true);
  }

  closeCreate(): void { this.modalOpen.set(false); }

  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) return;
    const v = this.createForm.getRawValue();
    this.creating.set(true);
    this.createError.set(null);
    this.tasksApi.create(this.projectId(), {
      title: v.title,
      description: v.description || undefined,
      priority: v.priority,
      dueDate: v.dueDate || undefined,
    }).subscribe({
      next: (task) => {
        this.creating.set(false);
        this.modalOpen.set(false);
        // Add at top of TODO column
        this.tasks.update((arr) => [task, ...arr]);
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err?.error?.error?.message ?? 'No se pudo crear la tarea.');
      },
    });
  }

  // Detail drawer
  openTask(task: Task): void {
    this.selectedTask.set(task);
  }

  closeTask(): void {
    this.selectedTask.set(null);
  }

  onTaskUpdated(updated: Task): void {
    this.tasks.update((arr) => arr.map((t) => (t._id === updated._id ? updated : t)));
    // Keep detail drawer in sync
    if (this.selectedTask()?._id === updated._id) {
      this.selectedTask.set(updated);
    }
  }
}
