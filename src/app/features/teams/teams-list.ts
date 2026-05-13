import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { TeamsService, type TeamWithRole } from '../../core/services/teams.service';
import { TutorialService } from '../../core/tutorial/tutorial.service';
import { TPipe } from '../../core/i18n/t.pipe';

@Component({
  selector: 'dp-teams-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    LearnMoreCardComponent,
    TPipe,
  ],
  templateUrl: './teams-list.html',
  styleUrl: './teams.scss',
})
export class TeamsListComponent {
  private readonly teamsApi = inject(TeamsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly tutorial = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly teams = signal<TeamWithRole[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly modalOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
  });

  constructor() {
    this.refresh();
    // Listen to tutorial-driven actions ("open the create-team modal for me").
    this.tutorial.actions$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => {
        if (action.key === 'open-modal:create-team') this.openCreate();
      });
  }

  refresh(): void {
    this.loading.set(true);
    this.teamsApi.list().subscribe({
      next: (data) => {
        this.teams.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los equipos.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.form.reset();
    this.modalOpen.set(true);
  }

  closeCreate(): void {
    this.modalOpen.set(false);
  }

  submit(): void {
    if (this.form.invalid || this.creating()) return;
    this.creating.set(true);
    this.teamsApi.create(this.form.controls.name.value).subscribe({
      next: (team) => {
        this.creating.set(false);
        this.closeCreate();
        void this.router.navigate(['/app/teams', team._id]);
      },
      error: () => {
        this.creating.set(false);
        this.error.set('No se pudo crear el equipo.');
      },
    });
  }
}
