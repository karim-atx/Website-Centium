import { tk } from "../../i18n/core";
import { isSessionRefusal, type ReadError } from "./profileGate";

/**
 * The two refusals at the end of onboarding that are not "try again" (Karim,
 * 2026-11-09). Pure, so it is tested without a server; the screens act on it
 * through onboarding's useFinishRefusal.
 *
 *   ATXG1    the Database refuses an already-onboarded account's profile
 *            update when the patch's account_type or professional_subtype
 *            differs from the stored one, or when onboarded would go false
 *            ("your account type is set when you sign up"). The account is
 *            already set up, so the screen re-reads it and goes into the app;
 *            only if the re-read says otherwise is ACCOUNT_TYPE_SET shown.
 *   session  the write was not signed in as this account (isSessionRefusal:
 *            401, PGRST301/303, 42501). The iPhone report's finish failed at
 *            exactly this: its legal_acceptances insert, the first write,
 *            never landed. Shown as "Couldn't load your account" with Try
 *            again and Sign out, not as a line telling them to try again.
 */

export type FinishRefusal = "accountTypeSet" | "session";

export const ACCOUNT_TYPE_SET = tk("Your account type is set when you sign up.");

/** Which of the two a failed finish write was, or null for any other error. */
export function finishRefusal(error: ReadError | null | undefined): FinishRefusal | null {
  if (!error) return null;
  if (error.code === "ATXG1" || /\bATXG1\b/.test(error.message ?? "")) return "accountTypeSet";
  if (isSessionRefusal(error)) return "session";
  return null;
}
