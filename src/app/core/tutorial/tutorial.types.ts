export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Optional call-to-action shown on the tooltip. When the step's target is
 * not present in the DOM, the CTA becomes the primary action ("Llévame
 * allí"). When the target IS present, the CTA renders as a secondary
 * link-style button ("Vamos a hacerlo").
 */
export interface TutorialCta {
  label: string;
  /** Internal route to navigate to */
  route: string;
  /** Optional query params */
  query?: Record<string, string | number | boolean>;
}

/**
 * A side effect the tour can fire when the user advances. Components
 * subscribe to `TutorialService.actions$` and react when their key matches.
 *
 * Currently supported:
 *   - `'open-modal:create-team'`     → TeamsListComponent opens its modal
 *   - `'open-modal:create-project'`  → ProjectsListComponent opens its modal
 *   - `'open-modal:create-task'`     → TasksBoardComponent opens its modal
 *
 * Adding a new one is just: pick a string key, emit it from a tour step,
 * and have the relevant component subscribe.
 */
export type TutorialActionKey =
  | 'open-modal:create-team'
  | 'open-modal:create-project'
  | 'open-modal:create-task';

export interface TutorialAction {
  key: TutorialActionKey;
}

export interface TutorialStep {
  /** Unique step id within a tour */
  id: string;
  /** Optional route to navigate to before showing the step */
  route?: string;
  /**
   * CSS attribute selector value: `[data-tour="<target>"]`.
   * Ignored when `centered: true`.
   */
  target: string;
  /**
   * If true, the step is rendered as a centered modal-like card with no
   * spotlight on any element. Useful for intro / outro steps.
   */
  centered?: boolean;
  title: string;
  body: string;
  /** Optional plan/tier explainer rendered as a callout under `body`. */
  tierInfo?: string;
  /**
   * Optional CTA. When present, the primary footer button uses `cta.label`
   * and navigates to `cta.route` BEFORE advancing the tour. This lets a
   * single click both finish the explanation and take the user to the next
   * thing they should do.
   */
  cta?: TutorialCta;
  /**
   * Optional declarative action fired when the user advances past this
   * step. Used to "open the form for them" so the tutorial can guide
   * inside dialogs. Components react via `TutorialService.actions$`.
   */
  action?: TutorialAction;
  placement?: TutorialPlacement;
}

export interface Tutorial {
  /** Unique tutorial id (used as the key in localStorage) */
  id: string;
  /** Human-friendly name shown in the help menu */
  name: string;
  /** Short description shown next to the name */
  summary?: string;
  /** Optional pi-icon class (default 'pi-play') */
  icon?: string;
  steps: TutorialStep[];
}
