import React, { useState } from "react";
import { Pencil, Star } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { ReviewItem } from "./ReviewItem";
import { textPx } from "../../theme/textSize";
import type { ReviewRow } from "../../services/professional-reviews";
import {
  EDIT_WINDOW_OVER,
  REPLY_BODY_MAX,
  REVIEW_BODY_MAX,
  REVIEW_REPORT_REASONS,
  bodyLength,
  counterLabel,
  editWindowLabel,
  type MyReviewStatus,
  type ReviewReportReason,
} from "../../services/professional-reviews/rules";

// The review screens' shared parts: the reviewer's own card, the form that
// writes and edits a review, the report form and the professional's reply
// sheet. One copy each, used by the listing, the Professionals page and the
// professional's Profile.

const fieldClass =
  "w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none";

/**
 * A textarea's character count, red once over the limit. `nearLimitOnly`
 * (MO1.2.1.2, decision 23 kept-list 196): shown only in the last 10% of the
 * limit or over it.
 */
const Counter: React.FC<{ text: string; max: number; id: string; nearLimitOnly?: boolean }> = ({ text, max, id, nearLimitOnly }) => {
  const len = bodyLength(text);
  const over = len > max;
  if (nearLimitOnly && len < max * 0.9) return null;
  return (
    <p id={id} aria-live="polite" className={`text-[11px] font-semibold text-right mt-1 tabular-nums ${over ? "text-status-high" : "text-charcoal-faint"}`}>
      {counterLabel(text, max)}
    </p>
  );
};

/** Two taps for a destructive action; the first arms it for three seconds. */
function useArmed(): [boolean, () => boolean] {
  const [armed, setArmed] = useState(false);
  const tap = () => {
    if (armed) return true;
    setArmed(true);
    window.setTimeout(() => setArmed(false), 3000);
    return false;
  };
  return [armed, tap];
}

// ---------------------------------------------------------------------------
// The reviewer's own card.
// ---------------------------------------------------------------------------

/**
 * "My Review": the empty prompt, or the review with what can still be done
 * with it — edit inside 30 days (with the time left), then only withdraw.
 */
