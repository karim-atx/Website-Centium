// Market + Share 3.0 · the member inbox (Database 33c0bf5, migration
// 20261210600000): the client notifications page (C-MO.4.10) and the Home
// bell (D-36) here; the business inbox (B-MA.9, Release 2) reads the same
// rows through the same calls with its own kinds and copy table.
// Professionals keep professional_notifications (D-37).

import { t } from "../../i18n/core";
import { marketRpc, type MarketResult } from "../market/rpc";
import { supabase } from "../../../lib/supabase/client";
import { businessIdsToName, parseMarkedCount, parseMemberNotifications, parseUnreadCount, withBusinessNames, type MemberNotification, type NotificationCursor } from "./notificationsModel";

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
    t("Couldn't load your notifications."),
    parseMemberNotifications
  );
  if (!r.ok) return r;
  const items = await namedBusinesses(r.value.slice(0, take));
  return { ok: true, value: { items, more: r.value.length > take } };
}

/**
 * Round F2 · AB4: the no-show notices carry only business_id, so the
 * business's name is read (business_profiles is public for an active
 * business) and joined into the payload. A failed or empty read leaves the
 * rows as they are: their lines then say "there" instead of the name.
 */
async function namedBusinesses(items: MemberNotification[]): Promise<MemberNotification[]> {
  const ids = businessIdsToName(items);
  if (ids.length === 0) return items;
  type Loose = { from: (t: string) => { select: (c: string) => { in: (col: string, v: string[]) => PromiseLike<{ data: { id: string; business_name: string | null }[] | null; error: unknown }> } } };
  try {
    const { data, error } = await (supabase as unknown as Loose).from("business_profiles").select("id, business_name").in("id", ids);
    if (error || !data) return items;
    return withBusinessNames(items, new Map(data.flatMap((b) => (b.business_name?.trim() ? [[b.id, b.business_name.trim()] as [string, string]] : []))));
  } catch {
    return items;
  }
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
    ids ? t("Couldn't update this notification.") : t("Couldn't mark your notifications as read."),
    parseMarkedCount
  );
}

/**
 * my_unread_notification_count(p_kinds): how many unread rows, for `kinds`
 * (omitted / null = every kind), capped at 99 by the server (unreadBadge
 * shows "99+" there).
 */
export function fetchUnreadNotificationCount(kinds?: readonly string[] | null): Promise<MarketResult<number>> {
  return marketRpc("my_unread_notification_count", { p_kinds: kindsArg(kinds) }, t("Couldn't check your notifications."), parseUnreadCount);
}
