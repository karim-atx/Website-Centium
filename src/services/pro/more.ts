// Release 3 W6 · the readers behind the professional More menu's row lines
// (MO1 v7): the Verified tag, where you work, the service area and the review
// line. Each part fails on its own to null, and a null line shows the row's
// plain subtitle, never a guess.

import { rpc } from "./rpc";
import { fetchMyEmployments } from "../business-team/employment";
import { fetchMyProfile } from "../professional-profile";

export interface MoreSummary {
  /** professional_verification_is_current(); null when it couldn't be read. */
  verified: boolean | null;
  /** Businesses whose team you're on (accepted seats). */
  businesses: string[] | null;
  /** The map area's label, or "" when the area is off. */
  areaLabel: string | null;
  /** practice_insights() average_rating and review_count. */
  rating: { average: number | null; count: number } | null;
}

export async function fetchMoreSummary(userId: string): Promise<MoreSummary> {
  const [ver, emp, prof, ins] = await Promise.all([
    rpc("professional_verification_is_current", { p_professional_id: userId }),
    fetchMyEmployments(),
    fetchMyProfile(userId),
    rpc("practice_insights"),
  ]);
  const verified = !ver.error && typeof ver.data === "boolean" ? ver.data : null;
  const businesses = emp.ok ? emp.value.filter((e) => e.acceptedAt).map((e) => e.businessName) : null;
  const areaLabel = prof.ok ? (prof.profile?.mapArea ? prof.profile.mapArea.label ?? "" : "") : null;
  let rating: MoreSummary["rating"] = null;
  if (!ins.error) {
    const row = (Array.isArray(ins.data) ? ins.data[0] : ins.data) as { average_rating: number | string | null; review_count: number | null } | undefined;
    if (row) rating = { average: row.average_rating == null ? null : Number(row.average_rating), count: row.review_count ?? 0 };
  }
  return { verified, businesses, areaLabel, rating };
}