export const MyReviewCard: React.FC<{
  firstName: string;
  review: ReviewRow | null;
  status: MyReviewStatus | null;
  onOpen: () => void;
  onWithdraw: () => Promise<string | null>;
  className?: string;
  /** MO1.2.1 puts "My review" above the card as a section label. */
  hideLabel?: boolean;
}> = ({ firstName, review, status, onOpen, onWithdraw, className = "", hideLabel }) => {
  // The time is read once per mount, not on every render.
  const [now] = useState(() => Date.now());
  const [armed, arm] = useArmed();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdrawn = status === "withdrawn";
  const editable = !!review && status === "editable";
  const left = review && editable ? editWindowLabel(review.createdAt, now) : null;

  const withdraw = async () => {
    if (busy || !arm()) return;
    setBusy(true);
    setError(await onWithdraw());
    setBusy(false);
  };

  return (
    <Card className={className}>
      <div className={`flex items-center gap-2 ${hideLabel ? (review ? "justify-end mb-1.5" : "hidden") : "justify-between mb-1.5"}`}>
        {!hideLabel && <p className="section-label text-charcoal-faint">My Review</p>}
        {(!review || editable) && (
          <Button size="sm" variant="outline" onClick={onOpen}>
            <Pencil size={13} /> {review ? "Edit" : "Rate & Review"}
          </Button>
        )}
      </div>
      {!review ? (
        hideLabel ? (
          // MO1.2.1: the prompt and the outline button on one row.
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-charcoal-faint">You haven't reviewed {firstName} yet</p>
            {/* MO1.2.1 #7: 12/700 in the deep primary ink with a 1 px primary-dark
                outline (#7D6BB5, sampled from the frame). */}
            <Button
              size="sm"
              variant="outline"
              onClick={onOpen}
              // 32 tall, radius 10 (measured on the frame; Foundations outline 32–40 / 10–12).
              className="shrink-0 !h-8 !rounded-[10px]"
              style={{ fontSize: textPx(12), color: "rgb(var(--c-primary-deep-text))", borderColor: "rgb(var(--c-primary-dark))" }}
            >
              <Pencil size={13} /> Rate &amp; Review
            </Button>
          </div>
        ) : (
          <p className="text-sm text-charcoal-faint">You haven't reviewed {firstName} yet</p>
        )
      ) : withdrawn ? (
        <>
          <ReviewItem review={{ ...review, reply: null }} showName={false} starSize={14} />
          <p className="text-xs text-charcoal-faint mt-2 leading-relaxed">
            You withdrew this review. Only you can see it, and it doesn't count toward {firstName}'s rating.
          </p>
        </>
      ) : (
        <>
          <ReviewItem review={review} showName={false} starSize={14} replyLabel={`Reply from ${firstName}`} />
          {status !== "removed" && (
            <p className="text-xs text-charcoal-faint mt-2">{left ?? EDIT_WINDOW_OVER}</p>
          )}
          {/* Withdrawing has no time limit, so once editing has closed it is
              offered here; inside the window it lives in the edit sheet. */}
          {!editable && (
            <button
              type="button"
              onClick={() => void withdraw()}
              disabled={busy}
              className="tap min-h-[44px] text-xs font-semibold text-status-high"
            >
              {armed ? "Tap again to withdraw your review" : "Withdraw review"}
            </button>
          )}
          {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
        </>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Writing and editing a review.
// ---------------------------------------------------------------------------

type FormProps = {
  open: boolean;
  onClose: () => void;
  firstName: string;
  existing: ReviewRow | null;
  onSave: (rating: number, body: string, nameVisible: boolean) => Promise<string | null>;
  onWithdraw: () => Promise<string | null>;
};

export const ReviewFormSheet: React.FC<FormProps> = (props) => (
  <BottomSheet open={props.open} onClose={props.onClose} title={`Rate ${props.firstName}`}>
    {/* Mounted afresh on each opening, so it starts from what is stored. */}
    <ReviewForm {...props} />
  </BottomSheet>
);

function ReviewForm({ onClose, firstName, existing, onSave, onWithdraw }: FormProps) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [text, setText] = useState(existing?.body ?? "");
  // OPT-IN, DEFAULTING OFF, matching reviewer_name_visible's default.
  const [showName, setShowName] = useState(existing?.reviewerNameVisible ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armed, arm] = useArmed();
  const [now] = useState(() => Date.now());

  const over = bodyLength(text) > REVIEW_BODY_MAX;
  const left = existing ? editWindowLabel(existing.createdAt, now) : null;

  const submit = async () => {
    if (busy || over) return;
    setBusy(true);
    const message = await onSave(rating, text, showName);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  };

  const withdraw = async () => {
    if (busy || !arm()) return;
    setBusy(true);
    const message = await onWithdraw();
    setBusy(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <div className="space-y-5 animate-fade-slide-up">
      {/* MO1.2.1.2: stars on a 44 pitch (34 + gap 10), the textarea 209 tall
          and "Your review" 12/600 in the faint grey (all measured on the frame
          at 2x, the label colour from the table). */}
      <div className="flex items-center justify-center gap-2.5" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i + 1}
            onClick={() => setRating(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
            className="tap"
          >
            <Star size={34} strokeWidth={1.5} className={i < rating ? "fill-gold text-gold" : "text-charcoal/15"} />
          </button>
        ))}
      </div>
      <label className="block">
        {/* Re-measured (revision round): label box ends 10 above the field; the field is 209 outside. */}
        <span className="text-xs font-semibold text-charcoal-faint mb-2.5 block">Your review</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`How has your experience with ${firstName} been?`}
          rows={5}
          aria-describedby="review-count"
          aria-invalid={over || undefined}
          className={`${fieldClass} h-[209px]`}
        />
        <Counter text={text} max={REVIEW_BODY_MAX} id="review-count" nearLimitOnly />
      </label>
      {/* NOT "post anonymously": the professional can resolve an active
          client's name from the relationship whatever this says.
          Decision 23 (kept-list 197): a Toggle row (Foundations Toggle 44×26)
          in place of the checkbox; the words are unchanged. */}
      <div className="flex items-center gap-3">
        <p className="flex-1 min-w-0 text-xs text-charcoal-soft leading-relaxed">
          Show my first name on this review.{" "}
          <span className="text-charcoal-faint">Your professional can see who left it either way.</span>
        </p>
        <Toggle checked={showName} onChange={setShowName} label="Show my first name on this review" />
      </div>
      {over && (
        <p className="text-xs font-semibold text-status-high">
          A review can be up to {REVIEW_BODY_MAX.toLocaleString("en")} characters.
        </p>
      )}
      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
      {!existing && (
        <p className="text-[11px] text-charcoal-faint leading-relaxed">
          You can edit your review for 30 days after posting it, and withdraw it at any time.
        </p>
      )}
      {left && <p className="text-[11px] text-charcoal-faint">{left}</p>}
      <Button fullWidth size="lg" onClick={() => void submit()} disabled={busy || over}>
        {busy ? "Saving…" : existing ? "Save changes" : "Submit review"}
      </Button>
      {existing && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy}
            className="tap min-h-[44px] w-full text-xs font-semibold text-status-high"
          >
            {armed ? "Tap again to withdraw your review" : "Withdraw review"}
          </button>
          <p className="text-[11px] text-charcoal-faint leading-relaxed">
            Withdrawing hides it from everyone else and takes it out of the rating. You can't review {firstName} again
            after.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reporting a review.
// ---------------------------------------------------------------------------

/**
 * The report form, as a sheet's body (the listing swaps it in for the list;
 * the Profile gives it a sheet of its own).
 */
export const ReviewReportForm: React.FC<{
  onSend: (reason: ReviewReportReason, detail: string) => Promise<string | null>;
}> = ({ onSend }) => {
  const [reason, setReason] = useState<ReviewReportReason>(REVIEW_REPORT_REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await onSend(reason, detail);
    setBusy(false);
    if (message) setError(message);
    else setSent(true);
  };

  if (sent) {
    return (
      <p role="status" className="text-sm font-semibold text-charcoal bg-primary-pale rounded-xl px-3.5 py-3">
        Report sent. Thank you. A moderator will look at it.
      </p>
    );
  }

  return (
    <div className="space-y-3 animate-fade-slide-up">
      <p className="text-[13px] text-charcoal-soft leading-relaxed">
        A moderator will review it. Nobody is told who reported it.
      </p>
      <fieldset className="border-none m-0 p-0">
        <legend className="section-label text-charcoal-soft w-full mb-1">Reason</legend>
        {REVIEW_REPORT_REASONS.map((r, i) => (
          <label
            key={r.value}
            className={`flex items-start gap-2.5 py-2.5 min-h-[48px] cursor-pointer ${
              i < REVIEW_REPORT_REASONS.length - 1 ? "border-b border-charcoal/10" : ""
            }`}
          >
            <input
              type="radio"
              name="review-report-reason"
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="mt-1 w-4 h-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-charcoal">{r.label}</span>
              <span className="block text-[11.5px] text-charcoal-faint">{r.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Anything else? (optional)</span>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 2000))}
          rows={3}
          className={fieldClass}
        />
      </label>
      {error && <p role="alert" className="text-xs font-semibold text-status-high">{error}</p>}
      <Button fullWidth size="lg" onClick={() => void send()} disabled={busy}>
        {busy ? "Sending…" : "Send report"}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The professional's reply.
// ---------------------------------------------------------------------------

type ReplyProps = {
  open: boolean;
  onClose: () => void;
  /** The reply being edited; null writes a new one. */
  existing: string | null;
  onSave: (body: string) => Promise<string | null>;
};

export const ReplySheet: React.FC<ReplyProps> = (props) => (
  <BottomSheet open={props.open} onClose={props.onClose} title={props.existing ? "Edit your reply" : "Reply to this review"}>
    <ReplyForm {...props} />
  </BottomSheet>
);

function ReplyForm({ onClose, existing, onSave }: ReplyProps) {
  const [text, setText] = useState(existing ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const len = bodyLength(text);
  const over = len > REPLY_BODY_MAX;

  const save = async () => {
    if (busy || over || len === 0) return;
    setBusy(true);
    const message = await onSave(text);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <div className="space-y-4 animate-fade-slide-up">
      <p className="text-[13px] text-charcoal-soft leading-relaxed">
        Your reply shows under the review, to everyone who can read it. You can reply once, then edit or remove it.
      </p>
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Your reply</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-describedby="reply-count"
          aria-invalid={over || undefined}
          className={fieldClass}
        />
        <Counter text={text} max={REPLY_BODY_MAX} id="reply-count" />
      </label>
      {over && (
        <p className="text-xs font-semibold text-status-high">
          A reply can be up to {REPLY_BODY_MAX.toLocaleString("en")} characters.
        </p>
      )}
      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
      <Button fullWidth size="lg" onClick={() => void save()} disabled={busy || over || len === 0}>
        {busy ? "Saving…" : existing ? "Save reply" : "Post reply"}
      </Button>
    </div>
  );
}

/** Remove, as a two-tap link, for the reply under a review. */
export const RemoveReplyButton: React.FC<{ onRemove: () => Promise<string | null> }> = ({ onRemove }) => {
  const [armed, arm] = useArmed();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tap = async () => {
    if (busy || !arm()) return;
    setBusy(true);
    setError(await onRemove());
    setBusy(false);
  };
  return (
    <>
      <button type="button" onClick={() => void tap()} disabled={busy} className="tap min-h-[44px] text-xs font-semibold text-status-high">
        {armed ? "Tap again to remove" : "Remove reply"}
      </button>
      {error && <span className="text-xs font-semibold text-status-high">{error}</span>}
    </>
  );
};
