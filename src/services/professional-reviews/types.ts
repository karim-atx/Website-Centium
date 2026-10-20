// The review shapes shared by the signed-in reader (./index) and the public
// profile (services/public-pro). Types only: no Supabase import, so pure
// modules and node tests can use them.

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
