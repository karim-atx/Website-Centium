// Dates of the member's health records, shared by the History tab and the
// doctor summary (services/premium/g3), so a service never imports a
// component. fmtDate and surgeryDate moved here unchanged from
// components/health/records/kit.tsx and HistoryTab.tsx.

import { appLocale } from "../i18n/format";

/** How much of a surgery's date the member knows (surgeries.date_precision). */
export type DatePrecision = "day" | "month" | "year";

/** "Sep 14, 2026" from yyyy-mm-dd (no time zone shift). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "–";
  const loc = appLocale();
  if (loc) return new Date(y, m - 1, d).toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" });
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${month} ${d}, ${y}`;
}

/**
 * B2 surgeries.date_precision: "14 Jul 2026" / "Jul 2026" / "2026". A full
 * date goes through `fullDate` (the History tab's fmtDate by default; the
 * doctor summary passes its own day format, so its full dates read like every
 * other date on it). A month-only or year-only date is the same everywhere.
 */
export function surgeryDate(
  s: { date: string; datePrecision?: DatePrecision | null },
  fullDate: (ymd: string) => string = fmtDate,
): string {
  const p = s.datePrecision ?? "day";
  if (p === "year") return s.date.slice(0, 4);
  if (p === "month") {
    // The month and the year only (the stored day is the 1st). English used to
    // cut the day out of "Jan 1, 2019" and kept "1, 2019".
    const [y, m] = s.date.split("-").map(Number);
    if (!y || !m || m > 12) return fullDate(s.date);
    return new Date(y, m - 1, 1).toLocaleDateString(appLocale("en-US"), { month: "short", year: "numeric" });
  }
  return fullDate(s.date);
}
