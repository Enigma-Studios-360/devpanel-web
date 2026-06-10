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
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge';

import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { PermissionsService } from '../../core/auth/permissions.service';
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
    DragDropModule,
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
  protected readonly permissions = inject(PermissionsService);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly project = signal<Project | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /**
   * Stable arrays per kanban status. CDK's drag-drop mutates these
   * directly via `transferArrayItem`, so they MUST be the same object
   * references between change-detection cycles (we can't return new
   * arrays from a `tasksFor()` getter — CDK would lose track of them).
   *
   * Built/rebuilt by `rebuildColumns()` from the master `tasks` signal.
   * Template binds `[cdkDropListData]="columnTasks[col.status]"`.
   */
  protected columnTasks: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    BLOCKED: [],
    DONE: [],
  };

  /** Optimistic-move error banner. Cleared on next successful refresh. */
  protected readonly moveError = signal<string | null>(null);

  protected readonly columns: KanbanColumn[] = [
    { status: 'TODO',        label: 'Por hacer',   color: '#6B7280', icon: 'pi-circle' },
    { status: 'IN_PROGRESS', label: 'En progreso', color: '#3B82F6', icon: 'pi-spinner' },
    { status: 'REVIEW',      label: 'En revisión', color: '#8B5CF6', icon: 'pi-search' },
    { status: 'BLOCKED',     label: 'Bloqueadas',  color: '#EF4444', icon: 'pi-ban' },
    { status: 'DONE',        label: 'Hechas',      color: '#22C55E', icon: 'pi-check' },
  ];

  /** Pre-computed list of drop-list ids so each column connects to all others. */
  protected readonly allListIds = this.columns.map((c) => 'col-' + c.status);

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
    // Whenever the master task list changes (refresh, create, archive,
    // delete, drawer-update), rebuild the per-column arrays IN PLACE so
    // CDK keeps tracking the same references.
    //
    // `skipNextRebuild` lets drop-driven mirrors of the signal skip
    // this rebuild (otherwise we'd clobber the in-place CDK move with a
    // re-bucket pass and the card would visually snap back).
    effect(() => {
      const tasks = this.tasks();
      if (this.skipNextRebuild) {
        this.skipNextRebuild = false;
        return;
      }
      this.rebuildColumns(tasks);
    });
    // Tutorial-driven actions
    this.tutorial.actions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => {
        if (action.key === 'open-modal:create-task') this.openCreate();
      });
  }

  /**
   * Rebuild the per-column arrays from the master `tasks` signal,
   * preserving the SAME array object so CDK doesn't lose its drop
   * targets. We empty + push in place rather than reassigning.
   */
  private rebuildColumns(tasks: Task[]): void {
    for (const col of this.columns) {
      this.columnTasks[col.status].length = 0;
    }
    for (const t of tasks) {
      const bucket = this.columnTasks[t.status] ?? this.columnTasks.TODO;
      bucket.push(t);
    }
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.tasksApi.listByProject(id).toPromise(),
      this.projectsApi.getWithRole(id).toPromise(),
    ])
      .then(([tasks, projectAndRole]) => {
        this.tasks.set(tasks ?? []);
        this.project.set(projectAndRole?.project ?? null);
        this.permissions.setRole(projectAndRole?.userRole ?? null);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudieron cargar las tareas.');
        this.loading.set(false);
      });
  }

  // Column helpers — return the SAME array reference each call so CDK
  // can mutate them and *ngFor stays stable across drops.
  tasksFor(status: TaskStatus): Task[] {
    return this.columnTasks[status];
  }
  countFor(status: TaskStatus): number {
    return this.columnTasks[status].length;
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
        // Advance the onboarding tour if it's waiting on this event.
        this.tutorial.emitEvent('task-created');
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

  /** Called when the drawer reports the task was archived or deleted. */
  onTaskRemoved(id: string): void {
    this.tasks.update((arr) => arr.filter((t) => t._id !== id));
    if (this.selectedTask()?._id === id) {
      this.selectedTask.set(null);
    }
  }

  // --- Drag & drop ----------------------------------------------------------

  /** Build the cdkDropList id used for connection between columns. */
  listIdFor(status: TaskStatus): string {
    return 'col-' + status;
  }

  /**
   * Handle a CDK drop event.
   *
   *   - Same column reorder: just swap indices locally (no server call —
   *     we don't persist within-column order yet).
   *   - Cross-column move: optimistically transfer the card, mutate the
   *     task's status, then call the API. On error: revert and surface
   *     a banner with the failure reason.
   *
   * We never set the `tasks` signal directly here because CDK has
   * already mutated `columnTasks` in place. To keep the master in sync
   * (so create/update/delete keep working) we rebuild it from the
   * column data after every successful move.
   */
  onDrop(event: CdkDragDrop<Task[]>): void {
    if (!this.permissions.canEditTasks()) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const fromStatus = event.previousContainer.id.replace(/^col-/, '') as TaskStatus;
    const toStatus = event.container.id.replace(/^col-/, '') as TaskStatus;
    const task = event.previousContainer.data[event.previousIndex];
    if (!task) return;

    // Move in the UI first — feels instant.
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    task.status = toStatus;
    this.syncTasksSignalFromColumns();
    this.moveError.set(null);

    // Persist on the server. On failure, undo.
    this.tasksApi.changeStatus(task._id, toStatus).subscribe({
      next: (updated) => {
        // Merge any server-side fields back in (e.g. updatedAt) without
        // re-creating the task reference — the column array already
        // points at it.
        Object.assign(task, updated);
      },
      error: (err) => {
        // Revert: move the card back, restore the original status.
        const reverseFrom = this.columnTasks[toStatus];
        const reverseTo = this.columnTasks[fromStatus];
        const ix = reverseFrom.indexOf(task);
        if (ix !== -1) {
          reverseFrom.splice(ix, 1);
          reverseTo.splice(event.previousIndex, 0, task);
          task.status = fromStatus;
          this.syncTasksSignalFromColumns();
        }
        this.moveError.set(
          err?.error?.error?.message ??
            'No se pudo cambiar el estado. Tu rol o el servidor lo bloquearon.',
        );
      },
    });
  }

  /**
   * After CDK mutates columnTasks, mirror the result back into the
   * master signal so create/delete/archive code (which still operates on
   * `tasks.update`) sees a consistent snapshot. We use signal.set with a
   * fresh array so subscribers re-evaluate.
   */
  private syncTasksSignalFromColumns(): void {
    const next: Task[] = [];
    for (const col of this.columns) {
      next.push(...this.columnTasks[col.status]);
    }
    // Bypass the rebuild effect: we just mutated the columns directly.
    // We don't want the effect to re-trigger and clobber them.
    this.skipNextRebuild = true;
    this.tasks.set(next);
  }

  /** Effect-skip guard for the rebuild logic above. */
  private skipNextRebuild = false;
}
