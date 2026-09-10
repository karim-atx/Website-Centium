import { supabase } from "../../../lib/supabase/client";

// Recording that an account is still in use, for the inactive-account work
// (Database follow-ups 39/40). Nothing in the app reads last_active_at — this
// exists so the column accumulates real history from today rather than from
// whenever that work starts.

/**
 * How long to ignore a repeat call for the same user.
 *
 * NOT A THROTTLE ON THE WRITE — the server owns that, and skips the update
 * entirely when the stamp is under an hour old. This is narrower and exists
 * for a different reason: one foreground-resume fires BOTH `visibilitychange`
 * and `focus`, so a single wake produces two identical calls, and flicking
 * between tabs produces a pair each time. The server would absorb them, but
 * each one is still a round trip bought for nothing.
 *
 * Deliberately far shorter than the server's hour. Duplicating that interval
 * here would mean two throttles that can silently disagree once one of them
 * changes; at 30 seconds this only ever collapses duplicates from a single
 * wake, and never decides whether a write should happen.
 */
const WAKE_DEDUPE_MS = 30_000;

/** Keyed by user so signing in as someone else is never suppressed. */
let lastCall: { userId: string; at: number } | null = null;

/**
 * Records the signed-in user as active now.
 *
 * FIRE AND FORGET, AND THE SIGNATURE ENFORCES IT. This returns void rather
 * than a promise, so no caller can await it, block on it, or branch on its
 * result. That is deliberate: this is a background signal, and a failure to
 * record it is not something a user can act on or should be told about. A
 * failed stamp costs at most an hour of resolution on a column nothing reads
 * yet.
 *
 * `userId` IS ONLY FOR THE DE-DUPE KEY ABOVE AND IS NEVER SENT. The RPC takes
 * no arguments: it resolves the caller from `auth.uid()` and always writes
 * `now()`. That is the whole point of it being SECURITY DEFINER with the
 * column absent from every client UPDATE grant — a client that could supply
 * the value could send a future date and never look inactive again.
 *
 * Only call this with a session in hand. The function raises rather than
 * returning null when `auth.uid()` is null, and `anon` has no execute grant.
 */
export function touchLastActive(userId: string): void {
  const now = Date.now();
  if (lastCall && lastCall.userId === userId && now - lastCall.at < WAKE_DEDUPE_MS) return;
  lastCall = { userId, at: now };

  void supabase
    .rpc("touch_last_active")
    .then(({ error }) => {
      // Logged, never surfaced. Worth a line in the console because a
      // persistent failure here would otherwise be invisible — the column is
      // not on screen anywhere, so nobody would notice it had stopped moving.
      if (error) console.warn("[activity] Could not record activity:", error.message);
    });
}
