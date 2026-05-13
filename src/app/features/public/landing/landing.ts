import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../../core/i18n/t.pipe';
import { ThemeToggleComponent } from '../../../core/layout/theme-toggle/theme-toggle';
import { LanguageSwitcherComponent } from '../../../core/layout/language-switcher/language-switcher';

interface Feature {
  icon: string;
  titleKey: string;
  descKey: string;
  color: string;
}

@Component({
  selector: 'dp-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TPipe,
    ThemeToggleComponent,
    LanguageSwitcherComponent,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingComponent {
  protected readonly year = new Date().getFullYear();

  protected readonly features: Feature[] = [
    {
      icon: 'pi-folder',
      titleKey: 'landing.features.f1.title',
      descKey: 'landing.features.f1.desc',
      color: '#3B82F6',
    },
    {
      icon: 'pi-users',
      titleKey: 'landing.features.f2.title',
      descKey: 'landing.features.f2.desc',
      color: '#8B5CF6',
    },
    {
      icon: 'pi-book',
      titleKey: 'landing.features.f3.title',
      descKey: 'landing.features.f3.desc',
      color: '#22C55E',
    },
    {
      icon: 'pi-cloud-upload',
      titleKey: 'landing.features.f4.title',
      descKey: 'landing.features.f4.desc',
      color: '#F59E0B',
    },
  ];
}
