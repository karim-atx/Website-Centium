import { supabase } from "../../../lib/supabase/client";
import type { AuthError, Session } from "@supabase/supabase-js";

// Real Supabase auth, replacing the format-validation-only "prototype auth"
// this screen used to run on. Everything here is a thin wrapper whose job is
// to turn Supabase's error surface into something the UI can show a user
// directly — AuthStep renders the returned `message` verbatim.

/**
 * Where Supabase sends the user back to, for both the email-confirmation
 * link and the Google OAuth callback.
 *
 * Derived from `window.location.origin` so one code path covers every
 * environment — http://localhost:5173 in dev, https://centium.atraxia.org
 * once deployed — instead of a hardcoded host or a dev/prod branch.
 *
 * Each origin must be registered separately outside this codebase:
 *   - Supabase dashboard -> Authentication -> URL Configuration -> Redirect URLs
 *   - Google Cloud console -> OAuth client -> Authorized redirect URIs
 * Only localhost is registered today, so email confirmation and Google
 * sign-in work in local dev and will fail on a deployed build until the
 * production origin is added. That is configuration, not a code bug.
 */
export function authRedirectUrl(): string {
  return `${window.location.origin}/app/onboarding`;
}

/**
 * Where a password-reset link comes back to.
 *
 * Deliberately NOT authRedirectUrl(). That one is shared by signup
 * confirmation and OAuth, both of which legitimately end at onboarding, and
 * sharing it left the destination unable to tell a recovery arrival from an
 * ordinary sign-in — which is how a reset link ended up forwarding people
 * straight to the dashboard.
 */
export function passwordResetRedirectUrl(): string {
  return `${window.location.origin}/app/reset-password`;
}

/** Supabase error -> a sentence worth showing a user. */
function describeAuthError(error: AuthError): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  // Kept separate from the auth-attempt throttle below on purpose. This one
  // is not the user doing anything wrong — it is the project's outbound
  // email quota being exhausted, project-wide, for everyone. Supabase's
  // built-in SMTP sender allows only a handful of messages per hour, so a
  // testing session drains it, and the window is an hour or more rather
  // than the "wait a minute" the generic throttle message promises.
  // The real fix is configuring custom SMTP on the project.
  if (code === "over_email_send_rate_limit") {
    return "We can't send confirmation emails right now — the email limit for this project has been reached. Try again later, or contact support if this persists.";
  }
  if (error.status === 429 || code.startsWith("over_")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }
  if (code === "weak_password") {
    return "That password is too weak — see the checklist below.";
  }
  if (code === "user_already_exists" || /already registered/i.test(message)) {
    return "An account already exists for this email. Try signing in instead.";
  }
  if (code === "validation_failed") {
    return "Check the email and password and try again.";
  }
  return message || "Something went wrong. Try again.";
}

/** The one error the UI must distinguish from a wrong password. */
function isEmailNotConfirmed(error: AuthError): boolean {
  return error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message ?? "");
}

export type SignUpResult =
  | { status: "confirmation_required"; email: string }
  | { status: "signed_in" }
  | { status: "error"; message: string };

/**
 * Email confirmation is REQUIRED on this project, so a successful signUp
 * resolves with `session: null` — the user is created but not logged in
 * until they click the emailed link. The caller must show a "check your
 * email" state rather than advancing as though sign-up logged them in.
 */
export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: authRedirectUrl() },
  });

  if (error) return { status: "error", message: describeAuthError(error) };
  // Belt and braces: if confirmations are ever turned off on the project,
  // signUp returns a live session and we should just proceed.
  if (data.session) return { status: "signed_in" };
  // When the address is already registered Supabase returns a decoy user
  // with an empty `identities` array rather than an error, deliberately, so
  // sign-up can't be used to enumerate accounts. Showing the same
  // "check your email" state preserves that property — and an unconfirmed
  // account does genuinely get the confirmation mail resent.
  return { status: "confirmation_required", email };
}

export type SignInResult =
  | { status: "signed_in" }
  | { status: "email_not_confirmed" }
  | { status: "error"; message: string };

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (isEmailNotConfirmed(error)) return { status: "email_not_confirmed" };
    return { status: "error", message: describeAuthError(error) };
  }
  return { status: "signed_in" };
}

export type OAuthResult = { status: "redirecting" } | { status: "error"; message: string };

/**
 * Google needs no email-confirmation step — Google itself is the
 * verification. This navigates away from the page; the session lands on the
 * return trip and is picked up by the auth listener.
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authRedirectUrl() },
  });

  if (error) return { status: "error", message: describeAuthError(error) };
  return { status: "redirecting" };
}

/**
 * The existing UI already words its confirmation enumeration-safely ("if an
 * account exists..."), which is exactly what resetPasswordForEmail needs.
 */
