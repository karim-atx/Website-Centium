import { useCallback, useEffect, useMemo, useState } from "react";
import { shiftDate, todayLocal } from "../../../utils/date";
import { previousRange, type AnalyticsRange } from "../shell/range";
import {
  fetchBusinessReviews,
  fetchInstructorRatings,
  type BizReview,
  type InstructorRating,
} from "../../../services/reputation";
import { reviewsByInstructor, teamFigures, teamReviews, type TeamFigures } from "./ratingsModel";

// AN5 Ratings on B14 (V6-85). instructor_ratings (gate marketing or
// schedule) gives each instructor's count and average: all time, up to the
// previous period's end (the delta), the range (new reviews) and the last
// 3 months against the 3 before (the trend). business_reviews_page (gate
// marketing) gives the words for the distribution, snippets, Latest reviews
// and the reviews sheets; without marketing those stay hidden and the
// averages still show.

export interface RatingsState {
  status: "loading" | "ok" | "error" | "offline" | "denied";
  team: TeamFigures;
  all: InstructorRating[];
  /** Tagged reviews inside the range, per instructor. */
  inRange: InstructorRating[];
  last3: InstructorRating[];
  prev3: InstructorRating[];
  /** Tagged reviews, newest first; null when business_reviews_page can't be read here. */
  reviews: BizReview[] | null;
  /** Matched reviews per professional id (unique first names only). */
  byPerson: Map<string, BizReview[]>;
  updatedAt: number | null;
  reload: () => void;
}

const EMPTY_TEAM: TeamFigures = { count: 0, avg: null, delta: null, newInRange: 0 };

export function useRatings(businessId: string | null, range: AnalyticsRange, early: boolean): RatingsState {
  const [tick, setTick] = useState(0);
  const [s, setS] = useState<{
    status: RatingsState["status"];
    all: InstructorRating[];
    upToPrev: InstructorRating[];
    inRange: InstructorRating[];
    last3: InstructorRating[];
    prev3: InstructorRating[];
    reviews: BizReview[] | null;
    updatedAt: number | null;
  }>({ status: "loading", all: [], upToPrev: [], inRange: [], last3: [], prev3: [], reviews: null, updatedAt: null });

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    const today = todayLocal();
    const prev = previousRange(range);
    void Promise.all([
      fetchInstructorRatings(businessId, null, null),
      fetchInstructorRatings(businessId, null, prev.to),
      fetchInstructorRatings(businessId, range.from, range.to),
      fetchInstructorRatings(businessId, shiftDate(today, -89), today),
      fetchInstructorRatings(businessId, shiftDate(today, -179), shiftDate(today, -90)),
      fetchBusinessReviews(businessId),
    ]).then(([all, upToPrev, inRange, last3, prev3, rv]) => {
      if (!alive) return;
      const reads = [all, upToPrev, inRange, last3, prev3];
      if (reads.some((r) => r.status === "denied")) {
        setS((x) => ({ ...x, status: "denied" }));
        return;
      }
      const bad = reads.find((r) => r.status !== "ok");
      if (bad) {
        const offline = bad.status === "error" && bad.offline;
        setS((x) => ({ ...x, status: offline ? "offline" : "error" }));
        return;
      }
      const val = (r: (typeof reads)[number]) => (r.status === "ok" ? r.value : []);
      setS({
        status: "ok",
        all: val(all),
        upToPrev: val(upToPrev),
        inRange: val(inRange),
        last3: val(last3),
        prev3: val(prev3),
        reviews: rv.status === "ok" ? teamReviews(rv.value.reviews) : null,
        updatedAt: Date.now(),
      });
    });
    return () => {
      alive = false;
    };
  }, [businessId, range, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const team = useMemo(
    () => (s.status === "ok" || s.updatedAt ? teamFigures(s.all, s.upToPrev, s.inRange, early) : EMPTY_TEAM),
    [s, early]
  );
  const byPerson = useMemo(() => reviewsByInstructor(s.reviews ?? [], s.all), [s.reviews, s.all]);
  return useMemo(
    () => ({ status: s.status, team, all: s.all, inRange: s.inRange, last3: s.last3, prev3: s.prev3, reviews: s.reviews, byPerson, updatedAt: s.updatedAt, reload }),
    [s, team, byPerson, reload]
  );
}
