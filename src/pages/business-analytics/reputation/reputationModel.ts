import type { BizReview, ReviewMetrics } from "../../../services/reputation/types";
import { appLocale } from "../../../i18n/format";
import {
  addDays,
  dateOf,
  daysBetween,
  isoOf,
  mondayOf,
  previousOf,
  type AnalyticsRange,
} from "../analyticsRange";
import { t, tn, tk } from "../../../i18n/core";

// AN13 numbers, computed from real review rows only (HANDOVER §1: no sample
// numbers). Leads are template sentences from these numbers (V6-37: no text
// analysis). Weeks start on Monday (user rule). Times are hours, not clocks.

const dm = (iso: string) => dateOf(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
const dayOf = (ts: string) => isoOf(new Date(ts));
const mean = (a: number[]) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The handover's injury wording, verbatim (KEEP-SAFETY, SW-36), shown when
 * business_reviews_page's flag_kind is 'injury' (B14 follow-up): the flag
 * card's reason line, and the notes in Message privately and Post a reply
 * (ReviewComposer `injury`). Never reworded. Catalogue keys: t() where shown.
 */
export const INJURY_LINE = tk("Mentions an injury. Read it yourself; Centium never answers these automatically.");
export const INJURY_MESSAGE_NOTE = tk(
  "This review mentions an injury. Centium never answers these automatically. Contact the member privately first, then reply publicly if you choose.",
);
export const INJURY_REPLY_NOTE = tk("This review mentions an injury. Your reply is public, so keep it short and offer to talk privately.");

/** Reviews that count: not redacted, with a rating. */
export const counted = (list: BizReview[]) =>
  list.filter((r) => !r.redacted && r.rating !== null) as (BizReview & {
    rating: number;
  })[];

/** HANDOVER 3.10: the rating shows from 3 reviews. */
export const MIN_FOR_RATING = 3;

/**
 * The row's tag (AN13-011 row 4b, "Lunch HIIT · Jane"): the class and its
 * instructor from write_class_review, led by the venue when the business has
 * more than one.
 */
export function reviewTag(
  r: Pick<BizReview, "gymName" | "classTitle" | "instructor">,
  manyVenues: boolean,
): string | null {
  const parts = [
    manyVenues ? r.gymName : null,
    r.classTitle,
    r.instructor,
  ].filter((x): x is string => !!x);
  return parts.length ? parts.join(" · ") : null;
}

/** "Today", "1 day ago", "3 days ago", "1 week ago", "3 weeks ago", then "8 Sep" / "8 Sep 2025". */
export function ago(ts: string, today: string = isoOf(new Date())): string {
  const d = daysBetween(dayOf(ts), today);
  if (d <= 0) return t("Today");
  if (d < 7) return tn(d, "1 day ago", "{n} days ago");
  if (d < 35) return tn(Math.floor(d / 7), "1 week ago", "{n} weeks ago");
  const day = dayOf(ts);
  return dateOf(day).getFullYear() === dateOf(today).getFullYear()
    ? dm(day)
    : dateOf(day).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" });
}

export interface Metrics {
  total: number;
  inRange: number;
  rating: number | null;
  ratingDelta: number | null;
  /** First review less than 4 weeks ago (AN13-007). */
  early: boolean;
  /** Counts 5 to 1 among every counted review up to the range end. */
  dist: [number, number, number, number, number];
  replyRate: number | null;
  replyRateDelta: number | null;
  replyHours: number | null;
  replyHoursDelta: number | null;
  replied: number;
  /** The last 18 (or fewer) reviews and how many have a reply (AN13-036 row 3). */
  recentN: number;
  recentReplied: number;
}

/** business_review_metrics for the range and the period before it (reply rate and time). */
export interface ServerMetrics {
  cur: ReviewMetrics | null;
  prev: ReviewMetrics | null;
}

const hasReply = (r: BizReview) => !!r.reply;
const rateOf = (x: ReviewMetrics | null | undefined) =>
  x && x.replyRate !== null ? Math.round(x.replyRate) : null;
const hoursOf = (x: ReviewMetrics | null | undefined) =>
  x && x.averageHoursToReply !== null
    ? Math.round(x.averageHoursToReply)
    : null;

export function metricsOf(
  all: BizReview[],
  range: AnalyticsRange,
  server: ServerMetrics | null,
  today: string = isoOf(new Date()),
): Metrics {
  const c = counted(all);
  const upTo = c.filter((r) => dayOf(r.createdAt) <= range.to);
  const prev = previousOf(range);
  const upToPrev = c.filter((r) => dayOf(r.createdAt) <= prev.to);
  const inRange = c.filter(
    (r) => dayOf(r.createdAt) >= range.from && dayOf(r.createdAt) <= range.to,
  );
  const first = c.length
    ? c.reduce((m, r) => (r.createdAt < m ? r.createdAt : m), c[0].createdAt)
    : null;
  const early = !!first && daysBetween(dayOf(first), today) < 28;
  const avg =
    upTo.length >= MIN_FOR_RATING
      ? round1(mean(upTo.map((r) => r.rating))!)
      : null;
  const avgPrev =
    upToPrev.length >= MIN_FOR_RATING
      ? round1(mean(upToPrev.map((r) => r.rating))!)
      : null;
  const dist: [number, number, number, number, number] = [5, 4, 3, 2, 1].map(
    (s) => upTo.filter((r) => r.rating === s).length,
  ) as never;
  const nowRate = rateOf(server?.cur);
  const prevRate = rateOf(server?.prev);
  const nowHours = hoursOf(server?.cur);
  const prevHours = hoursOf(server?.prev);
  const recent = [...upTo]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 18);
  return {
    total: upTo.length,
    inRange: inRange.length,
    rating: avg,
    ratingDelta:
      !early && range.compare && avg !== null && avgPrev !== null
        ? round1(avg - avgPrev)
        : null,
    early,
    dist,
    replyRate: nowRate,
    replyRateDelta:
      !early && nowRate !== null && prevRate !== null
        ? nowRate - prevRate
        : null,
    replyHours: nowHours,
    replyHoursDelta:
      !early && nowHours !== null && prevHours !== null
        ? nowHours - prevHours
        : null,
    replied: c.filter(hasReply).length,
    recentN: recent.length,
    recentReplied: recent.filter(hasReply).length,
  };
}

