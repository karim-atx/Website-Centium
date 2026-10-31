import React, { useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { marketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { ownerInitials } from "../../../services/offers";

// Market + Share 3.0 · W2 · small pieces shared by the Rewards screens
// (Client Explore Screens lines 362–365, 401–408, 453–461, 551–555).

/**
 * The board's back header: a row (gap 6, margin-left −7), the 36 back target
 * (chevron 18, stroke 2, --ink2), then either the title 22 / 800 or the caps
 * eyebrow 10.5 / 700 0.1em --faint ("REWARDS", "OFFER").
 */
export const BackRow: React.FC<{ onBack: () => void; title?: string; eyebrow?: string; trailing?: React.ReactNode }> = ({ onBack, title, eyebrow, trailing }) => {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginInlineStart: -7, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="hit market-focus"
        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: "none", border: 0, padding: 0, cursor: "pointer", borderRadius: 999, flexShrink: 0 }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      {title ? <h1 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, color: m.ink, minWidth: 0 }}>{title}</h1> : null}
      {eyebrow ? (
        <div role="heading" aria-level={2} style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", color: m.faint, textTransform: "uppercase" }}>
          {eyebrow}
        </div>
      ) : null}
      {trailing ? <span style={{ marginInlineStart: "auto" }}>{trailing}</span> : null}
    </div>
  );
};

/** A caps section label: 10.5 / 700 0.1em uppercase --faint. */
export const CapsLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; id?: string }> = ({ children, style, id }) => {
  const m = marketPalette(useIsDark());
  return (
    <h2 id={id} style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: "normal", ...style }}>
      {children}
    </h2>
  );
};

/**
 * The owner tile: --pale, the initials in --accent 800, or the owner's logo
 * (object-fit cover) when there is one; a logo that fails falls back to the
 * initials. 44 / radius 12 / 13 (offer, rows) and 60 / radius 18 / 18 (the
 * showcase).
 */
export const OwnerTile: React.FC<{ name: string; logoUrl?: string | null; size: 44 | 60; fontSize?: number }> = ({ name, logoUrl, size, fontSize }) => {
  const m = marketPalette(useIsDark());
  const [failed, setFailed] = useState(false);
  const radius = size === 60 ? 18 : 12;
  if (logoUrl && !failed) {
    return <img src={logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0, display: "block", background: m.pale }} />;
  }
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: radius, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(fontSize ?? (size === 60 ? 18 : 13)), fontWeight: 800, color: m.accent, flexShrink: 0, lineHeight: "normal" }}>
      {ownerInitials(name)}
    </span>
  );
};

/** The chevron at the end of a row (16, stroke 1.75, --faint). */
export const RowChevron: React.FC = () => {
  const m = marketPalette(useIsDark());
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
};

/** A small quiet line (12 / 17 --faint). */
export const QuietLine: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const m = marketPalette(useIsDark());
  return <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(17), color: m.faint, ...style }}>{children}</p>;
};
