// Sentences the auth screens show, and the matching that picks them. Kept free
// of the Supabase client so it can be tested on its own.
import { SUSPENDED_MESSAGE, USER_BANNED_CODE } from "../../../lib/supabase/suspensionMessage";
import type { ReturnedAuthError } from "../../../lib/supabase/oauthReturn";

/** The burner-email refusal, word for word the auth hook's own (Database cd1a5bf). */
export const DISPOSABLE_EMAIL_MESSAGE =
  "Please use a permanent email address. Temporary email addresses can't be used to create an account.";

/**
 * Whether an error's text is the hook's burner refusal. GoTrue reports its
 * code as "unknown" (and a redirect carries only the description), so the
 * sentence is the one thing that identifies it.
 */
export function isDisposableEmailText(text: string | null | undefined): boolean {
  return /temporary email address|permanent email address/i.test(text ?? "");
}

/** For anything else that comes back in a sign-in redirect. Never the raw text. */
export const RETURNED_AUTH_ERROR_MESSAGE = "We couldn't sign you in. Please try again.";

/** The sentence for an error that came back in the redirect URL (Google sign-in). */
export function describeReturnedAuthError(e: ReturnedAuthError): string {
  if (isDisposableEmailText(e.description)) return DISPOSABLE_EMAIL_MESSAGE;
  if (e.code === USER_BANNED_CODE) return SUSPENDED_MESSAGE;
  return RETURNED_AUTH_ERROR_MESSAGE;
}
