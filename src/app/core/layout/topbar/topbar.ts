import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher';
import { UserMenuComponent } from '../user-menu/user-menu';
import { NotificationBellComponent } from '../notification-bell/notification-bell';
import { HelpButtonComponent } from '../../tutorial/help-button';
import { PermissionsService } from '../../auth/permissions.service';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'dp-topbar',
  standalone: true,
  imports: [
    CommonModule,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    UserMenuComponent,
    NotificationBellComponent,
    HelpButtonComponent,
    TPipe,
  ],
  template: `
    <header class="dp-topbar">
      <div
        class="dp-topbar__search"
        role="button"
        tabindex="0"
        (click)="openSearch()"
        (keydown.enter)="openSearch()"
      >
        <i class="pi pi-search"></i>
        <input
          type="text"
          [placeholder]="'common.search' | t"
          aria-label="Search"
          readonly
          (focus)="openSearch()"
        />
        <span class="dp-topbar__kbd">⌘ K</span>
      </div>
      <div class="dp-topbar__right">
        @if (role(); as r) {
          <span
            class="dp-role-badge"
            [class.dp-role-badge--owner]="r === 'OWNER'"
            [class.dp-role-badge--admin]="r === 'ADMIN'"
            [class.dp-role-badge--dev]="r === 'DEVELOPER'"
            [class.dp-role-badge--viewer]="r === 'VIEWER'"
            data-tour="current-role"
            [title]="roleTooltip()"
          >
            <i class="pi pi-id-card"></i>
            <span>{{ r }}</span>
          </span>
        }
        <span data-tour="language-switcher">
          <dp-language-switcher></dp-language-switcher>
        </span>
        <span data-tour="theme-toggle">
          <dp-theme-toggle></dp-theme-toggle>
        </span>
        <dp-notification-bell></dp-notification-bell>
        <dp-help-button></dp-help-button>
        <dp-user-menu></dp-user-menu>
      </div>
    </header>
  `,
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  private readonly permissions = inject(PermissionsService);
  private readonly palette = inject(CommandPaletteService);

  readonly role = this.permissions.role;

  openSearch(): void {
    this.palette.openPalette();
  }
  readonly roleTooltip = computed(() => {
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
}
