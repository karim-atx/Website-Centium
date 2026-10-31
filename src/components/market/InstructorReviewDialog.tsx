import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { useBackCloses } from "../../hooks/useBackCloses";
import { useOnline } from "../../hooks/useOnline";
import { linePx, textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../pro/proInk";
import { MarketAvatar } from "./ProfessionalCard";
import { FOCUS_CSS, usePress } from "./usePress";
import {
  canSend,
  contextLine,
  REVIEW_TEXT_MAX,
  reviewInstructor,
  reviewNote,
  reviewTitle,
  starKey,
  type ReviewTarget,
} from "../../services/instructor-reviews";
import { GuidelinesLink } from "../moderation/GuidelinesLink";
import { useReviewOpensAt } from "../../hooks/useReviewOpensAt";
import { ReviewWaitNote } from "../reviews/ReviewWaitNote";

// Market + Share 3.0 · W5 · InstructorReviewDialog (PLAN F13; C-MO.4.5
// `revPrompt` / `revFilled`, Client Professional Screens lines 254–270 and
// the script's `rate`, `revText`, `revInk`, `revOp`; HANDOVER §4 "Review
// popup": a CentredDialog, not destructive). Literal values:
// - scrim --sscrim + blur 2; the card 338 wide, padding 24 22 22, radius 32,
//   --sbody, 1px --sborder, shadow 0 18 48 rgba(95,80,147,0.22), centred;
// - the 56 avatar (initials 17 / 800, the instructor's identity step: the
//   board's RK is step 1 #EEEAF8 / #7D67D9);
// - "How was {first}'s class?" (margin-top 10) 20 / 26 800 −0.015em
//   --stitle; "{class} · {gym} · {date}" (margin-top 4) 12.5 / 18 --ink2;
// - five 34 stars (margin-top 14, gap 8, centred), stroke 1.4: set --gold
//   filled, unset transparent with rgba(36,31,27,0.22);
// - the Short review box (margin-top 14, left aligned): --sgrey radius 14
//   padding 12 14; "Short review" 13 / 500 --slabel + "optional" --faint
//   (margin-bottom 8); the field --sfield radius 10 padding 11 13, min 58 +
//   padding, 13.5 / 19 (placeholder "What stood out?" --faint);
// - the note (margin-top 8) 11 / 15 --faint;
// - the buttons (margin-top 16, gap 8): 48 tall radius 14 14 / 700, "Not
//   now" #F0EDF9 / #5F5093, "Send review" #AEA1DC / #FFFFFF at opacity 0.4
//   (and disabled) until a star is set.
// Behaviour: the stars are a radiogroup (tap a star; Arrow keys, Home / End;
// roving tabindex), each with the pressed scale; Escape, the phone's back and
// a tap on the scrim close it (not while sending); focus goes to the card on
// open and back where it was on close. One request id per opening, so a
// retried send is idempotent (review_instructor ⟳). A send that comes back
// pending (DB10 not landed) shows a calm note and changes nothing.

const STAR = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";


const isHighContrast = () => typeof document !== "undefined" && document.documentElement.classList.contains("high-contrast");

export interface InstructorReviewDialogProps {
  /** The class to review; null keeps the dialog closed. */
  target: ReviewTarget | null;
  onClose: () => void;
  /** Sent: the rating given (the row turns "Reviewed · you rated N"; the page shows the strip). */
  onSent: (target: ReviewTarget, rating: number) => void;
}

/** A fresh dialog per class (keyed): no rating, empty text. */
export const InstructorReviewDialog: React.FC<InstructorReviewDialogProps> = ({ target, ...rest }) =>
  target ? <ReviewCard key={`${target.bookingId}:${target.sessionId}`} target={target} {...rest} /> : null;

const ReviewCard: React.FC<Omit<InstructorReviewDialogProps, "target"> & { target: ReviewTarget }> = ({ target, onClose, onSent }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const online = useOnline();
  const open = true;
  const titleId = useId();
  const ctxId = useId();
  const fieldId = useId();
  const card = useRef<HTMLDivElement>(null);
  const stars = useRef<(HTMLButtonElement | null)[]>([]);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "calm" | "error"; text: string } | null>(null);
  // Round F (AB7): an account under 7 days old sees when it may in Send's place.
  const opensAt = useReviewOpensAt();

  const busyRef = useRef(busy);
  const closeRef = useRef(onClose);
  useEffect(() => {
    busyRef.current = busy;
    closeRef.current = onClose;
  });
  const close = () => {
    if (!busyRef.current) closeRef.current();
  };
  useBackCloses(open, close);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  const ready = canSend(rating) && !busy;
  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setNote(null);
    const trimmed = text.trim();
    const r = await reviewInstructor(target.sessionId, rating, trimmed ? trimmed : null);
    setBusy(false);
    if (r.ok) {
      onSent(target, rating);
      return;
    }
    if (r.pending) {
      setNote({ tone: "calm", text: r.message });
      return;
    }
    setNote({ tone: "error", text: r.message });
  };

  const pick = (n: number) => {
    setRating(n);
    setNote(null);
  };
  const onStarKey = (e: React.KeyboardEvent) => {
    const n = starKey(rating, e.key);
    if (n === null) return;
    e.preventDefault();
    pick(n);
    stars.current[n - 1]?.focus();
  };

  const unset = isHighContrast() ? m.faint : dark ? "rgba(245,243,250,0.3)" : "rgba(36,31,27,0.22)";
  const btn = (bg: string, ink: string): React.CSSProperties => ({ flex: 1, minWidth: 0, minHeight: 48, padding: "0 8px", borderRadius: 14, border: 0, background: bg, color: ink, fontFamily: "inherit", fontSize: textPx(14), fontWeight: 700, cursor: "pointer" });

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 70, padding: 16 }}>
      <style>{`${FOCUS_CSS}.ird-field::placeholder{color:${m.faint};opacity:1}`}</style>
      <div aria-hidden onClick={close} style={{ position: "absolute", inset: 0, background: m.sscrim, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ctxId}
        tabIndex={-1}
        data-review-dialog
        style={{
          position: "relative",
          width: 338,
          maxWidth: "100%",
          maxHeight: "100%",
          overflowY: "auto",
          boxSizing: "border-box",
          padding: "24px 22px 22px",
          borderRadius: 32,
          background: m.sbody,
          border: `1px solid ${m.sborder}`,
          boxShadow: dark ? "none" : "0 18px 48px rgba(95,80,147,0.22)",
          textAlign: "center",
          outline: "none",
          color: m.ink,
          lineHeight: "normal",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MarketAvatar id={target.professionalId} name={target.professionalName} photoUrl={target.photoUrl} size={56} fontSize={17} />
        </div>
        <h2 id={titleId} style={{ margin: "10px 0 0", fontSize: textPx(20), lineHeight: linePx(26), fontWeight: 800, letterSpacing: "-0.015em", color: m.stitle }}>
          {reviewTitle(target.professionalName)}
        </h2>
        <p id={ctxId} style={{ margin: "4px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2 }}>
          {contextLine(target)}
        </p>

        <div role="radiogroup" aria-label="Your rating" style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <StarButton
              key={n}
              n={n}
              on={n <= rating}
              checked={n === rating}
              focusable={rating === 0 ? n === 1 : n === rating}
              gold={m.gold}
              unset={unset}
              disabled={busy}
              onPick={() => pick(n)}
              onKeyDown={onStarKey}
              refCb={(el) => {
                stars.current[n - 1] = el;
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: 14, textAlign: "start", background: m.sgrey, borderRadius: 14, padding: "12px 14px" }}>
          <label htmlFor={fieldId} style={{ display: "block", fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
            Short review <span style={{ color: m.faint }}>optional</span>
          </label>
          <textarea
            id={fieldId}
            className="ird-field market-focus"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
            maxLength={REVIEW_TEXT_MAX}
            placeholder="What stood out?"
            disabled={busy}
            rows={2}
            style={{
              display: "block",
              width: "100%",
              minHeight: 80,
              boxSizing: "border-box",
              resize: "none",
              border: 0,
              outlineOffset: 2,
              background: m.sbody,
              borderRadius: 10,
              padding: "11px 13px",
              fontFamily: "inherit",
              fontSize: textPx(13.5),
              lineHeight: linePx(19),
              color: m.ink,
            }}
          />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: textPx(11), lineHeight: linePx(15), color: m.faint }}>{reviewNote(target.professionalName)}</p>

        {note ? (
          <p role={note.tone === "error" ? "alert" : "status"} style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: note.tone === "error" ? m.high : m.ink2 }}>
            {note.text}
            <GuidelinesLink message={note.text} />
          </p>
        ) : !online ? (
          <p role="status" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.ink2 }}>
            You're offline. Send it once you're back online.
          </p>
        ) : null}

        {opensAt ? <ReviewWaitNote opensAt={opensAt} boxed style={{ marginTop: 16 }} /> : null}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button type="button" onClick={close} disabled={busy} className="market-focus" style={btn(m.cancelbg, m.cancelink)}>
            Not now
          </button>
          {opensAt ? null : <SendButton ready={ready && online} busy={busy} fill={m.fill} ink={m.onfill} style={btn(m.fill, m.onfill)} onSend={() => void send()} />}
        </div>
      </div>
    </div>,
    document.body
  );
};

