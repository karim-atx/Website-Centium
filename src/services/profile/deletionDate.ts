/** Only the fallback when deletion_due_at cannot be read. */
export const GRACE_PERIOD_DAYS = 30;

/**
 * The date a pending deletion runs, as the sweeps compute it:
 * coalesce(deletion_due_at, deletion_requested_at + 30 days). `dueAt` is null
 * when the column could not be read (a database without A7) or is unset.
 * Returns the UTC calendar date, YYYY-MM-DD.
 */
export function deletionRunDate(requestedAt: string, dueAt: string | null): string {
  const d = new Date(dueAt ?? requestedAt);
  if (!dueAt) d.setUTCDate(d.getUTCDate() + GRACE_PERIOD_DAYS);
  return d.toISOString().slice(0, 10);
}
