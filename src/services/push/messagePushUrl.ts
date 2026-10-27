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
 * A CALL NOTIFICATION OPENS THE CALL. send-push names it `/calls/{callId}`, a
 * path the app never had (it was the marketing 404); the app's own route is
 * /app/calls/{callId} (CallLink), which rings if the call is still ringing and
 * opens its conversation either way. Read from `callId` (a uuid only), so a
 * payload still carrying the old url lands right.
 *
 * Anything else uses the payload's `url` when it is a same-origin path (a
 * leading single slash only: "//evil.example" is protocol-relative and would
 * leave the origin), and otherwise the fallback.
 */
export function notificationTarget(raw: Record<string, unknown>, fallback: string): string {
  const extra = typeof raw.data === "object" && raw.data !== null ? (raw.data as Record<string, unknown>) : {};
  const pushId = typeof extra.messagePushId === "string" ? extra.messagePushId.trim() : "";
  if (UUID.test(pushId)) return `/app/messages?push=${pushId}`;
  const callId = typeof raw.callId === "string" ? raw.callId.trim() : "";
  if (raw.type === "incoming_call" && UUID.test(callId)) return `/app/calls/${callId}`;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  return url.startsWith("/") && !url.startsWith("//") ? url : fallback;
}

/** CallLink's next step: whether to ring, and the conversation to open (null: not found, or not theirs). */
export interface CallLinkStep {
  ring: boolean;
  threadId: string | null;
}

/**
 * What a tapped call link does: ring when the call is still ringing for this
 * user as the callee (the Realtime ring went out before the app was open, so
 * it never arrived), and open the call's conversation whatever its status.
 */
export function callLinkStep(row: { status: string; callee_id: string | null; thread_id: string } | null, userId: string | null): CallLinkStep {
  if (!row || !userId) return { ring: false, threadId: null };
  return { ring: row.status === "ringing" && row.callee_id === userId, threadId: row.thread_id };
}

/** A call id from a link, or null when it is not a uuid. */
export const callIdFromLink = (v: string | undefined): string | null => (v && UUID.test(v) ? v : null);
