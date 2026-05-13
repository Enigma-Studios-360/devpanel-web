import type { Tutorial } from './tutorial.types';

/**
 * Catalog of available tutorials.
 *
 * Authoring rules:
 *  - One tour, one outcome.
 *  - Each step explains ONE concept in one short sentence (`body`).
 *  - `tierInfo` is for plan-related callouts ("FREE: 1 / STARTER: 3 …").
 *  - When a step has a `cta`, the bottom-right primary button uses
 *    `cta.label` and BOTH navigates to `cta.route` AND advances the tour.
 *  - When a step has an `action`, advancing the tour fires that side
 *    effect (e.g. opens the create-team modal for the user). The next
 *    step's `data-tour` target can then live INSIDE the modal — the
 *    overlay will find it after a few frames.
 *  - Use `centered: true` for intro/outro steps that don't point at any
 *    DOM element.
 */
export const TUTORIALS: Tutorial[] = [
  // -------------------------------------------------------------------------
  // 1. WELCOME — auto-arranca para usuarios nuevos
  // -------------------------------------------------------------------------
  {
    id: 'welcome-tour',
    name: 'Bienvenida a DevPanel',
    summary: 'Lo esencial en 5 pasos',
    icon: 'pi-sparkles',
    steps: [
      {
        id: 'welcome',
        route: '/app/dashboard',
        target: 'sidebar-brand',
        centered: true,
        title: '👋 Te damos la bienvenida',
        body:
          'DevPanel centraliza tus equipos, proyectos, tareas, documentación y deploy ' +
          'en un solo lugar. En menos de un minuto te enseñamos lo esencial — al final, ' +
          'crearás tu primer equipo paso a paso.',
      },
      {
        id: 'sidebar',
        target: 'sidebar-teams',
        title: 'Navegación principal',
        body:
          'A la izquierda tienes Equipos, Proyectos, Planes y los módulos de fases ' +
          'futuras. Siempre está visible a un click.',
        placement: 'right',
      },
      {
        id: 'api-status',
        target: 'api-status',
        title: 'Estado del backend',
        body:
          'Esta tarjeta verifica que la API esté funcionando. Si la ves en rojo, ' +
          'asegúrate de tener el backend corriendo.',
        placement: 'top',
      },
      {
        id: 'help-button',
        target: 'help-button',
        title: 'Tu botón de ayuda',
        body:
          'Pulsa este "?" siempre que quieras repasar una guía o ver los demás ' +
          'tutoriales.',
        placement: 'bottom',
      },
      {
        id: 'go-create-team',
        target: 'sidebar-teams',
        title: 'Listo, vamos a crear tu primer equipo',
        body:
          'Te llevo a la pantalla de equipos y abrimos el formulario juntos. Solo ' +
          'pulsa el botón de abajo.',
        tierInfo:
          'Tu equipo arranca con plan FREE: 1 proyecto activo · 3 miembros · 100MB.',
        placement: 'right',
        cta: {
          label: 'Crear mi primer equipo →',
          route: '/app/teams',
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. TEAMS — abre el modal y te guía DENTRO
  // -------------------------------------------------------------------------
  {
    id: 'teams-tour',
    name: 'Crear tu primer equipo',
    summary: 'Te abro el formulario y te guío',
    icon: 'pi-users',
    steps: [
      {
        id: 'teams-intro',
        route: '/app/teams',
        target: 'create-team',
        centered: true,
        title: '¿Qué es un equipo?',
        body:
          'Un equipo agrupa a personas que colaboran en proyectos. Cada miembro ' +
          'tiene un rol (OWNER, ADMIN, DEVELOPER o VIEWER). Tú serás OWNER del ' +
          'que crees ahora.',
        tierInfo:
          'Plan FREE: 1 equipo · 3 miembros máx. STARTER: 5. PRO: 10. TEAM: 25.',
      },
      {
        id: 'create-team-btn',
        route: '/app/teams',
        target: 'create-team',
        title: 'Te abro el formulario',
        body:
          'Este es el botón "Crear equipo". Pulsa el botón de abajo y te abro ' +
          'el formulario automáticamente.',
        placement: 'bottom',
        action: { key: 'open-modal:create-team' },
      },
      {
        id: 'create-team-name',
        target: 'create-team-name',
        title: 'Escribe un nombre',
        body:
          'Solo necesitas un nombre. El slug, el plan (FREE) y la suscripción se ' +
          'configuran automáticamente. Cuando lo tengas escrito, pulsa Siguiente.',
        placement: 'right',
      },
      {
        id: 'create-team-submit',
        target: 'create-team-submit',
        title: 'Crea el equipo',
        body:
          'Pulsa "Crear" para finalizar. Después aparecerá en la lista y podrás ' +
          'abrirlo para añadirle proyectos.',
        placement: 'top',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. PROJECTS — abre el modal y te guía DENTRO
  // -------------------------------------------------------------------------
  {
    id: 'projects-tour',
    name: 'Crear tu primer proyecto',
    summary: 'Te abro el formulario y te guío',
    icon: 'pi-folder-open',
    steps: [
      {
        id: 'projects-intro',
        target: 'create-project',
        centered: true,
        title: '¿Qué es un proyecto?',
        body:
          'Un proyecto agrupa tareas, documentación, archivos e integraciones ' +
          '(GitHub, Vercel) de una aplicación o producto que estás construyendo.',
        tierInfo:
          'Plan FREE: 1 proyecto activo · STARTER: 3 · PRO: 10 · TEAM: 25. ' +
          'Archivar un proyecto libera el cupo.',
      },
      {
        id: 'plan-quota',
        target: 'plan-quota',
        title: 'Cupo de proyectos',
        body:
          'Esta barra muestra cuántos proyectos activos tienes vs el máximo de tu ' +
          'plan. Si llegas al límite, archiva uno o cambia de plan.',
        placement: 'bottom',
      },
      {
        id: 'create-project-btn',
        target: 'create-project',
        title: 'Te abro el formulario',
        body:
          'Pulsa el botón de abajo y te abro el formulario de crear proyecto.',
        placement: 'bottom',
        action: { key: 'open-modal:create-project' },
      },
      {
        id: 'create-project-name',
        target: 'create-project-name',
        title: 'Nombre del proyecto',
        body:
          'Lo único obligatorio. Pon algo descriptivo (ej. "Landing", "API auth", ' +
          '"App móvil"). El slug se autogenera.',
        placement: 'right',
      },
      {
        id: 'create-project-status',
        target: 'create-project-status',
        title: 'Estado y fecha límite',
        body:
          'PLANNING (planeación), DEVELOPMENT (desarrollo), TESTING (pruebas), ' +
          'PRODUCTION (publicado). Puedes cambiarlo después desde el overview.',
        placement: 'top',
      },
      {
        id: 'create-project-stack',
        target: 'create-project-stack',
        title: 'Stack tecnológico',
        body:
          'Lista las tecnologías separadas por comas (ej. "Angular, Express, MongoDB"). ' +
          'Se muestran como pills en la card del proyecto.',
        placement: 'top',
      },
      {
        id: 'create-project-submit',
        target: 'create-project-submit',
        title: 'Crea el proyecto',
        body:
          'Pulsa "Crear proyecto" para finalizar. Te llevará directo a su overview, ' +
          'donde podrás ver métricas y empezar a crear tareas.',
        placement: 'top',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. TASKS — abre el modal de tarea y te guía DENTRO
  // -------------------------------------------------------------------------
  {
    id: 'tasks-tour',
    name: 'Tareas y tablero Kanban',
    summary: 'Crear, mover y comentar tareas',
    icon: 'pi-check-square',
    steps: [
      {
        id: 'tasks-intro',
        target: 'create-task',
        centered: true,
        title: '¿Qué es una tarea?',
        body:
          'Una unidad de trabajo dentro de un proyecto: tiene título, descripción, ' +
          'prioridad, estado y opcionalmente fecha límite y responsables.',
        tierInfo:
          'Plan FREE: hasta 50 tareas. STARTER: 200. PRO/TEAM/SCHOOL: ilimitadas.',
      },
      {
        id: 'kanban-columns',
        target: 'kanban-columns',
        title: 'Las 5 columnas del Kanban',
        body:
          'Por hacer · En progreso · En revisión · Bloqueadas · Hechas. ' +
          'Cada columna muestra el conteo arriba a la derecha.',
        placement: 'top',
      },
      {
        id: 'create-task-btn',
        target: 'create-task',
        title: 'Te abro el formulario',
        body: 'Pulsa el botón de abajo y te abro el formulario de crear tarea.',
        placement: 'bottom',
        action: { key: 'open-modal:create-task' },
      },
      {
        id: 'create-task-title',
        target: 'create-task-title',
        title: 'Escribe el título',
        body:
          'Solo el título es obligatorio. Lo demás (descripción, fecha, asignados) ' +
          'lo puedes completar después abriendo el detalle de la tarea.',
        placement: 'right',
      },
      {
        id: 'create-task-priority',
        target: 'create-task-priority-field',
        title: 'Prioridad y fecha',
        body:
          'LOW, MEDIUM, HIGH o URGENT. Las URGENT se muestran en rojo. La fecha ' +
          'es opcional; si la pones y se vence, la card se marca en rojo.',
        placement: 'top',
      },
      {
        id: 'create-task-submit',
        target: 'create-task-submit',
        title: 'Crea la tarea',
        body:
          'Pulsa "Crear tarea". La nueva tarea aparecerá en la columna "Por hacer" ' +
          'y podrás moverla pulsando su badge de estado.',
        placement: 'top',
      },
      {
        id: 'task-card',
        target: 'task-card',
        title: 'Detalle de la tarea',
        body:
          'Pulsa cualquier card para abrir su detalle: ahí editas título, descripción, ' +
          'prioridad, asignados, cambias estado y dejas comentarios.',
        placement: 'right',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. DOCS — documentación guiada y README generado
  // -------------------------------------------------------------------------
  {
    id: 'docs-tour',
    name: 'Documentar tu proyecto',
    summary: '9 secciones guiadas + README generado',
    icon: 'pi-book',
    steps: [
      {
        id: 'docs-intro',
        target: 'docs-editor',
        centered: true,
        title: 'Documentación guiada',
        body:
          'Tu proyecto tiene 9 secciones predefinidas (visión general, stack, ' +
          'instalación, variables, comandos, base de datos, deploy, errores comunes, ' +
          'contribuidores). Las completas a tu ritmo y DevPanel genera el README por ti.',
        tierInfo:
          'Generar README: gratis en todos los planes. Descargar el .md: ' +
          'requiere STARTER o superior.',
      },
      {
        id: 'docs-sections',
        target: 'docs-sections',
        title: 'Las 9 secciones',
        body:
          'A la izquierda están todas las secciones. Cada una tiene un título, ' +
          'contenido (acepta Markdown) y un check de "completada".',
        placement: 'right',
      },
      {
        id: 'docs-section-content',
        target: 'docs-section-content',
        title: 'Editor de contenido',
        body:
          'Escribe lo que quieras. Acepta Markdown: listas con `-`, código con ' +
          'triple backtick, links con `[texto](url)`. Pulsa "Guardar sección" cuando termines.',
        placement: 'top',
      },
      {
        id: 'docs-progress',
        target: 'docs-progress',
        title: 'Tu progreso',
        body:
          'La barra muestra el % de secciones marcadas como completadas. Aparece ' +
          'también en el dashboard del proyecto.',
        placement: 'bottom',
      },
      {
        id: 'docs-generate-readme',
        target: 'generate-readme',
        title: 'Genera tu README',
        body:
          'Cuando tengas suficiente contenido, pulsa este botón. Se abre un modal ' +
          'con el README en Markdown listo para copiar o descargar.',
        placement: 'bottom',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. GITHUB — vincular repo y revisar commits/branches/issues
  // -------------------------------------------------------------------------
  {
    id: 'github-tour',
    name: 'Integrar GitHub',
    summary: 'Vincula tu repo y ve commits, branches e issues',
    icon: 'pi-github',
    steps: [
      {
        id: 'github-intro',
        target: 'github-link',
        centered: true,
        title: '¿Qué hace la integración con GitHub?',
        body:
          'DevPanel se conecta a tu repositorio para mostrarte commits, branches ' +
          'e issues sin salir de la app. Es solo lectura: tu código no se toca. ' +
          'También puedes crear issues desde aquí si el backend tiene un PAT configurado.',
        tierInfo:
          'Repos públicos: incluidos en todos los planes. ' +
          'Repos privados: requieren plan PRO o superior.',
      },
      {
        id: 'github-link-input',
        target: 'github-link-input',
        title: 'Vincula tu repositorio',
        body:
          'Pega la URL completa (ej. https://github.com/octokit/octokit.js) o ' +
          'usa el formato corto "owner/repo". DevPanel verifica que existe ' +
          'antes de guardarlo.',
        placement: 'right',
      },
      {
        id: 'github-repo-info',
        target: 'github-repo-info',
        title: 'Información del repo',
        body:
          'Una vez vinculado, ves el nombre, descripción, lenguaje, número de ' +
          'stars, forks, issues abiertas y la rama por defecto.',
        placement: 'bottom',
      },
      {
        id: 'github-tabs',
        target: 'github-tabs',
        title: 'Tabs: Commits, Branches, Issues',
        body:
          'Tres vistas distintas del mismo repo. Cada una se sincroniza en vivo ' +
          'con GitHub usando la API oficial (Octokit).',
        placement: 'bottom',
      },
      {
        id: 'github-commits',
        target: 'github-commits',
        title: 'Commits recientes',
        body:
          'Lista de los últimos 15 commits con SHA corto, mensaje, autor y ' +
          'fecha. Click en el mensaje abre el commit en GitHub.',
        placement: 'top',
      },
      {
        id: 'github-issues-head',
        target: 'github-issues-head',
        title: 'Issues y crear desde DevPanel',
        body:
          'Filtra por open/closed/all. El botón "Crear issue" abre un formulario ' +
          'que publica directamente en tu repo (requiere GITHUB_TOKEN en el backend).',
        placement: 'bottom',
      },
      {
        id: 'github-unlink',
        target: 'github-unlink',
        title: 'Desvincular',
        body:
          'Cuando termines un proyecto o quieras cambiar de repo, usa este botón. ' +
          'El proyecto sigue existiendo en DevPanel, solo se elimina la conexión.',
        placement: 'bottom',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. PRICING — entender los planes y el upgrade simulado
  // -------------------------------------------------------------------------
  {
    id: 'pricing-tour',
    name: 'Cambiar de plan',
    summary: 'Cómo entender y simular un upgrade',
    icon: 'pi-tag',
    steps: [
      {
        id: 'pricing-intro',
        route: '/app/pricing',
        target: 'pricing-plans',
        centered: true,
        title: 'Planes de DevPanel',
        body:
          'Hay 5 planes (FREE, STARTER, PRO, TEAM, SCHOOL). Cada uno aumenta los ' +
          'límites de proyectos, miembros, almacenamiento e integraciones avanzadas.',
        tierInfo:
          'En esta versión académica los pagos son simulados: el upgrade es instantáneo ' +
          'y no se cobra nada real.',
      },
      {
        id: 'pricing-team-selector',
        route: '/app/pricing',
        target: 'pricing-team-selector',
        title: 'Aplicar plan a un equipo',
        body:
          'Cada equipo tiene su propio plan. Selecciona aquí el equipo al que ' +
          'quieres aplicar el cambio. Solo OWNER y ADMIN pueden cambiarlo.',
        placement: 'bottom',
      },
      {
        id: 'pricing-plans',
        target: 'pricing-plans',
        title: 'Compara y simula',
        body:
          'El plan actual se resalta en verde. Los demás muestran un botón ' +
          '"Simular cambio" si tienes permisos. El cambio se aplica al instante.',
        placement: 'top',
      },
    ],
  },
];
