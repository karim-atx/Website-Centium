import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../pro/proInk";
import { sparkline } from "./chartModel";
import { deltaTone } from "./pointsModel";

// Market + Share 3.0 · HeroStatCard (HANDOVER §4 B-MA.1 items
// 2–3, P-MA.1; Business Marketplace Screens lines 70–86, Professional
// Marketplace Screens lines 81–98 and the `ov` / `biz.stats` script).
//
// HeroStatCard: radius 24, --card, border 1px --border, overflow hidden;
// padding 16 16 0; the caps label 10.5 / 700 / 0.1em uppercase --faint; a
// baseline row (gap 10, margin-top 4) with the figure 36 / 42 800 −0.02em
// tabular and the delta 12 / 700 --good; the sub line 11.5 --faint; the
// sparkline 358 × 64 (margin-top 8) at the card's bottom edge: area
// rgba(174,161,220,0.2), line #AEA1DC 2 round joins and caps. No series (or
// all zero) is P-MA.1 Empty: a flat line dashed "4 5" at y 54, no area.
// The SVG keeps the 358 × 64 viewBox and stretches to the card (354 at 390,
// 324 at 360) with a non-scaling stroke.


export interface HeroStatCardProps {
  label: string;
  value: string;
  /** "+12% vs last month"; empty hides it (P-MA.1 Empty). */
  delta?: string | null;
  /** "Last 30 days" or the empty line "Shows once clients start finding you". */
  sub?: string | null;
  /** The sparkline's values (30 days on the board); none draws the flat dashed line. */
  series?: readonly number[] | null;
  className?: string;
  style?: React.CSSProperties;
}

export const HeroStatCard: React.FC<HeroStatCardProps> = ({ label, value, delta, sub, series, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const sp = sparkline(series);
  const tone = deltaTone(delta);
  return (
    <div className={className} style={{ lineHeight: "normal", borderRadius: 24, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden", ...style }}>
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: textPx(36), lineHeight: linePx(42), fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: m.ink }}>{value}</span>
          {delta ? <span style={{ fontSize: textPx(12), fontWeight: 700, color: tone === "high" ? m.high : tone === "faint" ? m.faint : m.good }}>{delta}</span> : null}
        </div>
        {sub ? <div style={{ fontSize: textPx(11.5), color: m.faint }}>{sub}</div> : null}
      </div>
      <svg width="100%" height={64} viewBox="0 0 358 64" preserveAspectRatio="none" aria-hidden style={{ display: "block", marginTop: 8, ...NO_ICON_SCALE }}>
        <path d={sp.area} fill="rgba(174,161,220,0.2)" />
        <path d={sp.line} fill="none" stroke="#AEA1DC" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={sp.dash} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};
