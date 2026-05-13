import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher';
import { UserMenuComponent } from '../user-menu/user-menu';
import { HelpButtonComponent } from '../../tutorial/help-button';
import { TPipe } from '../../i18n/t.pipe';

@Component({
  selector: 'dp-topbar',
  standalone: true,
  imports: [
    CommonModule,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
    UserMenuComponent,
    HelpButtonComponent,
    TPipe,
  ],
  template: `
    <header class="dp-topbar">
      <div class="dp-topbar__search">
        <i class="pi pi-search"></i>
        <input
          type="text"
          [placeholder]="'common.search' | t"
          aria-label="Search"
        />
        <span class="dp-topbar__kbd">⌘ K</span>
      </div>
      <div class="dp-topbar__right">
        <span data-tour="language-switcher">
          <dp-language-switcher></dp-language-switcher>
        </span>
        <span data-tour="theme-toggle">
          <dp-theme-toggle></dp-theme-toggle>
        </span>
        <dp-help-button></dp-help-button>
        <dp-user-menu></dp-user-menu>
      </div>
    </header>
  `,
  styleUrl: './topbar.scss',
})
export class TopbarComponent {}
