import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { useApp } from "./AppContext";
import { useUnread } from "./UnreadContext";
import { useInboxRealtime } from "../hooks/useInboxRealtime";
import { fetchUnreadNotificationCount } from "../services/notifications";
import { badgeCount } from "../platform/badgeModel";
import { setAppBadge } from "../platform/nativeShell";

/**
 * Keeps the app icon's badge (App-Centium #43, native only) at the number a
 * push sets: the unread inbox (my_unread_notification_count, every kind) plus
 * the unread messages (UnreadContext's total, my_conversations()'s
 * unread_count summed), at most 99 (badgeModel). Sent whenever either changes,
 * 0 included; again on resume (a push may have set it meanwhile, and the
 * counts are re-read); 0 when signed out. Renders nothing.
 */
export function AppBadgeSync(): null {
  const { authUserId } = useApp();
  const { total: messages, refresh } = useUnread();
  // The inbox count, tagged with the account it was read for, so another
  // account's count is never used (it reads as "not read yet" instead).
  const [read, setRead] = useState<{ user: string; n: number } | null>(null);
  const inbox = read && read.user === authUserId ? read.n : null;
  // The latest values, for the resume handler's forced send.
  // (refresh is a new function each render, so the resume listener reads it here.)
  const latest = useRef({ inbox: null as number | null, messages: 0, signedIn: false, refresh });
  useEffect(() => {
    latest.current = { inbox, messages, signedIn: !!authUserId, refresh };
  });

  // One read of the inbox count; a failed read keeps the last count rather
  // than dropping the inbox part.
  const readInbox = useCallback((): Promise<number | null> => {
    if (!authUserId) return Promise.resolve(null);
    return fetchUnreadNotificationCount().then((r) => {
      if (!r.ok) return latest.current.inbox;
      setRead({ user: authUserId, n: r.value });
      return r.value;
    });
  }, [authUserId]);

  // Read on sign-in and whenever a notice arrives or is marked read (any kind).
  const [tick, setTick] = useState(0);
  useInboxRealtime(authUserId, "app-badge", null, () => setTick((n) => n + 1));
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    fetchUnreadNotificationCount().then((r) => {
      if (live && r.ok) setRead({ user: authUserId, n: r.value });
    });
    return () => {
      live = false;
    };
  }, [authUserId, tick]);

  // Back in the foreground: re-read both and send the result even if unchanged.
  useEffect(() => {
    const handle = App.addListener("resume", () => {
      latest.current.refresh();
      void readInbox().then((n) => {
        const l = latest.current;
        if (!l.signedIn) setAppBadge(0, true);
        else if (n !== null) setAppBadge(badgeCount(n, l.messages), true);
      });
    });
    return () => void handle.then((h) => h.remove());
  }, [readInbox]);

  useEffect(() => {
    if (!authUserId) {
      setAppBadge(0, true);
      return;
    }
    if (inbox === null) return; // not read yet: wait rather than show messages alone
    setAppBadge(badgeCount(inbox, messages));
  }, [authUserId, inbox, messages]);

  return null;
}
