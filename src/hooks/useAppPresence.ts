import { useEffect } from "react";
import { supabase } from "../../lib/supabase/client";
import { PRESENCE_INTERVAL_MS, presenceWanted } from "./presenceRule";

/**
 * "I'm looking at the app" (Round C Release 2, Database 20261221100000
 * report_app_active()). While a tab is visible AND focused it reports every
 * 35 seconds; the server then queues no message push for this account for
 * 60 seconds, because the app already shows the message (the in-app pop-up).
 * That is how the duplicate system notification is avoided in every browser:
 * the service worker still shows every push it receives, as browsers require.
 *
 * NEVER IN THE BACKGROUND: hidden, blurred or closed stops the timer, and
 * the last stamp lapses on its own after 60 seconds. The server writes at
 * most once per 15 seconds per account, so the extra call on refocus is free.
 * Nothing is read back; a failed call only means a push may arrive as before.
 */
type Rpc = { rpc: (fn: string) => PromiseLike<{ error: { message: string } | null }> };

export function useAppPresence(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;
    let timer: number | undefined;

    const report = () => {
      void (supabase as unknown as Rpc).rpc("report_app_active").then(({ error }) => {
        if (error) console.warn("[presence] report_app_active:", error.message);
      });
    };
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const sync = () => {
      if (presenceWanted(document.visibilityState, document.hasFocus())) {
        if (timer === undefined) {
          report();
          timer = window.setInterval(report, PRESENCE_INTERVAL_MS);
        }
      } else stop();
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("pagehide", stop);
    };
  }, [userId]);
}
