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
  // 0. ONBOARDING FLOW — el tour MAESTRO que encadena todo
  // -------------------------------------------------------------------------
  //
  // A diferencia de los tours sueltos (welcome-tour, teams-tour, ...) este
  // flujo es continuo: te lleva de la mano desde "te damos la bienvenida"
  // hasta "lanzaste tu primer deploy", pausando con `waitFor` mientras el
  // usuario completa cada acción real (crear equipo, crear proyecto, crear
  // tarea). Auto-arranca para usuarios nuevos.
  {
    id: 'onboarding-flow',
    name: 'Te guío de inicio a fin',
    summary: 'De la bienvenida a tu primer deploy',
    icon: 'pi-compass',
    steps: [
      // ------ 0. Hello ------------------------------------------------------
      {
        id: 'ob-welcome',
        route: '/app/dashboard',
        target: 'sidebar-brand',
        centered: true,
        title: '👋 Bienvenido a DevHub',
        body:
          'Te voy a guiar paso a paso para que en menos de cinco minutos tengas tu ' +
          'primer equipo, proyecto, tarea, documentación, GitHub vinculado y deploy ' +
          'a Vercel. Cuando termines un paso, sigo solo con el siguiente.',
        tierInfo:
          'Puedes cerrar esta guía en cualquier momento con la X o con ESC. ' +
          'Para retomarla, abre Clippy (esquina inferior derecha) y dile "reinicia el tutorial".',
      },
      // ------ 1. Take me to teams ------------------------------------------
      {
        id: 'ob-go-teams',
        route: '/app/dashboard',
        target: 'sidebar-teams',
        title: 'Empezamos por crear tu equipo',
        body:
          'Te llevo a la pantalla de Equipos. Pulsa el botón de abajo y abrimos ' +
          'el formulario juntos.',
        placement: 'right',
        cta: {
          label: 'Vamos a equipos',
          route: '/app/teams',
        },
      },
      // ------ 2. Open create-team modal + WAIT FOR creation ----------------
      {
        id: 'ob-create-team',
        route: '/app/teams',
        target: 'create-team',
        title: 'Crea tu primer equipo',
        body:
          'Te abro el formulario. Solo necesitas un nombre — el slug, el plan y la ' +
          'suscripción se configuran automáticamente. Cuando pulses "Crear", yo te ' +
          'llevo al siguiente paso.',
        placement: 'bottom',
        action: { key: 'open-modal:create-team' },
        waitFor: 'team-created',
        waitingHint: 'Esperando a que crees el equipo…',
      },
      // ------ 3. Celebrate + go to projects --------------------------------
      {
        id: 'ob-team-done',
        target: 'team-plan',
        centered: true,
        title: '🎉 ¡Equipo creado!',
        body:
          'Perfecto, tu equipo está listo. Ahora vamos a crear el primer proyecto ' +
          'dentro de él: los proyectos agrupan tareas, documentación, GitHub y ' +
          'deploys.',
      },
      {
        id: 'ob-go-projects',
        target: 'team-projects-link',
        title: 'Abre la lista de proyectos',
        body:
          'Pulsa el botón "Ver proyectos" resaltado y sigo contigo del otro lado.',
        placement: 'bottom',
        // No CTA: we don't know the team id statically. The button itself
        // is a routerLink — clicking it triggers navigation and the
        // `advanceOnNavigate` flag promotes that to a tour-advance.
        advanceOnNavigate: true,
      },
      // ------ 4. Create project + WAIT -------------------------------------
      {
        id: 'ob-create-project',
        target: 'create-project',
        title: 'Crea tu primer proyecto',
        body:
          'Te abro el formulario de crear proyecto. El nombre es lo único obligatorio. ' +
          'Cuando lo crees, sigo con tareas.',
        placement: 'bottom',
        action: { key: 'open-modal:create-project' },
        waitFor: 'project-created',
        waitingHint: 'Esperando a que crees el proyecto…',
        requiresRole: ['OWNER', 'ADMIN'],
        roleHint:
          'Tu rol no permite crear proyectos en este equipo. Pide a un OWNER o ADMIN que lo haga.',
      },
      // ------ 5. Tasks introduction ----------------------------------------
      // After creating the project, projects-list navigates the user STRAIGHT
      // to the Kanban board while a tour is active (see projects-list.ts), so
      // we no longer need a manual "open the board" step — we go right into
      // creating the first task on the board the user is already looking at.
      {
        id: 'ob-project-done',
        centered: true,
        target: 'kanban-columns',
        title: '🚀 ¡Proyecto listo!',
        body:
          'Te llevé directo a tu tablero Kanban: cinco columnas (por hacer, en ' +
          'progreso, en revisión, bloqueadas y hechas). Ahora creemos tu primera tarea.',
      },
      {
        id: 'ob-create-task',
        target: 'create-task',
        title: 'Crea tu primera tarea',
        body:
          'Te abro el formulario. Pon un título descriptivo (lo demás es opcional) y ' +
          'cuando la crees, sigo con la documentación.',
        placement: 'bottom',
        action: { key: 'open-modal:create-task' },
        waitFor: 'task-created',
        waitingHint: 'Esperando a que crees la tarea…',
        requiresRole: ['OWNER', 'ADMIN', 'DEVELOPER'],
        roleHint:
          'Tu rol VIEWER es solo lectura. Esta parte no aplica para ti.',
      },
      // ------ 6. Wrap-up: mention docs/github/deploy without spotlighting ---
      //
      // Why centered: after creating the task we're on /tasks, but the
      // "Ver docs/github/deploy" anchors live on /overview. Rather than
      // bounce the user back, we summarize the three remaining pieces
      // in one centered card and let them explore.
      {
        id: 'ob-task-done',
        centered: true,
        target: 'kanban-columns',
        title: '✅ ¡Primera tarea!',
        body:
          'Genial. Te falta conocer tres piezas más: Documentación (9 secciones + ' +
          'README generado), GitHub (commits, branches, issues + creación de issues) y ' +
          'Deploy Wizard a Vercel (de tu repo a producción en 4 pasos). Todas viven ' +
          'en el overview de tu proyecto — encuéntralas como botones en la cabecera.',
      },
      // ------ 7. Outro -----------------------------------------------------
      {
        id: 'ob-outro',
        centered: true,
        target: 'assistant-fab',
        title: '🎓 ¡Tour terminado!',
        body:
          'Ya conoces todo lo esencial. Si te pierdes en algún momento, abre Clippy ' +
          'en la esquina inferior derecha — puede repetirte cualquier guía o ' +
          'responder preguntas con IA. ¡Mucho éxito con tu proyecto!',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 1. WELCOME — auto-arranca para usuarios nuevos
  // -------------------------------------------------------------------------
  {
    id: 'welcome-tour',
    name: 'Bienvenida a DevHub',
    summary: 'Lo esencial en 7 pasos',
    icon: 'pi-sparkles',
    steps: [
      {
        id: 'welcome',
        route: '/app/dashboard',
        target: 'sidebar-brand',
        centered: true,
        title: '👋 Te damos la bienvenida a DevHub',
        body:
          'DevHub centraliza tus equipos, proyectos, tareas, documentación, GitHub y ' +
          'deploy en un solo lugar. En menos de dos minutos te enseñamos lo esencial — ' +
          'al final crearás tu primer equipo.',
      },
      {
        id: 'whats-new',
        route: '/app/dashboard',
        target: 'whats-new',
        title: 'Lo que estrenamos esta semana',
        body:
          'En tu dashboard verás un banner con las novedades: asistente con IA, ' +
          'detección automática de stack y el nuevo Deploy Wizard. Pásale el ratón ' +
          'a cada tarjeta para descubrirlas.',
        placement: 'bottom',
      },
      {
        id: 'sidebar',
        target: 'sidebar-teams',
        title: 'Tu navegación principal',
        body:
          'A la izquierda tienes Equipos, Proyectos, Documentación, GitHub, Deploy ' +
          'y Planes. Siempre está visible a un click.',
        placement: 'right',
      },
      {
        id: 'role-badge',
        target: 'current-role',
        title: 'Tu rol activo',
        body:
          'Cuando entras a un equipo o proyecto, este chip muestra tu rol ' +
          '(OWNER / ADMIN / DEVELOPER / VIEWER). Define qué puedes hacer en esa pantalla.',
        placement: 'bottom',
      },
      {
        id: 'assistant',
        target: 'assistant-fab',
        title: 'Tu asistente DevHub',
        body:
          'En la esquina inferior derecha tienes a Clippy: pregúntale lo que sea sobre ' +
          'DevHub. Combina FAQ instantáneo con IA (DeepSeek) cuando la pregunta es nueva.',
        placement: 'left',
      },
      {
        id: 'help-button',
        target: 'help-button',
        title: 'Botón de ayuda',
        body:
          'Pulsa el "?" arriba a la derecha siempre que quieras repasar una guía o ' +
          'lanzar otro tour: tareas, documentación, GitHub, deploy…',
        placement: 'bottom',
      },
      {
        id: 'go-create-team',
        target: 'sidebar-teams',
        title: 'Listo, vamos a crear tu primer equipo',
        body:
          'Te llevo a la pantalla de equipos. Cuando hayas creado uno, podrás añadir ' +
          'proyectos, vincular GitHub y lanzar tu primer deploy a Vercel.',
        tierInfo:
          'Tu equipo arranca con plan FREE: 1 proyecto activo · 3 miembros.',
        placement: 'right',
        cta: {
          label: 'Crear mi primer equipo',
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
        requiresRole: ['OWNER', 'ADMIN'],
        roleHint:
          'Tu rol no permite crear proyectos. Pide a un OWNER o ADMIN del equipo que lo cree.',
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
          'Arrastra cualquier tarjeta entre columnas para cambiarle el estado, ' +
          'o pulsa el badge dentro del detalle.',
        placement: 'top',
      },
      {
        id: 'create-task-btn',
        target: 'create-task',
        title: 'Te abro el formulario',
        body: 'Pulsa el botón de abajo y te abro el formulario de crear tarea.',
        placement: 'bottom',
        action: { key: 'open-modal:create-task' },
        requiresRole: ['OWNER', 'ADMIN', 'DEVELOPER'],
        roleHint:
          'Tu rol VIEWER es solo lectura. No puedes crear tareas, pero sí abrirlas y comentarlas.',
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
          'prioridad, asignados, cambias estado y dejas comentarios. ' +
          'Si aún no tienes ninguna tarea, crea una primero y vuelve aquí.',
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
          'contribuidores). Las completas a tu ritmo y DevHub genera el README por ti.',
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
        requiresRole: ['OWNER', 'ADMIN', 'DEVELOPER'],
        roleHint:
          'Tu rol VIEWER es solo lectura. Puedes ver el README de otros, pero no generar uno nuevo.',
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
          'DevHub se conecta a tu repositorio para mostrarte commits, branches ' +
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
          'usa el formato corto "owner/repo". DevHub verifica que existe ' +
          'antes de guardarlo.',
        placement: 'right',
        requiresRole: ['OWNER', 'ADMIN'],
        roleHint:
          'Solo OWNER y ADMIN pueden vincular el repositorio del proyecto.',
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
        title: 'Issues y crear desde DevHub',
        body:
          'Filtra por open/closed/all. El botón "Crear issue" abre un formulario ' +
          'que publica directamente en tu repo (requiere GITHUB_TOKEN en el backend).',
        placement: 'bottom',
        requiresRole: ['OWNER', 'ADMIN', 'DEVELOPER'],
        roleHint:
          'Tu rol VIEWER es solo lectura. Puedes ver issues, pero no crearlos desde DevHub.',
      },
      {
        id: 'github-unlink',
        target: 'github-unlink',
        title: 'Desvincular',
        body:
          'Cuando termines un proyecto o quieras cambiar de repo, usa este botón. ' +
          'El proyecto sigue existiendo en DevHub, solo se elimina la conexión.',
        placement: 'bottom',
        requiresRole: ['OWNER', 'ADMIN'],
        roleHint:
          'Solo OWNER y ADMIN pueden desvincular el repositorio del proyecto.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. DEPLOY — wizard de despliegue a Vercel
  // -------------------------------------------------------------------------
  {
    id: 'deploy-tour',
    name: 'Desplegar a Vercel',
    summary: 'Cómo lanzar tu proyecto en 4 pasos',
    icon: 'pi-cloud-upload',
    steps: [
      {
        id: 'deploy-intro',
        target: 'deploy-start',
        centered: true,
        title: 'Deploy Wizard',
        body:
          'DevHub usa la API de Vercel para crear el proyecto, configurar el build ' +
          'y lanzar el deploy. La primera vez tienes que instalar la app de Vercel ' +
          'en tu cuenta de GitHub (github.com/apps/vercel) y darle acceso al repo.',
        tierInfo:
          'El plan Hobby de Vercel es gratis (100GB banda, builds ilimitados). ' +
          'Para repos privados igual necesitas plan PRO de DevHub.',
      },
      {
        id: 'deploy-start',
        target: 'deploy-start',
        title: 'Lanza el wizard',
        body:
          'Pulsa "Desplegar a Vercel" y DevHub analiza tu repo, deduce el stack ' +
          'y propone una configuración de build.',
        placement: 'bottom',
        requiresRole: ['OWNER', 'ADMIN'],
        roleHint:
          'Solo OWNER y ADMIN pueden disparar deploys (la operación afecta a la cuenta de Vercel).',
      },
      {
        id: 'deploy-wizard',
        target: 'deploy-wizard',
        title: 'Cuatro pasos',
        body:
          'Stack → Build → Variables → Confirmar. Puedes ir y volver con los ' +
          'botones del pie. Lo que rellenamos por ti son sugerencias — siempre ' +
          'puedes sobrescribir.',
        placement: 'top',
      },
      {
        id: 'deploy-submit',
        target: 'deploy-submit',
        title: 'Lanza el deploy',
        body:
          'Después de "Lanzar deploy" DevHub crea el proyecto en Vercel (si no ' +
          'existe), guarda tus env vars cifradas y dispara la construcción. El ' +
          'estado se actualiza cada 3 segundos.',
        placement: 'top',
        requiresRole: ['OWNER', 'ADMIN'],
      },
      {
        id: 'deploy-history',
        target: 'deploy-history',
        title: 'Historial completo',
        body:
          'Cada deploy queda registrado con su rama, autor, URL pública y enlace a ' +
          'los logs en Vercel. Puedes volver aquí cuando quieras para auditarlos.',
        placement: 'top',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. PRICING — entender los planes y el upgrade simulado
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
        title: 'Planes de DevHub',
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
