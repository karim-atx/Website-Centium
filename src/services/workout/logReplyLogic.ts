// Round D · TR22: a professional's reply to a workout the client logged, and
// their own "reviewed" mark (Database 20261223010000, HANDOVER_API "Per-set
// targets and replies to a workout log"). Pure: the rows, the checks and the
// sentences. The calls live in ./logReplies.
//
// - reply_to_workout_log(p_session_id, p_body) → reply id: a finished
//   session, 1–1,000 characters (trimmed), 60 an hour (ATX02).
// - mark_workout_log_reviewed(p_session_id, p_reviewed) → reviewed_at, null
//   once un-marked.
// - workout_log_replies(p_session_id) → reply_id, professional_id,
//   professional_first_name, body, created_at, mine.
// - workout_log_review_states(p_session_ids) → workout_session_id,
//   reviewed_at, reply_count; up to 200 ids, unreviewable ones left out.
// - delete_workout_log_reply(p_reply_id).
// Somebody who can't read the session gets ATX08, as if it didn't exist.

export const REPLY_MAX = 1000;
/** workout_log_review_states takes at most this many ids a call. */
export const REVIEW_STATES_MAX = 200;

/** Why a reply can't be sent yet, or null when it can. */
export function replyProblem(body: string): string | null {
  const n = body.trim().length;
  if (n === 0) return "Write a reply first.";
  if (n > REPLY_MAX) return "A reply is up to 1,000 characters.";
  return null;
}

/** A refusal from any of the five calls, as one plain sentence. */
export function replyRefusal(error: { code?: string | null } | null | undefined, offline: boolean, action: "send" | "review" | "delete" | "read" = "send"): string {
  if (offline) return "You're offline. This needs a connection.";
  switch (error?.code) {
    case "ATX08":
      return action === "delete" ? "That reply is already gone." : "This workout isn't shared with you any more.";
    case "ATX09":
      return "Only professionals can reply to a workout.";
    case "ATX02":
    case "429":
      return "You've sent a lot of replies this hour. Try again later.";
    case "22023":
      return "A reply is 1 to 1,000 characters.";
    case "ATX06":
      return "Sign in again to continue.";
    default:
      return action === "send"
        ? "Couldn't send your reply. Try again."
        : action === "review"
          ? "Couldn't update the review. Try again."
          : action === "delete"
            ? "Couldn't delete the reply. Try again."
            : "Couldn't load the replies. Try again.";
  }
}

export interface WorkoutLogReply {
  id: string;
  sessionId: string;
  professionalId: string;
  /** The professional's first name, when known. */
  firstName: string | null;
  body: string;
  createdAt: string;
  /** The caller wrote it (the professional's own). */
  mine: boolean;
}

export interface ReviewState {
  reviewedAt: string | null;
  replyCount: number;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const list = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object") : [];

/** workout_log_replies' rows for one session, oldest first. */
export function parseReplies(data: unknown, sessionId: string): WorkoutLogReply[] {
  return list(data)
    .flatMap((r) => {
      const id = str(r.reply_id);
      const pro = str(r.professional_id);
      const body = str(r.body);
      const at = str(r.created_at);
      if (!id || !pro || !body || !at) return [];
      return [{ id, sessionId, professionalId: pro, firstName: str(r.professional_first_name)?.trim() ?? null, body, createdAt: at, mine: r.mine === true }];
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * workout_session_replies rows read through the client's own policy, grouped
 * by session, each oldest first. The table has no name, so `names` (by
 * professional id) fills the first name where it is known.
 */
export function groupReplyRows(data: unknown, names: Readonly<Record<string, string>> = {}): Record<string, WorkoutLogReply[]> {
  const out: Record<string, WorkoutLogReply[]> = {};
  for (const r of list(data)) {
    const id = str(r.id);
    const session = str(r.workout_session_id);
    const pro = str(r.professional_id);
    const body = str(r.body);
    const at = str(r.created_at);
    if (!id || !session || !pro || !body || !at) continue;
    (out[session] ??= []).push({ id, sessionId: session, professionalId: pro, firstName: names[pro] ?? null, body, createdAt: at, mine: false });
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return out;
}

/** workout_log_review_states' rows, by session id. */
export function parseReviewStates(data: unknown): Record<string, ReviewState> {
  const out: Record<string, ReviewState> = {};
  for (const r of list(data)) {
    const id = str(r.workout_session_id);
    if (!id) continue;
    const n = typeof r.reply_count === "number" ? r.reply_count : Number(r.reply_count);
    out[id] = { reviewedAt: str(r.reviewed_at), replyCount: Number.isInteger(n) && n > 0 ? n : 0 };
  }
  return out;
}

/** Ids split into calls the reader accepts (200 each), with repeats removed. */
export function chunkIds(ids: readonly string[], size: number = REVIEW_STATES_MAX): string[][] {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += size) out.push(unique.slice(i, i + size));
  return out;
}

/** The list row's state: "Reviewed · 2 replies", "1 reply", or null for neither. */
export function reviewStateText(s: ReviewState | undefined): string | null {
  if (!s) return null;
  const replies = s.replyCount > 0 ? `${s.replyCount} ${s.replyCount === 1 ? "reply" : "replies"}` : null;
  return [s.reviewedAt ? "Reviewed" : null, replies].filter(Boolean).join(" · ") || null;
}

/** The reply's heading: "Reply from Alex" (or "Reply from your coach"). */
export function replyHeading(firstName: string | null | undefined): string {
  return `Reply from ${firstName?.trim() || "your coach"}`;
}
