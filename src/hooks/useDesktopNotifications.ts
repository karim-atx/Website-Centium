import { useEffect } from "react";
import { supabase } from "../../lib/supabase/client";
import { desktop } from "../platform/desktop";
import { desktopNoticeFor, type DeliveredRow, type NoticeTable } from "../platform/desktopNoticeModel";

/**
 * Windows notifications in the desktop app, from the same rows the Database
 * pushes to phones and browsers (platform/desktopNoticeModel says why those).
 *
 * WHY NOT WEB PUSH: the app's window is an embedded browser (WebView2) with no
 * push service behind it, so it cannot hold a push subscription. While the
 * app runs (window or tray) it is signed in and connected, so it watches its
 * own rows over Realtime instead and shows each one as the Database marks it
 * delivered. A fully closed app gets nothing; Windows' own push service
 * (WNS) is the later step for that (Desktop-Centium docs/PLAN.md §7).
 *
 * UPDATE, NOT INSERT: a row is inserted when queued, possibly held for quiet
 * hours or folded into a digest, and becomes a notification when
 * delivered_at is set. RLS scopes Realtime to the account's own rows; the
 * filter just saves the server work. Needs both tables in the
 * supabase_realtime publication (Database: desktop_notifications_realtime).
 *
 * ONCE PER ROW: an id already shown this session is not shown again, whatever
 * else updates on it later.
 *
 * KEPT AWAKE WHILE HIDDEN: in the tray the page is hidden, and Chromium
 * freezes hidden pages after a while, which would let the Realtime socket
 * lapse. A held Web Lock keeps the page out of freezing.
 */
export function useDesktopNotifications(userId: string | null): void {
  useEffect(() => {
    const app = desktop();
    if (!app || !userId) return;

    const shown = new Set<string>();
    const show = (table: NoticeTable, row: Partial<DeliveredRow>) => {
      const notice = desktopNoticeFor(table, row);
      if (!notice || !row.id || shown.has(row.id)) return;
      shown.add(row.id);
      void app.notify(notice).catch((e: unknown) => console.warn("[desktop] notify:", e));
    };

    const channel = supabase
      .channel(`desktop-notices:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "message_push_sends", filter: `recipient_id=eq.${userId}` },
        (payload) => show("message_push_sends", payload.new as Partial<DeliveredRow>)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reminder_sends", filter: `user_id=eq.${userId}` },
        (payload) => show("reminder_sends", payload.new as Partial<DeliveredRow>)
      )
      .subscribe();

    let release: (() => void) | undefined;
    if (navigator.locks) {
      void navigator.locks
        .request("centium-desktop-awake", () => new Promise<void>((resolve) => (release = resolve)))
        .catch(() => {});
    }

    return () => {
      release?.();
      // removeChannel rather than unsubscribe, as useCallRealtime.
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
