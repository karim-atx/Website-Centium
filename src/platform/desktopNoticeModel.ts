// Which row becomes which Windows notification in the desktop app
// (hooks/useDesktopNotifications). Pure, so it is tested on its own.
//
// THE DATABASE ALREADY DECIDED EVERYTHING. message_push_sends and
// reminder_sends rows carry the title and body the push functions send
// verbatim, after quiet hours (held_until), digests (summarised_into), the
// account's switches and the preview / neutral-wording choices. The desktop
// app shows a row when the Database marks it delivered, exactly as a phone
// or a browser would have received it, and adds nothing of its own: no second
// place where the privacy decision lives.

import type { DesktopNotice } from "./desktop";

export type NoticeTable = "message_push_sends" | "reminder_sends";

/** The columns read here; both tables have them. */
export interface DeliveredRow {
  id: string;
  title: string;
  body: string;
  delivered_at: string | null;
  summarised_into: string | null;
}

/** The notification for a row, or null when the row isn't one to show (yet). */
export function desktopNoticeFor(
  table: NoticeTable,
  row: Partial<DeliveredRow> | null | undefined
): DesktopNotice | null {
  if (!row || typeof row.id !== "string" || typeof row.title !== "string") return null;
  // Not yet sent (queued or held), or folded into a digest that comes separately.
  if (!row.delivered_at || row.summarised_into) return null;
  const body = typeof row.body === "string" && row.body ? row.body : null;
  if (table === "message_push_sends") {
    return {
      title: row.title,
      body,
      // Where the phone app's message push lands (send-message-push).
      path: `/app/messages?push=${encodeURIComponent(row.id)}`,
      // ONE WINDOWS NOTIFICATION PER MESSAGE. Realtime doesn't deliver
      // message_push_sends.chat_group (a generated column), so the desktop app
      // can't collapse a chat's messages into one notification the way the
      // web's service worker does (services/push/collapse); each row keeps its
      // own tag. Quiet hours and digests still apply (above).
      tag: `push-${row.id}`,
    };
  }
  return {
    title: row.title,
    body,
    // The reminder's own link is worked out by send-reminder-push and isn't
    // on the row; a click brings the app forward where it was.
    path: null,
    tag: `reminder-${row.id}`,
  };
}
