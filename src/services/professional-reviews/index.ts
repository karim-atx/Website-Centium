import { supabase } from "../../../lib/supabase/client";
import { asReviewStatus, describeReviewError, type MyReviewStatus, type ReviewReportReason } from "./rules";

// Reviews clients leave for professionals: the real professional_reviews rows,
// the professional's one public reply under each, and the reviewer's own
// lifecycle (edit for 30 days, withdraw, report).
//
// THE GATE IS THE DATABASE'S, NOT THIS FILE'S. The INSERT policy calls
// can_review_professional(auth.uid(), professional_id), which requires a
// professional_clients row joining the two — deliberately WITHOUT a
// disconnected_at filter, so somebody who has since left can still review the
// person they worked with. my_reviewable_professionals() lists exactly those
// professionals, listed or not, with the caller's own review status.
//
// ONE REVIEW PER PAIR, FOR GOOD: the unique index on (professional_id,
// reviewer_id) also holds a withdrawn review, so withdrawing does not free the
// slot for a second one.
//
// WRITES AFTER THE FIRST GO THROUGH RPCs. Editing, withdrawing, reporting and
// replying are edit_my_professional_review and friends, which carry the
// 30-day window, the soft delete and the daily rate limits. Only the first
// review is a plain INSERT.
//
// REVIEWER NAMES ARE OPT-IN: reviewer_name_visible plus review_author_names()
// lets an author put their first name on a review. THE TOGGLE IS NOT
// ANONYMITY — the professional can still resolve an active client's name
// through the relationship — and the UI says so.

export interface ReviewReply {
  reviewId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  /** A moderator took it down: the body reads "(removed)". Only the professional sees these. */
  redactedAt: string | null;
}

export interface ReviewRow {
  id: string;
  professionalId: string;
  rating: number;
  /** Null when never written, and also when the review has been redacted. */
  body: string | null;
  createdAt: string;
  /** Set by a trigger on the first rating/body change — never written here. */
  editedAt: string | null;
  redactedAt: string | null;
  redactionReason: string | null;
  /**
   * Null for a reader who is neither the author nor the reviewed
   * professional (review_reviewer_id). Distinct from "no review".
   */
  reviewerId: string | null;
  /** The author chose to show their first name on this review. */
  reviewerNameVisible: boolean;
  /** Resolved where the reader is allowed to; null means "A client". */
  reviewerName: string | null;
  /** The professional's live reply, if any. */
  reply: ReviewReply | null;
}

/** One professional the caller may review — listed or not, current or past. */
export interface ReviewableProfessional {
  professionalId: string;
  firstName: string;
  listedPublicly: boolean;
  connectedNow: boolean;
  myReviewId: string | null;
  myRating: number | null;
  myStatus: MyReviewStatus;
}

export type ReviewsResult = { ok: true; reviews: ReviewRow[] } | { ok: false; message: string };
export type Done = { ok: true } | { ok: false; message: string };

// READ COLUMNS, FROM THE VIEW. reviewer_id is computed per caller by the view;
// redacted_body and redacted_by stay out because no client role can read them.
const READ_COLUMNS =
  "id, professional_id, reviewer_id, rating, body, reviewer_name_visible, created_at, edited_at, redacted_at, redaction_reason";

// A write's returning clause goes to the base table, whose SELECT grant leaves
// out reviewer_id — naming it would fail 42501 although the INSERT is allowed.
const WRITE_RETURN_COLUMNS = "id";

// Never redacted_body: the professional's own redacted reply shows as
// "(removed)", which is what body holds once a moderator moves the text.
const REPLY_COLUMNS = "review_id, body, created_at, edited_at, deleted_at, redacted_at";

type Row = {
  id: string | null;
  professional_id: string | null;
  reviewer_id: string | null;
  rating: number | null;
  body: string | null;
  reviewer_name_visible: boolean | null;
  created_at: string | null;
  edited_at: string | null;
  redacted_at: string | null;
  redaction_reason: string | null;
};

const toReview = (r: Row, name: string | null, reply: ReviewReply | null): ReviewRow => ({
  id: r.id ?? "",
  professionalId: r.professional_id ?? "",
  reviewerId: r.reviewer_id,
  rating: r.rating ?? 0,
  body: r.body,
  createdAt: r.created_at ?? "",
  editedAt: r.edited_at,
  redactedAt: r.redacted_at,
  redactionReason: r.redaction_reason,
  reviewerNameVisible: r.reviewer_name_visible ?? false,
  reviewerName: name,
  reply,
});

async function resolveNames(
  reviewIds: string[],
  reviewerIds: string[]
): Promise<{ byReview: Map<string, string>; byReviewer: Map<string, string> }> {
  const byReview = new Map<string, string>();
  const byReviewer = new Map<string, string>();
  if (reviewIds.length === 0) return { byReview, byReviewer };

  const opted = await supabase.rpc("review_author_names", { p_review_ids: reviewIds });
  if (opted.error) {
    console.warn("[reviews] Could not resolve opted-in names:", opted.error.message);
  }
  for (const row of opted.data ?? []) {
    const name = row.first_name?.trim();
    if (name) byReview.set(row.review_id, name);
  }

  if (reviewerIds.length > 0) {
    const { data } = await supabase
      .from("related_profile_summary")
      .select("id, first_name")
      .in("id", reviewerIds);
    for (const p of data ?? []) {
      const name = (p.first_name as string | null)?.trim();
      if (p.id && name) byReviewer.set(p.id as string, name);
    }
  }

  return { byReview, byReviewer };
}

