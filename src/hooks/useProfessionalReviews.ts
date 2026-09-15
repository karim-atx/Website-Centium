import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  canReviewProfessional,
  createReview,
  deleteReview,
  fetchReviewsFor,
  updateReview,
  type ReviewRow,
} from "../services/professional-reviews";

// Reviews for one professional, from the reader's point of view.
//
// ONE HOOK FOR BOTH SIDES OF THE SAME TABLE. A client looking at a listing and
// a professional looking at their own Profile are reading the same rows
// through the same policy — the difference is only which branch of
// professional_reviews_select_visible admits them — so splitting this in two
// would be two copies of one hydration with two chances to drift.
//
// `mine` IS PICKED OUT OF THE LIST rather than fetched separately. The list
// read already returns it (the policy always admits your own review), so a
// second round trip would only add a way for the two to disagree.

export interface UseProfessionalReviews {
  reviews: ReviewRow[];
  /** This account's own review of the professional, if any. */
  mine: ReviewRow | null;
  /** Everyone else's — what a listing shows under "Reviews". */
  others: ReviewRow[];
  loading: boolean;
  error: string | null;
  /** Null until checked; false means the gate refused. */
  canReview: boolean | null;
  save: (rating: number, body: string) => Promise<boolean>;
  remove: () => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useProfessionalReviews(professionalId: string | null): UseProfessionalReviews {
  const { authUserId } = useApp();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<{ id: string; allowed: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!professionalId) return;
    const result = await fetchReviewsFor(professionalId);
    setLoading(false);
    if (!result.ok) {
      // Keep whatever is on screen. An empty list and an unreachable server
      // look identical once rendered, and only one of them says something
      // true about a professional's reputation.
      setError(result.message);
      return;
    }
    setError(null);
    setReviews(result.reviews);
  }, [professionalId]);

  useEffect(() => {
    if (!professionalId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchReviewsFor(professionalId);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setReviews(result.reviews);
    })();
    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  // The eligibility check, stamped with the professional it answers for. A
  // bare boolean would report the previous listing's answer for one render
  // after navigating between two professionals — long enough to offer a review
  // form to somebody who cannot use it.
  useEffect(() => {
    // Not asked when the subject is the reader: can_review_professional
    // requires reviewer <> professional, so a professional viewing their own
    // reviews would be spending a round trip to be told what the schema
    // already guarantees.
    if (!professionalId || !authUserId || professionalId === authUserId) return;
    let cancelled = false;
    void canReviewProfessional(authUserId, professionalId).then((allowed) => {
      if (!cancelled) setGate({ id: professionalId, allowed });
    });
    return () => {
      cancelled = true;
    };
  }, [professionalId, authUserId]);

  const canReview = gate?.id === professionalId ? gate.allowed : null;
  const mine = authUserId ? reviews.find((r) => r.reviewerId === authUserId) ?? null : null;
  const others = authUserId ? reviews.filter((r) => r.reviewerId !== authUserId) : reviews;

  /** Creates or edits, depending on whether a review already exists. */
  const save = async (rating: number, body: string): Promise<boolean> => {
    if (!professionalId || !authUserId) return false;
    const result = mine
      ? await updateReview(mine.id, rating, body)
      : await createReview(authUserId, professionalId, rating, body);

    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    // From the response, not the draft: edited_at is stamped by a trigger, so
    // the only way to know whether this counted as an edit is to read back
    // what the row now holds.
    setReviews((prev) => {
      const without = prev.filter((r) => r.id !== result.review.id);
      return [result.review, ...without];
    });
    return true;
  };

  const remove = async (): Promise<boolean> => {
    if (!mine) return false;
    const result = await deleteReview(mine.id);
    if (!result.ok) {
      setError(result.message ?? "Couldn't delete your review.");
      return false;
    }
    setError(null);
    setReviews((prev) => prev.filter((r) => r.id !== mine.id));
    return true;
  };

  return { reviews, mine, others, loading, error, canReview, save, remove, reload: load };
}

/**
 * Reviews written about the signed-in professional, for their own Profile.
 *
 * Thin on purpose: it is the same read with the professional as the subject
 * rather than the reader, and it offers no write path because a professional
 * cannot review themselves — can_review_professional requires
 * reviewer <> professional, and the table has a CHECK saying the same thing.
 */
export function useReviewsAboutMe(): { reviews: ReviewRow[]; loading: boolean; error: string | null } {
  const { authUserId } = useApp();
  const { reviews, loading, error } = useProfessionalReviews(authUserId ?? null);
  return { reviews, loading, error };
}
