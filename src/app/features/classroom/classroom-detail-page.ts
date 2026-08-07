import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { ConfirmService } from '../../shared/services/confirm.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  ClassroomService,
  type Assignment,
  type AssignmentListItem,
  type Classroom,
  type ClassroomMember,
  type ClassroomRole,
  type SubmissionWithStudent,
} from '../../core/services/classroom.service';

/** Same `owner/repo` shape the backend validates (mirror of the zod schema). */
const OWNER_REPO_REGEX =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/;

/**
 * Aula detail. Everything here is role-aware: the invite-code box, the
 * assignment creation form and the submissions tables are PROFESOR-only;
 * the inline "entregar repo" form is ALUMNO-only. The backend enforces the
 * same contract — the UI just avoids offering dead ends.
 */
@Component({
  selector: 'dp-classroom-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingStateComponent, TPipe],
  templateUrl: './classroom-detail-page.html',
  styleUrl: './classroom-detail-page.scss',
})
export class ClassroomDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly classroomApi = inject(ClassroomService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly tr = inject(TranslationService);

  protected readonly classroomId = this.route.snapshot.paramMap.get('classroomId') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly classroom = signal<Classroom | null>(null);
  protected readonly myRole = signal<ClassroomRole | null>(null);
  protected readonly members = signal<ClassroomMember[]>([]);
  protected readonly assignments = signal<AssignmentListItem[]>([]);

  protected readonly isProfesor = computed(() => this.myRole() === 'PROFESOR');

  // Invite code box (PROFESOR) ------------------------------------------------
  protected readonly copied = signal(false);
  protected readonly rotating = signal(false);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  // Assignment creation (PROFESOR) --------------------------------------------
  protected readonly assignmentFormOpen = signal(false);
  protected readonly creatingAssignment = signal(false);
  protected readonly assignmentError = signal<string | null>(null);
  protected readonly assignmentForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    instructions: ['', [Validators.maxLength(20000)]],
    templateRepoFullName: ['', [Validators.pattern(OWNER_REPO_REGEX)]],
    dueAt: [''],
  });

  // Submissions table (PROFESOR, lazy per assignment) -------------------------
  protected readonly expandedAssignmentId = signal<string | null>(null);
  protected readonly submissionsMap = signal<Record<string, SubmissionWithStudent[]>>({});
  protected readonly submissionsLoading = signal<string | null>(null);
  protected readonly submissionsError = signal<string | null>(null);

  // Inline submit form (ALUMNO) -----------------------------------------------
  protected readonly submittingId = signal<string | null>(null);
  protected readonly submitErrors = signal<Record<string, string>>({});

  // Roster --------------------------------------------------------------------
  protected readonly removingUserId = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    if (!this.classroomId) return;
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      firstValueFrom(this.classroomApi.get(this.classroomId)),
      firstValueFrom(this.classroomApi.members(this.classroomId)),
      firstValueFrom(this.classroomApi.listAssignments(this.classroomId)),
    ])
      .then(([detail, members, assignments]) => {
        this.classroom.set(detail.classroom);
        this.myRole.set(detail.role);
        this.members.set(members);
        this.assignments.set(assignments);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set(this.tr.t('classroom.errors.loadDetail'));
        this.loading.set(false);
      });
  }

  // ---- Invite code ----------------------------------------------------------

  async copyCode(): Promise<void> {
    const c = this.classroom();
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c.inviteCode);
      this.copied.set(true);
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the
      // code visible on screen; there is nothing actionable to tell the user.
    }
  }

  async rotateCode(): Promise<void> {
    if (this.rotating()) return;
    const ok = await this.confirmSvc.ask({
      title: this.tr.t('classroom.code.rotateTitle'),
      message: this.tr.t('classroom.code.rotateMessage'),
      confirmLabel: this.tr.t('classroom.code.rotateConfirm'),
      cancelLabel: this.tr.t('common.cancel'),
      variant: 'danger',
      icon: 'pi-refresh',
    });
    if (!ok) return;

    this.rotating.set(true);
    this.classroomApi.rotateInviteCode(this.classroomId).subscribe({
      next: (classroom) => {
        this.classroom.set(classroom);
        this.rotating.set(false);
      },
      error: () => {
        this.rotating.set(false);
        this.error.set(this.tr.t('classroom.code.rotateError'));
      },
    });
  }

  // ---- Assignments (PROFESOR) -----------------------------------------------

  openAssignmentForm(): void {
    this.assignmentForm.reset();
    this.assignmentError.set(null);
    this.assignmentFormOpen.set(true);
  }

  closeAssignmentForm(): void {
    this.assignmentFormOpen.set(false);
  }

  submitAssignment(): void {
    if (this.assignmentForm.invalid || this.creatingAssignment()) return;
    this.creatingAssignment.set(true);
    this.assignmentError.set(null);

    const raw = this.assignmentForm.getRawValue();
    const input = {
      title: raw.title.trim(),
      ...(raw.instructions.trim() ? { instructions: raw.instructions.trim() } : {}),
      ...(raw.templateRepoFullName.trim()
        ? { templateRepoFullName: raw.templateRepoFullName.trim() }
        : {}),
      ...(raw.dueAt ? { dueAt: new Date(raw.dueAt).toISOString() } : {}),
    };

    this.classroomApi.createAssignment(this.classroomId, input).subscribe({
      next: (assignment: Assignment) => {
        this.creatingAssignment.set(false);
        this.assignmentFormOpen.set(false);
        // Newest-first, same order the backend lists them in.
        this.assignments.update((list) => [
          { assignment, submissionsCount: 0 },
          ...list,
        ]);
      },
      error: () => {
        this.creatingAssignment.set(false);
        this.assignmentError.set(this.tr.t('classroom.assignments.createError'));
      },
    });
  }

  toggleSubmissions(assignmentId: string): void {
    if (this.expandedAssignmentId() === assignmentId) {
      this.expandedAssignmentId.set(null);
      return;
    }
    this.expandedAssignmentId.set(assignmentId);
    this.submissionsError.set(null);

    // Lazy fetch, cached per assignment for the lifetime of the page.
    if (this.submissionsMap()[assignmentId]) return;
    this.submissionsLoading.set(assignmentId);
    this.classroomApi.listSubmissions(this.classroomId, assignmentId).subscribe({
      next: (subs) => {
        this.submissionsMap.update((m) => ({ ...m, [assignmentId]: subs }));
        this.submissionsLoading.set(null);
      },
      error: () => {
        this.submissionsLoading.set(null);
        this.submissionsError.set(this.tr.t('classroom.submissions.loadError'));
      },
    });
  }

  // ---- Submit (ALUMNO) ------------------------------------------------------

  submitRepo(item: AssignmentListItem, input: HTMLInputElement): void {
    const assignmentId = item.assignment._id;
    if (this.submittingId()) return;

    const repoFullName = input.value.trim();
    if (!OWNER_REPO_REGEX.test(repoFullName)) {
      this.submitErrors.update((e) => ({
        ...e,
        [assignmentId]: this.tr.t('classroom.submit.invalidRepo'),
      }));
      return;
    }

    this.submittingId.set(assignmentId);
    this.submitErrors.update((e) => ({ ...e, [assignmentId]: '' }));

    this.classroomApi.submit(this.classroomId, assignmentId, repoFullName).subscribe({
      next: (submission) => {
        this.submittingId.set(null);
        this.assignments.update((list) =>
          list.map((a) =>
            a.assignment._id === assignmentId ? { ...a, mySubmission: submission } : a,
          ),
        );
      },
      error: () => {
        this.submittingId.set(null);
        this.submitErrors.update((e) => ({
          ...e,
          [assignmentId]: this.tr.t('classroom.submit.error'),
        }));
      },
    });
  }

  // ---- Roster ---------------------------------------------------------------

  async removeMember(member: ClassroomMember): Promise<void> {
    if (this.removingUserId()) return;
    const ok = await this.confirmSvc.ask({
      title: this.tr.t('classroom.roster.removeTitle'),
      message: `${this.tr.t('classroom.roster.removeMessage')} (${member.name})`,
      confirmLabel: this.tr.t('classroom.roster.remove'),
      cancelLabel: this.tr.t('common.cancel'),
      variant: 'danger',
      icon: 'pi-user-minus',
    });
    if (!ok) return;

    this.removingUserId.set(member.userId);
    this.classroomApi.removeMember(this.classroomId, member.userId).subscribe({
      next: () => {
        this.removingUserId.set(null);
        this.members.update((list) => list.filter((m) => m.userId !== member.userId));
      },
      error: () => {
        this.removingUserId.set(null);
        this.error.set(this.tr.t('classroom.roster.removeError'));
      },
    });
  }

  // ---- Template helpers -----------------------------------------------------

  githubUrl(repoFullName: string): string {
    return `https://github.com/${repoFullName}`;
  }

  initialOf(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  submissionsOf(assignmentId: string): SubmissionWithStudent[] {
    return this.submissionsMap()[assignmentId] ?? [];
  }

  submitErrorOf(assignmentId: string): string {
    return this.submitErrors()[assignmentId] ?? '';
  }
}
