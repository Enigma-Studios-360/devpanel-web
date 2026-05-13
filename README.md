# DevPanel Web

Frontend de **DevPanel** — plataforma SaaS para centralizar la gestión de proyectos de desarrollo. Esta es la **Fase 1: Base técnica funcional**.

## Stack

- **Angular 21** standalone components + nuevo control flow (`@if`, `@for`)
- **PrimeNG 21** (preset Aura, modo oscuro)
- **PrimeIcons**
- **Angular CDK**
- **SCSS** con tokens propios (sin Tailwind)
- **HttpClient** + interceptors (auth + error)
- **Reactive Forms** para login/register
- i18n base ES/EN cargada desde `public/i18n/*.json`

## Instalación

```bash
cd devpanel-web
npm install
ng serve
```

Por defecto Angular abre en `http://localhost:4200`.

## Conexión con la API (runtime config)

El frontend lee la URL del backend desde `public/config.js`, que se carga
en `index.html` **antes** de arrancar Angular. Esto significa que puedes
cambiar de entorno (local, staging, producción) sin recompilar el bundle.

`public/config.js`:
```js
window.__APP_CONFIG__ = {
  apiUrl: 'http://localhost:4000',
};
```

### Cambiar el puerto/host del backend

| Escenario | Edita |
| --- | --- |
| Backend en otro puerto local (`:5000`) | `apiUrl: 'http://localhost:5000'` |
| Backend en otra máquina LAN | `apiUrl: 'http://192.168.1.50:4000'` |
| Producción | `apiUrl: 'https://devpanel-api.tudominio.com'` |

Después de editar, basta con **recargar el navegador**. No hay que volver a hacer `ng build` ni `ng serve`.

### Deploy

- **Vercel/Netlify**: build con `ng build` (carpeta `dist/devpanel-web`). En producción, sustituye `public/config.js` con un build-step o un Edge Function que inyecte la URL real.
- **Docker**: monta tu `config.js` real como volumen sobre `/usr/share/nginx/html/config.js`.
- **Backend en Railway/Render**: el frontend solo necesita la URL pública del backend en `apiUrl`.

- Configurado vía el token `API_CONFIG` en `src/app/core/services/api.config.ts`.
- El **Dashboard** consulta `GET /health` con `ApiHealthService` y muestra:
  - badge `API conectada` / `API caída`
  - entorno
  - uptime
  - estado de la base de datos
- La página **Planes** consulta `GET /api/plans`.

## Estructura

```
src/app/
├── app.config.ts          # providers (HttpClient, Router, PrimeNG, theme)
├── app.routes.ts          # routing público + auth + app shell
├── core/
│   ├── auth/              # auth.service, auth-state.service, token.service
│   ├── guards/            # authGuard, guestGuard (passive en Fase 1)
│   ├── interceptors/      # auth + error
│   ├── services/          # api.config, api-health.service, theme.service
│   ├── layout/            # app-shell, sidebar, topbar, theme-toggle, language-switcher, user-menu
│   └── i18n/              # language.service, translation.service, t.pipe
├── shared/
│   ├── components/        # page-header, stats-card, empty-state, status-badge, priority-badge, learn-more-card, loading-state
│   ├── models/            # user, team, project, task, plan
│   └── utils/             # format-date
├── features/
│   ├── public/landing/    # landing pública
│   ├── auth/login & register/
│   ├── dashboard/home-dashboard/
│   ├── pricing/           # consume /api/plans
│   ├── coming-soon.ts     # placeholder reusable
│   └── teams, projects, tasks, docs, activity, files, github, deploy/
└── styles/                # tokens, reset, utilities (SCSS)
```

## Diseño

Inspirado en GitHub, Linear, Vercel y Notion. Sobrio, técnico, dark mode por defecto.

Paleta principal:

| Token              | Valor       |
| ------------------ | ----------- |
| `--dp-bg`          | `#0B1020`   |
| `--dp-surface`     | `#111827`   |
| `--dp-surface-2`   | `#172033`   |
| `--dp-border`      | `#1F2937`   |
| `--dp-text`        | `#E5E7EB`   |
| `--dp-text-muted`  | `#9CA3AF`   |
| `--dp-accent-blue` | `#3B82F6`   |

El theme se controla con el atributo `[data-theme="dark"|"light"]` en `<html>`. `ThemeService` persiste la elección en `localStorage`.

## Internacionalización

- `public/i18n/es.json` (default) y `public/i18n/en.json`
- Pipe `| t` para resolver claves dotted: `{{ 'dashboard.title' | t }}`
- `LanguageService` persiste el idioma activo en `localStorage`
- `<dp-language-switcher>` en topbar y landing

## Rutas principales

| Ruta             | Descripción                                  |
| ---------------- | -------------------------------------------- |
| `/`              | Landing pública                               |
| `/pricing`       | Catálogo de planes (consume `/api/plans`)    |
| `/auth/login`    | Inicio de sesión (UI lista, conectar Fase 2) |
| `/auth/register` | Registro (UI lista, conectar Fase 2)          |
| `/app/dashboard` | Dashboard inicial con estado de la API       |
| `/app/projects`  | Coming soon (Fase 2/3)                        |
| `/app/tasks`     | Coming soon (Fase 3)                          |
| `/app/teams`     | Coming soon (Fase 2)                          |
| `/app/docs`      | Coming soon (Fase 4)                          |
| `/app/activity`  | Coming soon (Fase 3)                          |
| `/app/github`    | Coming soon (Fase 6)                          |
| `/app/deploy`    | Coming soon (Fase 7)                          |
| `/app/files`     | Coming soon (Fase 3)                          |

## Scripts

| Comando         | Acción                              |
| --------------- | ----------------------------------- |
| `ng serve`      | Dev server en `http://localhost:4200` |
| `ng build`      | Build de producción                  |
| `ng test`       | Tests con Vitest                     |
