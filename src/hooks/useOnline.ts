import { useSyncExternalStore } from "react";
import { onSessionReach, sessionUnreachable } from "../../lib/supabase/sessionReach";

/**
 * Whether the browser currently believes it has a network connection.
 *
 * `navigator.onLine` IS NOT A CONNECTIVITY CHECK, and this hook is named for
 * what it can actually tell you. The browser reports `true` whenever an
 * interface is up — a wifi network that requires a login, a router with no
 * route to the internet, and a captive portal all read as online. So `true`
 * means "not obviously offline", never "requests will succeed".
 *
 * That asymmetry is why nothing in this app gates a write on this value. Every
 * write still attempts and still reports its own failure, because the case
 * this hook cannot see — connected to something that cannot reach Supabase —
 * is exactly the case where refusing to try would strand the user. `false` is
 * the trustworthy direction: when the browser says it is offline, it is.
 *
 * Used for telling the user what is going on, not for deciding what to do.
 *
 * useSyncExternalStore rather than useState with an effect, because that is
 * precisely what this is: a subscription to a value the browser owns. It also
 * removes a real edge case rather than only a lint warning — with an effect,
 * an `online`/`offline` event firing between the initial read and the
 * subscription is missed, and being edge-triggered, the stale value persists
 * until the next transition. React re-reads the snapshot on subscribe.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  const stopReach = onSessionReach(onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    stopReach();
  };
}

// ALSO OFFLINE: a stored session whose refresh failed on the network
// (lib/supabase/sessionReach, Karim 2026-11-10). That failure is the
// trustworthy direction too — a request genuinely didn't get through — and
// while it lasts every data request fails as offline, so the offline bar and
// every screen that reads this say so, as they would with the cable out.
const getSnapshot = (): boolean => navigator.onLine && !sessionUnreachable();

// Assume online when there is no navigator to ask. Anything rendered without a
// browser is not going to be shown an offline banner, and defaulting the other
// way would put one in front of every such render.
const getServerSnapshot = (): boolean => true;

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
