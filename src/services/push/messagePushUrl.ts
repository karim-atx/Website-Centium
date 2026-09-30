// Where a tapped notification opens. Shared by the service worker (src/sw.ts)
// and its test; no browser or worker globals, so both can import it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The path a notification opens, from its raw push payload.
 *
 * A MESSAGE NOTIFICATION OPENS ITS CONVERSATION. send-message-push carries only
 * the push's own id (`data.messagePushId`), never who wrote or which thread;
 * the Messages page resolves the thread with a query the signed-in recipient
 * may make. Only a uuid is accepted, so nothing else can be smuggled into the
 * path.
 *
 * Anything else uses the payload's `url` when it is a same-origin path (a
 * leading single slash only: "//evil.example" is protocol-relative and would
 * leave the origin), and otherwise the fallback.
 */
export function notificationTarget(raw: Record<string, unknown>, fallback: string): string {
  const extra = typeof raw.data === "object" && raw.data !== null ? (raw.data as Record<string, unknown>) : {};
  const pushId = typeof extra.messagePushId === "string" ? extra.messagePushId.trim() : "";
  if (UUID.test(pushId)) return `/app/messages?push=${pushId}`;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  return url.startsWith("/") && !url.startsWith("//") ? url : fallback;
}
