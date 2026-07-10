import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ImportService,
  EXCLUSION_META,
  type ImportAnalysis,
  type ImportResult,
  type ExclusionCategory,
} from '../../../core/services/import.service';

type Phase = 'idle' | 'analyzing' | 'review' | 'confirming' | 'done';

/**
 * "Sube tu proyecto": arrastra un ZIP → reporte educativo de exclusiones →
 * crea el repo en la cuenta GitHub del usuario y empuja los archivos limpios.
 * Emite `imported` con el resultado para que la página padre refresque el repo.
 */
@Component({
  selector: 'dp-project-import',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './project-import.html',
  styleUrl: './project-import.scss',
})
export class ProjectImportComponent {
  private readonly importApi = inject(ImportService);

  /** Id del proyecto donde se importa. */
  readonly projectId = input.required<string>();
  /** ¿El usuario ya conectó su GitHub? Sin eso no se puede crear el repo. */
  readonly githubConnected = input<boolean>(false);

  readonly imported = output<ImportResult>();
  /** El usuario cerró la tarjeta de resultado: el padre puede refrescar ya. */
  readonly viewRepo = output<void>();

  protected readonly phase = signal<Phase>('idle');
  protected readonly dragOver = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly analysis = signal<ImportAnalysis | null>(null);
  protected readonly result = signal<ImportResult | null>(null);

  protected readonly repoName = signal('');
  protected readonly isPrivate = signal(true);

  protected readonly meta = EXCLUSION_META;
  protected readonly excludedCategories = computed<
    Array<{ category: ExclusionCategory; count: number }>
  >(() => {
    const a = this.analysis();
    if (!a) return [];
    return (Object.entries(a.excludedCounts) as Array<[ExclusionCategory, number]>)
      .map(([category, count]) => ({ category, count }))
      .sort((x, y) => {
        // secretos primero (lo más importante educativamente)
        if (x.category === 'SECRETO') return -1;
        if (y.category === 'SECRETO') return 1;
        return y.count - x.count;
      });
  });

  /** Muestra de secretos concretos excluidos (para nombrarlos explícitamente). */
  protected readonly secretSamples = computed(() =>
    (this.analysis()?.excluded ?? [])
      .filter((e) => e.category === 'SECRETO')
      .slice(0, 4)
      .map((e) => e.path.split('/').pop() ?? e.path),
  );

  // --- Drag & drop / file input --------------------------------------------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }
  onDragLeave(): void { this.dragOver.set(false); }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.analyze(file);
  }
  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.analyze(file);
    input.value = '';
  }

  // --- Steps ----------------------------------------------------------------

  private analyze(file: File): void {
    if (!/\.zip$/i.test(file.name)) {
      this.error.set('Sube un archivo .zip (comprime la carpeta de tu proyecto).');
      return;
    }
    this.error.set(null);
    this.phase.set('analyzing');
    this.importApi.analyze(this.projectId(), file).subscribe({
      next: (a) => {
        this.analysis.set(a);
        this.repoName.set(a.suggestedRepoName);
        this.phase.set('review');
      },
      error: (err) => {
        this.phase.set('idle');
        this.error.set(err?.error?.error?.message ?? 'No se pudo analizar el ZIP.');
      },
    });
  }

  confirm(): void {
    const a = this.analysis();
    if (!a || this.phase() === 'confirming') return;
    const name = this.repoName().trim();
    if (!name) { this.error.set('Ponle un nombre al repositorio.'); return; }
    this.error.set(null);
    this.phase.set('confirming');
    this.importApi.confirm(this.projectId(), a.importId, name, this.isPrivate()).subscribe({
      next: (r) => {
        this.result.set(r);
        this.phase.set('done');
        this.imported.emit(r);
      },
      error: (err) => {
        this.phase.set('review');
        this.error.set(err?.error?.error?.message ?? 'No se pudo crear el repositorio.');
      },
    });
  }

  reset(): void {
    this.phase.set('idle');
    this.analysis.set(null);
    this.result.set(null);
    this.error.set(null);
    this.repoName.set('');
    this.isPrivate.set(true);
  }

  onRepoNameInput(event: Event): void {
    this.repoName.set((event.target as HTMLInputElement).value);
  }

  formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }
}
