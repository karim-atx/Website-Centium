import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { deltaTone } from "./pointsModel";
import { PointsLeaf } from "./PointsFigure";

// Market + Share 3.0 · StatLedger (HANDOVER §4 B-MA.1 item 3, P-MA.1;
// Business Marketplace Screens lines 79–86, Professional Marketplace Screens
// lines 90–97, the `biz.stats` / `ov.stats` script): radius 20, --card,
// border 1px --border, padding 0 16; rows a centred flex (gap 10, padding
// 13 0), the divider 1.5px dashed --border from row 2; label flex 1 13 / 600
// --ink2; value 16 / 800 tabular (+ the leaf, gap 3, 6.7 × 12, for points);
// delta min-width 46 right-aligned 11 / 700 tabular: green, red when it
// starts with "−", faint for "–" (P-MA.1 Empty).

export interface StatLedgerRow {
  label: string;
  value: string;
  /** "+1", "+20%", "−3%"; "–" (faint) when there is nothing to compare. */
  delta?: string | null;
  /** Points: the leaf after the value. */
  leaf?: boolean;
}

export const StatLedger: React.FC<{ rows: StatLedgerRow[]; className?: string; style?: React.CSSProperties }> = ({ rows, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <div className={className} style={{ lineHeight: "normal", borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "0 16px", ...style }}>
      {rows.map((r, i) => {
        const tone = deltaTone(r.delta);
        return (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 0", borderTop: i ? `1.5px dashed ${m.border}` : 0 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: textPx(13), fontWeight: 600, color: m.ink2 }}>{r.label}</span>
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: textPx(16), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: m.ink }}>{r.value}</span>
              {r.leaf ? <PointsLeaf height={12} /> : null}
            </span>
            <span style={{ minWidth: 46, textAlign: "right", fontSize: textPx(11), fontWeight: 700, fontVariantNumeric: "tabular-nums", color: tone === "high" ? m.high : tone === "faint" ? m.faint : m.good }}>
              {r.delta ?? "–"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
