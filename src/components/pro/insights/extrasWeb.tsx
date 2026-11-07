import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Lightbulb, Lock, type LucideIcon } from "lucide-react";
import { INK } from "../proInk";
import { useWebLayout } from "../../web/useWebLayout";
import { InsightsWebCard } from "./webCardContext";

// Website viewport (WP-CO-IN.6, .7, .8; WP-CO Insights Extras Web): the Extras cards and their parts.

/** The Extras grid: `cols` across (one column on the rail, except the targets' 2), 16 apart (24 16 on the 1440 macros, 24 on the targets). */
export const ExtrasGridWeb: React.FC<{ cols: number; railCols?: number; gap: string; railGap?: string; children: React.ReactNode }> = ({ cols, railCols = 1, gap, railGap, children }) => {
  const { rail } = useWebLayout();
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${rail ? railCols : cols}, minmax(0, 1fr))`, gap: rail ? railGap ?? gap : gap, alignItems: "start", columnSpan: "all" }}>{children}</div>;
};

/** A drawn Extras card (r20, 1px border, 20 24): title 15 700, question 13 faint; a group card has the 36 tile head instead. */
export const ExtrasCardWeb: React.FC<{
  span?: string;
  row?: string;
  title?: string;
  question?: string;
  group?: { icon: LucideIcon; title: string; line: string };
  plotPx?: number;
  statCols?: number;
  stretch?: boolean;
  children?: React.ReactNode;
}> = ({ span = "span 1", row, title, question, group, plotPx = 200, statCols, stretch, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label={title ?? group?.title} style={{ gridColumn: span, gridRow: row, alignSelf: stretch ? "stretch" : undefined, display: stretch ? "flex" : "block", flexDirection: "column", minWidth: 0, boxSizing: "border-box", borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}`, padding: "20px 24px", overflow: "hidden" }}>
      {group && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[12px]"
          style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: open ? 12 : 0, borderBottom: open ? `1px solid ${INK.b06}` : "none", textAlign: "start", background: "transparent" }}
        >
          <span style={{ width: 36, height: 36, borderRadius: 11, background: INK.prPale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <group.icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: INK.ch }}>{group.title}</span>
            <span style={{ display: "block", fontSize: 13, color: INK.chS }}>{group.line}</span>
          </span>
          {open ? <ChevronUp size={16} aria-hidden style={{ color: INK.chF }} /> : <ChevronDown size={16} aria-hidden style={{ color: INK.chF }} />}
        </button>
      )}
      {title && (
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 700, color: INK.ch }}>{title}</p>
          {question && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: INK.chF }}>{question}</p>}
        </div>
      )}
      {(!group || open) && <InsightsWebCard.Provider value={{ plotPx, statCols, legendBelow: true, titlePx: 15 }}>{children}</InsightsWebCard.Provider>}
    </section>
  );
};

/** The caps caption (13 800, 0.1em, primary deep). */
export const ExtrasCapWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.4, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6D50D3" }}>{children}</p>
);

