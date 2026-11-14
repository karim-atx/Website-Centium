// Batch D GA · `?day=YYYY-MM-DD` on a calendar (a tapped booking or calendar
// notification opens that day). Pure, so it is tested on its own.
//
// Only a real calendar date is accepted: "2026-02-30", "2026-13-01" or
// anything not in that exact shape is ignored, and the calendar opens on
// today as it always did.

export interface DayParam {
  iso: string;
  year: number;
  /** 0-based, as the calendars' cursor. */
  month: number;
}

/** The day `?day=` names, or null when it doesn't name a real one. */
export function dayParam(raw: string | null | undefined): DayParam | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(5, 7)) - 1;
  const day = Number(raw.slice(8, 10));
  if (year < 1 || month < 0 || month > 11 || day < 1) return null;
  // Day 0 of the next month is this month's last day (UTC: no clock changes).
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  if (day > last) return null;
  return { iso: raw, year, month };
}
