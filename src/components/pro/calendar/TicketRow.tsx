import React from "react";
import { TicketCheck } from "../../market/ProfessionalCard";
import { eventColours } from "../../calendar/eventColour";
import { liftInk } from "../../market/marketColor";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

// Market + Share 3.0 · W5 · the P-CA agenda row as a ticket (Professional
// Calendar Screens lines 52–59, the `hired()` / `own()` rows): position
// relative, flex, radius 15, the colour at 16% (#hex29), overflow hidden,
// opacity / box-shadow outline per state; the body (padding 12 14, gap 11):
// the 3 bar (min 32), the title 12.5 / 700 / 1.5, the time line 10 / 1.5
// #A79E93 (both struck through when cancelled), "Hired via Centium" (10 / 700,
// the 11 ticket tick, margin-top 2, gap 4) in the class colour, the badge
// 11 / 600; the stub: 30 wide, border-left 1.5px dashed in the class colour,
// the 14 ticket tick, two 14 notches at right 23 (top / bottom -7) in the
// surface colour behind the row.
// Dark: the colour lifted to read on the dark page (eventColours). High
// contrast (light): the mark and badge take the colour deepened to 4.5:1.

const hc = () => typeof document !== "undefined" && document.documentElement.classList.contains("high-contrast");

/** The colour mixed toward black until it reads at 4.5:1 on its own 16% tint over white (High contrast only). */
function deepen(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return "#" + ch.map((v) => Math.round(v * 0.6).toString(16).padStart(2, "0")).join("");
}

export interface TicketRowProps {
  title: string;
  sub: string;
  colour: string;
  /** "Hired via Centium" under the time line. */
  mark?: boolean;
  /** The 30 dashed stub with the tick (gym classes). */
  stub?: boolean;
  badge?: { text: string; ink: string } | null;
  dim?: number;
  strike?: boolean;
  outline?: boolean;
  /** The surface behind the row (the notches). */
  notchBg: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export const TicketRow: React.FC<TicketRowProps> = ({ title, sub, colour, mark, stub, badge, dim = 1, strike, outline, notchBg, onClick, ariaLabel }) => {
  const dark = useIsDark();
  const { tint, bar } = eventColours(colour, dark);
  const ink = classInk(colour, dark);
  const deco = strike ? "line-through" : "none";
  const body = (
    <>
      <span className="flex items-start" style={{ flex: 1, minWidth: 0, gap: 11, padding: "12px 14px" }}>
        <span aria-hidden style={{ width: 3, alignSelf: "stretch", minHeight: 32, borderRadius: 999, background: bar, flex: "none" }} />
        <span style={{ flex: 1, minWidth: 0, lineHeight: "normal" }}>
          <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 700, lineHeight: 1.5, color: INK.ch, textDecoration: deco }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: textPx(10), lineHeight: 1.5, color: INK.chT, textDecoration: deco }}>
            {sub}
          </span>
          {mark ? (
            <span style={{ marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4, fontSize: textPx(10), fontWeight: 700, color: ink }}>
              <TicketCheck size={11} />
              Hired via Centium
            </span>
          ) : null}
        </span>
        {badge ? <span style={{ fontSize: textPx(11), fontWeight: 600, whiteSpace: "nowrap", color: badge.ink, flexShrink: 0 }}>{badge.text}</span> : null}
      </span>
      {stub ? (
        <>
          <span aria-hidden className="flex items-center justify-center" style={{ width: 30, boxSizing: "content-box", flex: "none", borderInlineStart: `1.5px dashed ${bar}`, color: bar }}>
            <TicketCheck size={14} />
          </span>
          <span aria-hidden style={{ position: "absolute", insetInlineEnd: 23, top: -7, width: 14, height: 14, borderRadius: 999, background: notchBg }} />
          <span aria-hidden style={{ position: "absolute", insetInlineEnd: 23, bottom: -7, width: 14, height: 14, borderRadius: 999, background: notchBg }} />
        </>
      ) : null}
    </>
  );
  const style: React.CSSProperties = {
    position: "relative",
    display: "flex",
    width: "100%",
    textAlign: "start",
    borderRadius: 15,
    background: tint,
    overflow: "hidden",
    opacity: dim,
    boxShadow: outline ? `0 0 0 1.5px ${bar}` : "none",
  };
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={ariaLabel} data-class-row={stub || undefined} className="tap" style={style}>
      {body}
    </button>
  ) : (
    <div style={style} aria-label={ariaLabel}>
      {body}
    </div>
  );
};

/** The badge words and inks for a class row (P-CA.5.2 / 5.3 / 5.4). */
export function classBadgeText(badge: string | null, colour: string, dark: boolean): { text: string; ink: string } | null {
  if (badge === "cancelled") return { text: "Cancelled", ink: dark ? "#F09A8E" : hc() ? "#A13023" : "#C0392B" };
  if (badge === "completed") return { text: "Completed", ink: INK.good };
  if (badge === "updated") return { text: "Updated", ink: classInk(colour, dark) };
  return null;
}

/** A class colour as text: the readable shade in dark, deepened in High contrast (light). */
// Dark: the text ink is the class colour lifted (marketColor.liftInk, as stubColors does); the bar's own
// dark value read 4.16:1 on the tinted row (R2 gate), under 4.5:1 for the 10px mark.
export const classInk = (colour: string, dark: boolean): string => (dark ? (/^#[0-9a-f]{6}$/i.test(colour) ? liftInk(colour) : eventColours(colour, dark).bar) : hc() ? deepen(colour) : eventColours(colour, false).bar);
