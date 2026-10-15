import type { BizReview, InstructorRating } from "../../../services/reputation/types";

// AN5 Ratings on B14 (instructor_ratings + business_reviews_page). Pure, for
// the node tests. Rules: an average shows from 3 reviews (HANDOVER §3.10,
// MIN_REVIEWS_FOR_AVERAGE); redacted reviews count for nothing; reviews are
// all time (§3.10); the team figure is every tagged review, including
// instructors who have left (OURS-AN5-ratings-empty R11).

export const MIN_REVIEWS = 3;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Weighted average over instructor_ratings rows; null under 3 reviews. */
export function teamOf(rows: InstructorRating[]): { count: number; avg: number | null } {
  const count = rows.reduce((s, r) => s + r.reviews, 0);
  const sum = rows.reduce((s, r) => s + (r.average ?? 0) * r.reviews, 0);
  return { count, avg: count >= MIN_REVIEWS ? round1(sum / count) : null };
}

export interface TeamFigures {
  count: number;
  avg: number | null;
  /** Average now against the average up to the previous period's end (hidden in early data). */
  delta: number | null;
  /** Tagged reviews written inside the range. */
  newInRange: number;
}

export function teamFigures(
  all: InstructorRating[],
  upToPrev: InstructorRating[],
  inRange: InstructorRating[],
  early: boolean,
): TeamFigures {
  const now = teamOf(all);
  const before = teamOf(upToPrev);
  return {
    count: now.count,
    avg: now.avg,
    delta: !early && now.avg !== null && before.avg !== null ? round1(now.avg - before.avg) : null,
    newInRange: inRange.reduce((s, r) => s + r.reviews, 0),
  };
}

/**
 * Reviews per instructor, by business_reviews_page's instructor_id (B14
 * follow-up), so two instructors with one first name each get their own.
 * Only instructors with an instructor_ratings row are keyed.
 */
export function reviewsByInstructor(
  reviews: BizReview[],
  ratings: InstructorRating[],
): Map<string, BizReview[]> {
  const rated = new Set(ratings.map((r) => r.professionalId));
  const out = new Map<string, BizReview[]>();
  for (const rv of reviews) {
    const id = rv.instructorId;
    if (!id || !rated.has(id)) continue;
    out.set(id, [...(out.get(id) ?? []), rv]);
  }
  return out;
}

