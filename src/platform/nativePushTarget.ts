// Batch D GA · where a tapped NATIVE notification opens. Pure, so it is
// tested on its own (nativePushTarget.test.ts).
//
// The phone app used to read only `data.url`. A message push carries no url,
// only its own id (`messagePushId`, send-message-push), and a call push names
// its call (`type: "incoming_call"`, `callId`); the web service worker already
// turns those into /app/messages?push=<id> and /app/calls/<id>
// (notificationTarget). This hands the native payload to that same function,
// so the two never disagree.
//
// The native payload is flat (FCM / APNs data: every key at the top), where
// the web push nests the message id under `data`; both shapes are read, and a
// `data` sent as a JSON string (FCM data values are strings) is read too.
// Whatever comes out still goes through NativeOpenPath (appPathFrom), which
// opens only /app paths.
import { notificationTarget } from "../services/push/messagePushUrl";

const objectOf = (v: unknown): Record<string, unknown> | null => {
  if (typeof v === "string") {
    try {
      return objectOf(JSON.parse(v));
    } catch {
      return null;
    }
  }
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
};

/** The link a tapped native notification opens, or null when it names none. */
export function nativePushTarget(data: unknown): string | null {
  const d = objectOf(data);
  if (!d) return null;
  const raw = { ...d, data: { ...d, ...(objectOf(d.data) ?? {}) } };
  // As before this change, a url that isn't a same-origin path is still handed
  // on (and NativeOpenPath drops it): only what notificationTarget adds is new.
  const fallback = typeof d.url === "string" ? d.url : "";
  return notificationTarget(raw, fallback) || null;
}
