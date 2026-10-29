import { useEffect, useState } from "react";
import { fetchMyWorkoutReplies, fetchWorkoutLogReplies } from "../../services/workout/logReplies";
import type { WorkoutLogReply } from "../../services/workout/logReplyLogic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Round D · TR22 (D-S5): the professionals' replies to the client's own
 * logged workouts, by session. One read of workout_session_replies for the
 * sessions on screen; the first names come from `names` (the coaches already
 * resolved for "Sent to {pro}"), and a session with a reply from anyone else
 * is read again through workout_log_replies, which carries the first name.
 * A failed read shows no replies rather than an error: the history is the
 * client's own and still reads without them.
 */
export function useWorkoutReplies(sessionIds: readonly string[], names: Readonly<Record<string, string>>): Record<string, WorkoutLogReply[]> {
  const [replies, setReplies] = useState<Record<string, WorkoutLogReply[]>>({});
  // Only saved sessions (a queued one has no database id yet).
  const key = sessionIds.filter((id) => UUID.test(id)).sort().join(",");
  const namesKey = Object.entries(names)
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join(",");
  useEffect(() => {
    if (!key) {
      setReplies({});
      return;
    }
    let cancelled = false;
    void fetchMyWorkoutReplies(key.split(","), names).then(async (r) => {
      if (cancelled || !r.ok) return;
      const out = { ...r.data };
      const unnamed = Object.keys(out).filter((id) => out[id].some((x) => !x.firstName)).slice(0, 20);
      const named = await Promise.all(unnamed.map((id) => fetchWorkoutLogReplies(id)));
      named.forEach((n, i) => {
        if (n.ok && n.data.length) out[unnamed[i]] = n.data;
      });
      if (!cancelled) setReplies(out);
    });
    return () => {
      cancelled = true;
    };
    // names travel by value (namesKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, namesKey]);
  return replies;
}
