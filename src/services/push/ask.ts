// Round J · J-2b: the moments that may ask to turn on notifications in the
// phone app (askModel.ts has the rules). A flow calls pushAskMoment() after
// it succeeded; PushAskCard, mounted once in the app, shows the card.
//
// Kept on this install (localStorage): the question is about this phone's
// permission, not the account.
import { EMPTY_PUSH_ASK, markShown, mayAsk, parsePushAsk, snooze, type PushAskMoment, type PushAskState } from "./askModel";
import { pushPermissionNow, pushSupported } from "./index";

export type { PushAskMoment };

const KEY = "centium.pushAsk";
const listeners = new Set<(moment: PushAskMoment) => void>();

function read(): PushAskState {
  try {
    return parsePushAsk(localStorage.getItem(KEY));
  } catch {
    return EMPTY_PUSH_ASK;
  }
}

function write(state: PushAskState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not kept: the card may ask again at the next moment.
  }
}

/** A moment happened (the first message sent, reminder set, booking made). Asks when the rules allow. */
export function pushAskMoment(moment: PushAskMoment): void {
  if (listeners.size === 0) return;
  const supported = pushSupported();
  const device = { supported, permission: supported ? pushPermissionNow() : ("denied" as const) };
  const state = read();
  if (!mayAsk(state, moment, Date.now(), device)) return;
  write(markShown(state, moment));
  for (const l of listeners) l(moment);
}

/** "Not now": nothing asks for 30 days. */
export function snoozePushAsk(): void {
  write(snooze(read(), Date.now()));
}

export function onPushAsk(listener: (moment: PushAskMoment) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
