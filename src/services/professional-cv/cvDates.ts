// Month-precision dates for the professional CV.
//
// Every CV date is stored as the first of its month (the tables CHECK
// `extract(day from x) = 1`) and every public view publishes `YYYY-MM` text,
// so the app deals in one shape throughout: a month string "YYYY-MM". The day
// is never shown and never typed.

/** "YYYY-MM". */
export type MonthValue = string;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function isMonthValue(value: string | null | undefined): value is MonthValue {
  return typeof value === "string" && MONTH_RE.test(value);
}

/** A stored `date` ("2022-03-01") or a view's month ("2022-03") → "2022-03". */
export function toMonth(value: string | null | undefined): MonthValue | null {
  if (!value) return null;
  const month = value.slice(0, 7);
  return isMonthValue(month) ? month : null;
}

/** "2022-03" → "2022-03-01", the value the table's month CHECK accepts. */
export function toDbDate(month: MonthValue | null | undefined): string | null {
  return isMonthValue(month) ? `${month}-01` : null;
}

/** "2022-03" → "Mar 2022". */
export function formatMonth(month: MonthValue | null | undefined): string {
  if (!isMonthValue(month)) return "";
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

/**
 * A date range as a CV shows it.
 *
 * `ongoing` says what a missing end means: for experience and volunteering an
 * empty end_on IS "Present" (the schema has no separate current flag), while
 * for education a missing end is just not given.
 */
export function formatRange(
  start: MonthValue | null | undefined,
  end: MonthValue | null | undefined,
  ongoing: boolean
): string {
  const from = formatMonth(start);
  const to = isMonthValue(end) ? formatMonth(end) : ongoing && from ? "Present" : "";
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/** The month containing `now`, in local time. */
export function currentMonth(now: Date = new Date()): MonthValue {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Newest first, the way a CV timeline reads: current roles (no end) on top,
 * then by end month, then by start month. Undated entries sink to the bottom.
 */
export function byRecency<T extends { start: MonthValue | null; end: MonthValue | null }>(
  entries: T[],
  ongoing: boolean
): T[] {
  const key = (e: T) => (e.end ?? (ongoing && e.start ? "9999-12" : e.start ?? ""));
  return [...entries].sort((a, b) => {
    const k = key(b).localeCompare(key(a));
    return k !== 0 ? k : (b.start ?? "").localeCompare(a.start ?? "");
  });
}
