// AX, the in-app message pop-up (Round C Release 1, Database
// 20261220010000). Pure: the row message_popup() returns, the words the pill
// shows, and the queue that groups arrivals per thread. No Supabase import,
// so it is unit-tested directly.
//
// THE SERVER DECIDES WHETHER, THIS SIDE DECIDES HOW. message_popup() returns
// no row for a muted, archived, blocked, hidden, cleared, unsent or redacted
// message, for the caller's own, and when "Message pop-ups" is off; preview
// is null when "Show message previews" is off. Nothing here repeats those
// rules: a row means "show it".

export interface MessagePopup {
  messageId: string;
  threadId: string;
  threadKind: string;
  threadName: string | null;
  senderLabel: string | null;
  /** The first line, at most 120 characters; null when previews are off or there is no text. */
  preview: string | null;
  hasAttachment: boolean;
  isVoiceNote: boolean;
  isSupport: boolean;
  createdAt: string;
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** message_popup()'s one row, or null for none (the server's "don't show it"). */
export function parseMessagePopup(data: unknown): MessagePopup | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const messageId = text(r.message_id);
  const threadId = text(r.thread_id);
  const createdAt = text(r.created_at);
  if (!messageId || !threadId || !createdAt) return null;
  return {
    messageId,
    threadId,
    threadKind: text(r.thread_kind) ?? "",
    threadName: text(r.thread_name),
    senderLabel: text(r.sender_label),
    preview: text(r.preview),
    hasAttachment: r.has_attachment === true,
    isVoiceNote: r.is_voice_note === true,
    isSupport: r.is_support === true,
    createdAt,
  };
}

/**
 * The pill's title: "Centium Support" for the support thread (as the chat
 * list names it, whoever answered), "{group} · {sender}" in a group, and the
 * sender (or the thread's name, by my_conversations()'s masking) otherwise.
 */
export function popupTitle(p: MessagePopup): string {
  if (p.isSupport) return "Centium Support";
  if (p.threadKind === "group") {
    const group = p.threadName ?? "Group";
    return p.senderLabel ? `${group} · ${p.senderLabel}` : group;
  }
  return p.senderLabel ?? p.threadName ?? "New message";
}

/** The pill's line: the preview, else what was sent, else "New message". */
export function popupLine(p: MessagePopup): string {
  if (p.preview) return p.preview;
  if (p.isVoiceNote) return "Voice note";
  if (p.hasAttachment) return "Attachment";
  return "New message";
}

export interface PopupCard {
  /** One card per thread while it waits or shows. */
  threadId: string;
  title: string;
  line: string;
  count: number;
  isSupport: boolean;
  /** Changes on every arrival, so a showing pill restarts its hold. */
  stamp: string;
}

/** At most this many threads wait behind the one showing; older ones drop. */
export const POPUP_QUEUE_MAX = 3;

/**
 * Adds an arrival. A thread already waiting or showing gains one ("3 new
 * messages") and keeps its place; a new thread joins the end. Past
 * POPUP_QUEUE_MAX waiting, the oldest waiting card is dropped (the one
 * showing never is): a burst across many threads is what the badge is for.
 */
export function enqueuePopup(queue: readonly PopupCard[], p: MessagePopup): PopupCard[] {
  const i = queue.findIndex((c) => c.threadId === p.threadId);
  if (i >= 0) {
    const c = queue[i];
    const count = c.count + 1;
    const next = { ...c, title: popupTitle(p), line: `${count} new messages`, count, stamp: p.messageId };
    return queue.map((x, j) => (j === i ? next : x));
  }
  const card: PopupCard = { threadId: p.threadId, title: popupTitle(p), line: popupLine(p), count: 1, isSupport: p.isSupport, stamp: p.messageId };
  const out = [...queue, card];
  while (out.length > POPUP_QUEUE_MAX + 1) out.splice(1, 1);
  return out;
}

/**
 * Where the pill must not show: the chat itself (the list, and any thread
 * open inside it), which already shows the message.
 */
export function popupSuppressedAt(pathname: string): boolean {
  return pathname === "/app/messages" || pathname.startsWith("/app/messages/");
}
