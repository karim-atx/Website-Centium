import React, { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ShieldAlert, Star, UserRound } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { useOnline } from "../../../hooks/useOnline";
import {
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  editReply,
  postReply,
  reportReview,
  reputationError,
  type BizReview,
} from "../../../services/reputation";
import { ago } from "./reputationModel";
import { INJURY_REPLY_NOTE } from "./parts";

// AN13 sheets (InsightFlowsV2): Reply to review (AN13-027), Post a reply on
// a flagged review (AN13-022 / -023; the injury note verbatim when a flag
// says injury), Edit reply (AN13-024 O3), the discard dialog (AN13-028) and
// Report this review (OURS-AN13-flag-queue row 5), on B14: reply_to_review,
// edit_review_reply, report_review. Message privately (AN13-018 / -019) is
// not here: B14 masks the reviewer and has no call that reaches them, so the
// flag card offers Report to Centium instead (X-28). Sheet shell =
// BottomSheet tone business (AN11-001 rows 1 to 6): header 53, closes by X
// only (HANDOVER 2.3), so X / Back with text asks first.

export const LIMIT = 500;

export type ComposerMode = "reply" | "flag-reply" | "edit";

const TITLE: Record<ComposerMode, string> = {
  reply: "Reply to review",
  "flag-reply": "Post a reply",
  edit: "Edit reply",
};

const ReviewContext: React.FC<{ review: BizReview; tag?: string | null }> = ({
  review,
  tag,
}) => {
  const r = review.rating ?? 0;
  return (
    <div className="rp-ctx">
      <div className="rp-ctx-top">
        <span className="rp-ctx-av" aria-hidden>
          <UserRound size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="rp-ctx-who">{review.label}</p>
          <p className="rp-ctx-meta">
            <span className="rp-ctx-stars" aria-label={`${r} of 5 stars`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  style={{ display: "flex", opacity: i <= r ? 1 : 0.25 }}
                >
                  <Star
                    size={11}
                    fill="currentColor"
                    strokeWidth={0}
                    aria-hidden
                  />
                </span>
              ))}
            </span>
            {ago(review.createdAt) + (tag ? ` · ${tag}` : "")}
          </p>
        </div>
      </div>
      <p className="rp-ctx-text">{review.body}</p>
    </div>
  );
};

