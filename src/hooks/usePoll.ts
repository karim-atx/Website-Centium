import { useEffect, useRef } from "react";

/**
 * Runs `task` on an interval, only while the tab is visible.
 *
 * POLLING BECAUSE REALTIME DOES NOT DELIVER, not because it is simpler.
 * Subscribing to `postgres_changes` on this project reports `SUBSCRIBED` and
 * then delivers nothing — proven by subscribing, performing a real insert and
 * receiving zero events. The tables are not in the `supabase_realtime`
 * publication. That failure is invisible from the client: the subscription
 * status says success, so messaging built on it would look correct in review
 * and silently never arrive. Moving to Realtime needs a Database migration
 * first; until then this is the delivery mechanism rather than a placeholder
 * for one.
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
