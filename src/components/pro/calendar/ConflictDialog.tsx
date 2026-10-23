import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { FOCUS_CSS } from "../../market/usePress";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBackCloses } from "../../../hooks/useBackCloses";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../proInk";
import { DEFAULT_SESSION } from "./calendarItems";
import { TicketRow } from "./TicketRow";

// Market + Share 3.0 · W5 · P-CA.5.5 Conflict check (Professional Calendar
// Screens lines 138–158, `dlg` / `clashes`): the scrim --sscrim + blur 2; the
// card role="alertdialog", 338 wide, padding 24 22 22, radius 32, --sbody,
// 1px --sborder, shadow 0 18px 48px rgba(95,80,147,0.22), centred; the 52
// warning disc (--cautionbg #F6E9C9 / --caution #B07D16, the 24 triangle);
// the title (margin-top 12) 20 / 26 800 −0.015em --stitle "This overlaps your
// calendar"; the body (margin-top 6) 13 / 19 500 --ink2; the clashes
// (margin-top 14, gap 6, left aligned) as own-session rows (#7D6BB5 at 16%,
// the 3 bar, the title 12.5 / 700, the time 10 #A79E93, "Clash" 11 / 600
// --caution); the note (margin-top 8) 11.5 / 16 --faint, left; the buttons
// (margin-top 18, gap 8) 48 tall radius 14 14 / 700: Go back --cancelbg /
// --cancelink, Accept anyway --fill / --onfill. Escape and the phone's back
// go back; focus returns to where it was.

export interface ConflictClash {
  title: string;
  /** "Mon 7:00 to 8:00 AM". */
  time: string;
  place?: string | null;
}

export const ConflictDialog: React.FC<{
  open: boolean;
  body: string;
  clashes: ConflictClash[];
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onAccept: () => void;
  children?: React.ReactNode;
}> = ({ open, body, clashes, busy, error, onBack, onAccept, children }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const titleId = useId();
  const bodyId = useId();
  const card = useRef<HTMLDivElement>(null);
  const backRef = useRef(onBack);
  useEffect(() => {
    backRef.current = onBack;
  });
  useBackCloses(open, onBack);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") backRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const btn = (bg: string, ink: string): React.CSSProperties => ({ flex: 1, minWidth: 0, minHeight: 48, padding: "0 8px", borderRadius: 14, border: 0, background: bg, color: ink, fontFamily: "inherit", fontSize: textPx(14), fontWeight: 700, cursor: "pointer" });
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 70, padding: 16 }}>
      <style>{FOCUS_CSS}</style>
      <div aria-hidden onClick={() => !busy && onBack()} style={{ position: "absolute", inset: 0, background: m.sscrim, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }} />
      <div
        ref={card}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        data-conflict-dialog
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
        <span aria-hidden style={{ width: 52, height: 52, margin: "0 auto", borderRadius: 999, background: m.cautionbg, color: m.caution, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TriangleAlert size={24} strokeWidth={2} style={NO_ICON_SCALE} />
        </span>
        <h2 id={titleId} style={{ margin: "12px 0 0", fontSize: textPx(20), lineHeight: linePx(26), fontWeight: 800, letterSpacing: "-0.015em", color: m.stitle }}>
          This overlaps your calendar
        </h2>
        <p id={bodyId} style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19), fontWeight: 500, color: m.ink2 }}>
          {body}
        </p>
        {clashes.length ? (
          <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
            {clashes.map((c, i) => (
              <li key={i}>
                <TicketRow title={c.title} sub={[c.time, c.place].filter(Boolean).join(" · ")} colour={DEFAULT_SESSION} badge={{ text: "Clash", ink: m.caution }} notchBg={m.sbody} />
              </li>
            ))}
          </ul>
        ) : null}
        <p style={{ margin: "8px 0 0", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint, textAlign: "left" }}>
          {/* Not the board's "both stay on your calendar": accept_hire_offer(p_ack_conflicts) keeps the agreement and leaves the
              clashing sessions WITHOUT an instructor (an instructor can't be in two places; Database Release 2). Ours, flagged. */}
          If you continue, you're hired and the clashing sessions are left for the gym to cover. Your own sessions stay as they are.
        </p>
        {children}
        {error ? (
          <p role="alert" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: m.high }}>
            {error}
          </p>
        ) : null}
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button type="button" onClick={onBack} disabled={busy} className="market-focus" style={btn(m.cancelbg, m.cancelink)}>
            Go back
          </button>
          <button type="button" onClick={onAccept} disabled={busy} aria-busy={busy || undefined} className="market-focus" style={{ ...btn(m.fill, m.onfill), opacity: busy ? 0.6 : 1 }}>
            Accept anyway
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
