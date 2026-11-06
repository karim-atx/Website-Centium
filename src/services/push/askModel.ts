// Round J · J-2b: when the phone app may ask to turn on notifications
// (website PLAN.md §2.2, D 10). Pure, so the rules are tested on their own.
//
// NEVER AT LAUNCH. A short card asks first, right after a moment that explains
// itself: the first message sent, the first reminder set, the first booking
// made. Each moment asks once (it is used up when the card is shown, not when
// the moment happens, so one that falls inside a "Not now" wait can still ask
// later). "Not now" waits 30 days before any moment may ask again. Only the
// card's "Turn on" shows the phone's own prompt.

export type PushAskMoment = "message" | "reminder" | "booking";

/** Notification.permission's values (this file is also compiled without the DOM types). */
export type AskPermission = "default" | "granted" | "denied";

export const PUSH_ASK_MOMENTS: readonly PushAskMoment[] = ["message", "reminder", "booking"];

/** "Not now" waits this long before asking again. */
export const PUSH_ASK_SNOOZE_DAYS = 30;
const DAY_MS = 86_400_000;

export type PushAskState = {
  /** Epoch ms until which nothing asks; null when not waiting. */
  snoozedUntil: number | null;
  /** The moments whose card has been shown. */
  shown: PushAskMoment[];
};

export const EMPTY_PUSH_ASK: PushAskState = { snoozedUntil: null, shown: [] };

/**
 * Whether `moment` may show the card now: the app can receive push, the phone
 * hasn't been asked yet ("default"; granted or denied is the phone's answer
 * and Settings covers it), the moment hasn't asked before, and no "Not now"
 * is waiting.
 */
export function mayAsk(
  state: PushAskState,
  moment: PushAskMoment,
  now: number,
  device: { supported: boolean; permission: AskPermission },
): boolean {
  if (!device.supported || device.permission !== "default") return false;
  if (state.shown.includes(moment)) return false;
  return state.snoozedUntil === null || now >= state.snoozedUntil;
}

export function markShown(state: PushAskState, moment: PushAskMoment): PushAskState {
  return state.shown.includes(moment) ? state : { ...state, shown: [...state.shown, moment] };
}

export function snooze(state: PushAskState, now: number): PushAskState {
  return { ...state, snoozedUntil: now + PUSH_ASK_SNOOZE_DAYS * DAY_MS };
}

/** The stored value -> a state; anything unreadable is a fresh start. */
export function parsePushAsk(raw: string | null): PushAskState {
  if (!raw) return EMPTY_PUSH_ASK;
  try {
    const v = JSON.parse(raw) as { snoozedUntil?: unknown; shown?: unknown };
    const snoozedUntil = typeof v.snoozedUntil === "number" && Number.isFinite(v.snoozedUntil) ? v.snoozedUntil : null;
    const shown = Array.isArray(v.shown) ? PUSH_ASK_MOMENTS.filter((m) => (v.shown as unknown[]).includes(m)) : [];
    return { snoozedUntil, shown };
  } catch {
    return EMPTY_PUSH_ASK;
  }
}
