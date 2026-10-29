import {
  db,
  loadFail,
  writeFail,
  type Load,
  type Write,
} from "../store/backend";
import {
  mapBizReview,
  mapInstructorRating,
  mapMetrics,
  mapMyReport,
} from "./mapping";
import type {
  BizReview,
  InstructorRating,
  MyReport,
  ReviewMetrics,
} from "./types";
import { contactRefusal } from "../moderation/text";
export type {
  BizReply,
  BizReview,
  InstructorRating,
  MyReport,
  ReviewMetrics,
} from "./types";
export { REPORT_NOTE_MAX, REPORT_REASONS, inFlagQueue, reputationError } from "./mapping";

// AN13 Reputation and AN5 Ratings on Database stage B14 (HANDOVER_API "B14 ·
// Reputation", 20261121310000). Business side, gate `marketing` unless said:
//   business_reviews_page(p_business_id, …) — every review of the business
//     (all venues, and none for a venue-less business), the reviewer as
//     "Member #" + 4 characters of the review id (never the person), the
//     class, the instructor's first name, the reply and the flag.
//   business_review_metrics(p_business_id, p_from, p_to) — counts, average,
//     reply rate and average hours to reply for one period.
//   instructor_ratings(p_business_id, p_from, p_to) — gate marketing or schedule.
//   reply_to_review / edit_review_reply / delete_review_reply — one public
//     reply per review, keyed by the review (ATXF9: one exists already).
//   report_review(p_review_id, p_reason, p_note ≤ 300) — anyone signed in,
//     the business included ("Report to Centium"); ATXG0 already reported.
// Our own reports are readable (gym_review_reports, select-own policy), which
// is how the flag queue says "You reported this … on {date}".
// B14 sends no flag REASON (injury, harassment) and has no "message the
// reviewer" or "mark as handled" call: the reviewer is masked by design.
// "Pending" is still the server's own answer (a function that is not there).

type Row = Record<string, unknown>;
const PAGE = 200;

/** A read that also says "not yours to read" (ATX03: the seat lacks the permission). */
export type Read<T> = Load<T> | { status: "denied" };
const denied = (error: { code?: string } | null | undefined) => error?.code === "ATX03";
const MAX_PAGES = 10;

export interface BizReviews {
  venues: { id: string; name: string }[];
  reviews: BizReview[];
}

/** Every review of this business, newest first (business_reviews_page). */
export async function fetchBusinessReviews(
  businessId: string,
): Promise<Read<BizReviews>> {
  const g = await db
    .from("gyms")
    .select("id, name")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (g.error) return loadFail(g.error, "Could not read the venues");
  const venues = ((g.data ?? []) as Row[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
  }));
  const names = new Map(venues.map((v) => [v.id, v.name]));
  const reviews: BizReview[] = [];
  for (let p = 0; p < MAX_PAGES; p++) {
    const { data, error } = await db.rpc("business_reviews_page", {
      p_business_id: businessId,
      p_limit: PAGE,
      p_offset: p * PAGE,
    });
    if (denied(error)) return { status: "denied" };
    if (error) return loadFail(error, "Could not read the reviews");
    const rows = (data ?? []) as Row[];
    for (const r of rows) reviews.push(mapBizReview(r, names));
    if (rows.length < PAGE) break;
  }
  return { status: "ok", value: { venues, reviews } };
}

/** business_review_metrics for one period (dates in the business's own zone; a null end is its today). */
export async function fetchReviewMetrics(
  businessId: string,
  from: string,
  to: string | null,
): Promise<Load<ReviewMetrics>> {
  const { data, error } = await db.rpc("business_review_metrics", {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
  });
  if (error) return loadFail(error, "Could not read the review metrics");
  const row = (Array.isArray(data) ? data[0] : data) as Row | null;
  return { status: "ok", value: mapMetrics(row) };
}

/** instructor_ratings; null dates mean all time. */
export async function fetchInstructorRatings(
  businessId: string,
  from: string | null,
  to: string | null,
): Promise<Read<InstructorRating[]>> {
  const { data, error } = await db.rpc("instructor_ratings", {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
  });
  if (denied(error)) return { status: "denied" };
  if (error) return loadFail(error, "Could not read the instructor ratings");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map(mapInstructorRating),
  };
}

/** This account's own review reports (RLS: reporter = me). */
export async function fetchMyReports(
  reviewIds: string[],
): Promise<Load<Map<string, MyReport>>> {
  if (!reviewIds.length) return { status: "ok", value: new Map() };
  const { data, error } = await db
    .from("gym_review_reports")
    .select("review_id, created_at, status")
    .in("review_id", reviewIds);
  if (error) return loadFail(error, "Could not read your reports");
  const map = new Map<string, MyReport>();
  for (const r of (data ?? []) as Row[]) {
    const m = mapMyReport(r);
    map.set(m.reviewId, m);
  }
  return { status: "ok", value: map };
}

export async function postReply(
  reviewId: string,
  body: string,
): Promise<Write<string>> {
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(body);
  if (contact) return { ok: false, code: "contact_details", message: contact };
  const { data, error } = await db.rpc("reply_to_review", {
    p_review_id: reviewId,
    p_body: body.trim(),
  });
  if (error) return writeFail(error, "Could not post the reply");
  return { ok: true, value: String(data ?? "") };
}

export async function editReply(
  reviewId: string,
  body: string,
): Promise<Write<null>> {
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(body);
  if (contact) return { ok: false, code: "contact_details", message: contact };
  const { error } = await db.rpc("edit_review_reply", {
    p_review_id: reviewId,
    p_body: body.trim(),
  });
  if (error) return writeFail(error, "Could not save the reply");
  return { ok: true, value: null };
}

export async function deleteReply(reviewId: string): Promise<Write<null>> {
  const { error } = await db.rpc("delete_review_reply", {
    p_review_id: reviewId,
  });
  if (error) return writeFail(error, "Could not delete the reply");
  return { ok: true, value: null };
}

/**
 * B14 follow-up: "Message privately". start_reviewer_thread(p_review_id)
 * resolves the author on the server and applies start_member_thread()'s rule
 * (the business's own people within 90 days); anyone else answers ATX96, and
 * the page offers Report to Centium instead. Gate messages. The business
 * never learns who wrote it: the thread shows the masked member label.
 */
export async function startReviewerThread(reviewId: string): Promise<Write<string>> {
  const { data, error } = await db.rpc("start_reviewer_thread", { p_review_id: reviewId });
  if (error) return writeFail(error, "Could not open the thread");
  return { ok: true, value: String(data ?? "") };
}

/**
 * Follow-up 20261121390000: takes a flagged review out of (handled = true) or
 * back into (false) the business's own queue. Gate marketing. Not a
 * moderation decision; Centium's report queue is unchanged.
 */
export async function markReviewHandled(reviewId: string, handled = true): Promise<Write<null>> {
  const { error } = await db.rpc("mark_review_handled", { p_review_id: reviewId, p_handled: handled });
  if (error) return writeFail(error, "Could not mark the review");
  return { ok: true, value: null };
}

export async function reportReview(
  reviewId: string,
  reason: string,
  note: string,
): Promise<Write<string>> {
  const { data, error } = await db.rpc("report_review", {
    p_review_id: reviewId,
    p_reason: reason,
    p_note: note.trim() || null,
  });
  if (error) return writeFail(error, "Could not send the report");
  return { ok: true, value: String(data ?? "") };
}
