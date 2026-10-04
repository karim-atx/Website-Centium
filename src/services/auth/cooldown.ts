// The wait after Supabase's sign-in rate limit refuses an attempt.
//
// SIXTY SECONDS IS THE APP'S CHOICE, not the server's figure: GoTrue's limit
// is per IP and auth-js does not pass a Retry-After through to the app, so
// this is a deliberate pause that keeps a person from hammering the button
// into a longer block, not a promise of exactly when the server relents.

export const AUTH_COOLDOWN_SECONDS = 60;

/** 45 -> "0:45", 60 -> "1:00", 5 -> "0:05". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The line shown while the wait runs: "Too many attempts. Try again in 0:45." */
export function cooldownMessage(seconds: number): string {
  return `Too many attempts. Try again in ${formatCountdown(seconds)}.`;
}

/** Whole seconds left until `until` (ms since epoch), never negative. */
export function secondsLeft(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}
