import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TutorialService } from '../tutorial/tutorial.service';
import { PermissionsService } from '../auth/permissions.service';
import { AuthStateService } from '../auth/auth-state.service';
import { readWithMigration, safeSet } from '../storage/migrate';
import { ASSISTANT_FAQ, FAQ_BY_ID } from './assistant-faq';
import {
  AssistantApiService,
  type AssistantChatTurn,
  type AssistantChatContext,
  type AssistantStatus,
} from '../services/assistant-api.service';
import type {
  AssistantMessage,
  AssistantSource,
  AssistantState,
  FaqEntry,
  QuickReply,
  QuickReplyAction,
} from './assistant.types';

const HELLO_KEY = 'devhub.assistant.greeted';
const HELLO_LEGACY_KEY = 'devpanel.assistant.greeted';
const MODE_KEY = 'devhub.assistant.mode';
const MODE_LEGACY_KEY = 'devpanel.assistant.mode';
/** Per-user IA history is persisted under `${IA_HISTORY_PREFIX}${userId}`. */
const IA_HISTORY_PREFIX = 'devhub.assistant.ia.';
const IA_HISTORY_MAX = 40;

export type AssistantMode = 'ia' | 'faq';

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Find an FAQ entry whose triggers appear in the normalized query. */
const matchFaq = (query: string): FaqEntry | null => {
  const norm = normalize(query);
  if (!norm) return null;
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of ASSISTANT_FAQ) {
    for (const trigger of entry.triggers) {
      if (norm.includes(normalize(trigger))) {
        const score = trigger.length;
        if (!best || score > best.score) best = { entry, score };
      }
    }
  }
  return best?.entry ?? null;
};

