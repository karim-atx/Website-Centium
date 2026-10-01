/**
 * Task J: the decisions behind Change password, kept pure so they are tested
 * without an auth server. Nothing here ever sees a password.
 */

/**
 * WHETHER THIS ACCOUNT HAS AN EMAIL PASSWORD WE CAN ASK FOR.
 *
 * An account made with email and password carries an `email` identity. A
 * Google-only account carries only `google`, and has no password to type.
 *
 * ONE THING THIS CANNOT SEE, measured on the local stack: when a Google-only
 * account sets a password, GoTrue stores it but adds no identity, so the user
 * object still lists only Google afterwards. Email-and-password sign-in then
 * works, yet this still answers false. Nothing on the user object records it.
 */
export function hasEmailPassword(user: {
  identities?: { provider: string }[] | null;
  app_metadata?: { providers?: unknown } | null;
}): boolean {
  if ((user.identities ?? []).some((i) => i.provider === "email")) return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("email");
}

/** Signs in with Google (whether or not it also has an email identity). */
export function usesGoogle(user: {
  identities?: { provider: string }[] | null;
  app_metadata?: { providers?: unknown } | null;
}): boolean {
  if ((user.identities ?? []).some((i) => i.provider === "google")) return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("google");
}

/** What updateUser({ password }) came back with, as the sheet needs it. */
export type ChangeOutcome =
  | { status: "ok" }
  /** "Secure password change" is on and this session is over 24 hours old:
   *  the emailed code from reauthenticate() has to come with the change. */
  | { status: "code_needed" }
  | { status: "error"; message: string };

/**
 * Maps GoTrue's codes for a password update. Anything not named here goes to
 * the shared describeAuthError by returning null.
 */
export function passwordChangeOutcome(code: string | undefined): ChangeOutcome | null {
  switch (code) {
    case "reauthentication_needed":
    case "reauth_nonce_missing":
      return { status: "code_needed" };
    case "reauthentication_not_valid":
      return { status: "error", message: "That code isn't right, or it has expired. Check your email or send a new one." };
    case "same_password":
      return { status: "error", message: "Your new password must be different from your current one." };
    default:
      return null;
  }
}
