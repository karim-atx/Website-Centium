import { useEffect, useRef } from "react";
import { subscribeToPush } from "../services/push";

/**
 * Re-registers this browser for push once per signed-in session.
 *
 * THE GAP THIS CLOSES, because it is invisible from every surface the user can
 * see. Signing out deletes this browser's push_subscriptions row on purpose —
 * the endpoint is globally unique, so leaving the row behind would lock the
 * next account on this browser out of notifications entirely. But the BROWSER
 * keeps its permission grant and its subscription: those belong to the origin,
 * not to the session. So after signing back in, `Notification.permission` still
 * reads "granted", Settings still says "Granted", and there is no row anywhere
 * for the server to address. The user is silently unreachable, and every signal
 * available to them says otherwise.
 *
 * Until this existed the only thing that ever called subscribeToPush() was the
 * button in Settings, so the fix was "go and press a control you have no reason
 * to think is broken".
 *
 * IT NEVER PROMPTS, and that is the line this must not cross.
 * `Notification.requestPermission()` is not called here and must not be:
 * asking is a user-initiated act that belongs to the Settings button, where a
 * row on screen explains what is being asked and why. This only acts on a
 * grant the browser ALREADY holds — it reconciles the server with the browser,
 * it never negotiates with the user. Someone at "default" or "denied" sees no
 * behaviour change whatsoever.
 *
 * SILENT BY DESIGN. No state, no UI, no error shown. Settings' row remains the
 * visible control and the honest report; a background reconciliation that
 * started throwing messages at someone who did not ask for anything would be
 * worse than the gap. A failure is logged and nothing else.
 */
export function usePushSubscriptionSync(authUserId: string | null): void {
  /** The account this browser has already been reconciled for. */
  const reconciledFor = useRef<string | null>(null);

  useEffect(() => {
    // SIGNED OUT CLEARS THE GUARD, and without this line the fix would not fix
    // the case it was written for. The scenario is sign out, then sign back in
    // as the SAME account — authUserId returns to the value it already held, so
    // a guard that merely remembered "seen this id" would skip the one moment
    // the row actually needs recreating.
    if (!authUserId) {
      reconciledFor.current = null;
      return;
    }

    if (reconciledFor.current === authUserId) return;

    // Feature-detected rather than assumed: `Notification` is absent in some
    // engines and on iOS outside an installed app, where reading `.permission`
    // would throw rather than return "default".
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // THE ONLY GATE THAT MATTERS. "granted" is the browser's existing answer;
    // anything else means there is nothing to reconcile and nothing to ask.
    if (Notification.permission !== "granted") return;

    // CLAIMED BEFORE THE AWAIT, never after. StrictMode double-invokes effects
    // in development, and any re-render landing between the call and its
    // resolution would otherwise fire a second subscribe. Setting it here makes
    // the guard cover the in-flight window too.
    reconciledFor.current = authUserId;

    void (async () => {
      const result = await subscribeToPush(authUserId);
      if (result.status !== "ok") {
        // NOT RETRIED WITHIN THIS SESSION, deliberately. The guard stays
        // claimed, so a transient failure waits for the next sign-in or page
        // load rather than looping. Settings' button is the immediate manual
        // path, and it reports failures properly.
        console.error("[push] Background re-subscribe failed:", result.status, result.message);
      }
    })();
  }, [authUserId]);
}
