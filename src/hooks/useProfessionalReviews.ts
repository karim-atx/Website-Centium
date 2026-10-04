import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  createReview,
  editReview,
  fetchMyReviewables,
  fetchReviewsFor,
  withdrawReview,
  type ReviewableProfessional,
  type ReviewRow,
} from "../services/professional-reviews";
import type { MyReviewStatus } from "../services/professional-reviews/rules";

// Reviews for one professional, from the reader's point of view.
//
// ONE HOOK FOR BOTH SIDES OF THE SAME TABLE. A client looking at a listing and
// a professional looking at their own Profile read the same rows through the
// same policy; only which branch admits them differs.
//
// `mine` IS PICKED OUT OF THE LIST rather than fetched separately: the policy
// always admits your own review — withdrawn ones included, which is why its
// status comes from my_reviewable_professionals rather than from the row.
//
// SIGNED OUT, NOTHING IS ASKED. Review text has no anon grant, so the read
// could only fail; the screens show a sign-in prompt instead of an error.

export interface UseProfessionalReviews {
  signedOut: boolean;
  reviews: ReviewRow[];
  /** This account's own review of the professional, if any (withdrawn included). */
  mine: ReviewRow | null;
  /** What the reviewer can do with it now; null until known or when not reviewable. */
  myStatus: MyReviewStatus | null;
  /** Everyone else's — what a listing shows under "Reviews". */
  others: ReviewRow[];
  loading: boolean;
  /** A failed read. Write failures come back from the call instead. */
  error: string | null;
  /** Null until checked; false means the gate refused. */
  canReview: boolean | null;
  /** Creates, or edits inside the 30 days. Resolves to an error message, or null. */
  save: (rating: number, body: string, reviewerNameVisible: boolean) => Promise<string | null>;
  withdraw: () => Promise<string | null>;
  reload: () => Promise<void>;
}

export function useProfessionalReviews(professionalId: string | null): UseProfessionalReviews {
  const { authUserId } = useApp();
  const signedOut = !authUserId;
  // Stamped with the professional they belong to, so navigating between two
  // listings never shows the previous one's rows or answer for a render.
  const [state, setState] = useState<{ id: string; reviews: ReviewRow[]; error: string | null } | null>(null);
  const [gate, setGate] = useState<{ id: string; entry: ReviewableProfessional | null } | null>(null);

  const loadReviews = useCallback(async (id: string) => {
    const result = await fetchReviewsFor(id);
    setState((prev) =>
      result.ok
        ? { id, reviews: result.reviews, error: null }
        : // Keep whatever is on screen: an empty list and an unreachable server
          // look identical once rendered, and only one is true.
          { id, reviews: prev?.id === id ? prev.reviews : [], error: result.message }
    );
  }, []);

  const loadGate = useCallback(
    async (id: string) => {
      // Not asked about oneself: can_review_professional requires reviewer <>
      // professional, so the answer is already known.
      if (id === authUserId) {
        setGate({ id, entry: null });
        return;
      }
      const r = await fetchMyReviewables();
      if (r.ok) setGate({ id, entry: r.professionals.find((p) => p.professionalId === id) ?? null });
      else setGate({ id, entry: null });
    },
    [authUserId]
  );

  useEffect(() => {
    if (!professionalId || !authUserId) return;
    let cancelled = false;
    void fetchReviewsFor(professionalId).then((result) => {
      if (cancelled) return;
      setState(result.ok ? { id: professionalId, reviews: result.reviews, error: null } : { id: professionalId, reviews: [], error: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [professionalId, authUserId]);

  useEffect(() => {
    if (!professionalId || !authUserId || professionalId === authUserId) return;
    let cancelled = false;
    void fetchMyReviewables().then((r) => {
      if (cancelled) return;
      setGate({
        id: professionalId,
        entry: r.ok ? r.professionals.find((p) => p.professionalId === professionalId) ?? null : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [professionalId, authUserId]);

  const current = state && state.id === professionalId ? state : null;
  const reviews = current?.reviews ?? [];
  const entry = gate && gate.id === professionalId ? gate.entry : undefined;
  const canReview = signedOut || professionalId === authUserId ? false : entry === undefined ? null : entry !== null;
  const mine = authUserId ? reviews.find((r) => r.reviewerId === authUserId) ?? null : null;
  const others = authUserId ? reviews.filter((r) => r.reviewerId !== authUserId) : reviews;
  const myStatus = entry ? entry.myStatus : null;

  const reload = useCallback(async () => {
    if (!professionalId || !authUserId) return;
    await Promise.all([loadReviews(professionalId), loadGate(professionalId)]);
  }, [professionalId, authUserId, loadReviews, loadGate]);

  const save = async (rating: number, body: string, reviewerNameVisible: boolean): Promise<string | null> => {
    if (!professionalId || !authUserId) return "Sign in to leave a review.";
    const result = mine
      ? await editReview(mine.id, rating, body, reviewerNameVisible)
      : await createReview(authUserId, professionalId, rating, body, reviewerNameVisible);
    if (!result.ok) return result.message;
    // Read back rather than patch in the draft: edited_at is stamped by a
    // trigger, and the status (editable/final) is the server's to say.
    await reload();
    return null;
  };

  const withdraw = async (): Promise<string | null> => {
    if (!mine) return null;
    const result = await withdrawReview(mine.id);
    if (!result.ok) return result.message;
    await reload();
    return null;
  };

  return {
    signedOut,
    reviews,
    mine,
    myStatus,
    others,
    loading: !signedOut && !!professionalId && !current,
    error: current?.error ?? null,
    canReview,
    save,
    withdraw,
    reload,
  };
}

/**
 * Reviews written about the signed-in professional, for their own Profile,
 * where the reply is written. A professional cannot review themselves, so
 * there is no write path for the review itself here.
 */
export function useReviewsAboutMe(): Pick<UseProfessionalReviews, "reviews" | "loading" | "error" | "reload"> {
  const { authUserId } = useApp();
  const { reviews, loading, error, reload } = useProfessionalReviews(authUserId ?? null);
  return { reviews, loading, error, reload };
}
