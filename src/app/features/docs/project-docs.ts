import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { TPipe } from '../../core/i18n/t.pipe';

import {
  DocsService,
  DOC_SECTION_KEYS,
  DOC_SECTION_META,
  type DocSectionKey,
  type ProjectDoc,
  type GeneratedReadme,
} from '../../core/services/docs.service';
import { ProjectsService } from '../../core/services/projects.service';
import { SubscriptionsService, type Subscription } from '../../core/services/subscription.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import type { Project } from '../../shared/models/project.model';

@Component({
  selector: 'dp-project-docs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    LearnMoreCardComponent,
    TPipe,
  ],
  templateUrl: './project-docs.html',
  styleUrl: './project-docs.scss',
})
export class ProjectDocsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly docsApi = inject(DocsService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly subsApi = inject(SubscriptionsService);
  private readonly fb = inject(FormBuilder);
  protected readonly permissions = inject(PermissionsService);

  protected readonly sectionKeys = DOC_SECTION_KEYS;
  protected readonly sectionMeta = DOC_SECTION_META;

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly project = signal<Project | null>(null);
  protected readonly doc = signal<ProjectDoc | null>(null);
  protected readonly subscription = signal<Subscription | null>(null);

  protected readonly activeSection = signal<DocSectionKey>('overview');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saveOk = signal<boolean>(false);

  /** The form mirrors only the section currently being edited. */
  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    content: [''],
    completed: [false],
  });

  // README modal
  protected readonly readmeOpen = signal(false);
  protected readonly readmeData = signal<GeneratedReadme | null>(null);
  protected readonly generating = signal(false);
  protected readonly downloading = signal(false);
  protected readonly copySuccess = signal(false);
  protected readonly readmeError = signal<string | null>(null);

  protected readonly canDownloadReadme = computed(
    () => this.subscription()?.limits?.canDownloadReadme ?? false,
  );

  // AI doc generation
  protected readonly aiGenerating = signal(false);
  protected readonly aiError = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    Promise.all([
      this.docsApi.get(id).toPromise(),
      this.projectsApi.getWithRole(id).toPromise(),
    ])
      .then(async ([doc, projectAndRole]) => {
        this.doc.set(doc ?? null);
        const project = projectAndRole?.project ?? null;
        this.project.set(project);
        this.permissions.setRole(projectAndRole?.userRole ?? null);
        if (project?.team) {
          try {
            const sub = await this.subsApi.forTeam(project.team).toPromise();
            this.subscription.set(sub ?? null);
          } catch {
            this.subscription.set(null);
          }
        }
        this.loadIntoForm(this.activeSection());
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('No se pudo cargar la documentación.');
        this.loading.set(false);
      });
  }

  /** Replace the form with the currently-active section's data. */
  private loadIntoForm(key: DocSectionKey): void {
    const section = this.doc()?.sections?.[key];
    if (!section) return;
    this.form.reset({
      title: section.title,
      content: section.content,
      completed: section.completed,
    });
    this.saveOk.set(false);
    this.saveError.set(null);
  }

  selectSection(key: DocSectionKey): void {
    if (key === this.activeSection()) return;
    this.activeSection.set(key);
    this.loadIntoForm(key);
  }

  sectionCompleted(key: DocSectionKey): boolean {
    return this.doc()?.sections?.[key]?.completed ?? false;
  }

  getCompletedCount(doc: ProjectDoc): number {
    return DOC_SECTION_KEYS.filter((k) => doc.sections?.[k]?.completed).length;
  }

  save(): void {
    const id = this.projectId();
    if (!id || this.form.invalid || this.saving()) return;
    const key = this.activeSection();
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    this.saveOk.set(false);

    this.docsApi
      .update(id, { [key]: { title: v.title, content: v.content, completed: v.completed } })
      .subscribe({
        next: (doc) => {
          this.doc.set(doc);
          this.saving.set(false);
          this.saveOk.set(true);
          setTimeout(() => this.saveOk.set(false), 2000);
        },
        error: (err) => {
          this.saving.set(false);
          this.saveError.set(err?.error?.error?.message ?? 'No se pudo guardar.');
        },
      });
  }

  toggleCompleted(): void {
    this.form.patchValue({ completed: !this.form.controls.completed.value });
    this.save();
  }

  // README ---------------------------------------------------------------

  openReadme(): void {
    if (this.generating()) return;
    this.readmeError.set(null);
    this.copySuccess.set(false);
    this.generating.set(true);
    this.docsApi.generateReadme(this.projectId()).subscribe({
      next: (data) => {
        this.readmeData.set(data);
        this.readmeOpen.set(true);
        this.generating.set(false);
      },
      error: (err) => {
        this.generating.set(false);
        this.readmeError.set(err?.error?.error?.message ?? 'No se pudo generar el README.');
      },
    });
  }

  closeReadme(): void { this.readmeOpen.set(false); }

  /** Fill all 9 sections from the linked GitHub repo using DeepSeek. */
  generateAi(): void {
    const id = this.projectId();
    if (!id || this.aiGenerating()) return;
    this.aiError.set(null);
    this.aiGenerating.set(true);
    this.docsApi.generateWithAi(id).subscribe({
      next: (doc) => {
        this.doc.set(doc);
        this.loadIntoForm(this.activeSection());
        this.aiGenerating.set(false);
      },
      error: (err) => {
        this.aiGenerating.set(false);
        this.aiError.set(
          err?.error?.error?.message ?? 'No se pudo generar la documentación con IA.',
        );
      },
    });
  }

  async copyReadme(): Promise<void> {
    const data = this.readmeData();
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.markdown);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      this.readmeError.set('No se pudo copiar al portapapeles.');
    }
  }

  async downloadReadme(): Promise<void> {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.readmeError.set(null);
    try {
      await this.docsApi.downloadReadme(this.projectId());
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'PLAN_LIMIT_REACHED') {
        this.readmeError.set(
          'Tu plan actual no permite descargar el README. ' +
            'Cámbiate a STARTER o superior para habilitarlo.',
        );
      } else {
        this.readmeError.set(e.message ?? 'No se pudo descargar el README.');
      }
    } finally {
      this.downloading.set(false);
    }
  }

  goToPricing(): void {
    const teamId = this.project()?.team;
    void this.router.navigate(['/app/pricing'], {
      queryParams: teamId ? { teamId } : {},
    });
  }
}