const StarButton: React.FC<{
  n: number;
  on: boolean;
  checked: boolean;
  focusable: boolean;
  gold: string;
  unset: string;
  disabled: boolean;
  onPick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLButtonElement | null) => void;
}> = ({ n, on, checked, focusable, gold, unset, disabled, onPick, onKeyDown, refCb }) => {
  const press = usePress();
  return (
    <button
      ref={refCb}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={n === 1 ? "1 star" : `${n} stars`}
      tabIndex={focusable ? 0 : -1}
      disabled={disabled}
      onClick={onPick}
      {...press.handlers}
      onKeyDown={(e) => {
        press.handlers.onKeyDown(e);
        onKeyDown(e);
      }}
      className="market-focus hit"
      style={{ width: 34, height: 34, padding: 0, border: 0, background: "none", borderRadius: 8, cursor: disabled ? "default" : "pointer", flexShrink: 0, ...press.style }}
    >
      <svg width={34} height={34} viewBox="0 0 24 24" fill={on ? gold : "transparent"} stroke={on ? gold : unset} strokeWidth={1.4} strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
        <polygon points={STAR} />
      </svg>
    </button>
  );
};

const SendButton: React.FC<{ ready: boolean; busy: boolean; fill: string; ink: string; style: React.CSSProperties; onSend: () => void }> = ({ ready, busy, style, onSend }) => {
  const press = usePress();
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!ready}
      aria-busy={busy || undefined}
      className="market-focus"
      {...(ready ? press.handlers : {})}
      style={{ ...style, opacity: busy ? 0.6 : ready ? 1 : 0.4, cursor: ready ? "pointer" : "default", ...(ready ? press.style : null) }}
    >
      {busy ? "Sending…" : "Send review"}
    </button>
  );
};
