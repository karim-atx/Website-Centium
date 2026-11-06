// A push that arrives while Centium is open (follow-up to Round J's J2, #86).
// The phone shows nothing then: the push plugin hands it to the page
// (pushNotificationReceived) and the server has already counted it delivered,
// so PushBanner shows it in the app. Pure, so it is tested on its own.
//
// NOT EVERY PUSH: a call keeps its ringing screen, and a message has the chat
// pop-up (MessagePopupToast; the server doesn't push a message to somebody
// active in the app anyway).
//
// THE TEXT IS THE PUSH'S OWN. The server wrote it in the account's language,
// and with "Hide details on lock screen" on it is already the neutral line,
// so the banner never shows more than the notification would have.
// Recovery-sensitive mode swaps it for that neutral line too (PushBanner).
import { appPathFrom } from "./openPathModel";

/** The plugin's pushNotificationReceived, as far as the banner reads it. */
export type ReceivedPush = { id?: string; title?: string; body?: string; data?: Record<string, unknown> };

export type PushBannerCard = {
  /** The same push again replaces its card. */
  key: string;
  title: string;
  line: string;
  /** Where a tap goes: the push's own link (an /app path), else Home. */
  path: string;
  /** reminder_sends.id, for the neutral text in recovery-sensitive mode. */
  notificationId: string | null;
};

/** send-push's call and send-message-push's message: never a banner. */
export const NO_BANNER_TYPES: ReadonlySet<string> = new Set(["incoming_call", "message"]);

/** At most this many wait behind the one showing; the oldest go first. */
export const MAX_WAITING = 3;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The banner for one push, or null when it gets none. `seq` keys a push with no id. */
export function bannerFromPush(push: ReceivedPush, seq: number): PushBannerCard | null {
  const data = push.data ?? {};
  if (typeof data.type === "string" && NO_BANNER_TYPES.has(data.type)) return null;
  const title = typeof push.title === "string" ? push.title.trim() : "";
  const line = typeof push.body === "string" ? push.body.trim() : "";
  if (!title && !line) return null;
  const notificationId = typeof data.notificationId === "string" && UUID.test(data.notificationId) ? data.notificationId : null;
  return {
    key: notificationId ?? (push.id || `push-${seq}`),
    title: title || "Centium",
    line,
    path: appPathFrom(data.url) ?? "/app",
    notificationId,
  };
}

/** One shows at a time (the front); the same push again replaces its card in place. */
export function enqueueBanner(queue: PushBannerCard[], card: PushBannerCard, maxWaiting = MAX_WAITING): PushBannerCard[] {
  const at = queue.findIndex((c) => c.key === card.key);
  if (at >= 0) return queue.map((c, i) => (i === at ? card : c));
  const next = [...queue, card];
  // The showing card stays; the oldest waiting ones make room.
  return next.length > maxWaiting + 1 ? [next[0], ...next.slice(next.length - maxWaiting)] : next;
}
