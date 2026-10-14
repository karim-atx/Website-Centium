import type { BizReview, ReviewReply } from "../../../services/reputation";
import {
  addDays,
  dateOf,
  daysBetween,
  isoOf,
  mondayOf,
  previousOf,
  type AnalyticsRange,
} from "../analyticsRange";

// AN13 numbers, computed from real review rows only (HANDOVER §1: no sample
// numbers). Leads are template sentences from these numbers (V6-37: no text
// analysis). Weeks start on Monday (user rule). Times are hours, not clocks.

const MON = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const dm = (iso: string) => {
  const d = dateOf(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
const dayOf = (ts: string) => isoOf(new Date(ts));
const mean = (a: number[]) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Reviews that count: not redacted, with a rating. */
export const counted = (list: BizReview[]) =>
  list.filter((r) => !r.redacted && r.rating !== null) as (BizReview & {
    rating: number;
  })[];

/** HANDOVER 3.10: the rating shows from 3 reviews. */
export const MIN_FOR_RATING = 3;

/** "Member #9E21": 4 characters of the review id, never a stable per-person code (RP-04). */
export function reviewerLabel(r: Pick<BizReview, "id" | "authorName">): {
  who: string;
  masked: boolean;
  initials: string;
} {
  if (r.authorName)
    return {
      who: r.authorName,
      masked: false,
      initials: r.authorName.slice(0, 1).toUpperCase(),
    };
  return {
    who: "Member #" + r.id.replace(/-/g, "").slice(0, 4).toUpperCase(),
    masked: true,
    initials: "",
  };
}

/** "Today", "1 day ago", "3 days ago", "1 week ago", "3 weeks ago", then "8 Sep" / "8 Sep 2025". */
export function ago(ts: string, today: string = isoOf(new Date())): string {
  const d = daysBetween(dayOf(ts), today);
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "1 week ago";
  if (d < 35) return `${Math.floor(d / 7)} weeks ago`;
  const day = dayOf(ts);
  return dateOf(day).getFullYear() === dateOf(today).getFullYear()
    ? dm(day)
    : `${dm(day)} ${dateOf(day).getFullYear()}`;
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

function replyStats(
  list: (BizReview & { rating: number })[],
  replies: Map<string, ReviewReply> | null,
) {
  if (!replies || !list.length)
    return {
      rate: null as number | null,
      hours: null as number | null,
      replied: 0,
    };
  const withReply = list.filter((r) => replies.has(r.id));
  const hours = withReply.map((r) =>
    Math.max(
      0,
      (Date.parse(replies.get(r.id)!.createdAt) - Date.parse(r.createdAt)) /
        3_600_000,
    ),
  );
  return {
    rate: Math.round((withReply.length / list.length) * 100),
    hours: hours.length ? Math.round(mean(hours)!) : null,
    replied: withReply.length,
  };
}

export function metricsOf(
  all: BizReview[],
  range: AnalyticsRange,
  replies: Map<string, ReviewReply> | null,
  today: string = isoOf(new Date()),
): Metrics {
  const c = counted(all);
  const upTo = c.filter((r) => dayOf(r.createdAt) <= range.to);
  const prev = previousOf(range);
  const upToPrev = c.filter((r) => dayOf(r.createdAt) <= prev.to);
  const inRange = c.filter(
    (r) => dayOf(r.createdAt) >= range.from && dayOf(r.createdAt) <= range.to,
  );
  const inPrev = c.filter(
    (r) => dayOf(r.createdAt) >= prev.from && dayOf(r.createdAt) <= prev.to,
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
  const now = replyStats(inRange.length ? inRange : upTo, replies);
  const before = replyStats(inPrev, replies);
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
    replyRate: now.rate,
    replyRateDelta:
      !early && now.rate !== null && before.rate !== null
        ? now.rate - before.rate
        : null,
    replyHours: now.hours,
    replyHoursDelta:
      !early && now.hours !== null && before.hours !== null
        ? now.hours - before.hours
        : null,
    replied: replies ? c.filter((r) => replies.has(r.id)).length : 0,
    recentN: recent.length,
    recentReplied: replies ? recent.filter((r) => replies.has(r.id)).length : 0,
  };
}

const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;
const sign = (v: number, unit = "") =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + unit;
export const signed = sign;

/** AN13-001 row 7e: numbers only (V6-37). */
export function heroLead(
  m: Metrics,
  kindWords: { people: string; rateWhat: string },
): string {
  if (m.total === 0)
    return `Reviews appear here once ${kindWords.people} rate ${kindWords.rateWhat} on Centium.`;
  if (m.early)
    return "Your first reviews came in less than 4 weeks ago. Trends start after a full period.";
  if (m.rating === null)
    return `Your rating shows once you have ${MIN_FOR_RATING} reviews.`;
  const n = plural(m.inRange, "new review");
  if (m.ratingDelta !== null && m.ratingDelta >= 0.1)
    return `Your rating is up ${m.ratingDelta.toFixed(1)} on the period before, with ${n}.`;
  if (m.ratingDelta !== null && m.ratingDelta <= -0.1)
    return `Your rating is down ${Math.abs(m.ratingDelta).toFixed(1)} on the period before, with ${n}.`;
  return `Your rating held at ${m.rating.toFixed(1)}, with ${n} this period.`;
}

/** AN13-032 row 2 / AN13-034 row 4 (template sentences from counts). */
export function distLines(m: Metrics): { insight: string; caption: string } {
  const tot = m.dist.reduce((s, v) => s + v, 0);
  const five = tot ? Math.round((m.dist[0] / tot) * 100) : 0;
  const low = m.dist[3] + m.dist[4];
  return {
    insight: `${five}% are 5 stars. ${low} of ${tot} are 2 stars or lower.`,
    caption: `${five}% of reviews are 5 stars. ${plural(low, "review")} ${low === 1 ? "is" : "are"} 2 stars or lower.`,
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
    insight: `You reply to ${m.replyRate ?? 0}% of reviews, in ${h} hours on average.`,
    rateCap: `${m.recentReplied} of the last ${plural(m.recentN, "review")} ${m.recentReplied === 1 ? "has" : "have"} a reply.`,
    timeCap:
      tone === "good"
        ? h < 24
          ? "Target: reply within 24 to 48 hours. You're well inside it."
          : "Target: reply within 24 to 48 hours. You're inside it."
        : tone === "caution"
          ? "Target: reply within 24 to 48 hours. You're a little over it."
          : "Target: reply within 24 to 48 hours. You're well over it.",
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
  replies: Map<string, ReviewReply> | null,
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
    if (replies) {
      const n = [...replies.values()].filter(
        (rp) =>
          dayOf(rp.createdAt) >= s && dayOf(rp.createdAt) <= addDays(s, 6),
      ).length;
      if (n >= 3) {
        markers.push({ i, t: `Replied to ${n}`, kind: "reply" });
        return;
      }
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
    labels: starts.map((s) => "Week of " + dm(s)),
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

export type FilterKey = "all" | "unreplied" | "5" | "4" | "low";

export function filterReviews(
  list: BizReview[],
  key: FilterKey,
  replies: Map<string, ReviewReply> | null,
): BizReview[] {
  return list.filter((r) => {
    if (key === "all") return true;
    if (r.redacted || r.rating === null) return false;
    if (key === "unreplied") return !!replies && !replies.has(r.id);
    if (key === "5") return r.rating === 5;
    if (key === "4") return r.rating === 4;
    return r.rating <= 3;
  });
}

/** AN13-011 row 6: numbers only (V6-37). */
export function allReviewsLine(
  list: BizReview[],
  range: AnalyticsRange,
): string {
  const c = counted(list).filter(
    (r) => dayOf(r.createdAt) >= range.from && dayOf(r.createdAt) <= range.to,
  );
  if (!c.length) return "No new reviews this period.";
  const by = [5, 4, 3, 2, 1].map((s) => ({
    s,
    n: c.filter((r) => r.rating === s).length,
  }));
  const top = by.reduce((m, x) => (x.n > m.n ? x : m), by[0]);
  return `Mostly ${top.s} ${top.s === 1 ? "star" : "stars"} this period, from ${plural(c.length, "new review")}.`;
}
