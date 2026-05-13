import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { API_CONFIG, resolveApiConfig } from './core/services/api.config';
import { ThemeService } from './core/services/theme.service';
import { TranslationService } from './core/i18n/translation.service';
import { LanguageService } from './core/i18n/language.service';
import { AuthService } from './core/auth/auth.service';

const DevPanelTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
      950: '#172554',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    providePrimeNG({
      theme: {
        preset: DevPanelTheme,
        options: {
          darkModeSelector: ':root',
          cssLayer: { name: 'primeng', order: 'app, primeng' },
        },
      },
      ripple: true,
    }),
    { provide: API_CONFIG, useFactory: resolveApiConfig },
    provideAppInitializer(async () => {
      inject(ThemeService).init();
      const lang = inject(LanguageService);
      const tr = inject(TranslationService);
      const auth = inject(AuthService);
      // Translations and session hydration in parallel — neither blocks routes,
      // but both should be ready before the first paint.
      await Promise.all([tr.load(lang.current()), auth.hydrate()]);
    }),
  ],
};
