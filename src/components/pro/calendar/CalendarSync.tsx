import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { TicketCheck } from "../../market/ProfessionalCard";
import { FOCUS_CSS } from "../../market/usePress";
import { hexAlpha, liftInk } from "../../market/marketColor";
import { useIsDark } from "../../../hooks/useIsDark";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { linePx, textPx } from "../../../theme/textSize";
import { MARKET_MOTION, marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../proInk";

// Market + Share 3.0 · W5 · the calendar sync pieces that aren't the strip
// (the strip is the shared ConfirmationStrip, compact = P-CA's):
// - SyncNote, P-CA.5.2 (Professional Calendar Screens lines 109–114, `note`):
//   fixed over the header, 12 from the sides; radius 18, --card, 1px
//   rgba(143,104,246,0.28), shadow 0 12px 32px rgba(95,80,147,0.2), padding
//   12 14, gap 12, cmSlideUp; the 36 tile (radius 11, #E6F1EF / #4F8F8A, the
//   17 clock stroke 1.9); the title 13 / 800, its age 10.5 / 700 #8C8378
//   ("now"), the body 12 / 17 #5B5349 (margin-top 2). A tap, Escape or 8 s
//   closes it (the notification is then read).
// - HiredEmpty, P-CA.6 (lines 66–71, `wkEmpty`): margin-top 14, radius 18,
//   1.5px dashed rgba(36,31,27,0.14), padding 14 16, gap 12; the 36 tile
//   (radius 11, #E6F1EF / #4F8F8A, the 17 ticket stroke 1.75); "No hired
//   classes yet" 13.5 / 800; the line 12 / 17 #5B5349 (margin-top 2);
//   "Browse opportunities" 12.5 / 800 #7D6BB5 (margin-top 8).

const TEAL = "#4F8F8A";
const TEAL_BG = "#E6F1EF";

export const SyncNote: React.FC<{ title: string; body: string; age: string; onClose: () => void }> = ({ title, body, age, onClose }) => {
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const m = marketPalette(dark);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const id = window.setTimeout(() => close.current(), 8000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return createPortal(
    <div className="fixed start-0 end-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 12px", pointerEvents: "none" }}>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onClose}
        role="status"
        aria-live="polite"
        aria-label={`${title}. ${body}`}
        data-sync-note
        className="market-focus"
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 406,
          textAlign: "start",
          fontFamily: "inherit",
          borderRadius: 18,
          background: m.card,
          border: `1px solid ${dark ? "rgba(169,145,254,0.36)" : "rgba(143,104,246,0.28)"}`,
          boxShadow: dark ? "none" : "0 12px 32px rgba(95,80,147,0.2)",
          padding: "12px 14px",
          display: "flex",
          gap: 12,
          cursor: "pointer",
          color: m.ink,
          lineHeight: "normal",
          animation: reduced ? undefined : MARKET_MOTION.slideUp,
        }}
      >
        <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, background: dark ? hexAlpha(TEAL, 0.16) : TEAL_BG, color: dark ? liftInk(TEAL) : TEAL, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Clock size={17} strokeWidth={1.9} style={NO_ICON_SCALE} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: textPx(13), fontWeight: 800 }}>{title}</span>
            <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: m.faint, flexShrink: 0 }}>{age}</span>
          </span>
          <span style={{ display: "block", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>{body}</span>
        </span>
      </button>
    </div>,
    document.body
  );
};

export const HiredEmpty: React.FC<{ onBrowse: () => void }> = ({ onBrowse }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <div data-hired-empty style={{ marginTop: 14, borderRadius: 18, border: `1.5px dashed ${dark ? "rgba(245,243,250,0.14)" : "rgba(36,31,27,0.14)"}`, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, background: dark ? hexAlpha(TEAL, 0.16) : TEAL_BG, color: dark ? liftInk(TEAL) : TEAL, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <TicketCheck size={17} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: textPx(13.5), fontWeight: 800 }}>No hired classes yet</div>
        <div style={{ fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>When a gym hires you and assigns classes, every session shows here on its own.</div>
        <button type="button" onClick={onBrowse} className="hit market-focus" style={{ marginTop: 8, padding: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, cursor: "pointer" }}>
          Browse opportunities
        </button>
      </div>
    </div>
  );
};
