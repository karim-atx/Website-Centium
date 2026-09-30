import { shiftDate } from "../../utils/date";

/**
 * The journal streak: consecutive days with an entry, walking back from
 * `today`, the user's own LOCAL date (AppContext's `today`, todayLocal()).
 *
 * All on yyyy-mm-dd strings with shiftDate, never through Date#toISOString:
 * that is UTC, so in Beirut (UTC+3) a local midnight read as the previous day
 * and the streak could be a day off each night between 00:00 and 03:00.
 */
export function journalStreak(entryDates: Iterable<string>, today: string): number {
  const days = new Set(entryDates);
  let n = 0;
  for (let d = today; days.has(d); d = shiftDate(d, -1)) n++;
  return n;
}
