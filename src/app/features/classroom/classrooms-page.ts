import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton';
import { TPipe } from '../../core/i18n/t.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  ClassroomService,
  type ClassroomWithRole,
} from '../../core/services/classroom.service';

/**
 * "Mis aulas" — every classroom where the user has a membership, with the
 * role THEY hold in each one (the same person can be PROFESOR of one aula
 * and ALUMNO of another; roles are per-aula, not global).
 */
@Component({
  selector: 'dp-classrooms-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    TPipe,
  ],
  templateUrl: './classrooms-page.html',
  styleUrl: './classrooms-page.scss',
})
export class ClassroomsPageComponent {
  private readonly classroomApi = inject(ClassroomService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tr = inject(TranslationService);

  protected readonly classrooms = signal<ClassroomWithRole[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // Create-aula modal ---------------------------------------------------------
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  // Join-by-code modal --------------------------------------------------------
  protected readonly joinOpen = signal(false);
  protected readonly joining = signal(false);
  protected readonly joinError = signal<string | null>(null);
  protected readonly joinForm = this.fb.nonNullable.group({
    inviteCode: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(8),
        Validators.pattern(/^[A-Za-z0-9]{8}$/),
      ],
    ],
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.classroomApi.list().subscribe({
      next: (data) => {
        this.classrooms.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.tr.t('classroom.errors.load'));
        this.loading.set(false);
      },
    });
  }

  // ---- Create ---------------------------------------------------------------

  openCreate(): void {
    this.createForm.reset();
    this.createError.set(null);
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) return;
    this.creating.set(true);
    this.createError.set(null);

    const name = this.createForm.controls.name.value.trim();
    const description = this.createForm.controls.description.value.trim();

    this.classroomApi
      .create({ name, ...(description ? { description } : {}) })
      .subscribe({
        next: (classroom) => {
          this.creating.set(false);
          this.closeCreate();
          void this.router.navigate(['/app/aulas', classroom._id]);
        },
        error: () => {
          this.creating.set(false);
          this.createError.set(this.tr.t('classroom.errors.create'));
        },
      });
  }

  // ---- Join -----------------------------------------------------------------

  openJoin(): void {
    this.joinForm.reset();
    this.joinError.set(null);
    this.joinOpen.set(true);
  }

  closeJoin(): void {
    this.joinOpen.set(false);
  }

  submitJoin(): void {
    if (this.joinForm.invalid || this.joining()) return;
    this.joining.set(true);
    this.joinError.set(null);

    const code = this.joinForm.controls.inviteCode.value.trim().toUpperCase();

    this.classroomApi.join(code).subscribe({
      next: ({ classroom }) => {
        this.joining.set(false);
        this.closeJoin();
        // alreadyMember or not, the aula detail is the right destination.
        void this.router.navigate(['/app/aulas', classroom._id]);
      },
      error: (err: HttpErrorResponse) => {
        this.joining.set(false);
        const code404 =
          (err?.error as { error?: { code?: string } } | undefined)?.error?.code;
        this.joinError.set(
          err.status === 404 || code404 === 'CLASSROOM_INVALID_CODE'
            ? this.tr.t('classroom.join.invalidCode')
            : this.tr.t('classroom.errors.join'),
        );
      },
    });
  }
}