let MSG_COUNTER = 0;
const nextId = (): string => `m-${Date.now()}-${++MSG_COUNTER}`;

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly router = inject(Router);
  private readonly tutorial = inject(TutorialService);
  private readonly permissions = inject(PermissionsService);
  private readonly authState = inject(AuthStateService);
  private readonly api = inject(AssistantApiService);

  private readonly openSignal = signal(false);
  private readonly stateSignal = signal<AssistantState>('idle');

  /**
   * Two separate conversation buffers:
   *  - `iaMessages`  → the IA (DeepSeek) chat. Persisted PER USER and restored
   *    on login, so each user keeps their own history.
   *  - `faqMessages` → the FAQ catalog view. Ephemeral: cleared every time the
   *    user switches into FAQ mode.
   */
  private readonly iaMessages = signal<AssistantMessage[]>([]);
  private readonly faqMessages = signal<AssistantMessage[]>([]);

  private readonly unreadSignal = signal(0);
  private readonly currentPathSignal = signal(
    this.router.url.split('?')[0] ?? '/',
  );
  private readonly aiAvailableSignal = signal<boolean | null>(null);
  private readonly quotaSignal = signal<AssistantStatus | null>(null);
  /** Stored preference. The EFFECTIVE mode also depends on auth (see `mode`). */
  private readonly modeSignal = signal<AssistantMode>(this.readMode());

  readonly open = this.openSignal.asReadonly();
  readonly state = this.stateSignal.asReadonly();
  readonly unread = this.unreadSignal.asReadonly();
  readonly aiAvailable = this.aiAvailableSignal.asReadonly();
  readonly quota = this.quotaSignal.asReadonly();

  /** IA requires an authenticated user (the /chat endpoint + quota are per-user). */
  readonly canUseIa = computed(() => this.authState.isAuthenticated());

  /** Effective mode: a logged-out user is always in FAQ mode. */
  readonly mode = computed<AssistantMode>(() =>
    this.canUseIa() ? this.modeSignal() : 'faq',
  );

  /** Messages shown for the active mode. */
  readonly messages = computed<AssistantMessage[]>(() =>
    this.mode() === 'ia' ? this.iaMessages() : this.faqMessages(),
  );

  /** Tracks which user's IA history is currently loaded (`undefined` = never). */
  private iaLoadedFor: string | null | undefined = undefined;

  readonly visible = computed(() => {
    const p = this.currentPathSignal();
    return (
      p.startsWith('/app') ||
      p === '/' ||
      p.startsWith('/pricing') ||
      p.startsWith('/auth')
    );
  });

  readonly contextualSuggestions = computed<QuickReply[]>(() => {
    const path = this.currentPathSignal();
    const role = this.permissions.role();
    return ASSISTANT_FAQ.filter((entry) =>
      entry.routes?.some((r) => path.startsWith(r)),
    )
      .filter(
        (entry) =>
          !entry.rolesAllowed || !role || entry.rolesAllowed.includes(role),
      )
      .slice(0, 4)
      .map<QuickReply>((entry) => ({
        label: entry.question,
        action: { type: 'ask', faqId: entry.id },
      }));
  });

  /** The full FAQ catalog as selectable chips (role-filtered). Drives FAQ mode. */
  readonly faqCatalog = computed<QuickReply[]>(() => {
    const role = this.permissions.role();
    return ASSISTANT_FAQ.filter((e) => e.id !== 'no-match' && e.id !== 'welcome')
      .filter((e) => !e.rolesAllowed || !role || e.rolesAllowed.includes(role))
      .map<QuickReply>((e) => ({
        label: e.question,
        action: { type: 'ask', faqId: e.id },
      }));
  });

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private nudgedRoutes = new Set<string>();
  private static readonly IDLE_NUDGE_MS = 45_000;

  constructor() {
    this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        const path = evt.urlAfterRedirects.split('?')[0];
        this.currentPathSignal.set(path);
        this.scheduleIdleNudge(path);
      }
    });
    this.scheduleIdleNudge(this.currentPathSignal());

    // Load each user's IA history when they log in; clear it on logout.
    effect(() => {
      const user = this.authState.user();
      const uid = user?._id ?? null;
      untracked(() => {
        if (this.iaLoadedFor === uid) return;
        this.iaLoadedFor = uid;
        this.iaMessages.set(uid ? this.readIaHistory(uid) : []);
      });
    });

    // Persist the IA history whenever it changes (only for a logged-in user).
    effect(() => {
      const msgs = this.iaMessages();
      const user = this.authState.user();
      if (user) this.writeIaHistory(user._id, msgs);
    });
  }

  private scheduleIdleNudge(path: string): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (!path.startsWith('/app/')) return;
    if (this.openSignal()) return;
    if (this.nudgedRoutes.has(path)) return;
    if (!this.userLooksNew()) return;

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.openSignal()) return;
      if (this.tutorial.isActive()) return;
      if (this.nudgedRoutes.has(path)) return;
      if (this.currentPathSignal() !== path) return;

      this.nudgedRoutes.add(path);
      this.pushIdleNudgeMessage(path);
      this.stateSignal.set('hello');
      this.unreadSignal.update((n) => n + 1);
    }, AssistantService.IDLE_NUDGE_MS);
  }

  private userLooksNew(): boolean {
    if (this.tutorial.hasCompleted('onboarding-flow')) return false;
    if (this.tutorial.hasCompleted('welcome-tour')) return false;
    return true;
  }

  private pushIdleNudgeMessage(path: string): void {
    this.pushMsg({
      id: nextId(),
      role: 'assistant',
      text: this.idleNudgeBodyFor(path),
      quickReplies: [
        { label: 'Reiniciar tutorial', icon: 'pi-replay', action: { type: 'restart-tutorial' } },
        { label: 'Ir al dashboard', icon: 'pi-th-large', action: { type: 'navigate', route: '/app/dashboard' } },
      ],
      source: 'faq',
      timestamp: Date.now(),
    });
  }

  private idleNudgeBodyFor(path: string): string {
    if (path === '/app/teams' || path === '/app/teams/') {
      return '¿Te ayudo a crear tu primer equipo? Si quieres, puedo reiniciar el tutorial y guiarte paso a paso desde el principio.';
    }
    if (path.startsWith('/app/teams/')) {
      return '¿Necesitas ayuda con este equipo? Puedo reiniciar el tutorial completo y guiarte hasta tu primer deploy.';
    }
    if (path.includes('/tasks')) {
      return '¿Buscas crear una tarea? Si quieres, reinicio el onboarding y te llevo paso a paso.';
    }
    if (path.includes('/docs')) {
      return '¿Te muestro cómo funciona la documentación guiada? Puedo lanzar el tour específico o reiniciar el onboarding completo.';
    }
    if (path.includes('/github')) {
      return '¿Te ayudo a vincular tu repo? Si quieres, reinicio el tutorial y te llevo paso a paso.';
    }
    if (path.includes('/deploy')) {
      return 'El Deploy Wizard tiene 4 pasos. ¿Quieres que te explique cómo funciona?';
    }
    return 'Veo que llevas un rato aquí. ¿Necesitas ayuda? Puedo reiniciar el tutorial y guiarte de la mano.';
  }

  // -- Visibility -----------------------------------------------------------

  toggle(): void {
    if (this.openSignal()) this.close();
    else this.openPanel();
  }

  openPanel(): void {
    this.openSignal.set(true);
    this.unreadSignal.set(0);
    this.refreshQuota();
    if (this.messages().length === 0 && !this.hasGreeted()) {
      this.markGreeted();
      this.pushAssistantMessage(FAQ_BY_ID.get('welcome')!);
    }
  }

  private refreshQuota(): void {
    if (!this.canUseIa()) return;
    this.api.status().subscribe({
      next: (s) => {
        this.quotaSignal.set(s);
        if (this.aiAvailableSignal() === null) {
          this.aiAvailableSignal.set(s.configured);
        }
      },
      error: () => {
        /* leave quota unknown — the hint just falls back to the generic copy */
      },
    });
  }

  private decrementQuota(): void {
    const q = this.quotaSignal();
    if (q && typeof q.remaining === 'number') {
      this.quotaSignal.set({
        ...q,
        remaining: Math.max(0, q.remaining - 1),
        used: (q.used ?? 0) + 1,
      });
    }
  }

  close(): void {
    this.openSignal.set(false);
    this.stateSignal.set('idle');
  }

  nudge(): void {
    if (this.hasGreeted() || this.openSignal()) return;
    this.stateSignal.set('hello');
    this.unreadSignal.set(1);
  }

  // -- Conversation ---------------------------------------------------------

  ask(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.pushUserMessage(trimmed);

    // IA mode: every message goes straight to the model (no FAQ interception).
    if (this.mode() === 'ia') {
      this.askDeepSeek(trimmed);
      return;
    }

    // FAQ mode: only the local catalog. On miss, offer the catalog + IA.
    const entry = matchFaq(trimmed);
    if (entry) {
      this.respondWithFaq(entry);
      return;
    }
    this.respondNoFaqMatch();
  }

  // -- Mode (IA ⇄ FAQ) ------------------------------------------------------

  setMode(mode: AssistantMode): void {
    if (mode === 'ia' && !this.canUseIa()) return; // IA needs a session
    this.modeSignal.set(mode);
    safeSet(MODE_KEY, mode);
  }

  /** Switch to FAQ mode; FAQ is ephemeral so we clear it and show the catalog. */
  useFaqMode(): void {
    this.setMode('faq');
    this.faqMessages.set([]);
    this.showFaqs();
  }

  /** Switch to IA mode. The IA history persists — nothing is cleared. */
  useIaMode(): void {
    if (!this.canUseIa()) return;
    this.setMode('ia');
  }

  /** Push the full FAQ catalog as clickable chips (into the FAQ buffer). */
  showFaqs(): void {
    const chips = this.faqCatalog();
    this.pushMsg({
      id: nextId(),
      role: 'assistant',
      text: chips.length
        ? 'Estas son las preguntas frecuentes. Toca la que quieras 👇'
        : 'No hay preguntas frecuentes disponibles para tu rol.',
      quickReplies: chips,
      source: 'faq',
      timestamp: Date.now(),
    });
    this.afterAssistantReply();
  }

  private respondNoFaqMatch(): void {
    const canIa = this.canUseIa();
    setTimeout(() => {
      this.pushMsg({
        id: nextId(),
        role: 'assistant',
        text: canIa
          ? 'No tengo esa pregunta en el catálogo. Elige una de abajo, o cambia a ' +
            'modo IA y te respondo con mis propias palabras.'
          : 'No tengo esa pregunta en el catálogo. Elige una de abajo. ' +
            '(Inicia sesión para preguntarme libremente con IA.)',
        quickReplies: [
          ...(canIa
            ? [
                {
                  label: '🤖 Responder con IA',
                  action: { type: 'set-mode', mode: 'ia' } as QuickReplyAction,
                },
              ]
            : []),
          ...this.faqCatalog().slice(0, 6),
        ],
        source: 'faq',
        timestamp: Date.now(),
      });
      this.afterAssistantReply();
    }, 300);
  }

  private readMode(): AssistantMode {
    return readWithMigration(MODE_KEY, MODE_LEGACY_KEY) === 'faq' ? 'faq' : 'ia';
  }

  /** Quick-reply equivalent of `ask` — by id rather than by free text. */
  askById(faqId: string): void {
    const entry = FAQ_BY_ID.get(faqId);
    if (!entry) return;
    this.pushUserMessage(entry.question);
    this.respondWithFaq(entry);
  }

  /** Run a quick-reply action. */
  runAction(action: QuickReplyAction): void {
    switch (action.type) {
      case 'ask':
        this.askById(action.faqId);
        return;
      case 'navigate':
        this.close();
        void this.router.navigate([action.route], action.query ? { queryParams: action.query } : {});
        return;
      case 'tour':
        this.close();
        this.tutorial.start(action.tourId);
        return;
      case 'restart-tutorial':
        this.close();
        this.tutorial.resetAll();
        void this.router.navigate(['/app/dashboard']).then(() => {
          setTimeout(() => this.tutorial.start('onboarding-flow'), 250);
        });
        return;
      case 'set-mode':
        if (action.mode === 'ia') {
          if (!this.canUseIa()) return;
          // The question was typed in FAQ mode — bring it into the IA chat.
          const lastUser = [...this.faqMessages()]
            .reverse()
            .find((m) => m.role === 'user');
          this.setMode('ia');
          if (lastUser) {
            this.pushUserMessage(lastUser.text);
            this.askDeepSeek(lastUser.text);
          }
        } else {
          this.useFaqMode();
        }
        return;
      case 'external':
        window.open(action.url, '_blank', 'noopener');
        return;
    }
  }

  /** Clear the conversation history of the ACTIVE mode. */
  reset(): void {
    this.activeBuffer().set([]);
    this.stateSignal.set('idle');
  }

  // -- Internal helpers -----------------------------------------------------

  /** The signal backing the currently-visible conversation. */
  private activeBuffer() {
    return this.mode() === 'ia' ? this.iaMessages : this.faqMessages;
  }

  /** Append a message to the active buffer. */
  private pushMsg(message: AssistantMessage): void {
    this.activeBuffer().update((arr) => [...arr, message]);
  }

  private pushUserMessage(text: string): void {
    this.pushMsg({ id: nextId(), role: 'user', text, timestamp: Date.now() });
    this.stateSignal.set('thinking');
  }

  private pushAssistantMessage(entry: FaqEntry): void {
    this.pushMsg({
      id: nextId(),
      role: 'assistant',
      text: entry.answer,
      quickReplies: this.filterQuickReplies(entry.quickReplies),
      source: 'faq',
      timestamp: Date.now(),
    });
    this.afterAssistantReply();
  }

  /** Land a bubble whose text didn't come from the FAQ (DeepSeek or error). */
  private pushFreeformReply(
    text: string,
    source: AssistantSource,
    quickReplies?: QuickReply[],
  ): void {
    this.pushMsg({
      id: nextId(),
      role: 'assistant',
      text,
      quickReplies,
      source,
      timestamp: Date.now(),
    });
    this.afterAssistantReply();
  }

  private afterAssistantReply(): void {
    if (!this.openSignal()) this.unreadSignal.update((n) => n + 1);
    this.stateSignal.set('talking');
    setTimeout(() => {
      if (this.stateSignal() === 'talking') this.stateSignal.set('idle');
    }, 900);
  }

  private respondWithFaq(entry: FaqEntry): void {
    setTimeout(() => this.pushAssistantMessage(entry), 350);
  }

  private askDeepSeek(text: string): void {
    if (this.aiAvailableSignal() === false) {
      this.respondWithFaq(FAQ_BY_ID.get('no-match')!);
      return;
    }

    const context: AssistantChatContext = {
      route: this.currentPathSignal(),
      role: this.permissions.role(),
    };
    const history = this.recentHistoryForApi();

    this.stateSignal.set('thinking');
    this.api.chat({ message: text, history, context }).subscribe({
      next: ({ reply }) => {
        if (this.aiAvailableSignal() === null) this.aiAvailableSignal.set(true);
        this.pushFreeformReply(reply, 'deepseek');
        this.decrementQuota();
      },
      error: (err: HttpErrorResponse) => {
        const code = (err?.error as { error?: { code?: string } } | undefined)?.error?.code;
        const message =
          (err?.error as { error?: { message?: string } } | undefined)?.error?.message ?? null;

        if (code === 'ASSISTANT_NOT_CONFIGURED') {
          this.aiAvailableSignal.set(false);
          this.respondWithFaq(FAQ_BY_ID.get('no-match')!);
          return;
        }

        if (code === 'ASSISTANT_QUOTA_EXCEEDED') {
          const q = this.quotaSignal();
          if (q) this.quotaSignal.set({ ...q, remaining: 0 });
          this.pushFreeformReply(
            message ?? 'Alcanzaste tu límite semanal de mensajes con IA.',
            'error',
            [
              {
                label: 'Ver planes',
                icon: 'pi-tag',
                action: { type: 'navigate', route: '/app/pricing' },
              },
            ],
          );
          return;
        }

        if (code === 'ASSISTANT_RATE_LIMIT' || code === 'ASSISTANT_UPSTREAM_RATE_LIMIT') {
          this.pushFreeformReply(
            message ?? 'Vas demasiado rápido — espera unos segundos y vuelve a intentarlo.',
            'error',
          );
          return;
        }

        if (code === 'ASSISTANT_TIMEOUT') {
          this.pushFreeformReply(
            message ?? 'La respuesta tardó demasiado. Intenta de nuevo en un momento.',
            'error',
          );
          return;
        }

        if (code === 'ASSISTANT_AUTH_FAILED') {
          this.aiAvailableSignal.set(false);
          this.pushFreeformReply(
            'No puedo conectarme al modelo (auth fallida). Mientras tanto, prueba con una pregunta del catálogo local.',
            'error',
          );
          return;
        }

        this.pushFreeformReply(
          message ??
            'No pude consultar al modelo en este momento. ' +
              'Mira las sugerencias del menú o intenta de nuevo más tarde.',
          'error',
        );
      },
    });
  }

  /** Last few IA turns, trimmed, sent as DeepSeek context. */
  private recentHistoryForApi(): AssistantChatTurn[] {
    const msgs = this.iaMessages();
    const tail = msgs.slice(-7, -1);
    return tail
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        text: m.text.slice(0, 1500),
      }));
  }

  private filterQuickReplies(replies?: QuickReply[]): QuickReply[] | undefined {
    if (!replies) return undefined;
    const role = this.permissions.role();
    return replies.filter((r) => {
      if (r.action.type !== 'ask') return true;
      const target = FAQ_BY_ID.get(r.action.faqId);
      if (!target?.rolesAllowed || !role) return true;
      return target.rolesAllowed.includes(role);
    });
  }

  // -- Per-user IA history persistence --------------------------------------

  private readIaHistory(uid: string): AssistantMessage[] {
    try {
      const raw = localStorage.getItem(IA_HISTORY_PREFIX + uid);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? (parsed as AssistantMessage[]).slice(-IA_HISTORY_MAX)
        : [];
    } catch {
      return [];
    }
  }

  private writeIaHistory(uid: string, msgs: AssistantMessage[]): void {
    try {
      localStorage.setItem(
        IA_HISTORY_PREFIX + uid,
        JSON.stringify(msgs.slice(-IA_HISTORY_MAX)),
      );
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }

  private hasGreeted(): boolean {
    return readWithMigration(HELLO_KEY, HELLO_LEGACY_KEY) === '1';
  }

  private markGreeted(): void {
    safeSet(HELLO_KEY, '1');
  }
}
