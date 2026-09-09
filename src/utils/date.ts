/**
 * Formats a date for display, e.g. "Sep 7, 2026".
 *
 * Accepts both shapes the app deals in:
 *   - a full ISO timestamp from Postgres ("2026-09-07T23:10:18.731222+00:00")
 *   - a bare calendar date ("2026-06-02")
 *
 * Rendered in UTC, deliberately. A timestamp late in the UTC day would
 * otherwise show as the *next* day for anyone east of UTC — a client who
 * joined at 23:10 UTC on Sep 7 reads as "Sep 8" in Beirut (UTC+3) — so the
 * displayed date would disagree with the stored one. This matches the
 * UTC-only date arithmetic AppContext already uses for exactly that reason.
 *
 * Returns "—" rather than "Invalid Date" for empty or unparseable input, so
 * a missing timestamp reads as absent instead of broken.
 */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  // A bare "2026-06-02" is already parsed as UTC midnight by JS, so both
  // shapes land on the same footing.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Whole years elapsed since a date of birth, or undefined if unparseable.
 *
 * Age is still needed as a number — TDEE (Mifflin-St Jeor), the age-banded
 * biomarker screening recommendations, and the profile display all take it —
 * but it is now DERIVED from the stored date rather than being the stored
 * value. That is the whole point of collecting a real birth date: the number
 * stays correct as time passes instead of freezing at whatever the user typed
 * when they signed up.
 *
 * Computed in UTC to match how the date is stored and displayed.
 */
export function ageFromDateOfBirth(dob: string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  // Not had this year's birthday yet.
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

/** yyyy-mm-dd for `n` years before today, in UTC. Used for date-input bounds. */
export function isoDateYearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// Bounds live here rather than in one screen because date of birth is
// editable in two places — onboarding's About You step and the Profile tab —
// and a minimum age enforced in one but not the other is not a minimum age.
//
// MIN_AGE = 16 is a product and legal decision, not a technical one. It is
// GDPR Article 8's default age of digital consent (member states may lower it
// to 13; COPPA's US floor is 13). Health data is special-category under
// Article 9, so the conservative end of that range is the right default, and
// the app has no verifiable-parental-consent mechanism to support anyone
// below it. It is deliberately stricter than the 10 the old free-typed age
// field allowed, which was too low for an app collecting body metrics and
// biomarkers.
//
// MAX_AGE = 120 rejects typos and impossible dates without excluding a real
// person; the oldest verified human reached 122.
export const MIN_AGE = 16;
export const MAX_AGE = 120;

/**
 * Validates a date of birth. Returns a message to show the user, or null when
 * the date is acceptable.
 *
 * Shared so both editors enforce the same rule. The bounds are also applied
 * as min/max on the date inputs, but those only constrain the picker — the
 * field can still be typed into, so this is the check that actually holds.
 */
export function validateDateOfBirth(dob: string): string | null {
  const age = ageFromDateOfBirth(dob);
  // Undefined covers both an unparseable date and one in the future, since a
  // future date yields a negative age.
  if (age === undefined) return "Enter a valid date of birth.";
  if (new Date(dob) > new Date()) return "Date of birth must be in the past.";
  if (age < MIN_AGE) return `You need to be at least ${MIN_AGE} to use Centium.`;
  if (age > MAX_AGE) return "Check the date of birth — that doesn't look right.";
  return null;
}

/**
 * Today's calendar date in the user's LOCAL timezone, as yyyy-mm-dd.
 *
 * Deliberately NOT `new Date().toISOString().slice(0, 10)`, which gives the
 * UTC day. The two disagree for part of every day, and the disagreement lands
 * exactly where date-keyed logging is most fragile: a user in Beirut (UTC+3)
 * logging a snack at 01:30 local is at 22:30 UTC *the previous day*, so the
 * UTC answer would file it under yesterday and it would not show up under
 * "Today". A day means the user's day.
 *
 * This is the opposite choice from formatDisplayDate above, and both are
 * right. That one renders an instant the server already stored, so it has to
 * agree with the stored value. This one decides which day the user is
 * currently living in, which only the browser knows.
 */
export function todayLocal(): string {
  return localDayOf(new Date());
}

/**
 * The local calendar day an instant fell on, as yyyy-mm-dd.
 *
 * Used where a real timestamp has to be reduced to the day it belongs to —
 * a finished workout's `started_at`, say — so that day matches what
 * todayLocal() would have said at the time.
 */
export function localDayOf(instant: string | Date): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
