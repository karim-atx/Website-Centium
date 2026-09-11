import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApp } from "./AppContext";
import { usePoll } from "../hooks/usePoll";
import { useUnreadRealtime } from "../hooks/useUnreadRealtime";
import { fetchUnreadCounts, type UnreadCounts } from "../services/messaging";

/**
 * How often the badge re-counts WHEN REALTIME IS NOT DELIVERING.
 *
 * The fallback interval, not the normal one, and the value this context polled
 * at unconditionally before it subscribed. Slower than an open conversation's
 * 8s because a badge is background: nobody is waiting on it the way they wait
 * on a reply.
 */
const FALLBACK_POLL_MS = 30000;

/**
 * A slow re-count that runs EVEN WHILE REALTIME IS LIVE.
 *
 * Same belt-and-braces as ThreadView's, for the same reason and at the same
 * value: a socket can report SUBSCRIBED and then deliver nothing, which from
 * the client is indistinguishable from nobody having written to you. A fallback
 * keyed on subscription STATUS cannot catch that, because the status says
 * everything is fine.
 *
 * Note this is SLOWER than the fallback, which reads backwards until you see
 * why: 30s is what the badge costs when it is the only mechanism, 60s is what
 * it costs as insurance behind one that works.
 */
const SAFETY_POLL_MS = 60000;

interface UnreadState extends UnreadCounts {
  /** Re-reads immediately. Called after marking a thread read. */
  refresh: () => void;
}

const UnreadCtx = createContext<UnreadState>({ byThread: {}, total: 0, refresh: () => {} });

/**
 * Unread message counts, available anywhere inside the app shell.
 *
 * ITS OWN CONTEXT RATHER THAN AppContext, deliberately. AppContext is already
 * three thousand lines and one enormous memo whose dependency list has been a
 * source of bugs; adding a value that changes every thirty seconds to it would
 * re-render the entire application on a cadence, to update a badge. This
 * touches only what subscribes to it.
 *
 * POLLED AT THE SHELL, NOT ON THE MESSAGES PAGE, which is the whole reason it
 * exists. `fetchThreads` already knows what is unread, but it only runs while
 * someone is looking at their conversations — and the point of a badge is to be
 * seen from the dashboard by someone who does not yet know a message arrived.
 *
 * REFRESH EXISTS BECAUSE THIRTY SECONDS IS TOO LONG FOR A CLEAR. Opening a
 * thread marks it read straight away, and a badge still showing "2" over an
 * open, fully-read conversation reads as broken rather than as merely stale.
 * ThreadView calls refresh() once the marking has actually happened, so the
 * badge disappears on the same interaction that earned it.
 *
 * The poll is visibility-aware through usePoll: a backgrounded tab stops, and
 * fires once immediately on return, which is exactly when the count is most
 * out of date.
 */
export const UnreadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUserId } = useApp();
  const [counts, setCounts] = useState<UnreadCounts>({ byThread: {}, total: 0 });

  const load = useCallback(async () => {
    if (!authUserId) {
      // Signed out: no counts rather than the previous account's. This runs on
      // sign-out too, so one person's unread total never lingers on the next
      // person's screen in the same browser.
      setCounts({ byThread: {}, total: 0 });
      return;
    }
    setCounts(await fetchUnreadCounts(authUserId));
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live arrivals across every conversation. The subscription re-reads through
  // the same load() the poll and refresh() use, so there is no second path to
  // keep in step — a message arriving live and one found by a poll produce the
  // identical count.
  const realtime = useUnreadRealtime(authUserId, () => void load());

  // One poll, two speeds. The interval changes with the subscription's status
  // rather than the poll being switched off, because a socket that reports
  // SUBSCRIBED and then goes quiet would leave no mechanism at all.
  usePoll(
    () => void load(),
    realtime === "live" ? SAFETY_POLL_MS : FALLBACK_POLL_MS,
    !!authUserId
  );

  return (
    <UnreadCtx.Provider value={{ ...counts, refresh: () => void load() }}>
      {children}
    </UnreadCtx.Provider>
  );
};

export function useUnread(): UnreadState {
  return useContext(UnreadCtx);
}
