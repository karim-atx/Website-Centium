import { supabase } from "../../../lib/supabase/client";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import { AuthError } from "@supabase/supabase-js";
import { describeAuthError, isAuthRateLimited } from "./index";
import { passwordChangeOutcome, type ChangeOutcome } from "./passwordChangeLogic";

// Task J: Change password, from Settings → Security.
//
// NO PASSWORD IS EVER LOGGED OR PUT IN A MESSAGE. Errors are mapped from
// GoTrue's codes, never by echoing a request, and nothing here calls
// console.* with an argument that came from a field.

export type VerifyResult =
  | { status: "ok" }
  | { status: "wrong" }
  | { status: "error"; message: string; rateLimited?: boolean };

/**
 * CHECKS THE CURRENT PASSWORD WITHOUT TOUCHING THIS SESSION.
 *
 * signInWithPassword() on the app's client would REPLACE the session it is
 * running on: a new session id, and for a two-factor account a drop from aal2
 * to aal1, after which GoTrue refuses the password update until a code is
 * entered again. So the check is a password grant over plain REST whose
 * session is thrown away at once (logout, scope local, which ends only that
 * one). The app's own session, cookie and listeners never see it.
 *
 * THIS IS A COURTESY, NOT THE CONTROL. Anyone holding a session can call
 * updateUser directly; what actually stops a stolen, older session is
 * Supabase's "Secure password change" (the emailed code below).
 */
export async function verifyCurrentPassword(email: string, password: string, captchaToken?: string): Promise<VerifyResult> {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      // gotrue_meta_security is where supabase-js puts a captcha token; this
      // is a plain REST call, so it is added by hand. Required once the
      // project's auth captcha is on, ignored while it is off.
      body: JSON.stringify(
        captchaToken ? { email, password, gotrue_meta_security: { captcha_token: captchaToken } } : { email, password }
      ),
    });
    const body = (await res.json().catch(() => null)) as
      | { access_token?: string; error_code?: string; code?: string | number; msg?: string; error_description?: string }
      | null;
    if (res.ok && body?.access_token) {
      // Ends the throwaway session only. Best effort: it expires on its own.
      void fetch(`${url}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: { apikey: anonKey, Authorization: `Bearer ${body.access_token}` },
      }).catch(() => {});
      return { status: "ok" };
    }
    const code = body?.error_code ?? (typeof body?.code === "string" ? body.code : undefined);
    if (code === "invalid_credentials") return { status: "wrong" };
    const error = new AuthError(body?.msg ?? body?.error_description ?? "", res.status, code);
    return { status: "error", message: describeAuthError(error), rateLimited: isAuthRateLimited(error) };
  } catch {
    return { status: "error", message: "Couldn't reach Centium. Check your connection and try again." };
  }
}

/**
 * Sets the new password on THIS session. With "Secure password change" on
 * and a session over 24 hours old, GoTrue answers reauthentication_needed;
 * the caller then sends the code (sendReauthenticationCode) and calls this
 * again with it as `code`.
 */
export async function changePassword(newPassword: string, code?: string): Promise<ChangeOutcome> {
  const { error } = await supabase.auth.updateUser(code ? { password: newPassword, nonce: code } : { password: newPassword });
  if (!error) return { status: "ok" };
  return passwordChangeOutcome(error.code) ?? { status: "error", message: describeAuthError(error) };
}

/** Emails the 6-digit code ("Your Centium verification code"). */
export async function sendReauthenticationCode(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.auth.reauthenticate();
  if (error) return { ok: false, message: describeAuthError(error) };
  return { ok: true };
}

/**
 * Signs out every other session and keeps this one.
 *
 * BELT AND BRACES. Measured locally: GoTrue already revokes every other
 * session's refresh token when the password changes, keeping the one that
 * changed it. This asks for the same thing explicitly, so it holds even if a
 * project is configured differently. A failure here does not undo the change,
 * so it is reported as a boolean, not an error.
 */
export async function signOutOtherSessions(): Promise<boolean> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return !error;
}
