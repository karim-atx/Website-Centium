import { tk } from "../../i18n/core";
/**
 * Round K (sign-out decision, 2026-11-08): which sessions a sign-out ends,
 * kept apart from the client so the choice and the order are tested without
 * an auth server.
 *
 * - Sign out (Profile, the business profile, every "Not you?"): THIS DEVICE
 *   ONLY. GoTrue revokes this session's refresh token; every other phone,
 *   tablet and browser stays signed in. supabase-js's default is "global",
 *   which is why the scope is always passed.
 * - Sign out of all devices (Settings › Security): every session. See
 *   signOutEveryDevice for why that is "others" first, then this device.
 * - Deleting the account: still every session ("global"), as it always was.
 */

export type SignOutScope = "local" | "others" | "global";

/** Which scope each way out of an account uses. */
export const SIGN_OUT_SCOPE = {
  /** The ordinary Sign out. */
  signOut: "local",
  /** Deleting the account ends every device's session, not just this one. */
  deleteAccount: "global",
} as const satisfies Record<string, SignOutScope>;

/** The narrow part of supabase.auth this needs (the real client satisfies it). */
export interface SignOutAuth {
  signOut(options: { scope: SignOutScope }): Promise<{ error: SignOutError | null }>;
}

export interface SignOutError {
  name?: string;
  message: string;
  status?: number;
}

export const COULDNT_SIGN_OUT_ALL = tk("Couldn't sign out of all devices. Try again.");

/**
 * Ends the session(s) the scope names. For "local" and "global" supabase-js
 * clears this device's stored session whatever the network does
 * (GoTrueClient._signOut removes it for every scope but "others", error or
 * not), so a failed call still leaves this device signed out; the error is
 * only reported.
 */
export async function signOutWithScope(auth: SignOutAuth, scope: SignOutScope): Promise<SignOutError | null> {
  const { error } = await auth.signOut({ scope });
  return error;
}

/**
 * SIGN OUT OF ALL DEVICES, IN THIS ORDER (the App session's local findings
 * with auth-js 2.115 and a local GoTrue):
 *
 * 1. Every OTHER session, while this one is still good ("others"). It is the
 *    one scope supabase-js does not clear locally on a failure, so if it fails
 *    nothing has changed: stop, and the person is still signed in to retry.
 *    ("global" first would clear this device on a network error and leave
 *    every other one signed in, silently.)
 * 2. The account's OTHER push registrations. A device signed out remotely
 *    never deletes its own row, so it would keep receiving this account's
 *    notifications. Own-row policies allow it only while this session is
 *    valid, hence before step 3. Best effort: a failure is logged and the
 *    sign-out still finishes.
 * 3. This device: the ordinary sign-out ("local" and all its cleanup,
 *    including this device's own push row).
 */
export async function signOutEveryDevice(steps: {
  revokeOthers: () => Promise<SignOutError | null>;
  removeOtherPush: () => Promise<void>;
  signOutHere: () => Promise<void>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const error = await steps.revokeOthers();
  if (error) return { ok: false, message: COULDNT_SIGN_OUT_ALL };
  try {
    await steps.removeOtherPush();
  } catch (e) {
    console.error("[auth] Could not remove the other devices' push registrations:", e);
  }
  await steps.signOutHere();
  return { ok: true };
}
