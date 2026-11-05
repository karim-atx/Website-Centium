import { supabase } from "../../../lib/supabase/client";
import { describeAuthError, isAuthRateLimited } from "../auth";
import { hasEmailPassword } from "../auth/passwordChangeLogic";
import { getMfaStatus } from "../mfa";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { CHANGE_FAILED, emailChangeMessage, RETURN_MARKER, RETURN_VALUE } from "./emailChangeLogic";

// Round J · FI: Settings › Account's email change (Supabase's confirm flow,
// double confirmation on). The decisions are in emailChangeLogic.ts.
//
// TWO-FACTOR (Karim, Round J): with a verified factor, the page takes a fresh
// code (verifyTotp) before it sends anything. updateUser({ email }) does not
// itself demand aal2, so this is the app honouring the account's choice; a
// stolen session still needs the code from the phone, and both links still
// have to be opened.

/** Where both links come back to: the Account page, marked as an arrival. */
export function accountRedirectUrl(): string {
  return `${window.location.origin}/app/settings/account?${RETURN_MARKER}=${RETURN_VALUE}`;
}

export interface AccountAuth {
  email: string | null;
  /** The address waiting for its links, if a change is under way. */
  newEmail: string | null;
  /** Signs in with Google only: the email comes from Google and isn't changed here. */
  googleOnly: boolean;
  /** The verified authenticator to ask a code from first, if two-factor is on. */
  factorId: string | null;
}

/**
 * The account as the auth server has it now. getUser() asks the server (not
 * the session in memory), so a change finished from a link opened in another
 * browser shows here on the next visit.
 */
export async function readAccountAuth(): Promise<{ ok: true; data: AccountAuth } | { ok: false; message: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, message: error ? failMessage(error) : CHANGE_FAILED };
  const user = data.user;
  const mfa = await getMfaStatus();
  return {
    ok: true,
    data: {
      email: user.email ?? null,
      newEmail: user.new_email ?? null,
      googleOnly: !hasEmailPassword(user),
      factorId: mfa.ok ? (mfa.data.factors[0]?.id ?? null) : null,
    },
  };
}

export type SendResult = { ok: true } | { ok: false; message: string; rateLimited: boolean };

/** Asks GoTrue to change the email: it sends the links and stores `new_email`. */
export async function requestEmailChange(email: string): Promise<SendResult> {
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: accountRedirectUrl() });
  if (!error) return { ok: true };
  return { ok: false, message: failMessage(error), rateLimited: isAuthRateLimited(error) };
}

/** Sends the links again for the change under way. */
export async function resendEmailChange(newEmail: string): Promise<SendResult> {
  const { error } = await supabase.auth.resend({ type: "email_change", email: newEmail, options: { emailRedirectTo: accountRedirectUrl() } });
  if (!error) return { ok: true };
  return { ok: false, message: failMessage(error), rateLimited: isAuthRateLimited(error) };
}

/** A fresh token after a link, so the session's own email claim is the new one. */
export async function refreshAfterLink(): Promise<void> {
  await supabase.auth.refreshSession().catch(() => undefined);
}

function failMessage(error: { code?: string; message?: string; status?: number; name?: string }): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  return emailChangeMessage(error.code) ?? describeAuthErrorOr(error);
}

function describeAuthErrorOr(error: Parameters<typeof describeAuthError>[0] | { code?: string; message?: string }): string {
  const described = describeAuthError(error as Parameters<typeof describeAuthError>[0]);
  // describeAuthError ends with GoTrue's own sentence when it knows no better;
  // that sentence is English only, so this page says its own instead.
  return described === (error.message ?? "") || !described ? CHANGE_FAILED : described;
}
