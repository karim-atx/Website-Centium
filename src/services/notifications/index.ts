// Market + Share 3.0 · W2 · the client notifications inbox (C-MO.4.10, D-36).
// awaiting DB stage DB6: the member inbox (notifications, my_notifications,
// mark_notification_read, mark_all_notifications_read) isn't on the server
// yet; until it is every call is `pending`, the page shows its empty state
// and the Home bell has no unread dot. Professionals keep
// professional_notifications (D-37); this is the member scope only.

import { marketRpc, type MarketResult } from "../market/rpc";
import { parseNotifications, type AppNotification } from "./notificationsModel";

export * from "./notificationsModel";

/** my_notifications('member', null, p_before, p_limit), newest first. */
export function fetchMyNotifications(before: string | null = null, limit = 50): Promise<MarketResult<AppNotification[]>> {
  // awaiting DB stage DB6
  return marketRpc("my_notifications", { p_scope: "member", p_business_id: null, p_before: before, p_limit: limit }, "Couldn't load your notifications.", parseNotifications);
}

export function markNotificationRead(id: string): Promise<MarketResult<null>> {
  // awaiting DB stage DB6
  return marketRpc("mark_notification_read", { p_id: id }, "Couldn't update this notification.", () => null);
}

export function markAllNotificationsRead(): Promise<MarketResult<null>> {
  // awaiting DB stage DB6
  return marketRpc("mark_all_notifications_read", { p_scope: "member", p_business_id: null }, "Couldn't mark your notifications as read.", () => null);
}