/** Label · value over a 10 bar, with the target tick (2 wide, 3 over and under). `pct` and `tick` are 0 to 100 of the track. */
export const ExtrasBarsWeb: React.FC<{ rows: { label: string; value: string; pct: number; tick?: number | null; color: string }[] }> = ({ rows }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
    {rows.map((r) => (
      <div key={r.label}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, lineHeight: "20px" }}>
          <span style={{ fontWeight: 700, color: INK.ch }}>{r.label}</span>
          <span style={{ color: INK.chS, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
        </div>
        <div style={{ position: "relative", height: 10, borderRadius: 999, background: INK.soft, marginTop: 4 }}>
          <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(100, r.pct))}%`, borderRadius: 999, background: r.color }} />
          {r.tick != null && <span style={{ position: "absolute", insetInlineStart: `${Math.max(0, Math.min(100, r.tick))}%`, top: -3, bottom: -3, width: 2, background: INK.ch, borderRadius: 2 }} />}
        </div>
      </div>
    ))}
  </div>
);

/** The insight line (13, lightbulb 14). */
export const ExtrasInsightWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: "12px 0 0", display: "flex", gap: 8, fontSize: 13, lineHeight: 1.5, color: INK.chS }}>
    <Lightbulb size={14} aria-hidden style={{ flex: "none", marginTop: 2, color: INK.prAccent }} />
    <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
  </p>
);

/** Rows 64 high: the 36 tile, title 15, sub 13, a value or a 24 chip at the end; a hairline between rows. */
export const ExtrasRowsWeb: React.FC<{
  rows: { key: string; icon?: LucideIcon; title: string; sub?: string; value?: string; chip?: { label: string; bg: string; ink: string } }[];
  top?: number;
}> = ({ rows, top = 4 }) => (
  <div style={{ marginTop: top }}>
    {rows.map((r, i) => (
      <div key={r.key} style={{ minHeight: 64, display: "flex", alignItems: "center", gap: 12, borderTop: i ? `1px solid ${INK.b06}` : "none" }}>
        {r.icon && (
          <span style={{ width: 36, height: 36, borderRadius: 11, background: INK.prPale, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <r.icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: INK.ch, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
          {r.sub && <span style={{ display: "block", fontSize: 13, color: INK.chF, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</span>}
        </span>
        {r.value && <span style={{ flex: "none", fontSize: 15, fontWeight: 700, color: INK.ch, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.value}</span>}
        {r.chip && <span style={{ flex: "none", height: 24, padding: "0 9px", borderRadius: 999, background: r.chip.bg, color: r.chip.ink, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{r.chip.label}</span>}
      </div>
    ))}
  </div>
);

/** The stat boxes (r14, #F7F7FC, 10 12): label 13 600 faint, value 26 800 with the unit 13, sub 13 faint. */
export const ExtrasStatsWeb: React.FC<{ stats: { label: string; value: string; unit?: string; sub?: string; ink?: string }[]; top?: number; fill?: boolean }> = ({ stats, top = 12, fill }) => (
  <div style={{ flex: fill ? 1 : "none", display: "grid", gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, gap: 8, marginTop: top }}>
    {stats.map((s) => (
      <div key={s.label} style={{ minWidth: 0, borderRadius: 14, background: INK.soft, padding: "10px 12px" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK.chF, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 26, lineHeight: 1.2, fontWeight: 800, letterSpacing: "-0.02em", color: s.ink ?? INK.ch, fontVariantNumeric: "tabular-nums" }}>
          {s.value}
          {s.unit && <span style={{ fontSize: 13, fontWeight: 700, color: INK.chF, marginInlineStart: 3 }}>{s.unit}</span>}
        </p>
        {s.sub && <p style={{ margin: "2px 0 0", fontSize: 13, color: INK.chF, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sub}</p>}
      </div>
    ))}
  </div>
);

/** The lock note (13 faint, lock 12). */
export const ExtrasLockWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: INK.chF }}>
    <Lock size={12} strokeWidth={2} aria-hidden />
    <span>{children}</span>
  </p>
);

/** The Extras head: back (32, chevron 20), the eyebrow 13 caps, the name 24/32 700. */
export const ExtrasHeadWeb: React.FC<{ eyebrow: string; title: string; onBack?: () => void; backLabel: string }> = ({ eyebrow, title, onBack, backLabel }) => (
  <div className="flex items-start" style={{ gap: 10, marginBottom: 16 }}>
    {onBack && (
      <button type="button" onClick={onBack} aria-label={backLabel} className="flex items-center justify-center shrink-0 rounded-[10px] hover:bg-[rgb(var(--c-primary-pale))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{ width: 32, height: 32, marginInlineStart: -6, marginTop: 6 }}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
      </button>
    )}
    <div className="min-w-0">
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF }}>{eyebrow}</p>
      <h2 style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 700, letterSpacing: "-0.02em", color: INK.ch, overflowWrap: "anywhere" }}>{title}</h2>
    </div>
  </div>
);
