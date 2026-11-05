// Round I · FG: the account's standing, and verifying the email (./model has
// the rules). In shadow mode the server always answers 'ok'.

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { parseStanding, STANDING_OK, type AccountStanding } from "./model";

export * from "./model";

// Not in the generated types yet (Database Round I is newer than database.types.ts).
type Rpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };

/** my_account_standing(); 'ok' when it can't be read (signed out, offline, a database before Round I). */
export async function fetchAccountStanding(): Promise<AccountStanding> {
  try {
    const { data, error } = await (supabase as unknown as Rpc).rpc("my_account_standing");
    return error ? STANDING_OK : parseStanding(data);
  } catch {
    return STANDING_OK;
  }
}

/** The standing, read once per mount. 'ok' until it arrives, so nothing flashes. */
export function useAccountStanding(enabled = true): AccountStanding {
  const [standing, setStanding] = useState<AccountStanding>(STANDING_OK);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchAccountStanding().then((s) => live && setStanding(s));
    return () => {
      live = false;
    };
  }, [enabled]);
  return standing;
}

/**
 * Sends the sign-up confirmation email again (Supabase Auth). The Auth server
 * asks for a Turnstile token on this as on every email call (AuthStep's
 * resend), so the caller passes one when a site key is set. True when accepted.
 */
export async function resendVerificationEmail(email: string, captchaToken?: string): Promise<boolean> {
  const { error } = await supabase.auth.resend({ type: "signup", email, options: captchaToken ? { captchaToken } : undefined });
  return !error;
}
