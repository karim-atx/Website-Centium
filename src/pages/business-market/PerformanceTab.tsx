import { useState, type CSSProperties } from "react";
import { useMarket } from "./MarketContext";
import { ScrubChart, type ScrubChartConfig } from "../../components/charts/ScrubChart";
import { lh, MCard, px } from "./kit";
import { addDays, dayMonth, isoOf, mondayOf } from "./model";

// MA1-005 / 054-057 / 060 / 065 / 096 / 098, MA1-071 (Store) and
// OURS-MA1-gym-performance. ONLY REAL LISTING EVENTS (V6-105, decision of
// 7 Oct: the invented "Views (30d)" stays gone). The readers are B13 MK-07
// (listing_performance, listing_funnel, listing_weekly, listing_top_items,
// listing_new_clients), not on the local stack: every figure is the drawn
// no-data state (MA1-065) and the half cards stay hidden. The range is the
// drawn fixed last 12 weeks, no picker.

export const SOURCES = ["Search", "Category browsing", "Map", "Direct link"];

export function PerformanceTab() {
  const m = useMarket();
  const { c, v } = m;
  const [src, setSrc] = useState<string | null>(null);
  const dash = "–";
  const boxes = v.perfLabels.map((l, i) => ({ l, v: dash, d: i === 0 ? "No data yet" : "" }));
  const weeks = lastTwelveMondays();
  const cfg: ScrubChartConfig = {
    vh: 120,
    labels: weeks.map((w) => `Week of ${dayMonth(w)}`),
    xl: [dayMonth(weeks[0]), dayMonth(weeks[5]), dayMonth(weeks[11])],
    aria: `Listing ${v.chartModes[0].toLowerCase()} and ${v.chartModes[1].toLowerCase()} per week`,
    caption: "Drag across to read a week, tap to pin it.",
    earlyText: "The trend starts after 2 weeks on Explore.",
    emptyText: `${v.chartModes[0]} and ${v.chartModes[1].toLowerCase()} start once your listing is seen.`,
    curLabel: "This period",
    prevLabel: "12 weeks before",
    modes: [
      { t: v.chartModes[0], unit: v.chartModes[0].toLowerCase(), cur: [] },
      { t: v.chartModes[1], unit: v.chartModes[1].toLowerCase(), cur: [] },
    ],
  };

  return (
    <div style={{ paddingBottom: 8 }}>
      <MCard c={c} r={22} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", overflow: "hidden" }}>
        {boxes.map((b, i) => (
          <div key={b.l} style={{ padding: "13px 10px 11px", borderLeft: i ? `1px solid ${c.divider}` : "none", minWidth: 0 }}>
            <p style={{ fontSize: px(10.5), fontWeight: 700, color: c.faint, lineHeight: lh(14) }}>{b.l}</p>
            <p style={{ fontSize: px(22), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: lh(26), marginTop: 3, fontVariantNumeric: "tabular-nums", color: c.tert }}>{b.v}</p>
            <p style={{ fontSize: px(10.5), fontWeight: 800, color: c.faint, lineHeight: lh(15.75), minHeight: lh(15.75) }}>{b.d}</p>
          </div>
        ))}
        <p style={{ gridColumn: "1 / -1", fontSize: px(12), lineHeight: lh(17), color: c.inkSoft, padding: "10px 14px 12px", borderTop: `1px solid ${c.divider}` }}>{`Numbers start once ${v.people} see your listing.`}</p>
      </MCard>

      <MCard c={c} style={{ padding: 16, marginTop: 12 }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>{v.funnelTitle}</p>
        <p style={{ fontSize: px(12), lineHeight: lh(17), color: c.faint, marginTop: 2 }}>{v.funnelSub}</p>
        <div role="group" aria-label="Show one source" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {SOURCES.map((t, i) => {
            const on = src === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setSrc(on ? null : t)}
                className="tap"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 999,
                  border: `1px solid ${on ? c.src[i] : c.border}`,
                  background: on ? c.soft : "transparent",
                  fontSize: px(11.5),
                  fontWeight: 700,
                  color: c.inkSoft,
                  opacity: src === null || on ? 1 : 0.5,
                }}
              >
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: c.src[i] }} />
                {t}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: px(11.5), lineHeight: lh(16), color: c.inkSoft, marginTop: 10, textWrap: "pretty" } as CSSProperties}>{v.emptyFunnel}</p>
      </MCard>

      <MCard c={c} r={22} style={{ marginTop: 12, padding: "14px 16px 16px" }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>{v.chartTitle}</p>
        <p style={{ fontSize: px(11.5), color: c.faint, margin: "2px 0 10px", lineHeight: lh(17.25) }}>{v.chartSub}</p>
        <ScrubChart cfg={cfg} empty />
      </MCard>
    </div>
  );
}

/** The 12 Mondays ending this week (fixed last 12 weeks, V6-105). */
export function lastTwelveMondays(): string[] {
  const end = mondayOf(isoOf(new Date()));
  return Array.from({ length: 12 }, (_, i) => addDays(end, (i - 11) * 7));
}
