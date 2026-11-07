import React from "react";
import { ChevronRight, Lightbulb, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { INK } from "../proInk";
import { useWebLayout } from "../../web/useWebLayout";
import { addDays } from "./insightsModel";
import { InsightsWebCard } from "./webCardContext";
import type { StatBox } from "./parts";

// Website viewport (WP-CO-IN.1, .2, .3, .8; WP-CO Insights Web v2 / Extras): the Insights page's cards and their parts.

/** The page grid: 12 columns (8 on the rail), 24 apart. */
export const InsightsGridWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? 8 : 12}, minmax(0, 1fr))`, gap: 24, columnSpan: "all" }}>{children}</div>;
};

/** A drawn card (r20, 1px border, 20 24): title 17/24 700, question 13/20, legend at the right, tip under. */
export const InsightsCardWeb: React.FC<{
  col: string;
  row?: string;
  title?: string;
  question?: string;
  tip?: string | null;
  plotPx?: number;
  statCols?: number;
  /** The legend as a row under the question (the Extras sub-views) instead of at the title's right (Insights Web v2). */
  legendBelow?: boolean;
  /** The chart title size inside (the Extras sub-views draw 15; Insights Web v2 17). */
  titlePx?: number;
  children?: React.ReactNode;
}> = ({ col, row, title, question, tip, plotPx = 200, statCols, legendBelow, titlePx, children }) => (
  <section aria-label={title} style={{ gridColumn: col, gridRow: row, minWidth: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}`, padding: "20px 24px" }}>
    {title && (
      <div style={{ flex: "none", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: INK.ch }}>{title}</p>
        {question && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: INK.chF }}>{question}</p>}
      </div>
    )}
    <InsightsWebCard.Provider value={{ plotPx, statCols, legendBelow, titlePx }}>{children}</InsightsWebCard.Provider>
    {tip && <TipWeb>{tip}</TipWeb>}
  </section>
);

export const TipWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ flex: "none", margin: "12px 0 0", display: "flex", gap: 6, fontSize: 13, lineHeight: "20px", color: INK.chS }}>
    <Lightbulb size={14} strokeWidth={2} aria-hidden style={{ flex: "none", marginTop: 3, color: INK.prAccent }} />
    <span>{children}</span>
  </p>
);

/** Rows of label · bar · value (Activity types, Weekly pattern). */
export const BarsListWeb: React.FC<{ cols: string; rows: { label: string; pct: number; value: string; color: string }[] }> = ({ cols, rows }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
    {rows.map((r) => (
      <div key={r.label} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: INK.ch, whiteSpace: "nowrap" }}>{r.label}</span>
        <span style={{ height: 10, borderRadius: 999, background: INK.soft, overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, r.pct))}%`, borderRadius: 999, background: r.color }} />
        </span>
        <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: INK.chS, textAlign: "end", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
      </div>
    ))}
  </div>
);

/** The drawn streak: 40/48 count, 14 day cells (20 high, r6, 4 apart), the best line. */
export const StreakWeb: React.FC<{ current: number; label: string; bestLine: string; done: Set<string>; today: string }> = ({ current, label, bestLine, done, today }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, marginTop: 8 }}>
    <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-0.02em", color: INK.ch, fontVariantNumeric: "tabular-nums" }}>{current}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: INK.chS }}>{label}</span>
    </p>
    <div aria-hidden style={{ display: "grid", gridTemplateColumns: "repeat(14, minmax(0, 1fr))", gap: 4 }}>
      {Array.from({ length: 14 }, (_, i) => {
        const day = addDays(today, i - 13);
        return <span key={day} style={{ height: 20, borderRadius: 6, background: done.has(day) ? "#AEA1DC" : INK.prPale }} />;
      })}
    </div>
    <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: INK.chF }}>{bestLine}</p>
  </div>
);

/** The drawn stat boxes (r16, 14 16): label 13/20 600, value 28/36 800, sub 13/20. */
export const StatBoxesWeb: React.FC<{ boxes: StatBox[]; cols?: number }> = ({ boxes, cols }) => (
  <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${cols ?? boxes.length}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)", gap: 12, marginTop: 12 }}>
    {boxes.map((b) => {
      const dc = b.dir === "up" ? INK.good : b.dir === "down" ? INK.hi : INK.chF;
      const Arrow = b.dir === "down" ? TrendingDown : TrendingUp;
      return (
        <div key={b.label} style={{ minWidth: 0, boxSizing: "border-box", borderRadius: 16, background: INK.soft, border: `1px solid ${INK.bCard}`, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: INK.chS }}>{b.label}</p>
          <p style={{ margin: "6px 0 0", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 8px" }}>
            <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", color: INK.ch, fontVariantNumeric: "tabular-nums" }}>
              {b.value}
              {b.unit && <span style={{ fontSize: 13, fontWeight: 700, color: INK.chF, marginInlineStart: 3 }}>{b.unit}</span>}
            </span>
            {b.delta && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 13, fontWeight: 800, color: dc, whiteSpace: "nowrap" }}>
                {b.dir && <Arrow size={13} strokeWidth={2.4} aria-hidden />}
                {b.delta}
              </span>
            )}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: INK.chF }}>{b.sub}</p>
        </div>
      );
    })}
  </div>
);

/** The drawn link rows (56, 36 tile, 15/24 title, 13/20 meta, chevron). */
export const LinkListWeb: React.FC<{ rows: { key: string; icon: LucideIcon; title: string; meta: string; onClick: () => void }[] }> = ({ rows }) => (
  <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
    {rows.map((r, i) => (
      <button key={r.key} type="button" onClick={r.onClick} className="hover:bg-[rgb(var(--c-primary-pale))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ minHeight: 56, display: "flex", alignItems: "center", gap: 12, borderTop: i ? `1px solid ${INK.bCard}` : "none", padding: "0 8px", margin: "0 -8px", borderRadius: 10, textAlign: "start", background: "transparent" }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: INK.prPale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <r.icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: INK.ch, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
          <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: INK.chF }}>{r.meta}</span>
        </span>
        <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
      </button>
    ))}
  </div>
);