export const ReviewComposer: React.FC<{
  open: boolean;
  mode: ComposerMode;
  review: BizReview | null;
  tag?: string | null;
  /** Injury-flagged review: the handover's safety note shows (KEEP-SAFETY). B14 sends no flag reason yet. */
  injury?: boolean;
  businessName: string;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ open, mode, review, tag, injury, businessName, onClose, onDone }) => {
  const online = useOnline();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const area = useRef<HTMLTextAreaElement | null>(null);
  const replyBody = review?.reply?.body ?? "";

  useEffect(() => {
    if (!open) return;
    setText(mode === "edit" ? replyBody : "");
    setErr(null);
    setBusy(false);
    setDiscard(false);
  }, [open, mode, replyBody]);

  if (!review) return null;
  const over = text.length > LIMIT;
  const changed =
    mode === "edit" ? text.trim() !== replyBody : text.trim().length > 0;
  const canSend = text.trim().length > 0 && !over && online && changed;
  const note = injury && mode === "flag-reply" ? INJURY_REPLY_NOTE : null;

  const close = () => {
    if (busy) return;
    if (changed) setDiscard(true);
    else onClose();
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    setErr(null);
    const r =
      mode === "edit"
        ? await editReply(review.id, text)
        : await postReply(review.id, text);
    setBusy(false);
    if (!r.ok) {
      setErr(
        r.pending
          ? "This isn't available yet."
          : (reputationError(r.code) ??
              (mode === "edit"
                ? "Couldn't save your reply. Try again."
                : "Couldn't post your reply. Try again.")),
      );
      return;
    }
    onDone(
      mode === "edit"
        ? "Reply saved."
        : "Reply posted. Members see it under the review.",
    );
  };

  const cta = busy
    ? mode === "edit"
      ? "Saving…"
      : "Posting…"
    : mode === "edit"
      ? "Save reply"
      : "Post reply";

  return (
    <>
      <BottomSheet
        open={open}
        onClose={close}
        title={TITLE[mode]}
        tone="business"
        headerHeight={53}
        closeOnScrim={false}
        bodyPadding={{ top: 20, right: 20, bottom: 16, left: 20 }}
        footerBottom={30}
        footer={
          <div className="rp an-scope">
            <div className="rp-foot">
              <button type="button" className="rp-cancel tap" onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="rp-cta tap"
                onClick={send}
                disabled={!canSend && !busy}
                aria-busy={busy || undefined}
              >
                {cta}
              </button>
            </div>
          </div>
        }
      >
        <div className="rp an-scope">
          {note && (
            <div className="rp-sheet-note" role="note">
              <ShieldAlert size={16} aria-hidden />
              <p>{note}</p>
            </div>
          )}
          <ReviewContext review={review} tag={tag} />
          <label className="rp-field-l" htmlFor="rp-compose">
            Your public reply
          </label>
          <textarea
            id="rp-compose"
            ref={area}
            className={"rp-area" + (over ? " is-error" : "")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a short, friendly reply"
            rows={3}
            aria-describedby="rp-compose-hint"
            autoFocus
          />
          <p className="rp-hint" id="rp-compose-hint">
            <span>Members see your reply under the review.</span>
            <span className={over ? "is-over" : undefined}>
              {text.length} / {LIMIT}
            </span>
          </p>
          {over && (
            <p className="rp-field-err" role="alert">
              <CircleAlert size={13} aria-hidden />
              Keep it under 500 characters.
            </p>
          )}
          {text.trim() && (
            <>
              <p className="rp-prev-l">How it appears publicly</p>
              <div className="rp-prev">
                <p className="rp-prev-review">{review.body}</p>
                <div className="rp-prev-reply">
                  <p>{businessName} replied</p>
                  <p>{text}</p>
                </div>
              </div>
            </>
          )}
          {!online && (
            <p className="rp-note">You're offline. Connect to send.</p>
          )}
          {err && (
            <div className="rp-send-err" role="alert">
              <CircleAlert
                size={16}
                aria-hidden
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              {err}
            </div>
          )}
        </div>
      </BottomSheet>
      <ConfirmCard
        open={open && discard}
        tone="destructive"
        title="Discard this reply?"
        subtitle="You'll lose what you've written."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        // AN13-028 row 5: Discard #C0392B with white in both modes.
        confirmStyle={{ background: "#C0392B", color: "#FFFFFF" }}
        onCancel={() => {
          setDiscard(false);
          // AN13-030: back to the text, caret at the end.
          window.setTimeout(() => {
            const el = document.getElementById(
              "rp-compose",
            ) as HTMLTextAreaElement | null;
            if (el) {
              el.focus();
              el.setSelectionRange(el.value.length, el.value.length);
            }
          }, 60);
        }}
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
      />
    </>
  );
};

/** OURS-AN13-flag-queue row 5: Report this review (report_review). */
export const ReportSheet: React.FC<{
  open: boolean;
  review: BizReview | null;
  tag?: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ open, review, tag, onClose, onDone }) => {
  const online = useOnline();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setReason(null);
    setNote("");
    setErr(null);
  }, [open]);
  if (!review) return null;
  const send = async () => {
    if (!reason) return;
    setBusy(true);
    setErr(null);
    const r = await reportReview(review.id, reason, note);
    setBusy(false);
    if (!r.ok) {
      setErr(
        r.pending
          ? "This isn't available yet."
          : (reputationError(r.code) ??
              "Couldn't send. Check your connection and try again."),
      );
      return;
    }
    // V6-37: no time promise until the admin team confirms one.
    onDone("Report sent. Centium will look at it.");
  };
  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      title="Report this review"
      tone="business"
      headerHeight={53}
      closeOnScrim={false}
      bodyPadding={{ top: 20, right: 20, bottom: 16, left: 20 }}
      footerBottom={30}
      footer={
        <div className="rp an-scope">
          <div className="rp-foot">
            <button
              type="button"
              className="rp-cancel tap"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rp-cta tap"
              onClick={send}
              disabled={!reason || !online || busy}
              aria-busy={busy || undefined}
            >
              {busy ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      }
    >
      <div className="rp an-scope">
        <ReviewContext review={review} tag={tag} />
        <p className="rp-field-l" id="rp-report-l">
          Why are you reporting it?
        </p>
        <div role="radiogroup" aria-labelledby="rp-report-l">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={reason === r.key}
              className="rp-opt tap"
              onClick={() => setReason(r.key)}
            >
              <span className="rp-opt-t">{r.label}</span>
              {reason === r.key && (
                <span className="rp-opt-check">
                  <Check size={15} strokeWidth={2.6} aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="rp-field-l" htmlFor="rp-report-note">
          Anything we should know?
        </label>
        <textarea
          id="rp-report-note"
          className="rp-area"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, REPORT_NOTE_MAX))}
          rows={3}
          placeholder="Optional"
        />
        {!online && <p className="rp-note">You're offline. Connect to send.</p>}
        {err && (
          <div className="rp-send-err" role="alert">
            <CircleAlert
              size={16}
              aria-hidden
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            {err}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
