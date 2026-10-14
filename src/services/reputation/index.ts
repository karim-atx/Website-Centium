import {
  db,
  isNotShipped,
  loadFail,
  writeFail,
  type Load,
  type Write,
} from "../store/backend";
import { isOffline } from "../network-error";

// v6 Batch 5 · AN13 Reputation: a business's reviews, replies and flags.
//
// LIVE TODAY (local stack, 14 Oct 2026): gym_reviews per venue through the
// two public readers, gym_reviews_page() (first name only, null for a minor
// or a hidden name, redaction kept as a row, author_is_member) and
// gym_review_summary(). A business reads every venue it owns (gyms.business_id)
// and the screens compute the rating, counts and weekly series from those rows.
//
// B14 (Reputation, BACKEND_REQUIREMENTS-v6 RP-01 to RP-04) IS NOT ON THE LOCAL
// STACK and has no section in HANDOVER_API.md yet. The names below follow
// RP-02 / RP-03 and the professional reply pattern (reply_to_professional_
// review, edit_my_review_reply, withdraw_my_review_reply,
// report_professional_review); when B14 lands, check each name there and
// change it HERE, not in a page. "Pending" is decided by the server's own
// answer (missing table / function), never by a flag:
//   gym_review_replies(id, review_id, body, created_at, edited_at, redacted_at)
//   reply_to_gym_review(p_review_id, p_body) → uuid
//   edit_my_gym_review_reply(p_reply_id, p_body)
//   withdraw_my_gym_review_reply(p_reply_id)
//   my_flagged_gym_reviews(p_business_id) → (review_id, reason, reported_at,
//     messaged_at, handled_at, may_message)  reason: injury | harassment |
//     reported | centium_review | kept
//   report_gym_review(p_review_id, p_reason, p_note)
//   mark_gym_review_flag_handled(p_review_id)
//   message_gym_reviewer(p_review_id, p_body) → thread id (B7 / BU6-06: only
//     the business's own members or customers; may_message says which, X-28)

export interface BizReview {
  id: string;
  gymId: string;
  gymName: string;
  /** Null when redacted. */
  rating: number | null;
  body: string | null;
  /** A first name; null for a minor, a hidden name, or a redacted review. */
  authorName: string | null;
  authorIsMember: boolean;
  createdAt: string;
  redacted: boolean;
}

export interface BizReviews {
  venues: { id: string; name: string }[];
  reviews: BizReview[];
}

type Row = Record<string, unknown>;
const PAGE = 100;
const MAX_PAGES = 10;

/** Every review of every venue this business owns, newest first. */
export async function fetchBusinessReviews(
  businessId: string,
): Promise<Load<BizReviews>> {
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
  const reviews: BizReview[] = [];
  for (const v of venues) {
    for (let p = 0; p < MAX_PAGES; p++) {
      const { data, error } = await db.rpc("gym_reviews_page", {
        p_gym_id: v.id,
        p_sort: "recent",
        p_limit: PAGE,
        p_offset: p * PAGE,
      });
      if (error) return loadFail(error, "Could not read the reviews");
      const rows = (data ?? []) as Row[];
      for (const r of rows) {
        reviews.push({
          id: String(r.id),
          gymId: v.id,
          gymName: v.name,
          rating:
            r.rating === null || r.rating === undefined
              ? null
              : Number(r.rating),
          body: typeof r.body === "string" ? r.body : null,
          authorName:
            typeof r.author_name === "string" && r.author_name.trim()
              ? r.author_name.trim()
              : null,
          authorIsMember: r.author_is_member === true,
          createdAt: String(r.created_at),
          redacted: r.redacted === true,
        });
      }
      if (rows.length < PAGE) break;
    }
  }
  reviews.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { status: "ok", value: { venues, reviews } };
}

// ---------------------------------------------------------------------------
// B14 replies

