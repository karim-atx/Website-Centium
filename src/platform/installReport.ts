// "This sign-in is on this install" (Database DB-Z1, report_app_install).
//
// The app's per-install id goes to the server once per session, right after
// signing in (once the profile row exists, see reportInstallOnce), so the new-sign-in email and the shared-sign-in rule tell two
// identical phones on one network apart. The id comes from the app's own
// storage (CentiumNative.installId) and is never put in the user agent.
//
// ONCE PER SESSION: the session is the access token's `session_id` claim,
// which a token refresh keeps. The server keeps the first report for a
// session anyway, so a repeat after a reload costs one ignored call; the
// remembered id only saves it.
import { supabase } from "../../lib/supabase/client";
import { isNative } from "./index";
import { CentiumNative } from "./native";
import { jwtSessionId } from "./sessionClaims";

type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ error: { message: string } | null }> };

const KEY = "centium.installReportedSession";

function reported(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let pending: string | null = null;

async function report(sessionId: string): Promise<void> {
  const { id } = await CentiumNative.installId();
  const { error } = await (supabase as unknown as Rpc).rpc("report_app_install", { p_device_id: id });
  if (error) throw new Error(error.message);
  try {
    localStorage.setItem(KEY, sessionId);
  } catch {
    // Not remembered: the next launch reports again and the server ignores it.
  }
}

/**
 * Reports this install for the session, once. Does nothing in a browser.
 *
 * Called by AppContext AFTER the account's profiles row is ensured, never
 * straight from the auth event: app_session_installs references profiles(id),
 * so on a brand-new account a report sent with the sign-in fails that foreign
 * key (409). An administrator has no profiles row and so reports nothing.
 * Never awaited; a failure is logged and tried again on the next auth event.
 */
export function reportInstallOnce(accessToken: string | null | undefined): void {
  if (!isNative()) return;
  const sessionId = jwtSessionId(accessToken);
  if (!sessionId || sessionId === reported() || sessionId === pending) return;
  pending = sessionId;
  report(sessionId)
    .catch((e: unknown) => console.warn("[install-report]", e instanceof Error ? e.message : e))
    .finally(() => {
      pending = null;
    });
}