/**
 * The live replies under these reviews. Withdrawn ones are dropped here: the
 * policy still shows them to the two parties, but a withdrawn reply is not
 * on the page for anyone.
 */
async function fetchReplies(reviewIds: string[]): Promise<Map<string, ReviewReply>> {
  const out = new Map<string, ReviewReply>();
  if (reviewIds.length === 0) return out;
  const { data, error } = await supabase
    .from("professional_review_replies")
    .select(REPLY_COLUMNS)
    .in("review_id", reviewIds)
    .is("deleted_at", null);
  if (error) {
    console.warn("[reviews] Could not read replies:", error.message);
    return out;
  }
  for (const y of data ?? []) {
    out.set(y.review_id, {
      reviewId: y.review_id,
      body: y.body,
      createdAt: y.created_at,
      editedAt: y.edited_at,
      redactedAt: y.redacted_at,
    });
  }
  return out;
}

export async function fetchReviewsFor(professionalId: string): Promise<ReviewsResult> {
  const { data, error } = await supabase
    .from("professional_reviews_readable")
    .select(READ_COLUMNS)
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] Could not read reviews:", error.message);
    return { ok: false, message: "Couldn't load reviews right now." };
  }

  const rows = ((data ?? []) as Row[]).filter((r) => !!r.id);
  const ids = rows.map((r) => r.id as string);
  const [{ byReview, byReviewer }, replies] = await Promise.all([
    resolveNames(
      ids,
      rows.map((r) => r.reviewer_id).filter((id): id is string => !!id)
    ),
    fetchReplies(ids),
  ]);

  return {
    ok: true,
    reviews: rows.map((r) =>
      toReview(
        r,
        byReview.get(r.id as string) ?? (r.reviewer_id ? byReviewer.get(r.reviewer_id) ?? null : null),
        replies.get(r.id as string) ?? null
      )
    ),
  };
}

/** Everyone the caller may review, with their own review's status. */
export async function fetchMyReviewables(): Promise<
  { ok: true; professionals: ReviewableProfessional[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("my_reviewable_professionals");
  if (error) {
    console.error("[reviews] Could not read reviewable professionals:", error.message);
    return { ok: false, message: "Couldn't load your professionals right now." };
  }
  return {
    ok: true,
    professionals: (data ?? []).map((p) => ({
      professionalId: p.professional_id,
      firstName: p.first_name?.trim() || "Your professional",
      listedPublicly: !!p.listed_publicly,
      connectedNow: !!p.connected_now,
      myReviewId: p.my_review_id ?? null,
      myRating: p.my_rating ?? null,
      myStatus: asReviewStatus(p.my_review_status),
    })),
  };
}

export async function createReview(
  reviewerId: string,
  professionalId: string,
  rating: number,
  body: string,
  reviewerNameVisible: boolean
): Promise<Done> {
  const { error } = await supabase
    .from("professional_reviews")
    .insert({
      professional_id: professionalId,
      reviewer_id: reviewerId,
      rating,
      body: body.trim() || null,
      reviewer_name_visible: reviewerNameVisible,
    })
    .select(WRITE_RETURN_COLUMNS)
    .single();

  if (error) {
    console.error("[reviews] Could not create the review:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "create") };
  }
  return { ok: true };
}

/** Within 30 days of posting. A blank body clears the text. */
export async function editReview(
  reviewId: string,
  rating: number,
  body: string,
  reviewerNameVisible: boolean
): Promise<Done> {
  const { error } = await supabase.rpc("edit_my_professional_review", {
    p_review_id: reviewId,
    p_rating: rating,
    p_body: body.trim(),
    p_name_visible: reviewerNameVisible,
  });
  if (error) {
    console.error("[reviews] Could not edit the review:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "edit") };
  }
  return { ok: true };
}

/** A soft delete: hidden from everyone else and out of the average, for good. */
export async function withdrawReview(reviewId: string): Promise<Done> {
  const { error } = await supabase.rpc("withdraw_my_professional_review", { p_review_id: reviewId });
  if (error) {
    console.error("[reviews] Could not withdraw the review:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "withdraw") };
  }
  return { ok: true };
}

/** One report per reviewer per review; a repeat succeeds and changes nothing. */
export async function reportReview(reviewId: string, reason: ReviewReportReason, detail?: string): Promise<Done> {
  const d = detail?.trim();
  const { error } = await supabase.rpc("report_professional_review", {
    p_review_id: reviewId,
    p_reason: reason,
    ...(d ? { p_detail: d.slice(0, 2000) } : {}),
  });
  if (error) {
    console.error("[reviews] Could not report the review:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "report") };
  }
  return { ok: true };
}

/** The professional's one public reply. Also replaces one they withdrew. */
export async function replyToReview(reviewId: string, body: string): Promise<Done> {
  const { error } = await supabase.rpc("reply_to_professional_review", { p_review_id: reviewId, p_body: body.trim() });
  if (error) {
    console.error("[reviews] Could not reply:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "reply") };
  }
  return { ok: true };
}

export async function editReply(reviewId: string, body: string): Promise<Done> {
  const { error } = await supabase.rpc("edit_my_review_reply", { p_review_id: reviewId, p_body: body.trim() });
  if (error) {
    console.error("[reviews] Could not edit the reply:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "editReply") };
  }
  return { ok: true };
}

export async function removeReply(reviewId: string): Promise<Done> {
  const { error } = await supabase.rpc("withdraw_my_review_reply", { p_review_id: reviewId });
  if (error) {
    console.error("[reviews] Could not remove the reply:", error.code, error.message);
    return { ok: false, message: describeReviewError(error, "removeReply") };
  }
  return { ok: true };
}
