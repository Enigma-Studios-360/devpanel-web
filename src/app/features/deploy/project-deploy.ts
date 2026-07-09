import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as QRCode from 'qrcode';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { formatDate } from '../../shared/utils/format-date';

import {
  DeployService,
  type DeployHistory,
  type DeployPrepareResult,
  type DeploymentRecord,
  type TriggerDeployInput,
  type VercelFrameworkPreset,
} from '../../core/services/deploy.service';
import { ProjectsService } from '../../core/services/projects.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import type { Project } from '../../shared/models/project.model';

/**
 * Sequence of steps the user moves through. We keep this declared so the
 * stepper UI in the template can iterate without hard-coding numbers.
 */
const STEP_LABELS: ReadonlyArray<{ key: WizardStep; label: string; icon: string }> = [
  { key: 'stack',   label: 'Stack',    icon: 'pi-microchip' },
  { key: 'build',   label: 'Build',    icon: 'pi-cog' },
  { key: 'env',     label: 'Variables', icon: 'pi-key' },
  { key: 'review',  label: 'Confirmar', icon: 'pi-check-circle' },
];

type WizardStep = 'stack' | 'build' | 'env' | 'review';

@Component({
  selector: 'dp-project-deploy',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    LearnMoreCardComponent,
  ],
  templateUrl: './project-deploy.html',
  styleUrl: './project-deploy.scss',
})
export class ProjectDeployComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly deploy = inject(DeployService);
  private readonly projectsApi = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly permissions = inject(PermissionsService);

  // ---- Resource state ------------------------------------------------------

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly project = signal<Project | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly history = signal<DeployHistory | null>(null);

  protected readonly providerConfigured = signal<boolean | null>(null);

  // ---- Wizard state --------------------------------------------------------

  protected readonly steps = STEP_LABELS;
  protected readonly currentStep = signal<WizardStep>('stack');
  protected readonly currentStepIndex = computed(() =>
    STEP_LABELS.findIndex((s) => s.key === this.currentStep()),
  );

  /** Step 1 output — backend's suggested config. */
  protected readonly prepareResult = signal<DeployPrepareResult | null>(null);
  protected readonly preparing = signal(false);
  protected readonly prepareError = signal<string | null>(null);

  /** Step 4 — trigger state. */
  protected readonly triggering = signal(false);
  protected readonly triggerError = signal<string | null>(null);
  protected readonly triggered = signal<DeploymentRecord | null>(null);

  /** QR of the public URL, rendered when the deploy reaches READY. */
  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly urlCopied = signal(false);

  /** Status polling token so we can cancel on destroy / navigation. */
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly buildForm = this.fb.nonNullable.group({
    projectName: ['', [Validators.required, Validators.maxLength(100)]],
    framework: ['other' as VercelFrameworkPreset, Validators.required],
    buildCommand: [''],
    outputDirectory: [''],
    installCommand: [''],
    rootDirectory: [''],
    branch: ['main', Validators.required],
  });

  /** Reactive form array for env-var rows. */
  protected readonly envForm = this.fb.group({
    rows: this.fb.array<FormGroup>([]),
  });

  protected readonly frameworkOptions: Array<{ value: VercelFrameworkPreset; label: string }> = [
    { value: 'nextjs',           label: 'Next.js' },
    { value: 'angular',          label: 'Angular' },
    { value: 'vite',             label: 'Vite' },
    { value: 'create-react-app', label: 'Create React App' },
    { value: 'nuxtjs',           label: 'Nuxt' },
    { value: 'astro',            label: 'Astro' },
    { value: 'sveltekit',        label: 'SvelteKit' },
    { value: 'remix',            label: 'Remix' },
    { value: 'vue',              label: 'Vue' },
    { value: 'svelte',           label: 'Svelte' },
    { value: 'gatsby',           label: 'Gatsby' },
    { value: 'other',            label: 'Otro (manual)' },
  ];

  constructor() {
    this.refresh();
    this.deploy.status().subscribe({
      next: (s) => this.providerConfigured.set(s.configured),
      error: () => this.providerConfigured.set(false),
    });

    // Whenever a deployment is triggered, kick off the polling effect.
    effect(() => {
      const dep = this.triggered();
      if (dep && dep.status !== 'READY' && dep.status !== 'ERROR' && dep.status !== 'CANCELED') {
        this.scheduleStatusPoll(dep._id);
      }
    });

    // When the deploy settles in READY, draw the QR of the public URL so
    // the team can share it (or project it) straight from the wizard.
    effect(() => {
      const dep = this.triggered();
      const target = dep?.publicUrl ?? dep?.url;
      if (dep?.status === 'READY' && target) {
        QRCode.toDataURL(target, {
          width: 260,
          margin: 1,
          color: { dark: '#0B1020', light: '#FFFFFF' },
        })
          .then((data) => this.qrDataUrl.set(data))
          .catch(() => this.qrDataUrl.set(null));
      } else {
        this.qrDataUrl.set(null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ---- Loaders -------------------------------------------------------------

  refresh(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    this.loadError.set(null);

    Promise.all([
      this.projectsApi.getWithRole(id).toPromise(),
      this.deploy.history(id).toPromise(),
    ])
      .then(([projectAndRole, history]) => {
        const proj = projectAndRole?.project ?? null;
        this.project.set(proj);
        this.permissions.setRole(projectAndRole?.userRole ?? null);
        this.history.set(history ?? null);
        this.loading.set(false);

        // If the latest deploy is still in flight, surface it to the
        // wizard's "triggered" slot so polling resumes after a page refresh.
        const current = history?.current;
        if (
          current &&
          current.status !== 'READY' &&
          current.status !== 'ERROR' &&
          current.status !== 'CANCELED'
        ) {
          this.triggered.set(current);
        }
      })
      .catch((err: HttpErrorResponse) => {
        this.loadError.set(
          (err?.error as { error?: { message?: string } } | undefined)?.error?.message ??
            'No se pudo cargar el proyecto.',
        );
        this.loading.set(false);
      });
  }

  /**
   * Step 1 — call backend "prepare" to learn the suggested build config,
   * then seed the build form. Idempotent: re-running it overwrites the
   * form with fresh suggestions (useful after editing the repo).
   */
  startWizard(): void {
    if (!this.permissions.canManageProject()) return;
    this.prepareError.set(null);
    this.triggerError.set(null);
    this.triggered.set(null);
    this.preparing.set(true);
    this.currentStep.set('stack');

    this.deploy.prepare(this.projectId()).subscribe({
      next: (result) => {
        this.prepareResult.set(result);
        this.buildForm.patchValue({
          projectName: result.suggestedProjectName,
          framework: result.framework,
          buildCommand: result.buildCommand,
          outputDirectory: result.outputDirectory,
          installCommand: result.installCommand,
          branch: result.branch,
        });
        // Seed env form with suggested keys (empty values for the user).
        this.resetEnvRows();
        for (const key of result.suggestedEnv) {
          this.addEnvRow(key, '');
        }
        this.preparing.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.preparing.set(false);
        this.prepareError.set(this.errorMessageFrom(err));
      },
    });
  }

  /** Move forward through the stepper, with the appropriate validation. */
  next(): void {
    const idx = this.currentStepIndex();
    if (idx < 0 || idx >= STEP_LABELS.length - 1) return;
    this.currentStep.set(STEP_LABELS[idx + 1].key);
  }

  prev(): void {
    const idx = this.currentStepIndex();
    if (idx <= 0) return;
    this.currentStep.set(STEP_LABELS[idx - 1].key);
  }

  /**
   * Step 4 — submit. We send only the fields the user filled; the
   * backend treats anything missing as "use the framework preset
   * default", which is exactly what we want.
   */
  submit(): void {
    if (this.triggering()) return;
    if (this.buildForm.invalid) {
      this.buildForm.markAllAsTouched();
      this.currentStep.set('build');
      return;
    }
    const v = this.buildForm.getRawValue();
    const input: TriggerDeployInput = {
      projectName: v.projectName.trim() || undefined,
      framework: v.framework,
      buildCommand: v.buildCommand.trim() || undefined,
      outputDirectory: v.outputDirectory.trim() || undefined,
      installCommand: v.installCommand.trim() || undefined,
      rootDirectory: v.rootDirectory.trim() || undefined,
      branch: v.branch.trim() || undefined,
      envVars: this.envRowsAsPairs(),
    };

    this.triggering.set(true);
    this.triggerError.set(null);

    this.deploy.trigger(this.projectId(), input).subscribe({
      next: (deployment) => {
        this.triggering.set(false);
        this.triggered.set(deployment);
        // Optimistic prepend to history.
        this.history.update((h) => {
          if (!h) return { current: deployment, history: [deployment] };
          return { current: deployment, history: [deployment, ...h.history].slice(0, 10) };
        });
      },
      error: (err: HttpErrorResponse) => {
        this.triggering.set(false);
        this.triggerError.set(this.errorMessageFrom(err));
      },
    });
  }

  // ---- Polling -------------------------------------------------------------

  /**
   * Schedule a single status refresh in 3s. The effect re-arms it as
   * long as the deployment is still in flight. Cancelled on destroy or
   * when the deployment settles.
   */
  private scheduleStatusPoll(deploymentId: string): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      this.deploy.refresh(this.projectId(), deploymentId).subscribe({
        next: (updated) => {
          this.triggered.set(updated);
          this.history.update((h) => {
            if (!h) return h;
            return {
              current: updated,
              history: h.history.map((d) => (d._id === updated._id ? updated : d)),
            };
          });
        },
        error: () => {
          // Network blip — try again in 6s instead of giving up.
          this.pollTimer = setTimeout(
            () => this.scheduleStatusPoll(deploymentId),
            6_000,
          );
        },
      });
    }, 3_000);
  }

  // ---- Env vars helpers ----------------------------------------------------

  protected get envRows(): FormArray<FormGroup> {
    return this.envForm.controls.rows;
  }

  addEnvRow(key = '', value = ''): void {
    this.envRows.push(
      this.fb.group({
        key: [key, [Validators.maxLength(256)]],
        value: [value, [Validators.maxLength(2000)]],
      }),
    );
  }

  removeEnvRow(idx: number): void {
    this.envRows.removeAt(idx);
  }

  private resetEnvRows(): void {
    while (this.envRows.length > 0) this.envRows.removeAt(0);
  }

  private envRowsAsPairs(): Array<{ key: string; value: string }> {
    return this.envRows.controls
      .map((g) => ({
        key: (g.value.key as string | undefined)?.trim() ?? '',
        value: (g.value.value as string | undefined) ?? '',
      }))
      .filter((p) => p.key.length > 0);
  }

  // ---- View helpers --------------------------------------------------------

  async copyPublicUrl(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.urlCopied.set(true);
      setTimeout(() => this.urlCopied.set(false), 2000);
    } catch {
      // clipboard unavailable (http/permissions) — no-op, the link is visible
    }
  }

  triggeredByName(d: DeploymentRecord): string {
    const v = d.triggeredBy;
    if (!v) return '—';
    if (typeof v === 'string') return v;
    return v.name ?? v.email ?? '—';
  }

  formatDate(value?: string): string { return formatDate(value); }

  statusVariant(status: DeploymentRecord['status']): string {
    switch (status) {
      case 'READY':    return 'success';
      case 'ERROR':    return 'danger';
      case 'CANCELED': return 'muted';
      case 'BUILDING': return 'info';
      default:         return 'warn';
    }
  }

  statusLabel(status: DeploymentRecord['status']): string {
    switch (status) {
      case 'READY':    return 'Listo';
      case 'BUILDING': return 'Construyendo';
      case 'QUEUED':   return 'En cola';
      case 'ERROR':    return 'Error';
      case 'CANCELED': return 'Cancelado';
    }
  }

  isInFlight(d: DeploymentRecord | null): boolean {
    if (!d) return false;
    return d.status !== 'READY' && d.status !== 'ERROR' && d.status !== 'CANCELED';
  }

  // ---- Error mapping -------------------------------------------------------

  private errorMessageFrom(err: HttpErrorResponse): string {
    const code = (err?.error as { error?: { code?: string } } | undefined)?.error?.code;
    const msg = (err?.error as { error?: { message?: string } } | undefined)?.error?.message;
    if (code === 'DEPLOY_VERCEL_GITHUB_UNLINKED') {
      return (
        msg ??
        'Tu cuenta de Vercel no está conectada a GitHub. Conéctala en Account Settings → Authentication y reintenta.'
      );
    }
    if (code === 'DEPLOY_GITHUB_APP_MISSING') {
      return (
        msg ??
        'Tu cuenta de Vercel no tiene acceso al repo. Instala la Vercel app en github.com/apps/vercel.'
      );
    }
    if (code === 'DEPLOY_NOT_CONFIGURED') {
      return msg ?? 'Vercel no está configurado en este servidor.';
    }
    if (code === 'DEPLOY_AUTH_FAILED') {
      return msg ?? 'La API key de Vercel fue rechazada.';
    }
    return msg ?? 'No fue posible procesar la operación.';
  }
}
