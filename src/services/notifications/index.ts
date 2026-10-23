// Market + Share 3.0 · the member inbox (Database 2a5b122, migration
// 20261210600000): the client notifications page (C-MO.4.10) and the Home
// bell (D-36) here; the business inbox (B-MA.9, Release 2) reads the same
// rows through the same calls with its own copy table. Professionals keep
// professional_notifications (D-37).

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseMarkedCount, parseMemberNotifications, type MemberNotification, type NotificationCursor } from "./notificationsModel";

export * from "./notificationsModel";

export interface NotificationPage {
  items: MemberNotification[];
  /** More rows exist after the last one here. */
  more: boolean;
}

/** my_notifications clamps p_limit to 1..200. */
const SERVER_MAX = 200;

/**
 * The caller's inbox, newest first, `limit` at a time:
 * my_notifications(p_before, p_limit, p_before_id). `cursor` is
 * notificationCursor() of the rows already shown (null for the first page).
 * One row more than `limit` is asked for, to know whether there is a next page.
 */
export async function fetchMyNotifications(cursor: NotificationCursor | null = null, limit = 30): Promise<MarketResult<NotificationPage>> {
  const take = Math.max(1, Math.min(SERVER_MAX - 1, limit));
  const r = await marketRpc(
    "my_notifications",
    { p_before: cursor?.before ?? null, p_limit: take + 1, p_before_id: cursor?.beforeId ?? null },
    "Couldn't load your notifications.",
    parseMemberNotifications
  );
  if (!r.ok) return r;
  return { ok: true, value: { items: r.value.slice(0, take), more: r.value.length > take } };
}

/**
 * mark_notifications_read(p_ids): the given rows, or every unread row with
 * null ("Mark all read"). The value is the count that moved.
 */
export function markNotificationsRead(ids: readonly string[] | null): Promise<MarketResult<number>> {
  return marketRpc(
    "mark_notifications_read",
    { p_ids: ids ? [...ids] : null },
    ids ? "Couldn't update this notification." : "Couldn't mark your notifications as read.",
    parseMarkedCount
  );
}
