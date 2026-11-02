// Market + Share 3.0 · W2 · the gym detail page's pure rules (C-MO.4.2.1
// `gymDetail`, C-MO.4.2.2 `memberSheet` / `memberDone`). No Supabase here, so
// node --test can load it.

import { dayValue, NOT_PUBLISHED, type HoursRow } from "../../services/venues/hours";
import { formatShortDate } from "../../utils/date";
import { t, tk, tn } from "../../i18n/core";
import type { Billing } from "../../services/venues/venueLogic";

const FULL = [tk("Monday"), tk("Tuesday"), tk("Wednesday"), tk("Thursday"), tk("Friday"), tk("Saturday"), tk("Sunday")];

/**
 * The board's "Location and hours" rows (Client Explore Screens lines
 * 127–128): consecutive days with the same hours share a row, "Monday to
 * Friday" for three or more days, "Saturday and Sunday" for two, the day in
 * full for one; the hours 12-hour from dayValue() ("6:00 AM to 11:00 PM").
 * Empty when the venue publishes nothing at all.
 */
export function gymHoursRows(rows: HoursRow[]): { key: string; label: string; value: string }[] {
  if (rows.length === 0) return [];
  const byDay = new Map(rows.map((r) => [r.weekday, r]));
  const values = [1, 2, 3, 4, 5, 6, 7].map((d) => dayValue(byDay.get(d)));
  if (values.every((v) => v === NOT_PUBLISHED)) return [];
  const out: { key: string; label: string; value: string }[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i < 7 && values[i] === values[start]) continue;
    const n = i - start;
    const label =
      n === 1
        ? t(FULL[start])
        : n === 2
          ? t("{first} and {last}", { first: t(FULL[start]), last: t(FULL[i - 1]) })
          : t("{first} to {last}", { first: t(FULL[start]), last: t(FULL[i - 1]) });
    out.push({ key: `d${start + 1}-${i}`, label, value: values[start] });
    start = i;
  }
  return out;
}

/**
 * The area in the rating line ("4.8 · 0.8 km · Hamra, Beirut"): the last two
 * parts of a three-or-more-part address ("Makdessi Street, Hamra, Beirut" →
 * "Hamra, Beirut"), else the address as it is.
 */
export function areaOf(location: string | null | undefined): string {
  const parts = (location ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 3 ? parts.slice(-2).join(", ") : parts.join(", ");
}

/** "YYYY-MM-DD" plus whole calendar months, clamped to the month's last day (Postgres `date + interval 'n months'`). */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * When a membership bought today runs out: the database's
 * plan_expiry_from(current_date, valid_for_days, billing), the one definition
 * purchase_gym_membership() uses. valid_for_days wins; otherwise one billing
 * period (daily + 1 day, monthly + 1 month, quarterly + 3, semiannually + 6,
 * annually + 12). The pass is valid THROUGH that date (gym_pass_state:
 * expired when expires_on < current_date).
 */
export function planExpiryIso(fromIso: string, validForDays: number | null | undefined, billing: Billing): string {
  if (validForDays && validForDays > 0) {
    const [y, m, d] = fromIso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + validForDays)).toISOString().slice(0, 10);
  }
  switch (billing) {
    case "daily": {
      const [y, m, d] = fromIso.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    }
    case "monthly":
      return addMonthsIso(fromIso, 1);
    case "quarterly":
      return addMonthsIso(fromIso, 3);
    case "semiannually":
      return addMonthsIso(fromIso, 6);
    case "annually":
      return addMonthsIso(fromIso, 12);
  }
}

const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** D-02: "Nov 15, 2026" from a `date`. */
export const longDay = (iso: string): string => formatShortDate(dateOf(iso), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The sheet's "Starts" value: "Today, Oct 16" (D-02, month first). */
export const startsToday = (iso: string): string => t("Today, {date}", { date: formatShortDate(dateOf(iso), { month: "short", day: "numeric", timeZone: "UTC" }) });

/** How long one purchase lasts, for the plan row's line: "30 days", "1 month", "3 months", "1 year", "1 day". */
export function durationText(validForDays: number | null | undefined, billing: Billing): string {
  if (validForDays && validForDays > 0) return tn(validForDays, "{n} day", "{n} days");
  if (billing === "daily") return tn(1, "{n} day", "{n} days");
  if (billing === "monthly") return tn(1, "{n} month", "{n} months");
  if (billing === "quarterly") return tn(3, "{n} month", "{n} months");
  if (billing === "semiannually") return tn(6, "{n} month", "{n} months");
  return tn(1, "{n} year", "{n} years");
}

const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1].toUpperCase() && /[A-Za-z]/.test(s[1]) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * membership_plans.includes as a phrase. `start`: the sheet's "Gym floor,
 * lockers, showers" (first letter up); otherwise the row's "gym floor,
 * lockers, showers". An all-caps word ("TRX", "24/7 access" stays) keeps its
 * case. Null with nothing listed.
 */
export function includesText(includes: readonly string[] | null | undefined, start: boolean): string | null {
  const list = (includes ?? []).map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  const phrase = list.map(lowerFirst).join(", ");
  return start ? upperFirst(phrase) : phrase;
}

/** The plan row's line (board: "30 days · gym floor, lockers, showers"). */
export function planRowLine(p: { validForDays?: number | null; billing: Billing; includes?: readonly string[] | null }): string {
  const inc = includesText(p.includes, false);
  return inc ? `${durationText(p.validForDays, p.billing)} · ${inc}` : durationText(p.validForDays, p.billing);
}

/**
 * The sheet's plan name (board: "Monthly membership" for the "Monthly" plan).
 * A name that already says what it is ("Day pass", "10-class pack",
 * "Annual membership") stays as it is.
 */
export function sheetPlanName(name: string): string {
  return /membership|pass|pack|trial|drop[- ]?in/i.test(name) ? name : t("{name} membership", { name });
}
