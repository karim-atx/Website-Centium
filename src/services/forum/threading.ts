// Round I · FD: one level of answers under a comment (Database 20261226470000:
// forum_replies.parent_reply_id, a published comment on the same post that
// itself answers the post). Pure, so it is tested without a server.

type Threadable = { id: string; parentReplyId: string | null; createdAt: string };

/**
 * The comments in reading order, each followed by its answers (oldest first),
 * with their depth. An answer whose comment isn't shown (withdrawn, removed,
 * or its author is blocked) stands on its own, in time order, so nothing
 * readable disappears.
 */
export function threadReplies<T extends Threadable>(replies: readonly T[]): { reply: T; depth: 0 | 1 }[] {
  const byTime = [...replies].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const shown = new Set(byTime.map((r) => r.id));
  const answers = new Map<string, T[]>();
  const top: T[] = [];
  for (const r of byTime) {
    if (r.parentReplyId && shown.has(r.parentReplyId)) answers.set(r.parentReplyId, [...(answers.get(r.parentReplyId) ?? []), r]);
    else top.push(r);
  }
  return top.flatMap((r) => [{ reply: r, depth: 0 as const }, ...(answers.get(r.id) ?? []).map((a) => ({ reply: a, depth: 1 as const }))]);
}

/** Whether a comment can be answered: it answers the post itself (one level only). */
export const canAnswer = (r: { parentReplyId: string | null }): boolean => r.parentReplyId === null;
