import { supabase } from "../../../lib/supabase/client";
import type { AuthError, Factor } from "@supabase/supabase-js";
import { describeAuthError } from "../auth";

// Two-factor authentication, TOTP only.
//
// WHAT SUPABASE OWNS AND WHAT THIS DOES NOT. GoTrue generates the secret,
// renders the QR, validates every code, and refuses the dangerous operations
// below aal2 on its own — enrolling a second factor and unenrolling a
// verified one both return `insufficient_aal` to a password-only session.
// Measured, not assumed. So nothing here re-checks those: this layer exists
// to turn the API's shape into results the UI can render, and to keep raw
// GoTrue strings off the screen.
//
// A PASSWORD-ONLY SESSION IS STILL A REAL SESSION, which is the whole reason
// the rest of this feature exists. Signing in with the right password when a
// factor is enrolled succeeds: a session is created, SIGNED_IN fires, the JWT
// carries `aal: "aal1"`, and RLS serves the user's data. The only signal that
// a challenge is outstanding is nextLevel > currentLevel. Enforcement in this
// app is a route guard reading getMfaStatus(), not something the server does
// for us — see AppContext's mfaPending and the guards in App.tsx.
//
// NO BACKUP CODES, because auth-js has none — the whole package was searched.
// Losing the authenticator means an administrator removes the factor, which
// is Phase 2. Every screen that mentions recovery says so plainly rather than
// implying a self-service path that does not exist.

/** What the enrolment screen needs to show before a code can be entered. */
export interface TotpEnrollment {
  factorId: string;
  /**
   * A `data:image/svg+xml` URI, ready for an <img src>.
   *
   * USED AS PROVIDED, rather than re-rendering the `uri` with a QR library.
   * It is large — measured 283–322 KB — but it is a transient string held
   * only while the sheet is open, not bundled weight, and it costs this app
   * no new dependency. A QR package would put ~10–20 KB in every bundle
   * forever, for every user including the ones who never enable this, plus a
   * supply-chain surface for a health app. The trade favours the data URI.
   */
  qrCode: string;
  /** The base32 secret, for anyone typing it in by hand. */
  secret: string;
  /** otpauth:// URI — on a phone, tapping it opens the authenticator app. */
  uri: string;
}

export type MfaResult<T> = { ok: true; data: T } | { ok: false; message: string };

function fail(error: AuthError): { ok: false; message: string } {
  return { ok: false, message: describeAuthError(error) };
}

/**
 * The current session's assurance level and enrolled factors.
 *
 * `pending` is the one thing callers act on: a session that has authenticated
 * but not yet satisfied the second factor. Note that this is NOT the same as
 * "has a factor" — an enrolled user who has already passed the challenge is
 * at aal2 and pending is false.
 *
 * COSTS A ROUND TRIP. getAuthenticatorAssuranceLevel decodes the JWT for the
 * current level but calls getUser() to work out the next one, so this is not
 * free and should be resolved once per account rather than per render.
 */
export interface MfaStatus {
  currentLevel: string | null;
  nextLevel: string | null;
  /** A verified second factor is required and has not been given yet. */
  pending: boolean;
  /** Verified TOTP factors. An unverified one is an abandoned enrolment. */
  factors: Factor[];
}

export async function getMfaStatus(): Promise<MfaResult<MfaStatus>> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return fail(error);

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) return fail(factors.error);

  return {
    ok: true,
    data: {
      currentLevel: data.currentLevel,
      nextLevel: data.nextLevel,
      pending: data.currentLevel === "aal1" && data.nextLevel === "aal2",
      // listFactors() already filters `totp` to verified ones; `all` includes
      // unverified leftovers from an abandoned enrolment, which are not
      // something to show anyone as protecting their account.
      factors: factors.data.totp,
    },
  };
}

/**
 * Just the "is a challenge outstanding" question, without the factor list.
 *
 * SEPARATE FROM getMfaStatus BECAUSE OF WHO CALLS IT. This one runs on every
 * app load for every signed-in user, including the overwhelming majority who
 * will never turn two-factor on; getMfaStatus runs on two screens that have
 * to name the factor. Folding them together would buy a listFactors round
 * trip for every session in order to serve the screens that are not open.
 */
export async function isMfaChallengePending(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    console.warn("[mfa] Could not read assurance level:", error.message);
    return false;
  }
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}

/**
 * Starts an enrolment. The factor exists after this call but is unverified
 * and protects nothing until a code is accepted.
 *
 * ISSUER IS PASSED EXPLICITLY, and it is not cosmetic. Left out, GoTrue fills
 * it from the project's site_url — measured as an authenticator entry reading
 * `127.0.0.1:3000` locally, which on staging would be a bare hostname. A
 * person scanning this is deciding what to trust six months later, from a
 * list of a dozen entries, and "Centium" is the only version of that name
 * they will recognise.
 */
export async function enrollTotp(friendlyName: string): Promise<MfaResult<TotpEnrollment>> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer: "Centium",
  });
  if (error) return fail(error);

  return {
    ok: true,
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

/**
 * Challenges a factor and verifies a code in one step, which is right for
 * TOTP and wrong for the other factor types — a phone factor needs the two
 * separated so the SMS has time to arrive. Only TOTP is built here.
 *
 * Used for BOTH halves of the feature, and deliberately so: verifying a fresh
 * enrolment and answering a sign-in challenge are the same call, and the
 * server decides what the result means. Verifying an unverified factor marks
 * it verified; verifying a verified one raises the session to aal2.
 *
 * The challenge GoTrue mints here expires in 300 seconds — measured — which
 * nothing in the UI needs to track, but which is why an abandoned screen
 * returns an expiry error rather than a wrong-code one.
 */
export async function verifyTotp(factorId: string, code: string): Promise<MfaResult<null>> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    // Authenticator apps and password managers both hand out codes with a
    // space in the middle, and pasting one is the most likely way this is
    // used. Refusing it would be a self-inflicted wound.
    code: code.replace(/\s+/g, ""),
  });
  if (error) return fail(error);
  return { ok: true, data: null };
}

/**
 * Removes a factor. GoTrue requires aal2 for a verified one, so a
 * password-only session cannot quietly strip someone's second factor —
 * measured as `insufficient_aal`, not something enforced here.
 *
 * An UNVERIFIED factor has no such protection, which is what makes this safe
 * to call when someone abandons the enrolment sheet halfway.
 */
export async function unenrollFactor(factorId: string): Promise<MfaResult<null>> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return fail(error);
  return { ok: true, data: null };
}
