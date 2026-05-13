import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TPipe } from '../../i18n/t.pipe';

interface NavItem {
  labelKey: string;
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
  protected readonly mainNav: NavItem[] = [
    { labelKey: 'nav.dashboard', icon: 'pi-th-large',     link: '/app/dashboard', tour: 'sidebar-dashboard' },
    { labelKey: 'nav.teams',     icon: 'pi-users',        link: '/app/teams',     tour: 'sidebar-teams' },
    { labelKey: 'nav.projects',  icon: 'pi-folder',       link: '/app/projects',  tour: 'sidebar-projects' },
    { labelKey: 'nav.tasks',     icon: 'pi-check-square', link: '/app/tasks',     badge: 'Fase 3' },
    { labelKey: 'nav.docs',      icon: 'pi-book',         link: '/app/docs',      tour: 'sidebar-docs' },
    { labelKey: 'nav.activity',  icon: 'pi-history',      link: '/app/activity',  badge: 'Fase 3' },
  ];

  protected readonly integrationNav: NavItem[] = [
    { labelKey: 'nav.github',  icon: 'pi-github',       link: '/app/github',  tour: 'sidebar-github' },
    { labelKey: 'nav.deploy',  icon: 'pi-cloud-upload', link: '/app/deploy',  badge: 'Fase 7' },
    { labelKey: 'nav.files',   icon: 'pi-file',         link: '/app/files',   badge: 'Fase 3' },
    { labelKey: 'nav.pricing', icon: 'pi-tag',          link: '/app/pricing', tour: 'sidebar-pricing' },
  ];
}
