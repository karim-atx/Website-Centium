// The options a web push is shown with (src/sw.ts showNotification). Pure:
// no worker globals, so the rules are unit-tested on their own.
//
// FW (Batch C item 34, from FX): THE PAYLOAD'S `family` decides how a
// notification behaves. The Database adds it to every web push, with the same
// value as the Android channel_id (calls, messages, safety, reminders,
// community, professional, business, bookings, account). With it:
//   - vibrate: every family is something a person asked to hear about, so
//     each gets a short pattern; a call a longer, ringing one.
//   - requireInteraction: calls and safety alerts stay on screen until they
//     are dealt with, rather than sliding away after a few seconds.
//   - renotify: wherever a tag is REUSED (a notification with that tag is on
//     screen now), so the replacement alerts again instead of updating
//     silently. Chats as before: always, on their chat tag.
//
// WITHOUT `family` (today's payloads, and any older sender) the options are
// exactly today's: no vibrate, no requireInteraction, renotify only for a
// chat. The one exception is a call, which is safe to infer: send-push has
// marked every call payload `type: "incoming_call"` since 20260914, and
// nothing else sends that type. Nothing else is guessed from a title, a tag
// or a url. So this works the same before and after the Database ships
// `family`, and gains the new behaviour per family as it arrives.

export const PUSH_FAMILIES = ["calls", "messages", "safety", "reminders", "community", "professional", "business", "bookings", "account"] as const;
export type PushFamily = (typeof PUSH_FAMILIES)[number];

/** A short buzz for anything a person chose to hear about. */
export const VIBRATE_SHORT: readonly number[] = [120, 60, 120];
/** A call rings: three long pulses. */
export const VIBRATE_CALL: readonly number[] = [500, 250, 500, 250, 500];

/**
 * The payload's family, or null when absent or not one we know (never a
 * guess). Confirmed with the Database session: a top-level "family" beside
 * title, body, url and tag; exactly one of the nine values, no _vN suffix;
 * sent by all three senders (reminders, messages, calls); calendar alerts
 * arrive as "reminders". Matched exactly: no trimming or case folding.
 */
export function readFamily(raw: Record<string, unknown>): PushFamily | null {
  const f = raw.family;
  return typeof f === "string" && (PUSH_FAMILIES as readonly string[]).includes(f) ? (f as PushFamily) : null;
}

/** The family to act on: the payload's own, else only what is certain (a call). */
export function effectiveFamily(raw: Record<string, unknown>): PushFamily | null {
  return readFamily(raw) ?? (raw.type === "incoming_call" ? "calls" : null);
}

/** NotificationOptions plus the three fields the DOM lib leaves out. */
export type PushNotificationOptions = {
  body: string;
  icon: string;
  badge: string;
  tag?: string;
  renotify: boolean;
  vibrate?: number[];
  requireInteraction?: boolean;
  data: { url: string; count: number };
};

export function pushNotificationOptions(input: {
  family: PushFamily | null;
  body: string;
  /** The app icon, with its cache-buster. */
  icon: string;
  url: string;
  count: number;
  /** The chat's collapse tag (collapseTag), when this is a chat message. */
  chatTag?: string;
  /** The payload's own tag. */
  tag?: string;
  /** A notification with this push's tag is on screen now (sw.ts reads getNotifications). */
  tagShown: boolean;
}): PushNotificationOptions {
  const tag = input.chatTag ?? input.tag;
  const options: PushNotificationOptions = {
    body: input.body,
    icon: input.icon,
    badge: input.icon,
    tag,
    // Without this a replaced notification updates silently. A chat always
    // (as before); with a family, any reused tag. renotify needs a tag.
    renotify: !!input.chatTag || (input.family !== null && !!tag && input.tagShown),
    data: { url: input.url, count: input.count },
  };
  if (input.family) {
    options.vibrate = [...(input.family === "calls" ? VIBRATE_CALL : VIBRATE_SHORT)];
    if (input.family === "calls" || input.family === "safety") options.requireInteraction = true;
  }
  return options;
}