const sign = (v: number, unit = "") =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + unit;
export const signed = sign;

/** AN13-001 row 7e: numbers only (V6-37). */
export function heroLead(
  m: Metrics,
  kindWords: { people: string; rateWhat: string },
): string {
  if (m.total === 0)
    return kindWords.people === "customers"
      ? t("Reviews appear here once customers rate your products or your store on Centium.")
      : kindWords.people === "clients"
        ? t("Reviews appear here once clients rate their classes or your business on Centium.")
        : t("Reviews appear here once members rate their classes or your business on Centium.");
  if (m.early)
    return t("Your first reviews came in less than 4 weeks ago. Trends start after a full period.");
  if (m.rating === null)
    return t("Your rating shows once you have {n} reviews.", { n: MIN_FOR_RATING });
  if (m.ratingDelta !== null && m.ratingDelta >= 0.1)
    return tn(m.inRange, "Your rating is up {delta} on the period before, with 1 new review.", "Your rating is up {delta} on the period before, with {n} new reviews.", { delta: m.ratingDelta.toFixed(1) });
  if (m.ratingDelta !== null && m.ratingDelta <= -0.1)
    return tn(m.inRange, "Your rating is down {delta} on the period before, with 1 new review.", "Your rating is down {delta} on the period before, with {n} new reviews.", { delta: Math.abs(m.ratingDelta).toFixed(1) });
  return tn(m.inRange, "Your rating held at {rating}, with 1 new review this period.", "Your rating held at {rating}, with {n} new reviews this period.", { rating: m.rating.toFixed(1) });
}

