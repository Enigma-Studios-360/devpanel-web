# DevHub Web

Frontend de **DevHub** — la plataforma open source que lleva a un principiante
absoluto desde *"tengo una carpeta con código"* hasta *"mi proyecto está en
internet"*. En español primero (i18n ES/EN).

> Licencia **AGPLv3** — ver [LICENSE](LICENSE). El backend vive en `devpanel-api`.

## Lo que hace hoy

12 features construidas (+1 placeholder), con tema claro/oscuro, i18n ES/EN y tutorial guiado:

- **Dashboard** con métricas del equipo y estado de la API
- **Proyectos / Tareas kanban** (drag & drop por proyecto) / **Docs** / **Archivos**
- **Equipos** con roles e invitaciones
- *Actividad — por construir:* la ruta `/app/activity` es un placeholder (Fase 3);
  hoy la actividad reciente se muestra como widget en el Dashboard y en el
  overview de cada proyecto
- **GitHub** — conecta TU cuenta (OAuth), elige repos con botones, o **sube tu
  proyecto en ZIP**: reporte educativo de seguridad ("Protegimos tu proyecto")
  y repo creado en tu cuenta sin saber Git
- **Deploy** — wizard a Vercel con URL pública + QR en pantalla
- **Arcade** — DevCrafting (nuestro juego Unity WebGL) embebido, con progreso
  y leaderboard reportados a la API
- **Pricing** — planes con límites (pagos simulados en esta etapa)
- Asistente IA contextual

## Stack

**Angular 21** standalone (+ control flow `@if`/`@for`, Signals) · **PrimeNG 21**
(preset Aura) · Angular CDK · SCSS con tokens propios · HttpClient + interceptors
(auth/error) · i18n propia vía JSON (`public/i18n/es.json` / `en.json`).

## Levantarlo

```bash
cd devpanel-web
npm install
ng serve        # http://localhost:4200
```

Necesitas la API corriendo (ver `devpanel-api/README.md`).

### Conexión con la API (runtime config, sin recompilar)

La URL del backend se lee de `public/config.js` **antes** de arrancar Angular:

```js
window.__APP_CONFIG__ = { apiUrl: 'http://localhost:4000' };
```

| Escenario | Edita `apiUrl` a |
|---|---|
| Backend en otro puerto | `http://localhost:5000` |
| Backend en LAN | `http://192.168.1.50:4000` |
| Producción | `https://api.tudominio.com` |

Guardas, recargas el navegador y listo — sin `ng build`.

### Correr en otro puerto (ej. 4201)

```bash
ng serve --port 4201
```

Recuerda agregar ese origen a `CORS_ORIGIN` en el `.env` de la API.

## Estructura

```
src/app/
├── core/          # auth, guards, interceptors, layout (shell/sidebar/topbar),
│                  # i18n (pipe | t), theme, servicios de API por módulo
├── shared/        # componentes reutilizables, modelos, utils
├── features/      # 12 features: public/landing, auth, dashboard, teams,
│                  # projects, tasks, docs, files, github, deploy, arcade,
│                  # pricing (+ activity: vacía, placeholder Fase 3)
└── styles/        # tokens SCSS, reset, utilities
```

Diseño sobrio inspirado en GitHub/Linear/Vercel, dark mode por defecto
(`[data-theme]` en `<html>`, persistido en localStorage).

## Scripts

| Comando | Acción |
|---|---|
| `ng serve` | Dev server en `:4200` |
| `ng build` | Build de producción (`dist/devpanel-web`) |
| `ng test` | Tests (Vitest) |

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Vulnerabilidades: [SECURITY.md](SECURITY.md).

## Licencia

[AGPL-3.0](LICENSE) © equipo enigma.
