import { useEffect, useState } from "react";
import { fetchReviewStates } from "../../../services/workout/logReplies";
import type { ReviewState } from "../../../services/workout/logReplyLogic";

/**
 * Round D · TR22: the professional's reviewed mark and reply count for the
 * sessions on a list (workout_log_review_states, 200 a call). A failed read
 * leaves the list as it was, without the states.
 */
export function useReviewStates(sessionIds: readonly string[]): Record<string, ReviewState> {
  const [states, setStates] = useState<Record<string, ReviewState>>({});
  const key = [...sessionIds].sort().join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetchReviewStates(key.split(",")).then((r) => {
      if (!cancelled && r.ok) setStates(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return states;
}
