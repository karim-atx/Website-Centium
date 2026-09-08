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
