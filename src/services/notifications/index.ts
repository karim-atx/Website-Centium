// Market + Share 3.0 · the member inbox (Database 33c0bf5, migration
// 20261210600000): the client notifications page (C-MO.4.10) and the Home
// bell (D-36) here; the business inbox (B-MA.9, Release 2) reads the same
// rows through the same calls with its own kinds and copy table.
// Professionals keep professional_notifications (D-37).

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseMarkedCount, parseMemberNotifications, parseUnreadCount, type MemberNotification, type NotificationCursor } from "./notificationsModel";

export * from "./notificationsModel";

export interface NotificationPage {
  items: MemberNotification[];
  /** More rows exist after the last one here. */
  more: boolean;
}

/** my_notifications clamps p_limit to 1..200. */
const SERVER_MAX = 200;

/** A kinds filter as the readers take it: null = every kind. */
const kindsArg = (kinds: readonly string[] | null | undefined): string[] | null => (kinds ? [...kinds] : null);

/**
 * The caller's inbox, newest first, `limit` at a time:
 * my_notifications(p_before, p_limit, p_before_id, p_kinds). `cursor` is
 * notificationCursor() of the rows already shown (null for the first page);
 * `kinds` filters on the server (omitted / null = every kind). One row more
 * than `limit` is asked for, to know whether there is a next page.
 */
export async function fetchMyNotifications(cursor: NotificationCursor | null = null, limit = 30, kinds?: readonly string[] | null): Promise<MarketResult<NotificationPage>> {
  const take = Math.max(1, Math.min(SERVER_MAX - 1, limit));
  const r = await marketRpc(
    "my_notifications",
    { p_before: cursor?.before ?? null, p_limit: take + 1, p_before_id: cursor?.beforeId ?? null, p_kinds: kindsArg(kinds) },
    "Couldn't load your notifications.",
    parseMemberNotifications
  );
  if (!r.ok) return r;
  return { ok: true, value: { items: r.value.slice(0, take), more: r.value.length > take } };
}

/**
 * mark_notifications_read(p_ids, p_kinds): the given rows, or every unread
 * row with null ("Mark all read"), scoped to `kinds` when given — a screen
 * that shows some kinds passes them so its Mark all read never clears another
 * screen's rows. The value is the count that moved.
 */
export function markNotificationsRead(ids: readonly string[] | null, kinds?: readonly string[] | null): Promise<MarketResult<number>> {
  return marketRpc(
    "mark_notifications_read",
    { p_ids: ids ? [...ids] : null, p_kinds: kindsArg(kinds) },
    ids ? "Couldn't update this notification." : "Couldn't mark your notifications as read.",
    parseMarkedCount
  );
}

/**
 * my_unread_notification_count(p_kinds): how many unread rows, for `kinds`
 * (omitted / null = every kind), capped at 99 by the server (unreadBadge
 * shows "99+" there).
 */
export function fetchUnreadNotificationCount(kinds?: readonly string[] | null): Promise<MarketResult<number>> {
  return marketRpc("my_unread_notification_count", { p_kinds: kindsArg(kinds) }, "Couldn't check your notifications.", parseUnreadCount);
}
