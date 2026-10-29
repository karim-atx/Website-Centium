// Round D · TR22: the calls behind a reply to a workout log. The rows, checks
// and sentences are in ./logReplyLogic (tested).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import {
  chunkIds,
  groupReplyRows,
  parseReplies,
  parseReviewStates,
  replyProblem,
  replyRefusal,
  type ReviewState,
  type WorkoutLogReply,
} from "./logReplyLogic";

type RpcResult = { data: unknown; error: PostgrestError | null };
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args);

export type Done<T> = { ok: true; data: T } | { ok: false; message: string; gone: boolean };

const refused = (error: unknown, action: Parameters<typeof replyRefusal>[2]): { ok: false; message: string; gone: boolean } => {
  const e = error as { code?: string } | null;
  return { ok: false, message: replyRefusal(e, isOffline(error), action), gone: e?.code === "ATX08" };
};

/** reply_to_workout_log → the new reply's id. */
export async function replyToWorkoutLog(sessionId: string, body: string): Promise<Done<string>> {
  const problem = replyProblem(body);
  if (problem) return { ok: false, message: problem, gone: false };
  try {
    const { data, error } = await rpc("reply_to_workout_log", { p_session_id: sessionId, p_body: body.trim() });
    if (error) return refused(error, "send");
    return { ok: true, data: String(data) };
  } catch (e) {
    return refused(e, "send");
  }
}

/** mark_workout_log_reviewed → reviewed_at (null once un-marked). */
export async function markWorkoutLogReviewed(sessionId: string, reviewed: boolean): Promise<Done<string | null>> {
  try {
    const { data, error } = await rpc("mark_workout_log_reviewed", { p_session_id: sessionId, p_reviewed: reviewed });
    if (error) return refused(error, "review");
    return { ok: true, data: typeof data === "string" ? data : null };
  } catch (e) {
    return refused(e, "review");
  }
}

/** workout_log_replies: the client reads every reply; a professional their own. */
export async function fetchWorkoutLogReplies(sessionId: string): Promise<Done<WorkoutLogReply[]>> {
  try {
    const { data, error } = await rpc("workout_log_replies", { p_session_id: sessionId });
    if (error) return refused(error, "read");
    return { ok: true, data: parseReplies(data, sessionId) };
  } catch (e) {
    return refused(e, "read");
  }
}

/** delete_workout_log_reply: the author takes a reply back. */
export async function deleteWorkoutLogReply(replyId: string): Promise<Done<null>> {
  try {
    const { error } = await rpc("delete_workout_log_reply", { p_reply_id: replyId });
    if (error) return refused(error, "delete");
    return { ok: true, data: null };
  } catch (e) {
    return refused(e, "delete");
  }
}

/**
 * workout_log_review_states for any number of sessions (200 a call). A
 * session the professional can't review is simply absent.
 */
export async function fetchReviewStates(sessionIds: readonly string[]): Promise<Done<Record<string, ReviewState>>> {
  const out: Record<string, ReviewState> = {};
  try {
    for (const ids of chunkIds(sessionIds)) {
      const { data, error } = await rpc("workout_log_review_states", { p_session_ids: ids });
      if (error) return refused(error, "read");
      Object.assign(out, parseReviewStates(data));
    }
    return { ok: true, data: out };
  } catch (e) {
    return refused(e, "read");
  }
}

/**
 * The client's replies for their own sessions, in one read per 100 sessions
 * (workout_session_replies, through workout_session_replies_select_client).
 * `names` gives each professional's first name where the caller knows it.
 */
export async function fetchMyWorkoutReplies(
  sessionIds: readonly string[],
  names: Readonly<Record<string, string>> = {}
): Promise<Done<Record<string, WorkoutLogReply[]>>> {
  const out: Record<string, WorkoutLogReply[]> = {};
  try {
    for (const ids of chunkIds(sessionIds, 100)) {
      const { data, error } = await supabase
        .from("workout_session_replies" as never)
        .select("id, workout_session_id, professional_id, body, created_at")
        .in("workout_session_id", ids);
      if (error) return refused(error, "read");
      Object.assign(out, groupReplyRows(data, names));
    }
    return { ok: true, data: out };
  } catch (e) {
    return refused(e, "read");
  }
}