/** Tagged reviews only (an instructor on the review), newest first. */
export const teamReviews = (reviews: BizReview[]) =>
  reviews
    .filter((r) => !!r.instructor || !!r.instructorId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/** Counts for 5..1 stars; null when the rows don't add up to the reader's count (one reader rule, AN5-048 row 5). */
export function distOf(
  list: BizReview[],
  expected: number,
): [number, number, number, number, number] | null {
  const c = list.filter((r) => !r.redacted && r.rating !== null);
  if (c.length !== expected || expected === 0) return null;
  return [5, 4, 3, 2, 1].map((s) => c.filter((r) => r.rating === s).length) as [
    number,
    number,
    number,
    number,
    number,
  ];
}

export type Trend = "up" | "down" | "steady";

/** Mean of the last 3 months against the 3 before, steady within ±0.1 (AN5-040 row 14). */
export function trendOf(last: InstructorRating | undefined, before: InstructorRating | undefined): Trend | null {
  if (!last || !before || last.average === null || before.average === null || !last.reviews || !before.reviews) return null;
  const d = last.average - before.average;
  if (d >= 0.1) return "up";
  if (d <= -0.1) return "down";
  return "steady";
}

export function metaOf(reviews: number, trend: Trend | null): string {
  if (reviews === 0) return "No reviews yet";
  if (reviews < MIN_REVIEWS) return "Shown after 3 reviews";
  if (!trend) return "Not enough reviews for a trend yet";
  return `Trend ${trend} over 3 months`;
}

export interface RatedPerson {
  id: string;
  name: string;
  seat: number;
  reviews: number;
  /** Null while New (under 3 reviews). */
  avg: number | null;
  trend: Trend | null;
}

/** Highest rated first, New last in team order (AN5-040 row 15). */
export function ratedPeople(
  people: { id: string; name: string; seat: number }[],
  all: InstructorRating[],
  last3: InstructorRating[],
  prev3: InstructorRating[],
): RatedPerson[] {
  const by = (rows: InstructorRating[]) => new Map(rows.map((r) => [r.professionalId, r]));
  const a = by(all);
  const l = by(last3);
  const p = by(prev3);
  const rows = people.map((x, i) => {
    const r = a.get(x.id);
    const n = r?.reviews ?? 0;
    return {
      i,
      v: {
        id: x.id,
        name: x.name,
        seat: x.seat,
        reviews: n,
        avg: n >= MIN_REVIEWS && r?.average != null ? round1(r.average) : null,
        trend: n >= MIN_REVIEWS ? trendOf(l.get(x.id), p.get(x.id)) : null,
      },
    };
  });
  rows.sort((x, y) => {
    if ((x.v.avg === null) !== (y.v.avg === null)) return x.v.avg === null ? 1 : -1;
    if (x.v.avg !== null && y.v.avg !== null && x.v.avg !== y.v.avg) return y.v.avg - x.v.avg;
    if (x.v.avg !== null && x.v.reviews !== y.v.reviews) return y.v.reviews - x.v.reviews;
    return x.i - y.i;
  });
  return rows.map((r) => r.v);
}

const firstWord = (name: string) => name.trim().split(/\s+/)[0] || name;

/** AN5-040 row 2 / AN5-043 row 4 / OURS R1, R3. */
export function ratingsLead(team: TeamFigures, rows: RatedPerson[]): string {
  if (team.count === 0) return "No reviews yet. Members can review an instructor after a class.";
  if (team.avg === null) return "The team average shows after 3 reviews.";
  const rated = rows.filter((r) => r.avg !== null);
  if (rows.length === 1 && rated.length === 1)
    return `${rated[0].name} is rated ${rated[0].avg!.toFixed(1)} from ${rated[0].reviews} reviews.`;
  if (!rated.length) return "Instructors show a rating once they have 3 reviews.";
  const fresh = rows.find((r) => r.avg === null);
  const top = `${firstWord(rated[0].name)} has the highest rating.`;
  return fresh ? `${top} ${firstWord(fresh.name)} shows as New until they have 3 reviews.` : top;
}

/** AN5-045 row 9: the Ratings box's right line against the team average. */
export function vsTeam(avg: number | null, teamAvg: number | null): { text: string; good: boolean } | null {
  if (teamAvg === null) return null;
  const t = teamAvg.toFixed(1);
  if (avg === null) return { text: `Team avg ${t}`, good: false };
  if (avg >= teamAvg + 0.05) return { text: `Above team avg ${t}`, good: true };
  if (avg > teamAvg - 0.05) return { text: `Same as team avg ${t}`, good: false };
  return { text: `Below team avg ${t}`, good: false };
}

export type ReviewSort = "newest" | "highest" | "lowest";

/** AN5-053 / -054: ties newest first; redacted reviews last in Highest / Lowest. */
export function sortReviews(list: BizReview[], sort: ReviewSort): BizReview[] {
  const newest = (a: BizReview, b: BizReview) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
  return [...list].sort((a, b) => {
    if (sort === "newest") return newest(a, b);
    const ra = a.redacted || a.rating === null;
    const rb = b.redacted || b.rating === null;
    if (ra !== rb) return ra ? 1 : -1;
    if (!ra && a.rating !== b.rating) return sort === "highest" ? b.rating! - a.rating! : a.rating! - b.rating!;
    return newest(a, b);
  });
}

/** The accordion's short age (AnTeamV6 l.468 "2 wk"). */
export function shortAge(ts: string, now: number = Date.now()): string {
  const d = Math.max(0, Math.floor((now - Date.parse(ts)) / 86_400_000));
  if (d === 0) return "Today";
  if (d < 7) return `${d} d`;
  if (d < 35) return `${Math.floor(d / 7)} wk`;
  return `${Math.max(1, Math.floor(d / 30))} mo`;
}
