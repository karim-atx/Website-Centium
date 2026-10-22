import React from "react";
import { ChevronLeft } from "lucide-react";
import { linePx, textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";
import { marketPalette, type MarketPalette } from "../../../theme/marketTokens";

// Market + Share 3.0 B-MA.6: the pieces the Classes screens share, with the
// Business Marketplace Screens values (markup lines 44–48, 382–466). Colours
// come from marketPalette (the board's light palette, its dark set through
// marketPalette(true), D-05). Every size goes through textPx / linePx so
// Larger text works.

/** The B-MA palette for the current theme. */
export function useMarketColours(): MarketPalette {
  return marketPalette(useIsDark());
}

/** The board's --scrim (the class cancel dialog): rgba(0,0,0,0.42), dark 0.6. */
export const scrimOf = (dark: boolean) => (dark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.42)");

/**
 * The handover back header (line 45–48): row gap 6, margin -4 16 12 6; a 44
 * back target with a 22 chevron (stroke 2.2, --ink); eyebrow 10.5 / 15.75 700
 * 0.1em uppercase --faint; title 22 / 28 800. `onBack` null draws no back
 * (the Classes business type's top-level Schedule). `right` sits at the end.
 */
export const BackHeader: React.FC<{ m: MarketPalette; eyebrow?: string; title: string; onBack: (() => void) | null; right?: React.ReactNode }> = ({ m, eyebrow, title, onBack, right }) => (
  <div className="flex items-center" style={{ gap: 6, margin: onBack ? "-4px 0 12px -10px" : "0 0 12px 0", minHeight: 44 }}>
    {onBack && (
      <button type="button" aria-label="Back" onClick={onBack} className="market-focus shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, color: m.ink, borderRadius: 12 }}>
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>
    )}
    <div className="flex-1 min-w-0">
      {eyebrow && <p style={{ margin: 0, fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, lineHeight: linePx(15.75) }}>{eyebrow}</p>}
      <h1 className="truncate" style={{ margin: 0, fontSize: textPx(22), fontWeight: 800, lineHeight: linePx(28), color: m.ink }}>
        {title}
      </h1>
    </div>
    {right && <div className="flex items-center shrink-0" style={{ gap: 2, marginRight: -6 }}>{right}</div>}
  </div>
);

/** A caps label (10.5 / 700, 0.1em, uppercase, --faint). */
export const Caps: React.FC<{ m: MarketPalette; children: React.ReactNode; style?: React.CSSProperties; as?: "p" | "h2" }> = ({ m, children, style, as = "h2" }) => {
  const Tag = as;
  return <Tag style={{ margin: 0, lineHeight: "normal", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint, ...style }}>{children}</Tag>;
};

/**
 * The outlined button ("Add class", line 395): min-height 40 inside a 1px
 * --border (42 drawn), radius 12, padding 0 14, gap 6, 12.5 / 800 --pdark,
 * a 15 plus (stroke 2.4).
 */
export const OutlineButton: React.FC<{ m: MarketPalette; icon?: React.ReactNode; onClick: () => void; disabled?: boolean; children: React.ReactNode; ariaLabel?: string }> = ({ m, icon, onClick, disabled, children, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className="market-focus hit inline-flex items-center shrink-0 disabled:opacity-40"
    style={{ minHeight: 42, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${m.border}`, gap: 6, padding: "0 14px", fontSize: textPx(12.5), fontWeight: 800, color: m.pdark, background: "transparent", whiteSpace: "nowrap" }}
  >
    {icon}
    {children}
  </button>
);

/** A small status chip (the B-MA status chips: 10.5 / 800, radius 999, padding 2 8). */
export const Chip: React.FC<{ label: string; bg: string; ink: string; icon?: React.ReactNode }> = ({ label, bg, ink, icon }) => (
  <span className="inline-flex items-center shrink-0 whitespace-nowrap" style={{ gap: 3, fontSize: textPx(10.5), fontWeight: 800, lineHeight: linePx(14), borderRadius: 999, padding: "2px 8px", background: bg, color: ink }}>
    {icon}
    {label}
  </span>
);

/**
 * The board's switch (the cancel dialog's toggle, line 459): 42 × 26 radius
 * 999, on --fill / off --swoff, a 22 white knob 2 from the edge with
 * 0 1px 3px rgba(0,0,0,0.18). A 44 hit box. `readOnly` shows the state
 * without letting it change (aria-disabled), for a setting the server fixes.
 */
export const BoardSwitch: React.FC<{ m: MarketPalette; checked: boolean; onChange?: (on: boolean) => void; label: string; disabled?: boolean; readOnly?: boolean }> = ({ m, checked, onChange, label, disabled, readOnly }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-disabled={readOnly || disabled || undefined}
    disabled={disabled}
    onClick={() => !readOnly && !disabled && onChange?.(!checked)}
    className="market-focus hit shrink-0 disabled:opacity-40"
    style={{ position: "relative", width: 42, height: 26, borderRadius: 999, background: checked ? m.fill : m.swoff, border: 0, padding: 0, cursor: readOnly ? "default" : undefined }}
  >
    <span aria-hidden style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
  </button>
);

/**
 * The sheet's field box (classFields, line 420): --sgrey radius 14 padding
 * 12 14; the label 13 / 500 --slabel 8 above its content. `span` 2 takes the
 * whole row of the 2-column grid. An error line sits inside the box.
 */
export const FieldBox: React.FC<{ m: MarketPalette; label: React.ReactNode; htmlFor?: string; span?: 1 | 2; error?: string | null; errorId?: string; hint?: React.ReactNode; children: React.ReactNode; boxRef?: (el: HTMLDivElement | null) => void; style?: React.CSSProperties }> = ({
  m,
  label,
  htmlFor,
  span = 1,
  error,
  errorId,
  hint,
  children,
  boxRef,
  style,
}) => (
  <div ref={boxRef} className="min-w-0" style={{ gridColumn: `span ${span}`, background: m.sgrey, borderRadius: 14, padding: "12px 14px", scrollMarginTop: 20, ...style }}>
    {htmlFor ? (
      <label htmlFor={htmlFor} className="block" style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>
        {label}
      </label>
    ) : (
      <p style={{ margin: "0 0 8px", fontSize: textPx(13), fontWeight: 500, color: m.slabel }}>{label}</p>
    )}
    {children}
    {error ? (
      <p id={errorId} role="alert" style={{ margin: "6px 0 0", fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: m.high }}>
        {error}
      </p>
    ) : hint ? (
      <div style={{ margin: "6px 0 0", fontSize: textPx(11.5), fontWeight: 600, lineHeight: linePx(15), color: m.faint }}>{hint}</div>
    ) : null}
  </div>
);

/** The field inside a FieldBox (line 420): --sfield (--card) radius 10 padding 11 13, 14 / 19, 41 tall; error 1px --high. */
export const fieldStyle = (m: MarketPalette, opts: { error?: boolean; active?: boolean } = {}): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  minHeight: 41,
  boxSizing: "border-box",
  background: m.card,
  borderRadius: 10,
  // 11 13 drawn; the 1px (transparent unless error / active) border takes 1 of it.
  padding: "10px 12px",
  fontSize: textPx(14),
  lineHeight: linePx(19),
  color: m.ink,
  textAlign: "left",
  border: `1px solid ${opts.error ? m.high : opts.active ? m.fill : "transparent"}`,
});