export interface ReviewReply {
  id: string;
  reviewId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

/** The business's replies to these reviews; pending until B14. */
export async function fetchReplies(
  reviewIds: string[],
): Promise<Load<Map<string, ReviewReply>>> {
  let q = db
    .from("gym_review_replies")
    .select("id, review_id, body, created_at, edited_at")
    .is("redacted_at", null);
  // An empty list still asks the server, so "pending" is answered either way.
  q = reviewIds.length ? q.in("review_id", reviewIds) : q.limit(0);
  const { data, error } = await q;
  if (error) return loadFail(error, "Could not read the review replies");
  const map = new Map<string, ReviewReply>();
  for (const r of (data ?? []) as Row[]) {
    map.set(String(r.review_id), {
      id: String(r.id),
      reviewId: String(r.review_id),
      body: String(r.body ?? ""),
      createdAt: String(r.created_at),
      editedAt: typeof r.edited_at === "string" ? r.edited_at : null,
    });
  }
  return { status: "ok", value: map };
}

export async function postReply(
  reviewId: string,
  body: string,
): Promise<Write<string>> {
  const { data, error } = await db.rpc("reply_to_gym_review", {
    p_review_id: reviewId,
    p_body: body.trim(),
  });
  if (error) return writeFail(error, "Could not post the reply");
  return { ok: true, value: String(data ?? "") };
}

export async function editReply(
  replyId: string,
  body: string,
): Promise<Write<null>> {
  const { error } = await db.rpc("edit_my_gym_review_reply", {
    p_reply_id: replyId,
    p_body: body.trim(),
  });
  if (error) return writeFail(error, "Could not save the reply");
  return { ok: true, value: null };
}

export async function withdrawReply(replyId: string): Promise<Write<null>> {
  const { error } = await db.rpc("withdraw_my_gym_review_reply", {
    p_reply_id: replyId,
  });
  if (error) return writeFail(error, "Could not delete the reply");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// B14 flags and reports

export type FlagReason =
  "injury" | "harassment" | "reported" | "centium_review" | "kept";

export interface ReviewFlag {
  reviewId: string;
  reason: FlagReason;
  reportedAt: string | null;
  messagedAt: string | null;
  handledAt: string | null;
  /** X-28: the reviewer is (or was in the last 12 months) this business's member or customer. */
  mayMessage: boolean;
}

const REASONS: FlagReason[] = [
  "injury",
  "harassment",
  "reported",
  "centium_review",
  "kept",
];

export async function fetchFlags(
  businessId: string,
): Promise<Load<ReviewFlag[]>> {
  const { data, error } = await db.rpc("my_flagged_gym_reviews", {
    p_business_id: businessId,
  });
  if (error) return loadFail(error, "Could not read the flagged reviews");
  return {
    status: "ok",
    value: ((data ?? []) as Row[])
      .filter((r) => REASONS.includes(r.reason as FlagReason))
      .map((r) => ({
        reviewId: String(r.review_id),
        reason: r.reason as FlagReason,
        reportedAt: typeof r.reported_at === "string" ? r.reported_at : null,
        messagedAt: typeof r.messaged_at === "string" ? r.messaged_at : null,
        handledAt: typeof r.handled_at === "string" ? r.handled_at : null,
        mayMessage: r.may_message === true,
      })),
  };
}

/** OURS-AN13-flag-queue row 5: reasons mapped to report_reason where it exists (BU6-07 adds the two new ones). */
export const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "harassment", label: "Harassment" },
  { key: "spam", label: "Spam" },
  { key: "not_about_this_business", label: "Not about this business" },
  { key: "shares_private_information", label: "Shares private information" },
  { key: "other", label: "Something else" },
];

export async function reportReview(
  reviewId: string,
  reason: string,
  note: string,
): Promise<Write<null>> {
  const { error } = await db.rpc("report_gym_review", {
    p_review_id: reviewId,
    p_reason: reason,
    p_note: note.trim() || null,
  });
  if (error) return writeFail(error, "Could not send the report");
  return { ok: true, value: null };
}

export async function markFlagHandled(reviewId: string): Promise<Write<null>> {
  const { error } = await db.rpc("mark_gym_review_flag_handled", {
    p_review_id: reviewId,
  });
  if (error) return writeFail(error, "Could not mark the review as handled");
  return { ok: true, value: null };
}

export async function messageReviewer(
  reviewId: string,
  body: string,
): Promise<Write<string>> {
  const { data, error } = await db.rpc("message_gym_reviewer", {
    p_review_id: reviewId,
    p_body: body.trim(),
  });
  if (error) return writeFail(error, "Could not send the message");
  return { ok: true, value: String(data ?? "") };
}

/** A write that failed because B14 is not on this database. */
export const isPendingWrite = (w: Write<unknown>) => !w.ok && !!w.pending;
export { isNotShipped, isOffline };
