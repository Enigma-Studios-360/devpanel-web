import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TPipe } from '../../../core/i18n/t.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton';
import {
  DashboardService,
  type DashboardOverview,
  type DashboardActivityEntry,
  type DashboardMyTask,
} from '../../../core/services/dashboard.service';
import {
  ClassroomService,
  type AssignmentListItem,
  type ClassroomWithRole,
} from '../../../core/services/classroom.service';
import {
  DeployService,
  type DeploymentRecord,
} from '../../../core/services/deploy.service';
import {
  ArcadeService,
  type ArcadeProgress,
} from '../../../core/services/arcade.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { TutorialService } from '../../../core/tutorial/tutorial.service';

/** i18n fragment resolved in the template: `{{ x.key | t: x.params }}`. */
interface I18nFragment {
  key: string;
  params?: Record<string, string | number>;
}

/** Hero card when the user is ALUMNO with a pending assignment. */
interface AulaHeroVM {
  classroomId: string;
  classroomName: string;
  title: string;
  instructions: string;
  due: I18nFragment;
  overdue: boolean;
  done: number;
  total: number;
  pct: number;
}

/** Hero card when the user is PROFESOR with submissions waiting. */
interface ProfesorHeroVM {
  classroomId: string;
  classroomName: string;
  pending: number;
}

type HeroVariant = 'loading' | 'entrega' | 'revisar' | 'proyecto' | 'vacio';

const GREETED_PREFIX = 'devhub.greeted.';

/**
 * "Hoy" — editorial home. A giant time-aware greeting, a real date kicker
 * and an asymmetric bento fed by real workspace data: next classroom
 * assignment (or submissions to review), latest deploy, arcade progress,
 * recent activity and open tasks.
 */
@Component({
  selector: 'dp-home-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TPipe, SkeletonComponent],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
})
export class HomeDashboardComponent {
  private readonly dashboardApi = inject(DashboardService);
  private readonly classroomApi = inject(ClassroomService);
  private readonly deployApi = inject(DeployService);
  private readonly arcadeApi = inject(ArcadeService);
  private readonly auth = inject(AuthStateService);
  private readonly tutorial = inject(TutorialService);
  private readonly router = inject(Router);
  private readonly tr = inject(TranslationService);
  private readonly lang = inject(LanguageService);

  // --- State ----------------------------------------------------------------

  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly overviewLoading = signal<boolean>(true);
  protected readonly overviewError = signal<string | null>(null);

  protected readonly classrooms = signal<ClassroomWithRole[]>([]);
  protected readonly classroomsLoading = signal<boolean>(true);
  protected readonly aulaHero = signal<AulaHeroVM | null>(null);
  protected readonly profesorHero = signal<ProfesorHeroVM | null>(null);

  protected readonly lastDeploy = signal<DeploymentRecord | null>(null);
  protected readonly deployProjectId = signal<string | null>(null);

  protected readonly arcade = signal<ArcadeProgress | null>(null);

  protected readonly seeding = signal<boolean>(false);
  protected readonly seedError = signal<string | null>(null);

  // Animated counters (count-up on mount, still under prefers-reduced-motion)
  protected readonly aulasCount = signal(0);
  protected readonly tasksCount = signal(0);
  protected readonly arcadeStars = signal(0);
  protected readonly arcadeDay = signal(0);

  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Greeting (rotates by hour + typewriter once per day) -----------------

  protected readonly firstName = computed(() => {
    const full = this.auth.user()?.name?.trim() ?? '';
    const first = full.split(' ')[0] ?? '';
    return first || this.tr.t('home.fallbackName');
  });

