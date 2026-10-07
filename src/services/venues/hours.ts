// Opening hours as MO1.4.2.1 #8-9 draws them (backend stage A4, Database
// docs/HANDOVER_API.md "Stage A4 · The business side of a venue"). Pure, so
// node --test can load it.
//
// THE DATABASE DECIDES, THIS ONLY NAMES. gym_hours_for() returns one row per
// weekday (1 = Monday … 7 = Sunday) in one of three shapes: closed, open 24
// hours, or a from–to range, with `wraps_midnight` already worked out. A range
// is labelled from that flag, never by comparing the two times here. A day
// with no row is "not published", never "closed" (the contract: a venue that
// has not filled its hours in must not be drawn as shut).
//
// The frame's rows: consecutive days with the same hours share a row ("Mon to
// Fri"), a single day reads in full ("Saturday"), and today gets its own
// highlighted row "Thursday (today)" right after the row that contains it,
// exactly as the frame draws it (its Thursday sits inside "Mon to Fri" and is
// drawn again under it). "Today" is the venue's own day (gyms.timezone).

export interface HoursRow {
  /** 1 = Monday … 7 = Sunday (extract(isodow)). */
  weekday: number;
  closed: boolean;
  open24h: boolean;
  /** "HH:MM:SS" from a `time` column, or null when closed / open 24 hours. */
  opensAt: string | null;
  closesAt: string | null;
  /** From gym_hours_for(): the range runs past midnight into the next day. */
  wrapsMidnight: boolean;
}

export interface HoursLine {
  key: string;
  label: string;
  value: string;
  today: boolean;
}

const FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The value a day with no row shows: not published, never "Closed". */
export const NOT_PUBLISHED = "Not published";

/** "06:00:00" → "06:00" (24-hour, as the rest of the app). */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}

/** One day's hours as the right-hand column reads them. */
export function dayValue(row: HoursRow | undefined): string {
  if (!row) return NOT_PUBLISHED;
  if (row.closed) return "Closed";
  if (row.open24h) return "Open 24 hours";
  // A range with a missing end can't be drawn honestly; say nothing about it.
  if (!row.opensAt || !row.closesAt) return NOT_PUBLISHED;
  const range = `${hhmm(row.opensAt)} to ${hhmm(row.closesAt)}`;
  return row.wrapsMidnight ? `${range} (next day)` : range;
}

/**
 * The rows MO1.4.2.1's Opening hours card draws, Monday first. Empty when
 * the venue publishes no hours at all (the page says so instead of a card of
 * "Not published" rows). `today` is the venue's ISO weekday, or null when it
 * isn't known (then nothing is highlighted).
 */
export function hoursLines(rows: HoursRow[], today: number | null): HoursLine[] {
  if (rows.length === 0) return [];
  const byDay = new Map(rows.map((r) => [r.weekday, r]));
  const values = [1, 2, 3, 4, 5, 6, 7].map((d) => dayValue(byDay.get(d)));

  const lines: HoursLine[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i < 7 && values[i] === values[start]) continue;
    const first = start + 1;
    const last = i;
    const value = values[start];
    const hasToday = today !== null && today >= first && today <= last;
    if (first === last) {
      lines.push({ key: `d${first}`, label: hasToday ? `${FULL[first - 1]} (today)` : FULL[first - 1], value, today: hasToday });
    } else {
      lines.push({ key: `d${first}-${last}`, label: `${SHORT[first - 1]} to ${SHORT[last - 1]}`, value, today: false });
      if (hasToday) lines.push({ key: `today${today}`, label: `${FULL[today - 1]} (today)`, value, today: true });
    }
    start = i;
  }
  return lines;
}

const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/**
 * The ISO weekday it is now on the venue's clock (gyms.timezone), or null if
 * the zone can't be used. The database validates the zone name, so null is a
 * browser without that zone, not bad data.
 */
export function isoWeekdayIn(timeZone: string, now: Date = new Date()): number | null {
  try {
    const w = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
    return WEEKDAY[w] ?? null;
  } catch {
    return null;
  }
}

/**
 * venue_is_open_at() is three-valued: null means the venue has no hours for
 * now (or doesn't exist), which shows nothing — never "Closed now".
 */
export function openNowTag(open: boolean | null): { label: string; tone: "member" | "muted" } | null {
  if (open === null) return null;
  return open ? { label: "Open now", tone: "member" } : { label: "Closed now", tone: "muted" };
}