export async function sendPasswordReset(email: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectUrl(),
  });
  if (error) return { ok: false, message: describeAuthError(error) };
  return { ok: true };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession failed:", error.message);
    return null;
  }
  return data.session;
}

/**
 * Whether a session token is STORED, regardless of whether it can be verified.
 *
 * NOT THE SAME QUESTION AS getCurrentSession(), and conflating the two wiped
 * real users' local data. Offline with an expired access token, getSession()
 * tries to refresh, the request fails, and it returns null with "Failed to
 * fetch" — indistinguishable from a signed-out visitor to any caller reading
 * only the session. It is not the same thing at all: the cookie is still
 * there, the refresh token in it is still valid, and the account signs itself
 * back in the moment there is a network.
 *
 * So this reads the stored token directly and answers only "is there
 * something to restore". It says nothing about whether that token is still
 * accepted by the server — an expired refresh token or a revoked session both
 * still leave a cookie behind — which is exactly why it is used to withhold a
 * DESTRUCTIVE action rather than to grant access. Nothing is unlocked by it;
 * the worst it can do is keep a cache one page load longer than necessary,
 * and the next load with a real answer clears it.
 *
 * Reads cookies rather than localStorage because createBrowserClient manages
 * the session in cookies here and ignores `auth.storage` outright — see the
 * note in lib/supabase/client.ts. Chunked names (`…auth-token.0`) count too.
 */
export function hasStoredSessionToken(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((entry) => {
      const separator = entry.indexOf("=");
      if (separator < 1) return false;
      const name = entry.slice(0, separator);
      const value = entry.slice(separator + 1);
      // A cleared cookie is often left behind as an empty value rather than
      // removed, so presence of the name alone is not enough.
      return /^sb-.+-auth-token(\.\d+)?$/.test(name) && value.length > 0;
    });
}

/**
 * Subscribes to every session change — sign-in, sign-out, token refresh, and
 * the INITIAL_SESSION event fired on load. Returns an unsubscribe function.
 *
 * Preferred over a one-shot getSession() check so the app stays in sync when
 * a session arrives late (returning from the confirmation link or the OAuth
 * round trip) or expires mid-session.
 */
export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/**
 * A SEPARATE subscription, only for PASSWORD_RECOVERY.
 *
 * onAuthChange above deliberately keeps its (session) => void signature:
 * AppContext depends on it for profiles-row creation on every auth path, and
 * widening it would ripple through that. Recovery needs the event type and
 * nothing else, so it gets its own narrow listener rather than reshaping the
 * shared one.
 */
export function onPasswordRecovery(callback: (userId: string) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session?.user) callback(session.user.id);
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Sets a new password for the signed-in (or recovery) session.
 *
 * This is the only thing a recovery session is allowed to do, and completing
 * it is what lifts the pending flag.
 */
export async function updatePassword(newPassword: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: describeAuthError(error) };
  return { ok: true };
}

export interface AccountDeletionResult {
  ok: boolean;
  message?: string;
  /** ISO timestamp when deletion was requested, or null once cancelled. */
  deletionRequestedAt?: string | null;
}

/**
 * Schedules the signed-in account for deletion after a 30-day grace period.
 *
 * Sets profiles.deletion_requested_at and nothing else — the actual deletion
 * is a `delete from auth.users` performed by a pg_cron sweep once the grace
 * period elapses, which then cascades through all 57 foreign keys pointing at
 * profiles. That work is entirely server-side: the client never needs, and
 * never has, the service-role key required to touch auth.users.
 *
 * Reversible until the sweep runs. Nothing is destroyed by calling this.
 */
export async function requestAccountDeletion(): Promise<AccountDeletionResult> {
  const { data, error } = await supabase.rpc("request_account_deletion");

  if (error || !data) {
    console.error("[auth] Could not request account deletion:", error?.message);
    return {
      ok: false,
      message: error?.message
        ? "Could not schedule your account for deletion. Please try again."
        : "Could not schedule your account for deletion.",
    };
  }

  const row = data as unknown as { deletion_requested_at: string | null };
  return { ok: true, deletionRequestedAt: row.deletion_requested_at };
}

/**
 * Cancels a pending deletion.
 *
 * Idempotent by design on the database side — cancelling when nothing is
 * pending is a no-op rather than an error, because "make sure my account is
 * not scheduled for deletion" is already satisfied in that state.
 */
export async function cancelAccountDeletion(): Promise<AccountDeletionResult> {
  const { data, error } = await supabase.rpc("cancel_account_deletion");

  if (error || !data) {
    console.error("[auth] Could not cancel account deletion:", error?.message);
    return { ok: false, message: "Could not cancel the deletion. Please try again." };
  }

  const row = data as unknown as { deletion_requested_at: string | null };
  return { ok: true, deletionRequestedAt: row.deletion_requested_at };
}

/** Clears the Supabase session. Local cached state is cleared by AppContext. */
export async function signOutRemote(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[auth] signOut failed:", error.message);
}
