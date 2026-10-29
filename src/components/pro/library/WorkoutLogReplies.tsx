import React, { useEffect, useState } from "react";
import { Check, Send, Trash2 } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { CtaButton, PinnedCta } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { ProCardSkeleton } from "../states";
import { notifWhen } from "../../../services/notifications/notificationsModel";
import { REPLY_MAX, replyProblem, type ReviewState, type WorkoutLogReply } from "../../../services/workout/logReplyLogic";
import {
  deleteWorkoutLogReply,
  fetchReviewStates,
  fetchWorkoutLogReplies,
  markWorkoutLogReviewed,
  replyToWorkoutLog,
} from "../../../services/workout/logReplies";

/**
 * Round D · TR22 "Reply to {client}" and "Mark as reviewed" on a client's
 * finished workout log (Database 20261223010000).
 *
 * - The state comes from workout_log_review_states: a session the
 *   professional can't review (not connected, Workout activity off, not
 *   finished) is absent, and so is this panel's composer and button.
 * - Their own replies (workout_log_replies) are listed oldest first, each
 *   with Delete (tap again to confirm, delete_workout_log_reply).
 * - Send (reply_to_workout_log, 1–1,000 characters) also marks the session
 *   reviewed on the server, so the state follows.
 * - Mark as reviewed is the pinned button; once reviewed, a "Reviewed" line
 *   with "Undo" (mark_workout_log_reviewed false).
 * - ATX08 at any step: the workout is no longer shared ("gone").
 */
export const WorkoutLogReplies: React.FC<{ sessionId: string; clientFirstName: string }> = ({ sessionId, clientFirstName }) => {
  const [state, setState] = useState<"loading" | "ok" | "none" | "error">("loading");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [replies, setReplies] = useState<WorkoutLogReply[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"send" | "review" | string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchReviewStates([sessionId]), fetchWorkoutLogReplies(sessionId)]).then(([rs, rp]) => {
      if (cancelled) return;
      if (!rs.ok || (!rp.ok && !rp.gone)) {
        setState("error");
        return;
      }
      const own = rs.data[sessionId];
      if (!own || !rp.ok) {
        setState("none");
        return;
      }
      setReview(own);
      setReplies(rp.data.filter((r) => r.mine));
      setState("ok");
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, reload]);

  const gone = () => {
    setState("none");
    setReview(null);
  };

  const send = async () => {
    const check = replyProblem(draft);
    if (check) {
      setProblem(check);
      return;
    }
    setBusy("send");
    setProblem(null);
    const r = await replyToWorkoutLog(sessionId, draft);
    setBusy(null);
    if (!r.ok) {
      if (r.gone) gone();
      else setProblem(r.message);
      return;
    }
    setReplies((list) => [...list, { id: r.data, sessionId, professionalId: "", firstName: null, body: draft.trim(), createdAt: new Date().toISOString(), mine: true }]);
    setDraft("");
    // The server marks the session reviewed with the reply.
    setReview((s) => ({ reviewedAt: s?.reviewedAt ?? new Date().toISOString(), replyCount: (s?.replyCount ?? 0) + 1 }));
  };

  const setReviewed = async (on: boolean) => {
    setBusy("review");
    setProblem(null);
    const r = await markWorkoutLogReviewed(sessionId, on);
    setBusy(null);
    if (!r.ok) {
      if (r.gone) gone();
      else setProblem(r.message);
      return;
    }
    setReview((s) => ({ replyCount: s?.replyCount ?? 0, reviewedAt: on ? r.data ?? new Date().toISOString() : null }));
  };

  const remove = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      window.setTimeout(() => setConfirmDelete((c) => (c === id ? null : c)), 3000);
      return;
    }
    setConfirmDelete(null);
    setBusy(id);
    setProblem(null);
    const r = await deleteWorkoutLogReply(id);
    setBusy(null);
    // ATX08 here means it was already deleted: drop it either way.
    if (!r.ok && !r.gone) {
      setProblem(r.message);
      return;
    }
    setReplies((list) => list.filter((x) => x.id !== id));
    setReview((s) => (s ? { ...s, replyCount: Math.max(0, s.replyCount - 1) } : s));
  };

  if (state === "loading") return <div style={{ marginTop: 16 }}><ProCardSkeleton lines={2} /></div>;
  if (state === "error")
    return (
      <p style={{ marginTop: 16, fontSize: textPx(12.5), color: INK.chF }}>
        {"Couldn't load your replies. "}
        <button type="button" onClick={() => setReload((n) => n + 1)} className="tap" style={{ fontWeight: 700, color: INK.prDeep }}>
          Try again
        </button>
      </p>
    );
  if (state === "none" || !review) return null;

  const reviewed = !!review.reviewedAt;
  const left = REPLY_MAX - draft.trim().length;

  return (
    <div style={{ marginTop: 16, paddingBottom: reviewed ? 0 : 96 }}>
      {replies.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8, marginBottom: 12 }}>
          {replies.map((r) => (
            <div key={r.id} style={{ background: INK.prPale, borderRadius: 16, padding: "10px 14px" }}>
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <span style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>{`You · ${notifWhen(r.createdAt)}`}</span>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  disabled={busy === r.id}
                  className="tap inline-flex items-center disabled:opacity-40"
                  style={{ gap: 4, minHeight: 32, fontSize: textPx(12), fontWeight: 600, color: confirmDelete === r.id ? INK.hi : INK.chS }}
                  aria-label={confirmDelete === r.id ? "Tap again to delete this reply" : "Delete this reply"}
                >
                  <Trash2 size={13} aria-hidden />
                  {confirmDelete === r.id ? "Tap again to delete" : "Delete"}
                </button>
              </div>
              <p className="whitespace-pre-wrap break-words" style={{ marginTop: 2, fontSize: textPx(13.5), color: INK.ch }}>{r.body}</p>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, marginBottom: 6 }}>{`Reply to ${clientFirstName || "your client"}`}</span>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.slice(0, REPLY_MAX + 50));
            if (problem) setProblem(null);
          }}
          rows={3}
          placeholder="Say what went well, or what to change next time."
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </label>
      <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 6 }}>
        <span className="tabular-nums" style={{ fontSize: textPx(11.5), color: left < 0 ? INK.hi : INK.chF }}>
          {left < 0 ? `${-left} over the limit` : `${left} left`}
        </span>
        <div style={{ width: 128 }}>
          <CtaButton label="Send" icon={<Send size={15} />} variant="secondary" onClick={() => void send()} loading={busy === "send"} disabled={!draft.trim() || left < 0} />
        </div>
      </div>
      {problem && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {problem}
        </p>
      )}

      {reviewed && (
        <p className="flex items-center mt-4" style={{ gap: 6, fontSize: textPx(12.5), fontWeight: 700, color: INK.good }}>
          <Check size={14} aria-hidden /> Reviewed
          <button
            type="button"
            onClick={() => void setReviewed(false)}
            disabled={busy === "review"}
            className="tap disabled:opacity-40"
            style={{ marginLeft: 8, minHeight: 32, fontWeight: 600, color: INK.chS }}
          >
            Undo
          </button>
        </p>
      )}
      {!reviewed && (
        <PinnedCta primary={{ label: "Mark as reviewed", icon: <Check size={15} />, onClick: () => void setReviewed(true), loading: busy === "review" }} />
      )}
    </div>
  );
};
