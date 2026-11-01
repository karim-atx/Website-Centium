import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { reviewOpensAt } from "../services/safety/model";

/**
 * Round F (AB7): when the signed-in account may write reviews, or null when it
 * already may. From the session's auth user created_at (no request), the same
 * clock the Database's review_age_gate reads; the server still refuses with
 * ATXW0 if the two disagree.
 */
export function useReviewOpensAt(): Date | null {
  const { session } = useApp();
  const createdAt = session?.user?.created_at ?? null;
  return useMemo(() => reviewOpensAt(createdAt), [createdAt]);
}