/** AN13-032 row 2 / AN13-034 row 4 (template sentences from counts). */
export function distLines(m: Metrics): { insight: string; caption: string } {
  const tot = m.dist.reduce((s, v) => s + v, 0);
  const five = tot ? Math.round((m.dist[0] / tot) * 100) : 0;
  const low = m.dist[3] + m.dist[4];
  return {
    insight: t("{five}% are 5 stars. {low} of {total} are 2 stars or lower.", { five, low, total: tot }),
    caption: tn(low, "{five}% of reviews are 5 stars. 1 review is 2 stars or lower.", "{five}% of reviews are 5 stars. {n} reviews are 2 stars or lower.", { five }),
  };
}

/** AN13-036 row 4: inside or under target good, over 48 h caution, over 72 h high (OURS rule). */
export function replyTimeTone(h: number): "good" | "caution" | "high" {
  if (h > 72) return "high";
  if (h > 48) return "caution";
  return "good";
}

export function healthLines(m: Metrics): {
  insight: string;
  rateCap: string;
  timeCap: string;
} {
  const h = m.replyHours ?? 0;
  const tone = replyTimeTone(h);
  return {
    insight: t("You reply to {pct}% of reviews, in {h} hours on average.", { pct: m.replyRate ?? 0, h }),
    rateCap:
      m.recentReplied === 1
        ? tn(m.recentN, "1 of the last 1 review has a reply.", "1 of the last {n} reviews has a reply.")
        : tn(m.recentN, "{replied} of the last 1 review have a reply.", "{replied} of the last {n} reviews have a reply.", { replied: m.recentReplied }),
    timeCap:
      tone === "good"
        ? h < 24
          ? t("Target: reply within 24 to 48 hours. You're well inside it.")
          : t("Target: reply within 24 to 48 hours. You're inside it.")
        : tone === "caution"
          ? t("Target: reply within 24 to 48 hours. You're a little over it.")
          : t("Target: reply within 24 to 48 hours. You're well over it."),
  };
}

// ---------------------------------------------------------------------------
// The weekly chart (AN13-001 rows 8 to 8f): 12 Monday weeks ending with the
// week holding the range end, against the 12 weeks before. The line is the
// rating members saw at the end of each week (every counted review so far).

export interface WeekSeries {
  labels: string[];
  xl: string[];
  rating: (number | null)[];
  ratingPrev: (number | null)[];
  count: number[];
  countPrev: number[];
  split: number[][];
  markers: { i: number; t: string; kind: "reply" | "drop" | "rise" }[];
  /** Fewer than 2 weeks since the first review: the chart shows its early box. */
  early: boolean;
}

export const WEEKS = 12;

