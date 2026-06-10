import type { FaqEntry } from './assistant.types';

/**
 * Catálogo local de FAQ que alimenta al asistente en v1 (sin IA).
 *
 * Cada entrada tiene:
 *  - `triggers`: keywords normalizadas que matchean la query del usuario.
 *  - `routes`: lista de rutas donde la entrada se sugiere por contexto.
 *  - `quickReplies`: acciones de seguimiento (otra FAQ, navegar, abrir tour).
 *
 * Si añades una entrada nueva, no olvides:
 *  1. `id` único.
 *  2. Al menos un `trigger` corto y otro más natural.
 *  3. Una sola idea por respuesta — no escribas párrafos largos.
 */
export const ASSISTANT_FAQ: FaqEntry[] = [
  // -------------------------------------------------------------------------
  // Bienvenida y orientación
  // -------------------------------------------------------------------------
  {
    id: 'welcome',
    triggers: ['hola', 'que eres', 'quien eres', 'ayuda', 'help'],
    question: '¿Qué puedes hacer por mí?',
    answer:
      'Soy tu asistente de DevHub. Puedo explicarte cómo funciona el producto, ' +
      'llevarte a cada sección, o lanzar un tour guiado paso a paso. ' +
      'Si no encuentro tu respuesta, dime con tus palabras y miro la FAQ.',
    quickReplies: [
      { label: 'Tour de bienvenida', icon: 'pi-sparkles', action: { type: 'tour', tourId: 'welcome-tour' } },
      { label: '¿Qué es un equipo?', icon: 'pi-users', action: { type: 'ask', faqId: 'what-team' } },
      { label: '¿Qué es un proyecto?', icon: 'pi-folder', action: { type: 'ask', faqId: 'what-project' } },
    ],
  },

  // -------------------------------------------------------------------------
  // Conceptos
  // -------------------------------------------------------------------------
  {
    id: 'what-team',
    triggers: ['que es un equipo', 'equipo', 'team'],
    question: '¿Qué es un equipo en DevHub?',
    answer:
      'Un equipo agrupa personas que colaboran en proyectos. Cada persona tiene un ' +
      'rol (OWNER, ADMIN, DEVELOPER o VIEWER) que define qué puede hacer.',
    quickReplies: [
      { label: 'Crear un equipo', icon: 'pi-plus', action: { type: 'tour', tourId: 'teams-tour' } },
      { label: 'Ir a Equipos', icon: 'pi-arrow-right', action: { type: 'navigate', route: '/app/teams' } },
    ],
  },
  {
    id: 'what-project',
    triggers: ['que es un proyecto', 'proyecto', 'project'],
    question: '¿Qué es un proyecto?',
    answer:
      'Un proyecto agrupa tareas, documentación, archivos e integraciones (GitHub, ' +
      'deploy) de una app o producto. Vive dentro de un equipo y tiene un cupo ' +
      'según el plan.',
    quickReplies: [
      { label: 'Crear un proyecto', icon: 'pi-plus', action: { type: 'tour', tourId: 'projects-tour' } },
      { label: 'Ver planes', icon: 'pi-tag', action: { type: 'navigate', route: '/app/pricing' } },
    ],
  },
  {
    id: 'what-role',
    triggers: ['roles', 'permisos', 'que puedo hacer', 'mi rol', 'viewer', 'developer', 'admin', 'owner'],
    question: '¿Qué puede hacer cada rol?',
    answer:
      'OWNER y ADMIN gestionan el proyecto (editar, archivar, vincular GitHub). ' +
      'DEVELOPER trabaja en tareas, comentarios y documentación. VIEWER es solo ' +
      'lectura. Tu rol aparece en el badge superior derecho cuando entras a un proyecto.',
  },

  // -------------------------------------------------------------------------
  // Tareas
  // -------------------------------------------------------------------------
  {
    id: 'tasks-create',
    triggers: ['crear tarea', 'nueva tarea', 'tarea nueva', 'agregar tarea'],
    question: '¿Cómo creo una tarea?',
    answer:
      'Entra a un proyecto, abre "Tareas" y pulsa "Crear tarea". El título es lo ' +
      'único obligatorio; la prioridad, fecha y asignados son opcionales y los ' +
      'puedes completar después.',
    quickReplies: [
      { label: 'Tour de tareas', icon: 'pi-play', action: { type: 'tour', tourId: 'tasks-tour' } },
    ],
    routes: ['/app/projects/'],
    rolesAllowed: ['OWNER', 'ADMIN', 'DEVELOPER'],
  },
  {
    id: 'tasks-move',
    triggers: ['mover tarea', 'cambiar estado', 'kanban', 'mover', 'arrastrar', 'drag'],
    question: '¿Cómo muevo una tarea entre columnas?',
    answer:
      'Hay dos formas: arrastra la card de una columna a otra (drag & drop) o, ' +
      'desde el detalle de la tarea, pulsa el badge de estado para elegir uno nuevo. ' +
      'El estado se persiste al instante y si tu rol no permite editar, las cards ' +
      'no se podrán arrastrar.',
  },
  {
    id: 'tasks-archive',
    triggers: ['archivar tarea', 'ocultar tarea'],
    question: '¿Cómo archivo una tarea?',
    answer:
      'En el detalle de la tarea verás un botón "Archivar". La tarea se oculta del ' +
      'tablero pero no se borra — puedes restaurarla más tarde. Es distinto de ' +
      '"Eliminar", que sí es permanente y solo OWNER/ADMIN puede usarlo.',
  },

  // -------------------------------------------------------------------------
  // Docs
  // -------------------------------------------------------------------------
  {
    id: 'docs-readme',
    triggers: ['readme', 'generar readme', 'documentacion'],
    question: '¿Cómo se genera el README?',
    answer:
      'En la pantalla de Documentación de tu proyecto verás 9 secciones (visión, ' +
      'stack, instalación, etc.). Complétalas y pulsa "Generar README" — DevHub ' +
      'arma el archivo Markdown listo para copiar o descargar.',
    quickReplies: [
      { label: 'Tour de docs', icon: 'pi-play', action: { type: 'tour', tourId: 'docs-tour' } },
    ],
  },
  {
    id: 'docs-download',
    triggers: ['descargar readme', 'plan starter', 'descargar documentacion'],
    question: '¿Por qué no puedo descargar el README?',
    answer:
      'La descarga del .md requiere plan STARTER o superior. Generar y copiar el ' +
      'README es gratis en todos los planes — solo la descarga del archivo está ' +
      'gateada. Cambia de plan desde "Planes".',
    quickReplies: [
      { label: 'Ver planes', icon: 'pi-tag', action: { type: 'navigate', route: '/app/pricing' } },
    ],
  },

  // -------------------------------------------------------------------------
  // GitHub
  // -------------------------------------------------------------------------
  {
    id: 'github-link',
    triggers: ['vincular github', 'conectar github', 'repositorio', 'github'],
    question: '¿Cómo conecto mi repositorio de GitHub?',
    answer:
      'En la pantalla de GitHub del proyecto, pega la URL del repo o "owner/repo" ' +
      'y pulsa Vincular. DevHub te mostrará commits, branches e issues sin tocar ' +
      'tu código. Para repos privados necesitas plan PRO o superior.',
    quickReplies: [
      { label: 'Tour de GitHub', icon: 'pi-play', action: { type: 'tour', tourId: 'github-tour' } },
    ],
  },
  {
    id: 'github-issue',
    triggers: ['crear issue', 'reportar bug', 'issue'],
    question: '¿Puedo crear issues desde DevHub?',
    answer:
      'Sí. En la pestaña "Issues" del proyecto verás un botón "Crear issue" que ' +
      'publica directamente en tu repo. Requiere que el backend tenga un GITHUB_TOKEN ' +
      'configurado y que tu rol sea OWNER, ADMIN o DEVELOPER.',
  },
  {
    id: 'stack-detect',
    triggers: ['detectar stack', 'analizar repo', 'que tecnologias', 'analizar repositorio', 'stack'],
    question: '¿Qué hace "Analizar repositorio"?',
    answer:
      'DevHub revisa la raíz del repo y los manifests (package.json, ' +
      'requirements.txt, Gemfile, etc.) para deducir tu stack: Next.js, Angular, ' +
      'Express, Django, Rails, Go, Flutter… Es solo lectura y no usa IA, son reglas ' +
      'declarativas. El resultado se usa después para configurar el Deploy Wizard.',
    routes: ['/app/projects/'],
  },

  // -------------------------------------------------------------------------
  // Deploy Wizard
  // -------------------------------------------------------------------------
  {
    id: 'deploy-how',
    triggers: ['como desplegar', 'deploy', 'desplegar', 'vercel', 'subir a produccion', 'publicar'],
    question: '¿Cómo despliego mi proyecto?',
    answer:
      'Entra al proyecto y abre la pestaña "Deploy". Pulsa "Desplegar a Vercel" y ' +
      'el wizard te guía en 4 pasos: confirmar el stack detectado, ajustar el build ' +
      'command, añadir variables de entorno y lanzar. DevHub crea el proyecto en ' +
      'Vercel si no existe y dispara el deploy automáticamente.',
    quickReplies: [
      { label: 'Tour de Deploy', icon: 'pi-play', action: { type: 'tour', tourId: 'deploy-tour' } },
    ],
    routes: ['/app/projects/'],
    rolesAllowed: ['OWNER', 'ADMIN'],
  },
  {
    id: 'deploy-github-app',
    triggers: ['vercel github', 'no encontro el repo', 'github app', 'instalar vercel', 'vercel no encuentra'],
    question: '¿Por qué Vercel no encuentra mi repo?',
    answer:
      'Vercel necesita su GitHub App instalada en tu cuenta para acceder al repo. ' +
      'Ve a https://github.com/apps/vercel, instálala (o configúrala) y concédele ' +
      'acceso al repositorio que quieres desplegar. Es una sola vez por cuenta de GitHub.',
  },
  {
    id: 'deploy-cost',
    triggers: ['cuesta vercel', 'precio vercel', 'plan vercel', 'pagar vercel'],
    question: '¿Cuánto cuesta Vercel?',
    answer:
      'El plan Hobby de Vercel es gratis y suficiente para proyectos personales o ' +
      'académicos: 100GB de banda, builds ilimitados y 6,000 minutos de build al ' +
      'mes. No se permite uso comercial — si monetizas tu app, sube a Pro ($20/mes).',
  },

  // -------------------------------------------------------------------------
  // Planes y suscripción
  // -------------------------------------------------------------------------
  {
    id: 'pricing-plans',
    triggers: ['planes', 'precios', 'cuanto cuesta', 'free', 'pro', 'starter', 'team', 'school'],
    question: '¿Qué planes hay?',
    answer:
      'FREE (1 proyecto, 3 miembros), STARTER ($9 — 3 proyectos), PRO ($19 — 10 ' +
      'proyectos + repos privados), TEAM ($49 — 25 proyectos), SCHOOL (custom). ' +
      'En esta versión académica los pagos son simulados.',
    quickReplies: [
      { label: 'Ver planes', icon: 'pi-tag', action: { type: 'navigate', route: '/app/pricing' } },
      { label: 'Tour de planes', icon: 'pi-play', action: { type: 'tour', tourId: 'pricing-tour' } },
    ],
  },
  {
    id: 'pricing-upgrade',
    triggers: ['cambiar plan', 'upgrade', 'mejorar plan', 'subir plan'],
    question: '¿Cómo cambio de plan?',
    answer:
      'En "Planes", selecciona el equipo y pulsa "Simular cambio" sobre el plan ' +
      'que quieras. El cambio es instantáneo y no se cobra nada real. Solo OWNER y ' +
      'ADMIN del equipo pueden cambiarlo.',
  },

  // -------------------------------------------------------------------------
  // Notificaciones
  // -------------------------------------------------------------------------
  {
    id: 'notifications-what',
    triggers: [
      'notificaciones',
      'campanita',
      'campana',
      'que es la campana',
      'como funcionan las notificaciones',
    ],
    question: '¿Cómo funcionan las notificaciones?',
    answer:
      'Verás una campana en la barra superior con un contador rojo cuando tengas ' +
      'notificaciones nuevas. Te avisamos cuando alguien te asigne una tarea, ' +
      'comente una tarea tuya, o cuando un deploy que disparaste termine (READY o ' +
      'ERROR). Click una notificación para marcarla como leída e ir a su destino.',
  },

  // -------------------------------------------------------------------------
  // Onboarding y guía
  // -------------------------------------------------------------------------
  {
    id: 'restart-tutorial',
    triggers: [
      'reinicia el tutorial',
      'reiniciar tutorial',
      'reinicia tutorial',
      'volver a ver el tutorial',
      'repetir tutorial',
      'empezar de cero',
      'mostrar tutorial',
      'guiame',
      'guíame',
      'no recuerdo',
    ],
    question: '¿Cómo vuelvo a ver el tutorial?',
    answer:
      'Voy a borrar tu progreso y arrancar el onboarding desde el principio. ' +
      'Te llevará paso a paso por crear equipo, proyecto, tarea, docs, GitHub y deploy. ' +
      'Pulsa el botón de abajo cuando quieras empezar.',
    quickReplies: [
      { label: 'Reiniciar y empezar', icon: 'pi-replay', action: { type: 'restart-tutorial' } },
    ],
  },
  {
    id: 'where-am-i',
    triggers: [
      'donde estoy',
      'que hago aqui',
      'que hago aquí',
      'no se que hacer',
      'estoy perdido',
      'que hago ahora',
    ],
    question: '¿Qué hago en esta pantalla?',
    answer:
      'Si te sientes perdido, abre la guía interactiva pulsando "?" en la barra ' +
      'superior derecha, o pídeme que te reinicie el tutorial completo. También puedo ' +
      'llevarte a las áreas principales.',
    quickReplies: [
      { label: 'Reiniciar tutorial', icon: 'pi-replay', action: { type: 'restart-tutorial' } },
      { label: 'Ir al dashboard', icon: 'pi-th-large', action: { type: 'navigate', route: '/app/dashboard' } },
      { label: 'Ir a equipos', icon: 'pi-users', action: { type: 'navigate', route: '/app/teams' } },
    ],
  },

  // -------------------------------------------------------------------------
  // Soporte / sin respuesta
  // -------------------------------------------------------------------------
  {
    id: 'no-match',
    triggers: [],
    question: 'No estoy seguro de cómo responder eso',
    answer:
      'Ahora mismo no puedo consultar al modelo de IA (puede que no esté configurado ' +
      'o haya fallado), así que tiro de mi catálogo local. Prueba a preguntarme por ' +
      'equipos, proyectos, tareas, documentación, GitHub, deploy o planes. Vuelve a ' +
      'intentarlo en un momento.',
    quickReplies: [
      { label: '¿Qué puedes hacer?', action: { type: 'ask', faqId: 'welcome' } },
    ],
  },
];

/** Index for O(1) lookup by id. */
export const FAQ_BY_ID: ReadonlyMap<string, FaqEntry> = new Map(
  ASSISTANT_FAQ.map((entry) => [entry.id, entry]),
);
