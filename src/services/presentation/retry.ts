// How usePresentationSync retries a display-settings save that failed.
//
// A failed save is kept on this device and retried on the documented triggers
// (the next change, reconnecting, the next sign-in) and, between them, on a
// backoff timer. Retries are bounded so a server that keeps refusing is never
// hammered:
//   - a permission refusal (an expired session, a missing grant) is not
//     retried at all until the next sign-in: retrying cannot fix it;
//   - after MAX_FAILURES failed saves in a row the sync stops until the next
//     sign-in;
//   - between failures each retry waits retryDelayMs(failures), doubling from
//     FIRST_DELAY_MS up to MAX_DELAY_MS. A trigger inside that wait does not
//     save early; the timer saves the latest choice when it ends.
// A save that lands resets the count, and so does reconnecting (Round D O13):
// failures while offline say nothing about the server, so coming back online
// starts a fresh count. A permission refusal stays stopped.

export const MAX_FAILURES = 5;
export const FIRST_DELAY_MS = 5_000;
export const MAX_DELAY_MS = 5 * 60_000;

/** Error codes that mean this account may not write the row right now. */
const PERMISSION_CODES = new Set(["ATX01", "PGRST301", "PGRST302", "42501"]);

export function isPermissionCode(code: string | undefined | null): boolean {
  return !!code && PERMISSION_CODES.has(code);
}

/** How long to wait after `failures` failed saves in a row (1 = the first). */
export function retryDelayMs(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(FIRST_DELAY_MS * 2 ** (failures - 1), MAX_DELAY_MS);
}

export type RetryState = { failures: number; blocked: boolean; notBefore: number; permission: boolean };

export const RETRY_START: RetryState = { failures: 0, blocked: false, notBefore: 0, permission: false };

/** The state after a failed save at `now`. */
export function afterFailure(state: RetryState, permission: boolean, now: number): RetryState {
  const failures = state.failures + 1;
  return {
    failures,
    blocked: permission || failures >= MAX_FAILURES,
    notBefore: now + retryDelayMs(failures),
    permission: state.permission || permission,
  };
}

/** The state after the browser's `online` event: a fresh count, unless a permission refusal stopped it. */
export function afterOnline(state: RetryState): RetryState {
  return state.permission ? state : RETRY_START;
}

/** Whether a save may be attempted at `now`: "now", "later" (wait for the timer) or "never" (until sign-in). */
export function canSave(state: RetryState, now: number): "now" | "later" | "never" {
  if (state.blocked) return "never";
  return now >= state.notBefore ? "now" : "later";
}
