import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  effect,
  inject,
  signal,
} from '@angular/core';

import { TasksService } from '../../core/services/tasks.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { formatDate } from '../../shared/utils/format-date';
import {
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
} from '../../shared/models/task.model';
import type {
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  Assignee,
} from '../../shared/models/task.model';

@Component({
  selector: 'dp-task-detail-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    LoadingStateComponent,
  ],
  templateUrl: './task-detail-drawer.html',
  styleUrl: './task-detail-drawer.scss',
})
export class TaskDetailDrawerComponent {
  @Input() task: Task | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskRemoved = new EventEmitter<string>();

  private readonly tasksApi = inject(TasksService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmSvc = inject(ConfirmService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly archiving = signal(false);
  protected readonly deleting = signal(false);

  protected readonly statuses: TaskStatus[] = TASK_STATUS_VALUES;
  protected readonly priorities: TaskPriority[] = TASK_PRIORITY_VALUES;

  protected readonly comments = signal<TaskComment[]>([]);
  protected readonly loadingComments = signal(false);
  protected readonly statusMenuOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly commentForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(5000)]],
  });
  protected readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    priority: ['MEDIUM' as TaskPriority],
    dueDate: [''],
  });
  protected readonly sendingComment = signal(false);
  protected readonly savingEdit = signal(false);
  protected readonly opError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const t = this.task;
      this.statusMenuOpen.set(false);
      this.editing.set(false);
      this.opError.set(null);
      if (!t) {
        this.comments.set([]);
        return;
      }
      this.editForm.reset({
        title: t.title,
        description: t.description ?? '',
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
      });
      this.loadComments(t._id);
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.task) this.close.emit();
  }

  formatDate(value?: string): string {
    return formatDate(value);
  }

  assigneesText(): string {
    if (!this.task) return '—';
    const arr = this.task.assignees as (Assignee | string)[];
    if (arr.length === 0) return 'Sin asignados';
    return arr.map((a) => (typeof a === 'string' ? a : a.name)).join(', ');
  }

  createdByName(): string {
    if (!this.task) return '';
    const c = this.task.createdBy;
    return typeof c === 'string' ? c : c.name;
  }

  commenterName(c: TaskComment): string {
    return typeof c.user === 'string' ? c.user : c.user.name;
  }

  commenterInitial(c: TaskComment): string {
    const name = this.commenterName(c).trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'hace instantes';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }

  // --- Status ---------------------------------------------------------------

  toggleStatusMenu(): void {
    this.statusMenuOpen.update((v) => !v);
  }

  changeStatus(status: TaskStatus): void {
    if (!this.task || this.task.status === status) {
      this.statusMenuOpen.set(false);
      return;
    }
    this.opError.set(null);
    this.tasksApi.changeStatus(this.task._id, status).subscribe({
      next: (updated) => {
        this.statusMenuOpen.set(false);
        // Preserve populated assignees + createdBy if the response strips them
        const merged: Task = { ...this.task!, ...updated };
        this.taskUpdated.emit(merged);
      },
      error: (err) => {
        this.opError.set(
          err?.error?.error?.message ?? 'No se pudo cambiar el estado.',
        );
      },
    });
  }

  // --- Edit -----------------------------------------------------------------

  startEditing(): void {
    if (!this.task) return;
    this.editForm.reset({
      title: this.task.title,
      description: this.task.description ?? '',
      priority: this.task.priority,
      dueDate: this.task.dueDate ? this.task.dueDate.slice(0, 10) : '',
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    if (!this.task || this.editForm.invalid || this.savingEdit()) return;
    const v = this.editForm.getRawValue();
    this.savingEdit.set(true);
    this.opError.set(null);
    this.tasksApi.update(this.task._id, {
      title: v.title.trim(),
      description: v.description || undefined,
      priority: v.priority,
      dueDate: v.dueDate || undefined,
    }).subscribe({
      next: (updated) => {
        this.savingEdit.set(false);
        this.editing.set(false);
        const merged: Task = { ...this.task!, ...updated };
        this.taskUpdated.emit(merged);
      },
      error: (err) => {
        this.savingEdit.set(false);
        this.opError.set(
          err?.error?.error?.message ?? 'No se pudo guardar la tarea.',
        );
      },
    });
  }

  // --- Comments -------------------------------------------------------------

  loadComments(taskId: string): void {
    this.loadingComments.set(true);
    this.tasksApi.listComments(taskId).subscribe({
      next: (data) => {
        this.comments.set(data);
        this.loadingComments.set(false);
      },
      error: () => {
        this.comments.set([]);
        this.loadingComments.set(false);
      },
    });
  }

  sendComment(): void {
    if (!this.task || this.commentForm.invalid || this.sendingComment()) return;
    const message = this.commentForm.controls.message.value;
    this.sendingComment.set(true);
    this.opError.set(null);
    this.tasksApi.addComment(this.task._id, message).subscribe({
      next: (c) => {
        this.sendingComment.set(false);
        this.commentForm.reset({ message: '' });
        this.comments.update((arr) => [...arr, c]);
      },
      error: (err) => {
        this.sendingComment.set(false);
        this.opError.set(
          err?.error?.error?.message ?? 'No se pudo enviar el comentario.',
        );
      },
    });
  }

  // --- Archive / Delete -----------------------------------------------------

  async archive(): Promise<void> {
    if (!this.task || this.archiving()) return;
    const ok = await this.confirmSvc.ask({
      title: 'Archivar tarea',
      message:
        'La tarea se ocultará del tablero pero no se eliminará. ' +
        'Podrás restaurarla más tarde desde el listado de archivadas.',
      confirmLabel: 'Archivar',
      cancelLabel: 'Cancelar',
      icon: 'pi-inbox',
    });
    if (!ok || !this.task) return;
    this.archiving.set(true);
    this.opError.set(null);
    const id = this.task._id;
    this.tasksApi.archive(id).subscribe({
      next: () => {
        this.archiving.set(false);
        this.taskRemoved.emit(id);
        this.close.emit();
      },
      error: (err) => {
        this.archiving.set(false);
        this.opError.set(
          err?.error?.error?.message ?? 'No se pudo archivar la tarea.',
        );
      },
    });
  }

  async remove(): Promise<void> {
    if (!this.task || this.deleting()) return;
    const ok = await this.confirmSvc.ask({
      title: 'Eliminar tarea',
      message:
        'Esta acción es permanente. Se borrarán también todos sus comentarios. ' +
        'Si solo quieres ocultarla del tablero, mejor archívala.',
      confirmLabel: 'Eliminar definitivamente',
      cancelLabel: 'Cancelar',
      variant: 'danger',
      icon: 'pi-trash',
    });
    if (!ok || !this.task) return;
    this.deleting.set(true);
    this.opError.set(null);
    const id = this.task._id;
    this.tasksApi.remove(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.taskRemoved.emit(id);
        this.close.emit();
      },
      error: (err) => {
        this.deleting.set(false);
        this.opError.set(
          err?.error?.error?.message ?? 'No se pudo eliminar la tarea.',
        );
      },
    });
  }
}
