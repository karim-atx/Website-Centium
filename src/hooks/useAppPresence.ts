import { useEffect } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../../lib/supabase/client";
import { isNative } from "../platform";
import { PRESENCE_INTERVAL_MS, presenceErrorIgnorable, presenceQueue, presenceSignal, presenceStep, type PresenceSignal, type PresenceState } from "./presenceRule";

/**
 * "I'm looking at the app" (Round C Release 2, Database 20261221100000
 * report_app_active()). While a tab is visible AND focused it reports every
 * 35 seconds; the server then queues no message push for this account for
 * 60 seconds, because the app already shows the message (the in-app pop-up).
 * That is how the duplicate system notification is avoided in every browser:
 * the service worker still shows every push it receives, as browsers require.
 *
 * AWAY AT ONCE (Database 20261227080000 report_app_away()): hidden, blurred,
 * closed (pagehide) or, in the phone app, paused stops the timer and tells
 * the server straight away, which deletes the stamp, so a message sent next is
 * pushed instead of being skipped for up to 60 seconds. Back in front
 * (visible and focused, or the phone's resume) reports active at once and
 * restarts the timer. Both calls are fire and forget (iOS suspends the web
 * view within seconds of a pause), and their failures are silent: nothing is
 * read back, and before the migration is live report_app_away answers
 * PGRST202, which only means the stamp lapses after 60 s as before.
 */
type RpcError = { code?: string; message: string };
type Rpc = { rpc: (fn: string) => PromiseLike<{ error: RpcError | null; status?: number }> };
type PresenceFn = "report_app_active" | "report_app_away";

function send(fn: PresenceFn): Promise<void> {
  return Promise.resolve((supabase as unknown as Rpc).rpc(fn)).then(
    ({ error, status }) => {
      if (error && !presenceErrorIgnorable({ ...error, status })) console.warn(`[presence] ${fn}:`, error.message);
    },
    () => undefined
  );
}

// Every presence call goes through one queue, in order (#145 follow-up): an
// "away" is sent once any "active" still in flight has answered (3 s at most),
// so the active can't land after it and recreate the stamp; an "active" after
// coming back likewise follows the away.
const enqueue = presenceQueue((fn) => send(fn as PresenceFn));
const call = (fn: PresenceFn): Promise<void> => enqueue(fn);

/**
 * Sign-out: away before the session ends, so the account's stamp doesn't keep
 * this person's message pushes quiet for a minute. Best effort, capped.
 */
export function reportAppAway(capMs = 1500): Promise<void> {
  return Promise.race([call("report_app_away"), new Promise<void>((resolve) => setTimeout(resolve, capMs))]);
}

export function useAppPresence(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    let timer: number | undefined;
    let state: PresenceState = "unknown";

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const apply = (signal: PresenceSignal) => {
      const step = presenceStep(state, signal);
      state = step.next;
      if (signal === "front" && timer === undefined) timer = window.setInterval(() => void call("report_app_active"), PRESENCE_INTERVAL_MS);
      if (signal === "left") stop();
      if (step.action === "active") void call("report_app_active");
      else if (step.action === "away") void call("report_app_away");
    };
    const sync = () => apply(presenceSignal(document.visibilityState, document.hasFocus()));
    const left = () => apply("left");

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("pagehide", left);
    // The phone app: pause and resume come first and surely (visibilitychange
    // may arrive late, or not at all, once iOS suspends the web view).
    const native = isNative() ? [App.addListener("pause", left), App.addListener("resume", () => apply("front"))] : [];
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("pagehide", left);
      for (const h of native) void h.then((x) => x.remove());
    };
  }, [userId]);
}
