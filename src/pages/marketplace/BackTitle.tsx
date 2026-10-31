import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { useBack } from "../../hooks/useBack";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";

// Market + Share 3.0 · W2 · the Client Explore sub-pages' back row (Client
// Explore Screens lines 552–555 / 600–603 / 637–640: My bookings, Points
// history, How to earn): a row, gap 6, margin-left −7; the 36 back box
// (a 44 hit area through .hit) with the 18 chevron, stroke 2, --ink2; the
// title 22 / 800 --ink. `parent` is where back leads when there is no in-app
// history (useBack).

export const BackTitle: React.FC<{ title: string; parent: string; children?: React.ReactNode }> = ({ title, parent, children }) => {
  const m = marketPalette(useIsDark());
  const back = useBack(parent);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginInlineStart: -7, lineHeight: "normal" }}>
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        className="hit market-focus"
        style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: "none", border: 0, padding: 0, borderRadius: 10, cursor: "pointer" }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <h1 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, color: m.ink, minWidth: 0, flex: 1 }}>{title}</h1>
      {children}
    </div>
  );
};