export function weekSeries(
  all: BizReview[],
  range: AnalyticsRange,
  today: string = isoOf(new Date()),
): WeekSeries {
  const c = counted(all);
  const lastMon = mondayOf(range.to);
  const starts = Array.from({ length: WEEKS }, (_, i) =>
    addDays(lastMon, -7 * (WEEKS - 1 - i)),
  );
  const prevStarts = starts.map((s) => addDays(s, -7 * WEEKS));
  const inWeek = (s: string, r: BizReview) =>
    dayOf(r.createdAt) >= s && dayOf(r.createdAt) <= addDays(s, 6);
  const avgTo = (end: string) => {
    const l = c.filter((r) => dayOf(r.createdAt) <= end);
    return l.length ? round1(mean(l.map((r) => r.rating))!) : null;
  };
  const rating = starts.map((s) => avgTo(addDays(s, 6)));
  const ratingPrev = prevStarts.map((s) => avgTo(addDays(s, 6)));
  const count = starts.map((s) => c.filter((r) => inWeek(s, r)).length);
  const countPrev = prevStarts.map((s) => c.filter((r) => inWeek(s, r)).length);
  const split = starts.map((s) =>
    [5, 4, 3, 2, 1].map(
      (st) => c.filter((r) => inWeek(s, r) && r.rating === st).length,
    ),
  );
  const markers: WeekSeries["markers"] = [];
  starts.forEach((s, i) => {
    const n = all.filter(
      (r) =>
        !!r.reply &&
        dayOf(r.reply.at) >= s &&
        dayOf(r.reply.at) <= addDays(s, 6),
    ).length;
    if (n >= 3) {
      markers.push({ i, t: t("Replied to {n}", { n }), kind: "reply" });
      return;
    }
    const a = rating[i];
    const b = i ? rating[i - 1] : null;
    if (a !== null && b !== null && Math.abs(a - b) >= 0.2)
      markers.push({
        i,
        t: sign(round1(a - b)),
        kind: a < b ? "drop" : "rise",
      });
  });
  const first = c.length
    ? c.reduce((m, r) => (r.createdAt < m ? r.createdAt : m), c[0].createdAt)
    : null;
  return {
    labels: starts.map((s) => t("Week of {date}", { date: dm(s) })),
    xl: [
      dm(starts[0]),
      dm(starts[Math.floor((WEEKS - 1) / 3)]),
      dm(starts[WEEKS - 1]),
    ],
    rating,
    ratingPrev,
    count,
    countPrev,
    split,
    markers,
    early: !!first && daysBetween(dayOf(first), today) < 14,
  };
}

export const starsText = (v: number) =>
  "★".repeat(Math.round(v)) + "☆".repeat(5 - Math.round(v));

// ---------------------------------------------------------------------------
// Reviews & replies (AN13-011 to -017)

/** "inst:{first name}" is the By instructor second level (AN13-014 row 4, OURS). */
export type FilterKey = "all" | "unreplied" | "5" | "4" | "low" | `inst:${string}`;

/** The instructors named on reviews (write_class_review tags), A to Z, with counts. */
export function instructorsOf(list: BizReview[]): { name: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of list) if (r.instructor && !r.redacted) m.set(r.instructor, (m.get(r.instructor) ?? 0) + 1);
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name));
}

export function filterReviews(list: BizReview[], key: FilterKey): BizReview[] {
  return list.filter((r) => {
    if (key === "all") return true;
    if (r.redacted || r.rating === null) return false;
    if (key === "unreplied") return !r.reply;
    if (key.startsWith("inst:")) return r.instructor === key.slice(5);
    if (key === "5") return r.rating === 5;
    if (key === "4") return r.rating === 4;
    return r.rating <= 3;
  });
}

/**
 * OURS-AN13-flag-queue row 4, on what B14 says: a flag has no reason, so the
 * line is "reported by you" (our own open report) or "Centium is reviewing".
 */
export function flagLine(reportedAt: string | null): string {
  return reportedAt
    ? t("You reported this to Centium on {date}. We're reviewing it.", { date: dm(dayOf(reportedAt)) })
    : t("Centium is reviewing this review. You can still reply.");
}

/** AN13-011 row 6: numbers only (V6-37). */
export function allReviewsLine(
  list: BizReview[],
  range: AnalyticsRange,
): string {
  const c = counted(list).filter(
    (r) => dayOf(r.createdAt) >= range.from && dayOf(r.createdAt) <= range.to,
  );
  if (!c.length) return t("No new reviews this period.");
  const by = [5, 4, 3, 2, 1].map((s) => ({
    s,
    n: c.filter((r) => r.rating === s).length,
  }));
  const top = by.reduce((m, x) => (x.n > m.n ? x : m), by[0]);
  return top.s === 1
    ? tn(c.length, "Mostly 1 star this period, from 1 new review.", "Mostly 1 star this period, from {n} new reviews.")
    : tn(c.length, "Mostly {stars} stars this period, from 1 new review.", "Mostly {stars} stars this period, from {n} new reviews.", { stars: top.s });
}
