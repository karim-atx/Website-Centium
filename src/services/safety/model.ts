// Round F (AB7, AB8), pure: reviews from established accounts and the daily
// cap on starting conversations with new people (Database
// 20261226080000_reviews_from_established_accounts_and_ten_new_people_a_day).
// Tested in model.test.ts; the I/O (the account's created_at) is ./index.ts.
//
// - AB7: write_gym_review, write_business_review, write_class_review,
//   review_instructor and the professional-review insert refuse an account
//   younger than 7 days (auth.users.created_at) with ATXW0, DETAIL the moment
//   it may (ISO). The app says so before the tap, in place of the review
//   button, from the same created_at. write_gym_review now refuses the
//   venue's owner and staff with ATX03 (write_business_review's sentence).
//   The professional-review insert is limited to 5 a day (ATX02).
// - AB8: start_message_thread and start_venue_thread refuse an 11th new
//   person in 24 hours (a 4th for an account under 7 days) with ATXX0, DETAIL
//   when the next one frees (ISO). The cap differs by account age, so the
//   sentence names no number.

import { t, tk } from "../../i18n/core";
import { appLocale } from "../../i18n/format";
import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";

/** Karim's number (the Database's review_age_gate c_age): reviews open 7 days after joining. */
export const REVIEW_ACCOUNT_DAYS = 7;

const DAY_MS = 86400000;

/** A Date from an ISO timestamp, or null when it doesn't read. */
export function instant(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Nov 7", or "Jan 3, 2027" in another year, in the app's language. */
export function dayLabel(at: Date, now: Date = new Date()): string {
  return formatShortDate(at, at.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }, appLocale("en-US"));
}

/** "today at 9:40 AM", "tomorrow at 9:40 AM", else "Tue, Nov 3 at 9:40 AM" (device time). */
export function whenLabel(at: Date, now: Date = new Date()): string {
  const time = clock12(at);
  if (dayKey(at) === dayKey(now)) return t("today at {time}", { time });
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dayKey(at) === dayKey(tomorrow)) return t("tomorrow at {time}", { time });
  const date = formatShortDate(at, { weekday: "short", month: "short", day: "numeric" }, appLocale("en-US"));
  return t("{date} at {time}", { date, time });
}

// ---------------------------------------------------------------------------
// AB7 · reviews

/** When this account may write reviews (created_at + 7 days), or null when it already may (or created_at is unknown: the server decides). */
export function reviewOpensAt(createdAt: string | null | undefined, now: Date = new Date()): Date | null {
  const c = instant(createdAt);
  if (!c) return null;
  const at = new Date(c.getTime() + REVIEW_ACCOUNT_DAYS * DAY_MS);
  return at.getTime() > now.getTime() ? at : null;
}

/** The note in place of a review button, and ATXW0's sentence. */
export function reviewWaitLine(opensAt: Date | null, now: Date = new Date()): string {
  return opensAt ? t("You can write reviews 7 days after joining Centium (from {date}).", { date: dayLabel(opensAt, now) }) : t("You can write reviews 7 days after joining Centium.");
}

/** write_gym_review's ATX03 (new) in write_business_review's words. */
export const REVIEW_INSIDER_LINE = tk("You can't review a business you work for.");

/** The professional-review insert's ATX02 (review_professional, 5 a day): never the server's "Too many review_professional attempts…". */
export const PROFESSIONAL_REVIEW_LIMIT_LINE = tk("You can write up to 5 reviews a day. Try again tomorrow.");

type DbError = { code?: string | null; details?: string | null; message?: string | null } | null | undefined;

/**
 * The review refusals F2 added, or null for every other code (the caller's own
 * map words those). `professional`: the professional-review insert, where
 * ATX02 is its 5-a-day limit.
 */
export function reviewRefusalLine(e: DbError, opts: { professional?: boolean; insider?: boolean; now?: Date } = {}): string | null {
  if (!e?.code) return null;
  if (e.code === "ATXW0") return reviewWaitLine(instant(e.details), opts.now);
  if (e.code === "ATX03" && opts.insider) return t(REVIEW_INSIDER_LINE);
  if (e.code === "ATX02" && opts.professional) return t(PROFESSIONAL_REVIEW_LIMIT_LINE);
  return null;
}

// ---------------------------------------------------------------------------
// AB8 · first messages

/** ATXX0's sentence, with when the next new conversation frees (DETAIL). */
export function firstMessageCapLine(details: string | null | undefined, now: Date = new Date()): string {
  const at = instant(details);
  return at && at.getTime() > now.getTime()
    ? t("You've messaged a lot of new people today. You can keep talking with people you've already messaged, and start new conversations again {when}.", { when: whenLabel(at, now) })
    : t("You've messaged a lot of new people today. You can keep talking with people you've already messaged, and start new conversations again within a day.");
}
