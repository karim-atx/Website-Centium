import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApp } from "./AppContext";
import { usePoll } from "../hooks/usePoll";
import { fetchUnreadCounts, type UnreadCounts } from "../services/messaging";

/** Background badge, so a slower cadence than an open conversation's 8s. */
const POLL_MS = 30000;

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

  usePoll(() => void load(), POLL_MS, !!authUserId);

  return (
    <UnreadCtx.Provider value={{ ...counts, refresh: () => void load() }}>
      {children}
    </UnreadCtx.Provider>
  );
};

export function useUnread(): UnreadState {
  return useContext(UnreadCtx);
}
