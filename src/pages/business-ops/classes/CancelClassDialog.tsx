import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarX } from "lucide-react";
import { linePx, textPx } from "../../../theme/textSize";
import { useBackCloses } from "../../../hooks/useBackCloses";
import { useIsDark } from "../../../hooks/useIsDark";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { scrimOf, useMarketColours } from "./parts";
import { cancelExtras, cancelText, notifiedText, type Session } from "./scheduleModel";

// B-MA.6 Cancel class (Business Marketplace Screens `classCancel`, markup
// lines 450–464): the board draws its own dialog, not the CentredDialog: a
// --scrim (rgba(0,0,0,0.42)) over the page, a --card card left / right 24,
// radius 20, padding 22 20 18, a centred column: the 48 --highbg circle with
// the 20 calendar-x (--high, stroke 2.2); "Cancel {name}?" 17 / 800
// (margin-top 12); the body 12.5 / 18 --ink2 (margin-top 4); the toggle row
// (drawn as a switch; see below); "Cancel class" 48 radius 14
// --highbg / --high 14 / 800 (margin-top 14); "Keep class" 44, 14 / 700
// --ink2.
//
// THE TOGGLE: cancel_class_session(p_class_id, p_reason) has no notify
// switch; it always tells every booked member (and the waitlist). Lead
// decision (R1 polish): no switch is drawn; the dialog says so in a plain
// line (12.5 / 18 600 --ink2): "Members with a booking are notified."
//
// KEPT (PLAN §3.4): the reason field (optional, only the team sees it) and
// the live waitlist / paid counts (from the desk roster); the offline line and
// the failure line with "Try again".

export function CancelClassDialog({
  open,
  session,
  people,
  waitlist,
  paid,
  reason,
  onReason,
  busy,
  error,
  offline,
  onKeep,
  onConfirm,
}: {
  open: boolean;
  session: Session | null;
  people: "clients" | "members";
  waitlist: number;
  paid: number;
  reason: string;
  onReason: (v: string) => void;
  busy: boolean;
  error: string | null;
  offline: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const m = useMarketColours();
  const dark = useIsDark();
  const titleId = useId();
  const bodyId = useId();
  const keepRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  useBackCloses(open, onKeep);
  const keepFn = useRef(onKeep);
  useEffect(() => {
    keepFn.current = onKeep;
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    window.setTimeout(() => keepRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        keepFn.current();
      }
      if (e.key === "Tab" && cardRef.current) {
        const f = [...cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])")];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);

  if (!open || !session) return null;
  const extras = cancelExtras(waitlist, paid);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: "0 24px", lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div aria-hidden className="absolute inset-0" style={{ background: scrimOf(dark) }} onClick={() => !busy && onKeep()} />
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="relative flex flex-col items-center text-center"
        style={{ width: "100%", maxWidth: 342, background: m.card, borderRadius: 20, padding: "22px 20px 18px", color: m.ink, maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}
      >
        <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 999, background: m.highbg, color: m.high }}>
          <CalendarX size={20} strokeWidth={2.2} />
        </span>
        <h2 id={titleId} style={{ margin: "12px 0 0", fontSize: textPx(17), fontWeight: 800, color: m.ink }}>{`Cancel ${session.title}?`}</h2>
        <p id={bodyId} style={{ margin: "4px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2 }}>
          {cancelText(session.date, session.startTime, session.booked)}
          {extras ? ` ${extras}` : ""}
        </p>
        {session.booked > 0 && (
          <p style={{ margin: "10px 0 0", fontSize: textPx(12.5), lineHeight: linePx(18), fontWeight: 600, color: m.ink2 }}>{notifiedText(people)}</p>
        )}
        <div className="w-full text-start" style={{ marginTop: 12 }}>
          <label htmlFor={`${titleId}-reason`} className="block" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: linePx(16), color: m.ink2, marginBottom: 6 }}>
            Reason (optional)
          </label>
          <input
            id={`${titleId}-reason`}
            value={reason}
            maxLength={300}
            disabled={busy}
            onChange={(e) => onReason(e.target.value)}
            placeholder="Only your team sees this"
            className="market-focus w-full"
            style={{ height: 44, borderRadius: 12, background: m.soft, border: `1px solid ${m.border}`, padding: "0 12px", fontSize: textPx(14), color: m.ink, outline: "none" }}
          />
        </div>
        {(error || offline) && (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
            {offline ? "You're offline. Connect to cancel this class." : error}
          </p>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={offline || busy}
          aria-busy={busy || undefined}
          className="market-focus w-full flex items-center justify-center disabled:opacity-40"
          style={{ marginTop: 14, height: 48, borderRadius: 14, background: m.highbg, color: m.high, fontSize: textPx(14), fontWeight: 800, border: 0 }}
        >
          {busy ? "Cancelling…" : error ? "Try again" : "Cancel class"}
        </button>
        <button
          ref={keepRef}
          type="button"
          onClick={onKeep}
          disabled={busy}
          className="market-focus w-full flex items-center justify-center"
          style={{ height: 44, fontSize: textPx(14), fontWeight: 700, color: m.ink2, background: "transparent", border: 0, borderRadius: 14 }}
        >
          Keep class
        </button>
      </div>
    </div>,
    document.body
  );
}
