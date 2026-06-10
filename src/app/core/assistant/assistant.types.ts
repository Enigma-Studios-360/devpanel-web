/**
 * Types for the DevHub in-app assistant ("Clippy v1").
 *
 * v1 is FAQ-driven (no LLM). The service matches user input against a local
 * catalog and surfaces canned answers + quick replies. Later we'll route
 * unmatched questions to DeepSeek via the backend — the contract here is
 * deliberately compatible with that future capability.
 */

/** Visual state of the assistant character/avatar. */
export type AssistantState = 'idle' | 'hello' | 'thinking' | 'talking';

/**
 * Action a quick-reply chip triggers when the user clicks it.
 *
 * - `ask`              → run another FAQ entry as if the user asked it.
 * - `navigate`         → router.navigateByUrl.
 * - `tour`             → start a tutorial tour by id.
 * - `restart-tutorial` → wipe tutorial progress and re-launch the onboarding flow.
 * - `external`         → open a URL in a new tab (rarely used in v1).
 */
export type QuickReplyAction =
  | { type: 'ask'; faqId: string }
  | { type: 'navigate'; route: string; query?: Record<string, string | number> }
  | { type: 'tour'; tourId: string }
  | { type: 'restart-tutorial' }
  | { type: 'set-mode'; mode: 'ia' | 'faq' }
  | { type: 'external'; url: string };

export interface QuickReply {
  label: string;
  icon?: string;
  action: QuickReplyAction;
}

/**
 * Where an assistant message came from. `faq` is the local catalog,
 * `deepseek` is the LLM proxy, `error` is a typed failure surface
 * (rate limit, network, missing key) rendered as a system-like bubble.
 */
export type AssistantSource = 'faq' | 'deepseek' | 'error';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** Optional list of suggested actions shown under an assistant message. */
  quickReplies?: QuickReply[];
  /** Provenance — drives the "IA" badge in the UI. */
  source?: AssistantSource;
  timestamp: number;
}

/**
 * A canned conversation node. Matching strategy:
 *  - The user's literal input is normalized (lowercase, accents stripped)
 *    and checked for substring presence of every `trigger`.
 *  - Routes are not matchers — they only drive the default suggestions
 *    surfaced when the assistant is opened on that screen.
 */
export interface FaqEntry {
  id: string;
  /** Substrings (normalized) that fire this entry when present in the user query. */
  triggers: string[];
  /** Question label used in suggestion chips. */
  question: string;
  /** Markdown-ish answer text — rendered as plain text in v1. */
  answer: string;
  /** Optional follow-up quick replies. */
  quickReplies?: QuickReply[];
  /** Route prefixes where this entry is a sensible default suggestion. */
  routes?: string[];
  /** Minimum role required to surface this suggestion. */
  rolesAllowed?: ReadonlyArray<'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER'>;
}
