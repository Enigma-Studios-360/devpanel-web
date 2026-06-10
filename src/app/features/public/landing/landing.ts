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

interface HowItWorksStep {
  number: string;
  title: string;
  body: string;
  icon: string;
}

interface StackItem {
  icon: string;
  name: string;
  role: string;
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

  /**
   * Extra capabilities added after the original four-feature grid.
   * We surface them as separate cards so visitors see the recent
   * investments (assistant + auto-deploy) without scanning marketing copy.
   */
  protected readonly extraFeatures: Feature[] = [
    {
      icon: 'pi-sparkles',
      titleKey: 'landing.features.f5.title',
      descKey: 'landing.features.f5.desc',
      color: '#EC4899',
    },
    {
      icon: 'pi-microchip',
      titleKey: 'landing.features.f6.title',
      descKey: 'landing.features.f6.desc',
      color: '#06B6D4',
    },
    {
      icon: 'pi-github',
      titleKey: 'landing.features.f7.title',
      descKey: 'landing.features.f7.desc',
      color: '#94A3B8',
    },
    {
      icon: 'pi-shield',
      titleKey: 'landing.features.f8.title',
      descKey: 'landing.features.f8.desc',
      color: '#EAB308',
    },
  ];

  protected readonly howItWorks: HowItWorksStep[] = [
    {
      number: '01',
      title: 'Crea tu equipo',
      body: 'Invita a tu gente y asigna roles (OWNER / ADMIN / DEVELOPER / VIEWER). El plan FREE arranca al instante, sin tarjeta.',
      icon: 'pi-users',
    },
    {
      number: '02',
      title: 'Trabaja con orden',
      body: 'Tableros Kanban, comentarios, documentación guiada con 9 secciones y un README que se genera solo. Todo por proyecto.',
      icon: 'pi-list-check',
    },
    {
      number: '03',
      title: 'Despliega a Vercel',
      body: 'Vincula tu repo de GitHub, deja que DevHub detecte tu stack y dispara el deploy en 4 pasos. El primero, en 60 segundos.',
      icon: 'pi-cloud-upload',
    },
  ];

  protected readonly stack: StackItem[] = [
    { icon: 'pi-prime', name: 'Angular 21', role: 'Frontend' },
    { icon: 'pi-server', name: 'Express + TypeScript', role: 'API' },
    { icon: 'pi-database', name: 'MongoDB Atlas', role: 'Persistencia' },
    { icon: 'pi-github', name: 'Octokit', role: 'GitHub' },
    { icon: 'pi-cloud', name: 'Vercel API', role: 'Deploys' },
    { icon: 'pi-sparkles', name: 'DeepSeek', role: 'Asistente IA' },
  ];
}
