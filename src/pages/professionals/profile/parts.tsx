import React from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { textPx, linePx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { SEGMENT_STEPS, marketPalette } from "../../../theme/marketTokens";
import { hexAlpha, liftInk } from "../../../components/market/marketColor";
import { FOCUS_CSS, usePress } from "../../../components/market/usePress";
import { t } from "../../../i18n/core";

// Market + Share 3.0 · W5 · shared pieces of the C-MO.4.9 screens (Client
// Professional Screens lines 28–31 / 54–57 back rows, 94 caps label, 150–156
// empty state). Literal values:
// - back row: margin-left −7, gap 6; a 36 × 36 box with the chevron 18 /
//   stroke 2 in --ink2; then the title 22 / 800 (directory) or the eyebrow
//   "PROFESSIONAL" 10.5 / 700, 0.1em, --faint (profile). A 44 hit box.
// - caps label: 10.5 / 700, 0.1em, uppercase, --faint.
// - empty state: a column, centred, gap 10, padding 40 24 0; the 56 tile
//   radius 18 #EEEAF8 with the 24 ticket icon (stroke 1.75) in #7D67D9; the
//   title 16 / 800; the body 13 / 1.55 --faint, max 290. Dark: the step-1 ink
//   at 16% with the lifted ink (stubColors' rule).

export const Chevron: React.FC<{ size?: number; color: string; dir?: "left" | "right"; stroke?: number }> = ({ size = 16, color, dir = "right", stroke = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100" style={{ display: "block", flex: "none", ...NO_ICON_SCALE }}>
    <path d={dir === "right" ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
  </svg>
);

/** The board's empty-state ticket (lucide ticket with three perforation ticks). */
export const TicketGlyph: React.FC<{ size?: number; color: string }> = ({ size = 24, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

/** The back row: the 36 chevron box, then the page title (22 / 800) or the caps eyebrow. */
export const BackRow: React.FC<{ title?: string; eyebrow?: string; aside?: React.ReactNode; onBack?: () => void }> = ({ title, eyebrow, aside, onBack }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const back = useBack();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginInlineStart: -7, minWidth: 0 }}>
        <button
          type="button"
          onClick={onBack ?? back}
          aria-label={t("Back")}
          className="hit market-focus"
          style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: m.ink2, background: "none", border: 0, padding: 0, borderRadius: 999, cursor: "pointer", flexShrink: 0 }}
        >
          <Chevron size={18} color="currentColor" dir="left" stroke={2} />
        </button>
        {title ? (
          <h1 style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, color: m.ink, minWidth: 0 }}>{title}</h1>
        ) : (
          <div style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", color: m.faint }}>{eyebrow}</div>
        )}
      </div>
      {aside}
    </div>
  );
};

/** 10.5 / 700 caps in --faint (Point offers, Teaches at, the kept sections). */
export const Caps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; as?: "h2" | "div" }> = ({ children, style, as = "h2" }) => {
  const m = marketPalette(useIsDark());
  const Tag = as;
  return <Tag style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: "normal", ...style }}>{children}</Tag>;
};

/** The drawn empty state (proWorkEmpty / proReviewsEmpty), also used for the kept empty lines. */
export const EmptyBlock: React.FC<{ title: string; body?: string | null; icon?: React.ReactNode; children?: React.ReactNode; style?: React.CSSProperties }> = ({ title, body, icon, children, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [tint, ink] = SEGMENT_STEPS[0];
  const tileInk = dark ? liftInk(ink) : ink;
  return (
    <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "40px 24px 0", lineHeight: "normal", ...style }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? hexAlpha(ink, 0.16) : tint, color: tileInk, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon ?? <TicketGlyph color="currentColor" />}
      </span>
      <div style={{ fontSize: textPx(16), fontWeight: 800, color: m.ink }}>{title}</div>
      {body ? <div style={{ fontSize: textPx(13), lineHeight: linePx(20.15), color: m.faint, maxWidth: 290 }}>{body}</div> : null}
      {children}
    </div>
  );
};

/** The 44-tall row of inline text actions under a block (Retry, See all). */
export const TextAction: React.FC<{ children: React.ReactNode; onClick: () => void; ariaLabel?: string; style?: React.CSSProperties }> = ({ children, onClick, ariaLabel, style }) => {
  const m = marketPalette(useIsDark());
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="hit market-focus"
      style={{ background: "none", border: 0, padding: 0, font: "inherit", fontSize: textPx(12.5), fontWeight: 700, color: m.pdark, cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
};

/** A button with its own pressed state (scale 0.97, 140 ms; none under Reduce motion). */
export const PressButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { inert?: boolean }> = ({ inert, style, className, onClick, ...rest }) => {
  const press = usePress();
  return (
    <button
      type="button"
      {...rest}
      {...(inert ? {} : press.handlers)}
      onClick={inert ? undefined : onClick}
      aria-disabled={inert || rest["aria-disabled"] || undefined}
      className={`market-focus ${className ?? ""}`}
      style={{ ...style, ...(inert ? {} : press.style) }}
    />
  );
};
