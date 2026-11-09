/**
 * Whether a signed-in account goes into the app, into onboarding, or to the
 * "Couldn't load your account" screen. Pure, so every rule is tested without a
 * server (profileGate.test.ts); the read itself is fetchProfile in ./index.ts.
 *
 * THE BUG THIS EXISTS FOR (iPhone TestFlight, 2026-11-09, not reproduced on a
 * device). An account that had finished onboarding was sent back into it, and
 * finishing again failed with "Couldn't finish setting up your account". The
 * leading theory: in the iOS app (WKWebView at capacitor://localhost) the
 * session cookie may not stick, so the app believes it is signed in while the
 * Supabase client's own requests go out as anon. fetchProfile answered null
 * for an error and for "no row" alike, the hydration marked the profile read
 * anyway, and `onboarded` stayed at its default false. The guards then did
 * exactly what they were told.
 *
 * KARIM'S RULE (2026-11-09): a profile that can't be loaded never shows
 * onboarding. Only a CONFIRMED missing row means a new account, and confirmed
 * means the read succeeded as this account: the client's own session belongs
 * to the account the app thinks is signed in. Everything else is an error,
 * shown as "Couldn't load your account" with Try again and Sign out.
 */

export type ProfileLoadErrorReason = "offline" | "session" | "failed";

/** What a profile read came to, without the row itself. */
export type ProfileReadOutcome =
  | { status: "ok" }
  | { status: "missing" }
  | { status: "error"; reason: ProfileLoadErrorReason };

/**
 * The Supabase client's own session, as it stood when a read came back with
 * no row. NOT the app's React session: the bug is precisely those two
 * disagreeing.
 */
export type ClientSession =
  | { kind: "user"; userId: string }
  | { kind: "none" }
  /** getSession() itself failed; `offline` when that was the connection. */
  | { kind: "unreadable"; offline: boolean };

/** An error as supabase-js hands it back, with the HTTP status beside it when there is one. */
export interface ReadError {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * A refusal that means "this request was not signed in as you".
 *
 *   401          PostgREST refused the JWT outright.
 *   PGRST301     the JWT could not be decoded or verified (an expired or
 *                foreign token on older PostgREST).
 *   PGRST303     the JWT's claims failed validation (expired, on newer ones).
 *   42501        insufficient privilege: what anon gets from every table it
 *                has no grant on (profiles, legal_acceptances), and what an
 *                RLS WITH CHECK refuses an insert for someone else's row with.
 *
 * 42501 is the one that needs a word. It can also mean a column grant the app
 * should never have needed; on the profile read and the finish writes that is
 * not a state a working build reaches, while a missing or foreign session is
 * exactly the state the Database session found behind the iPhone report (no
 * legal_acceptances row was ever written: the insert is the 42501).
 */
export function isSessionRefusal(error: ReadError | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 401) return true;
  return error.code === "PGRST301" || error.code === "PGRST303" || error.code === "42501";
}

/**
 * The client session against the account the app believes is signed in.
 * "offline" only when the session could not even be read for want of a
 * connection (getSession refreshing an expired token offline fails that way,
 * see hasStoredSessionToken); anything else that is not this account is a
 * mismatch, which is the "signed-out read".
 */
export function sessionVerdict(userId: string, session: ClientSession): "match" | "offline" | "mismatch" {
  if (session.kind === "user") return session.userId === userId ? "match" : "mismatch";
  if (session.kind === "unreadable" && session.offline) return "offline";
  return "mismatch";
}

/**
 * Classifies one read of profiles.
 *
 * `session` is only asked for when the read came back with no row (that is
 * the only answer the session can change), so it may be undefined otherwise.
 * `offline` is the codebase's own transport test (network-error isOffline),
 * passed in so this module stays free of anything but logic.
 */
export function classifyProfileRead(input: {
  userId: string;
  error: ReadError | null;
  hasRow: boolean;
  session?: ClientSession;
  offline: (error: unknown) => boolean;
}): ProfileReadOutcome {
  const { userId, error, hasRow, session, offline } = input;
  if (error) {
    if (isSessionRefusal(error)) return { status: "error", reason: "session" };
    return { status: "error", reason: offline(error) ? "offline" : "failed" };
  }
  // A row came back: RLS only shows an account its own, so it was this one.
  if (hasRow) return { status: "ok" };
  // No row. Trusted only when the read went out as this account.
  const verdict = sessionVerdict(userId, session ?? { kind: "none" });
  if (verdict === "match") return { status: "missing" };
  return { status: "error", reason: verdict === "offline" ? "offline" : "session" };
}

/**
 * THE OFFLINE EXCEPTION, as a switch. Karim's rule says a profile that can't
 * be loaded shows "Couldn't load your account". This app is also offline-first
 * (a cached profile, an outbox): an onboarded member opening it on a train has
 * always got in with their cached data, and that is still never onboarding.
 * So, with this true, an OFFLINE read whose own account's cache says
 * `onboarded: true` lets them in as before. Every other error, and every
 * session error whatever the cache says, is the error screen.
 *
 * A decision for Karim (flagged in the PR): false makes every failed read the
 * error screen, offline included.
 */
export const OFFLINE_CACHE_LETS_IN = true;

export type ProfileGate = "app" | "onboarding" | "error";

/**
 * Where a signed-in account goes once its profile read has been decided.
 *
 * `onboarded` is the live value (the server's after a good read, or set by
 * onboarding's own finish), so the answer follows a member finishing
 * onboarding. `cachedOnboarded` is whether THIS account's own cache said
 * onboarded before the read: same account id, same storage namespace
 * (AppContext works it out; see profileCacheSaysOnboarded).
 */
export function profileGate(input: {
  outcome: ProfileReadOutcome;
  onboarded: boolean;
  cachedOnboarded: boolean;
}): ProfileGate {
  const { outcome, onboarded, cachedOnboarded } = input;
  if (outcome.status === "error") {
    if (outcome.reason === "offline" && cachedOnboarded && OFFLINE_CACHE_LETS_IN) return "app";
    return "error";
  }
  return onboarded ? "app" : "onboarding";
}

/**
 * Whether a cached profile is a trustworthy "onboarded" for this account: it
 * was written by this account's tab (`tabUserId`, the namespace the cache is
 * stored under, lib/supabase/tabIdentity) and it names this account.
 */
export function profileCacheSaysOnboarded(
  authUserId: string,
  tabUserId: string | null,
  cached: { id?: string; onboarded?: boolean } | null | undefined
): boolean {
  return tabUserId === authUserId && !!cached && cached.id === authUserId && cached.onboarded === true;
}
