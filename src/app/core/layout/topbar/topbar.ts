import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher';
import { UserMenuComponent } from '../user-menu/user-menu';
import { NotificationBellComponent } from '../notification-bell/notification-bell';
import { HelpButtonComponent } from '../../tutorial/help-button';
import { PermissionsService } from '../../auth/permissions.service';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { TPipe } from '../../i18n/t.pipe';

interface NavItem {
  labelKey: string;
  link: string;
  /** Tour anchor id, exposed as `data-tour="..."` on the rendered link. */
  tour?: string;
  /** Contexto Classroom: acento teal. */
  accent?: 'teal';
}

/**
 * Editorial topbar — the app's single navigation surface.
 *
 * The old admin-template sidebar is gone: primary sections live here as a
 * horizontal nav, secondary routes fold into a "Más" dropdown, and when the
 * user is inside a project a contextual second row surfaces the project's
 * working links (the old sidebar "Proyecto actual" group).
 */
@Component({
  selector: 'dp-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    UserMenuComponent,
    NotificationBellComponent,
    HelpButtonComponent,
    TPipe,
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  private readonly permissions = inject(PermissionsService);
  private readonly palette = inject(CommandPaletteService);
  private readonly router = inject(Router);

  readonly role = this.permissions.role;

  /** Primary sections — always visible on desktop. */
  protected readonly mainNav: NavItem[] = [
    { labelKey: 'nav.today',      link: '/app/dashboard', tour: 'sidebar-dashboard' },
    { labelKey: 'nav.projects',   link: '/app/projects',  tour: 'sidebar-projects' },
    { labelKey: 'nav.teams',      link: '/app/teams',     tour: 'sidebar-teams' },
    { labelKey: 'nav.classrooms', link: '/app/aulas',     tour: 'sidebar-classrooms', accent: 'teal' },
    { labelKey: 'nav.deploy',     link: '/app/deploy' },
    { labelKey: 'nav.arcade',     link: '/app/arcade',    tour: 'sidebar-arcade' },
  ];

  /** Secondary routes — folded into the "Más" dropdown so nothing is lost. */
  protected readonly moreNav: NavItem[] = [
    { labelKey: 'nav.docs',     link: '/app/docs' },
    { labelKey: 'nav.files',    link: '/app/files' },
    { labelKey: 'nav.activity', link: '/app/activity' },
    { labelKey: 'nav.pricing',  link: '/app/pricing', tour: 'sidebar-pricing' },
    { labelKey: 'nav.github',   link: '/app/github' },
  ];

  protected readonly moreOpen = signal(false);
  protected readonly mobileOpen = signal(false);

  /** Current project id, derived from the URL — drives the contextual row. */
  protected readonly projectId = signal<string | null>(
    this.deriveProjectId(this.router.url),
  );

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.projectId.set(this.deriveProjectId(e.urlAfterRedirects));
        // Any navigation closes the transient menus.
        this.moreOpen.set(false);
        this.mobileOpen.set(false);
      }
    });
  }

  /** Working links scoped to the active project (the old sidebar group). */
  protected readonly projectNav = computed<NavItem[]>(() => {
    const id = this.projectId();
    if (!id) return [];
    const base = `/app/projects/${id}`;
    return [
      { labelKey: 'shell.overview', link: `${base}/overview` },
      { labelKey: 'nav.tasks',      link: `${base}/tasks`,  tour: 'sidebar-tasks' },
      { labelKey: 'nav.docs',       link: `${base}/docs`,   tour: 'sidebar-docs' },
      { labelKey: 'nav.github',     link: `${base}/github`, tour: 'sidebar-github' },
      { labelKey: 'nav.deploy',     link: `${base}/deploy`, tour: 'sidebar-deploy' },
      { labelKey: 'nav.files',      link: `${base}/files`,  tour: 'sidebar-files' },
    ];
  });

  openSearch(): void {
    this.palette.openPalette();
  }

  toggleMore(): void {
    this.moreOpen.update((v) => !v);
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  protected readonly roleTooltip = computed(() => {
    switch (this.role()) {
      case 'OWNER':
        return 'Eres OWNER en este proyecto: puedes hacer todo.';
      case 'ADMIN':
        return 'Eres ADMIN: puedes gestionar proyecto, miembros y trabajo.';
      case 'DEVELOPER':
        return 'Eres DEVELOPER: puedes crear y editar tareas, documentación e issues.';
      case 'VIEWER':
        return 'Eres VIEWER: solo lectura.';
      default:
        return '';
    }
  });

  /** Close menus when clicking anywhere outside of them. */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (this.moreOpen() && !target?.closest('.dp-topbar__more')) {
      this.moreOpen.set(false);
    }
    if (
      this.mobileOpen() &&
      !target?.closest('.dp-topbar__mobile') &&
      !target?.closest('.dp-topbar__burger')
    ) {
      this.mobileOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.moreOpen.set(false);
    this.mobileOpen.set(false);
  }

  private deriveProjectId(url: string): string | null {
    const m = url.split('?')[0].match(/^\/app\/projects\/([^/]+)\//);
    return m ? m[1] : null;
  }
}
