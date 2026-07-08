import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';

interface NavItem {
  /** i18n key (global items) … */
  labelKey?: string;
  /** … or a literal label (contextual project items). */
  label?: string;
  icon: string;
  link: string;
  /** Tour anchor id, exposed as `data-tour="..."` on the rendered link */
  tour?: string;
  badge?: string;
}

@Component({
  selector: 'dp-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  private readonly router = inject(Router);

  // Global workspace nav. The project-scoped sections (Tasks, Docs, GitHub,
  // Deploy) live under a project, so they're surfaced contextually below
  // instead of as global links that just bounce the user to /app/teams.
  protected readonly mainNav: NavItem[] = [
    { labelKey: 'nav.dashboard', icon: 'pi-th-large', link: '/app/dashboard', tour: 'sidebar-dashboard' },
    { labelKey: 'nav.teams',     icon: 'pi-users',    link: '/app/teams',     tour: 'sidebar-teams' },
    { labelKey: 'nav.projects',  icon: 'pi-folder',   link: '/app/projects',  tour: 'sidebar-projects' },
    { labelKey: 'nav.pricing',   icon: 'pi-tag',      link: '/app/pricing',   tour: 'sidebar-pricing' },
  ];

  /** Current project id, derived from the URL — drives the contextual group. */
  protected readonly projectId = signal<string | null>(
    this.deriveProjectId(this.router.url),
  );

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.projectId.set(this.deriveProjectId(e.urlAfterRedirects));
      }
    });
  }

  /** Working links scoped to the active project (Kanban, docs, GitHub, deploy). */
  protected readonly projectNav = computed<NavItem[]>(() => {
    const id = this.projectId();
    if (!id) return [];
    const base = `/app/projects/${id}`;
    return [
      { label: 'Resumen',       icon: 'pi-compass',      link: `${base}/overview` },
      { label: 'Tareas',        icon: 'pi-check-square', link: `${base}/tasks`,  tour: 'sidebar-tasks' },
      { label: 'Documentación', icon: 'pi-book',         link: `${base}/docs`,   tour: 'sidebar-docs' },
      { label: 'GitHub',        icon: 'pi-github',       link: `${base}/github`, tour: 'sidebar-github' },
      { label: 'Deploy',        icon: 'pi-cloud-upload', link: `${base}/deploy`, tour: 'sidebar-deploy' },
      { label: 'Archivos',      icon: 'pi-paperclip',    link: `${base}/files`,  tour: 'sidebar-files' },
    ];
  });

  private deriveProjectId(url: string): string | null {
    const m = url.split('?')[0].match(/^\/app\/projects\/([^/]+)/);
    return m ? m[1] : null;
  }
}