  protected readonly greetKey = computed(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'home.greeting.morning';
    if (hour >= 12 && hour < 19) return 'home.greeting.afternoon';
    return 'home.greeting.night';
  });

  protected readonly greetParams = computed(() => ({ name: this.firstName() }));

  /** While true, the H1 renders the animated `typed()` text instead. */
  protected readonly typing = signal(false);
  protected readonly typed = signal('');
  private typewriterStarted = false;

  // --- Derived --------------------------------------------------------------

  /** "JUEVES 7 · AGO 2026" — real date, locale-aware, mono + uppercase. */
  protected readonly todayLabel = computed(() => {
    const locale = this.lang.current() === 'en' ? 'en-US' : 'es-MX';
    const now = new Date();
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
    const month = new Intl.DateTimeFormat(locale, { month: 'short' })
      .format(now)
      .replace('.', '');
    return `${weekday} ${now.getDate()} · ${month} ${now.getFullYear()}`;
  });

  protected readonly heroVariant = computed<HeroVariant>(() => {
    if (this.overviewLoading() || this.classroomsLoading()) return 'loading';
    if (this.aulaHero()) return 'entrega';
    if (this.profesorHero()) return 'revisar';
    if ((this.overview()?.recentProjects?.length ?? 0) > 0) return 'proyecto';
    return 'vacio';
  });

  protected readonly subKey = computed(() => {
    switch (this.heroVariant()) {
      case 'loading':  return 'home.sub.cargando';
      case 'entrega':  return 'home.sub.entrega';
      case 'revisar':  return 'home.sub.revisar';
      case 'proyecto': return 'home.sub.proyecto';
      default:         return 'home.sub.vacio';
    }
  });

  /** Most recent project — hero fallback when there is no classroom signal. */
  protected readonly heroProject = computed(
    () => this.overview()?.recentProjects?.[0] ?? null,
  );

  protected readonly activeClassrooms = computed(() =>
    this.classrooms().filter((c) => !c.classroom.archived),
  );

  protected readonly classroomNames = computed(() =>
    this.activeClassrooms()
      .slice(0, 2)
      .map((c) => c.classroom.name)
      .join(' · '),
  );

  protected readonly activity = computed<DashboardActivityEntry[]>(
    () => this.overview()?.recentActivity?.slice(0, 3) ?? [],
  );

  protected readonly myTasks = computed<DashboardMyTask[]>(
    () => this.overview()?.myOpenTasks?.slice(0, 4) ?? [],
  );

  protected readonly deployHost = computed(() => {
    const d = this.lastDeploy();
    const url = d?.publicUrl ?? d?.url ?? '';
    return url.replace(/^https?:\/\//, '');
  });

  protected readonly deployBadge = computed<I18nFragment | null>(() => {
    const d = this.lastDeploy();
    if (!d) return null;
    if (d.status === 'READY') return { key: 'home.cards.deployLive' };
    if (d.status === 'QUEUED' || d.status === 'BUILDING')
      return { key: 'home.cards.deployBuilding' };
    return { key: 'home.cards.deployError' };
  });

  /** Arcade streak pixels — one square per campaign day, capped at 10. */
  protected readonly arcadePixels = computed(() => {
    const day = this.arcade()?.day ?? 0;
    return Array.from({ length: 10 }, (_, i) => i < Math.min(day, 10));
  });

  /** True when the user has nothing in the workspace yet. */
  protected readonly isEmptyWorkspace = computed(() => {
    const o = this.overview();
    if (!o) return false;
    return o.stats.totalTeams === 0 && o.stats.totalProjects === 0;
  });

  constructor() {
    this.refreshOverview();
    this.loadClassrooms();
    this.loadArcade();
    this.bootstrapTour();

    // Typewriter: wait until translations AND the user name are hydrated so
    // we type the real sentence, not a raw i18n key.
    effect(() => {
      if (!this.tr.ready() || !this.auth.user()) return;
      this.maybeStartTypewriter();
    });
  }

  // --- Loaders --------------------------------------------------------------

  refreshOverview(): void {
    this.overviewLoading.set(true);
    this.overviewError.set(null);
    this.dashboardApi.overview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.overviewLoading.set(false);
        this.animateNumber(this.tasksCount, data.stats.openTasksAssignedToMe);
        this.loadLastDeploy(data);
      },
      error: () => {
        this.overviewError.set(this.tr.t('home.errors.overview'));
        this.overviewLoading.set(false);
      },
    });
  }

  private loadLastDeploy(data: DashboardOverview): void {
    const recent = data.recentProjects?.[0];
    if (!recent) return;
    this.deployApi
      .history(recent._id)
      .pipe(catchError(() => of(null)))
      .subscribe((h) => {
        const record = h?.current ?? h?.history?.[0] ?? null;
        this.lastDeploy.set(record);
        this.deployProjectId.set(recent._id);
      });
  }

  private loadClassrooms(): void {
    this.classroomApi
      .list()
      .pipe(catchError(() => of([] as ClassroomWithRole[])))
      .subscribe((rooms) => {
        this.classrooms.set(rooms);
        const active = rooms.filter((r) => !r.classroom.archived).slice(0, 4);
        this.animateNumber(
          this.aulasCount,
          rooms.filter((r) => !r.classroom.archived).length,
        );
        if (active.length === 0) {
          this.classroomsLoading.set(false);
          return;
        }
        forkJoin(
          active.map((room) =>
            this.classroomApi
              .listAssignments(room.classroom._id)
              .pipe(catchError(() => of([] as AssignmentListItem[]))),
          ),
        ).subscribe({
          next: (lists) => {
            this.buildClassroomHeroes(active, lists);
            this.classroomsLoading.set(false);
          },
          error: () => this.classroomsLoading.set(false),
        });
      });
  }

  private loadArcade(): void {
    this.arcadeApi
      .progress()
      .pipe(catchError(() => of(null)))
      .subscribe((progress) => {
        this.arcade.set(progress);
        if (progress) {
          this.animateNumber(this.arcadeStars, progress.totalStars);
          this.animateNumber(this.arcadeDay, progress.day);
        }
      });
  }

  // --- Hero building --------------------------------------------------------

  private buildClassroomHeroes(
    rooms: ClassroomWithRole[],
    lists: AssignmentListItem[][],
  ): void {
    // ALUMNO: nearest pending assignment wins the hero.
    let best: {
      room: ClassroomWithRole;
      item: AssignmentListItem;
      rank: number;
      time: number;
      list: AssignmentListItem[];
    } | null = null;

    const now = Date.now();
    rooms.forEach((room, i) => {
      if (room.role !== 'ALUMNO') return;
      for (const item of lists[i]) {
        if (item.mySubmission) continue;
        const dueMs = item.assignment.dueAt
          ? new Date(item.assignment.dueAt).getTime()
          : null;
        // rank 0: future due (sooner first) · 1: no due date · 2: overdue
        const rank = dueMs === null ? 1 : dueMs >= now ? 0 : 2;
        const time = dueMs === null ? 0 : rank === 0 ? dueMs : -dueMs;
        if (
          !best ||
          rank < best.rank ||
          (rank === best.rank && time < best.time)
        ) {
          best = { room, item, rank, time, list: lists[i] };
        }
      }
    });

    if (best) {
      const b = best as {
        room: ClassroomWithRole;
        item: AssignmentListItem;
        rank: number;
        list: AssignmentListItem[];
      };
      const total = b.list.length;
      const done = b.list.filter((x) => x.mySubmission).length;
      this.aulaHero.set({
        classroomId: b.room.classroom._id,
        classroomName: b.room.classroom.name,
        title: b.item.assignment.title,
        instructions: b.item.assignment.instructions?.trim() ?? '',
        due: this.dueFragment(b.item.assignment.dueAt),
        overdue: b.rank === 2,
        done,
        total,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      });
      return;
    }

    // PROFESOR: surface the aula with the most submissions waiting.
    let bestProf: ProfesorHeroVM | null = null;
    rooms.forEach((room, i) => {
      if (room.role !== 'PROFESOR') return;
      const pending = lists[i].reduce(
        (acc, item) => acc + (item.submissionsCount ?? 0),
        0,
      );
      if (pending > 0 && (!bestProf || pending > bestProf.pending)) {
        bestProf = {
          classroomId: room.classroom._id,
          classroomName: room.classroom.name,
          pending,
        };
      }
    });
    this.profesorHero.set(bestProf);
  }

  private dueFragment(dueAt?: string): I18nFragment {
    if (!dueAt) return { key: 'home.hero.noDue' };
    const locale = this.lang.current() === 'en' ? 'en-US' : 'es-MX';
    const due = new Date(dueAt);
    const date = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(due);

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round(
      (startOfDay(due) - startOfDay(new Date())) / 86_400_000,
    );

    if (due.getTime() < Date.now() && dayDiff < 0)
      return { key: 'home.hero.overdue', params: { date } };
    if (dayDiff <= 0) return { key: 'home.hero.dueToday', params: { date } };
    if (dayDiff === 1) return { key: 'home.hero.dueTomorrow', params: { date } };
    return { key: 'home.hero.dueIn', params: { days: dayDiff, date } };
  }

  // --- Typewriter -----------------------------------------------------------

  private maybeStartTypewriter(): void {
    if (this.typewriterStarted) return;
    this.typewriterStarted = true;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `${GREETED_PREFIX}${today}`;
    let alreadyGreeted = true;
    try {
      alreadyGreeted = sessionStorage.getItem(storageKey) !== null;
      if (!alreadyGreeted) sessionStorage.setItem(storageKey, '1');
    } catch {
      /* storage unavailable → skip the animation */
    }
    if (alreadyGreeted || this.reducedMotion) return;

    const full = this.tr.t(this.greetKey(), this.greetParams());
    this.typing.set(true);
    this.typed.set('');
    let i = 0;
    const step = () => {
      i += 1;
      this.typed.set(full.slice(0, i));
      if (i < full.length) {
        setTimeout(step, 42);
      } else {
        // Hand rendering back to the live i18n binding.
        setTimeout(() => this.typing.set(false), 900);
      }
    };
    setTimeout(step, 250);
  }

  // --- Count-up -------------------------------------------------------------

  private animateNumber(
    target: WritableSignal<number>,
    to: number,
    ms = 700,
  ): void {
    if (this.reducedMotion || to <= 0 || typeof requestAnimationFrame === 'undefined') {
      target.set(Math.max(0, to));
      return;
    }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      target.set(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- Actions --------------------------------------------------------------

  /**
   * Smart auto-start logic:
   *  - First visit → onboarding-flow (the guided end-to-end tour).
   *  - Otherwise → leave the user alone (they can re-trigger from help).
   */
  private bootstrapTour(): void {
    if (!this.tutorial.hasCompleted('onboarding-flow')) {
      this.tutorial.maybeAutoStartFirstTime('onboarding-flow');
    }
  }

  /**
   * Empty-state CTA: create a team + project + tasks so the user has
   * something realistic to navigate.
   */
  seedDemoData(): void {
    if (this.seeding()) return;
    this.seeding.set(true);
    this.seedError.set(null);
    this.dashboardApi.seedDemo().subscribe({
      next: () => {
        this.seeding.set(false);
        this.refreshOverview();
      },
      error: (err: HttpErrorResponse) => {
        this.seeding.set(false);
        this.seedError.set(
          (err?.error as { error?: { message?: string } } | undefined)?.error
            ?.message ?? this.tr.t('home.errors.seed'),
        );
      },
    });
  }

  goToAula(classroomId: string): void {
    void this.router.navigate(['/app/aulas', classroomId]);
  }

  // --- View helpers ---------------------------------------------------------

  /** Relative time, mono style: "AHORA · HACE 5 MIN · AYER · HACE 3 D". */
  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return this.tr.t('home.time.now');
    if (m < 60) return this.tr.t('home.time.min', { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return this.tr.t('home.time.hours', { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return this.tr.t('home.time.yesterday');
    return this.tr.t('home.time.days', { n: d });
  }

  trackActivity = (_i: number, a: DashboardActivityEntry): string => a._id;
  trackTask = (_i: number, t: DashboardMyTask): string => t._id;
}
