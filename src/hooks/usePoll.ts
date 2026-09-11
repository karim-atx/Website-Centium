import { useEffect, useRef } from "react";

/**
 * Runs `task` on an interval, only while the tab is visible.
 *
 * NO LONGER THE PRIMARY DELIVERY MECHANISM FOR MESSAGES, and the history is
 * worth keeping because the failure was invisible. Subscribing to
 * `postgres_changes` used to report `SUBSCRIBED` and then deliver nothing:
 * `public.messages` was not a member of the `supabase_realtime` publication,
 * so no change was ever published. The subscription status said success, which
 * is why messaging built on it would have looked correct in review and silently
 * never arrived. The Database migration `realtime_message_publication` fixed
 * it, and ThreadView now subscribes — see useThreadRealtime.
 *
 * THIS HOOK REMAINS, IN TWO ROLES. It is the fallback when a subscription is
 * not delivering, and a slow safety re-read that runs even when one is, because
 * a socket that reports SUBSCRIBED and stays silent is indistinguishable from a
 * quiet conversation. Other callers — the unread badge — still poll outright.
 *
 * PAUSED WHILE HIDDEN, which is most of the point. A background tab left open
 * overnight would otherwise issue thousands of requests nobody is waiting for.
 * The listener is on `visibilitychange`, and a poll fires immediately on
 * becoming visible rather than waiting out the interval — coming back to a
 * conversation is exactly when the answer is most stale.
 *
 * THE TASK IS HELD IN A REF, so a caller passing an inline closure does not
 * restart the interval on every render. Only `intervalMs` and `enabled` do
 * that, which is what makes "poll while a thread is open" expressible without
 * the caller having to memoise anything.
 */
export function usePoll(task: () => void, intervalMs: number, enabled = true): void {
  const taskRef = useRef(task);
  // Updated in an effect rather than during render. Assigning to a ref while
  // rendering is the usual shorthand for this pattern and is flagged for a
  // real reason — render must stay free of side effects for React to be able
  // to discard and re-run it. An unkeyed effect runs after every commit, which
  // is exactly when the latest closure becomes the one worth keeping.
  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => taskRef.current(), intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Fire once immediately: the value is staler the longer the tab was
        // away, so waiting a full interval is the wrong way round.
        taskRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
