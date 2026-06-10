import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CommandPaletteService } from './command-palette.service';
import { SearchService, type SearchResults } from '../../services/search.service';

/**
 * Global command palette (⌘K / Ctrl+K). Searches teams, projects and tasks
 * the user can access and navigates to the chosen result. Mounted once in
 * the app shell so the shortcut works anywhere inside /app.
 */
@Component({
  selector: 'dp-command-palette',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class CommandPaletteComponent {
  protected readonly palette = inject(CommandPaletteService);
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);

  protected readonly queryControl = new FormControl('', { nonNullable: true });
  protected readonly results = signal<SearchResults | null>(null);
  protected readonly loading = signal(false);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  protected readonly hasResults = computed(() => {
    const r = this.results();
    return !!r && r.teams.length + r.projects.length + r.tasks.length > 0;
  });

  constructor() {
    this.queryControl.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((q) => {
          const term = q.trim();
          if (term.length < 2) {
            this.loading.set(false);
            return of<SearchResults | null>(null);
          }
          this.loading.set(true);
          return this.search.search(term).pipe(catchError(() => of<SearchResults | null>(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.results.set(res);
      });

    // Reset + focus the input whenever the palette opens.
    effect(() => {
      if (this.palette.open()) {
        this.queryControl.setValue('');
        this.results.set(null);
        this.loading.set(false);
        setTimeout(() => this.searchInput?.nativeElement?.focus(), 30);
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      this.palette.toggle();
      return;
    }
    if (e.key === 'Escape' && this.palette.open()) {
      this.palette.close();
    }
  }

  goTeam(id: string): void { this.navigate(['/app/teams', id]); }
  goProject(id: string): void { this.navigate(['/app/projects', id, 'overview']); }
  goTask(projectId: string): void { this.navigate(['/app/projects', projectId, 'tasks']); }

  private navigate(commands: unknown[]): void {
    this.palette.close();
    void this.router.navigate(commands as string[]);
  }
}
