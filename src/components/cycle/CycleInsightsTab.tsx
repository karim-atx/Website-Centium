import React, { useEffect, useState } from "react";
import type { CycleDayLog, CyclePrediction } from "../../services/cycle/types";
import { cycleStats, hasEnoughForInsights, symptomGrid } from "../../services/cycle/insights";
import * as G from "../../services/cycle/guidance";
import { getCycleStats, type CycleServerStats } from "../../services/cycle";
import { CapsLabel, CycleCard, CycleFooter, hair, type, useCycleMode } from "./cycleUi";

// HE1.10.a, the Insights tab.
//
// Cycle length as one horizontal strip per cycle (last 6, cycleStats().history):
// length in proportion to the days, the longest fills the track; period days
// in the period pink at the start (#E29AB2, dark #E8A9BF: --metric-cycle-main),
// the rest #D6CFF0 (dark #A991FE@35%, * derived), the latest in the theme
// primary (#9A8CD6 / #A991FE); month on the left, days at the end. Then the
// three averages in one divider row, the "Worth a conversation" flags card
// (K1, repo copy verbatim incl. FLAG_EXTRA), and Symptoms by phase with
// counts tinted by phase colour. A null stat is a dash, never a zero (the
// app's "–", D-17).

const MONTH = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short" });

/** Cell colours per phase (HE1.10.a #36-#40). */
function cellColours(phase: string): { ink: string; bg: string } {
  switch (phase) {
    case "menstrual":
      return { ink: "rgb(var(--c-primary-deep-text))", bg: "rgb(var(--c-primary-dark) / 0.2)" };
    case "follicular":
      return { ink: "rgb(var(--c-primary-deep-text))", bg: "rgb(var(--c-primary) / 0.2)" };
    case "ovulatory":
      return { ink: "var(--cyc-ovu-ink)", bg: "rgb(var(--th-4f7f78) / 0.2)" };
    default:
      return { ink: "rgb(var(--c-primary-deep-text))", bg: "rgb(var(--c-teal) / 0.2)" };
  }
}

export const CycleInsightsTab: React.FC<{
  logs: readonly CycleDayLog[];
  lutealLength: number;
  prediction: CyclePrediction | null;
}> = ({ logs, lutealLength, prediction }) => {
  const { dark, hc } = useCycleMode();
  const stats = cycleStats(logs);
  // Database B2: the averages come from my_cycle_stats() (period runs
  // collapsed, gaps outside 15–90 days left out); nulls = not enough logged
  // yet. The strips, the variation and the symptom grid stay on the device:
  // the function does not return them. Re-read when the logs change.
  const [server, setServer] = useState<CycleServerStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    void getCycleStats().then((r) => {
      if (!live) return;
      if (r.ok) {
        setServer(r.stats);
        setStatsFailed(false);
      } else setStatsFailed(true);
    });
    return () => {
      live = false;
    };
  }, [logs, retry]);
  const avgCycle = server?.avgCycleLength == null ? null : Math.round(server.avgCycleLength);
  const avgPeriod = server?.avgPeriodLength == null ? null : Math.round(server.avgPeriodLength);
  const grid = symptomGrid(logs, lutealLength);
  const enough = hasEnoughForInsights(logs);
  const history = stats.history;
  const max = Math.max(1, ...history.map((h) => h.days));
  // Period days per strip: the period that STARTS each cycle (cycleStats'
  // own history carries the days; the period length is counted here from the
  // same logs: consecutive period days from the cycle's start date).
  const periodDays = new Set(logs.filter((l) => l.isPeriod).map((l) => l.date));
  const periodLen = (start: string) => {
    let n = 0;
    const d = new Date(`${start}T00:00:00`);
    for (;;) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!periodDays.has(iso)) break;
      n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  };

  const ovuInk = dark ? "rgb(var(--th-93c1b9))" : "rgb(var(--th-3c6b65))";
  const divider = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "#E5E7EB";

  return (
    <div style={{ ["--cyc-ovu-ink" as string]: ovuInk }} data-cycle-tab="insights">
      {!enough ? (
        // K2 / OURS-cycle-empty-states #6: repo copy, centred 12/18 #5B5349.
        <CycleCard style={{ marginTop: 4 }}>
          <p className="text-center text-charcoal-soft" style={type(12, 18, 400)}>
            {G.INSIGHTS_TOO_LITTLE}
          </p>
        </CycleCard>
      ) : (
        <>
          <CycleCard style={{ marginTop: 4 }} ariaLabel={G.INSIGHTS_CYCLE_LENGTH}>
            <CapsLabel style={{ marginBottom: 12 }}>{G.INSIGHTS_CYCLE_LENGTH}</CapsLabel>
            <div className="flex flex-col" style={{ gap: 10 }}>
              {history.map((c, i) => {
                const latest = i === history.length - 1;
                const pDays = Math.min(c.days, periodLen(c.startDate));
                return (
                  <div key={c.startDate} className="flex items-center" style={{ gap: 10 }} data-strip={c.days}>
                    <span
                      className="uppercase shrink-0"
                      style={type(9.5, 14.3, 800, { width: 30, letterSpacing: 1, color: latest ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))" })}
                    >
                      {MONTH(c.startDate)}
                    </span>
                    <span className="flex-1 min-w-0 flex items-center" style={{ gap: 10 }}>
                      <span
                        className="relative overflow-hidden rounded-full"
                        data-strip-bar=""
                        style={{
                          height: 12,
                          width: `calc((100% - 44px) * ${c.days / max})`,
                          background: latest ? "rgb(var(--c-fill-pinned))" : dark ? "rgb(169 145 254 / 0.35)" : "#D6CFF0",
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0"
                          data-strip-period=""
                          style={{ width: `${(pDays / c.days) * 100}%`, background: "rgb(var(--metric-cycle-main))" }}
                        />
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-charcoal" style={type(12, 18, 800, { fontVariantNumeric: "tabular-nums" })}>
                        {c.days}{" "}
                        <span className="text-charcoal-faint" style={type(10, 15, 600)}>
                          d
                        </span>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center flex-wrap" style={{ gap: 14, marginTop: 14 }}>
              <span className="inline-flex items-center text-charcoal-soft" style={{ gap: 6, ...type(10, 15, 600) }}>
                <span aria-hidden className="rounded-full" style={{ width: 12, height: 8, background: "rgb(var(--metric-cycle-main))" }} />
                {G.INSIGHTS_PERIOD_DAYS}
              </span>
              <span className="inline-flex items-center text-charcoal-soft" style={{ gap: 6, ...type(10, 15, 600) }}>
                <span aria-hidden className="rounded-full" style={{ width: 12, height: 8, background: dark ? "rgb(169 145 254 / 0.35)" : "#D6CFF0" }} />
                {G.INSIGHTS_REST_OF_CYCLE}
              </span>
            </div>
            <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 400, { marginTop: 10 })}>
              {G.INSIGHTS_STRIPS_NOTE(history.length)}
            </p>
          </CycleCard>

          {/* #23-#30: one row pad 12 0, hairlines above and below, no boxes. */}
          <div
            className="flex"
            style={{ marginTop: 12, padding: "12px 0", borderTop: `0.5px solid ${hair(dark, hc)}`, borderBottom: `0.5px solid ${hair(dark, hc)}` }}
          >
            {(
              [
                [G.INSIGHTS_AVG_CYCLE, avgCycle, "rgb(var(--c-primary-dark))"],
                [G.INSIGHTS_AVG_PERIOD, avgPeriod, dark ? "#EDA9C0" : "rgb(var(--metric-cycle-accent))"],
                [G.INSIGHTS_VARIATION, stats.variationDays, dark ? "#B8B3C7" : "#6B6570"],
              ] as const
            ).map(([label, value, ink], i) => (
              <div
                key={label}
                className="flex-1 min-w-0 text-center"
                style={{ padding: "2px 4px", borderLeft: i === 0 ? undefined : `0.5px solid ${divider}` }}
              >
                <p style={type(18, 27, 700, { letterSpacing: -0.4, color: ink, fontVariantNumeric: "tabular-nums" })}>
                  {/* A NULL IS A DASH, never a zero: a zero-day cycle is not a cycle. */}
                  {value ?? "–"}
                  {value !== null && (
                    <span className="text-charcoal-faint" style={type(11, 16.5, 600, { letterSpacing: -0.4 })}>
                      {" "}
                      days
                    </span>
                  )}
                </p>
                <p className="text-charcoal-faint" style={type(10, 15, 600, { marginTop: 1 })}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-charcoal-faint" style={type(10.5, 15.2, 400, { marginTop: 8 })}>
            {G.INSIGHTS_AVERAGES_NOTE}
          </p>
          {statsFailed && (
            <p role="alert" className="text-center text-status-high" style={type(11.5, 17.3, 600, { marginTop: 4 })}>
              {G.INSIGHTS_LOAD_ERROR}{" "}
              <button type="button" onClick={() => setRetry((n) => n + 1)} className="tap text-primary-dark" style={{ minHeight: 32, fontWeight: 700 }}>
                {G.RETRY}
              </button>
            </p>
          )}

          {/* K1: kept above Symptoms, repo copy verbatim. */}
          {prediction !== null && prediction.flags.length > 0 && (
            <CycleCard style={{ marginTop: 12 }} ariaLabel={G.FLAGS_HEADING}>
              <CapsLabel style={{ marginBottom: 10 }}>{G.FLAGS_HEADING}</CapsLabel>
              <div className="flex flex-col" style={{ gap: 10 }}>
                {prediction.flags.map((f) => (
                  <div key={f}>
                    <p className="text-charcoal" style={type(13, 19.5, 700)}>
                      {G.FLAG_TITLE[f]}
                    </p>
                    <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                      {G.FLAG_BODY[f]} {G.FLAG_ADVICE}
                    </p>
                    {G.FLAG_EXTRA[f] && (
                      <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 4 })}>
                        {G.FLAG_EXTRA[f]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CycleCard>
          )}

          <CycleCard style={{ marginTop: 12 }} ariaLabel={G.SYMPTOMS_BY_PHASE}>
            <CapsLabel style={{ marginBottom: 12 }}>{G.SYMPTOMS_BY_PHASE}</CapsLabel>
            {grid.symptoms.length === 0 ? (
              <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                {G.SYMPTOM_GRID_TOO_LITTLE}
              </p>
            ) : (
              <>
                <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: "0 6px", margin: "-6px 0" }}>
                  <thead>
                    <tr>
                      <th scope="col" className="text-start uppercase text-charcoal-faint" style={type(8.5, 12.8, 800, { letterSpacing: 1 })}>
                        {G.GRID_HEAD_SYMPTOM}
                      </th>
                      {G.PHASE_BAR.map((p) => (
                        <th key={p} scope="col" className="uppercase text-charcoal-faint" style={type(8.5, 12.8, 800, { letterSpacing: 1, width: 61 })}>
                          <abbr title={G.PHASE_LABEL[p]} className="no-underline">
                            {G.GRID_PHASE_SHORT[p]}
                          </abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.symptoms.map((sym) => (
                      <tr key={sym}>
                        <th scope="row" className="text-start text-charcoal" style={type(12, 18, 600)}>
                          {G.SYMPTOM_LABEL[sym]}
                        </th>
                        {G.PHASE_BAR.map((p) => {
                          const n = grid.counts[sym]?.[p] ?? 0;
                          const c = cellColours(p);
                          return (
                            <td key={p} className="text-center" style={{ fontVariantNumeric: "tabular-nums" }}>
                              <span
                                className="inline-flex items-center justify-center"
                                aria-label={`${n} day${n === 1 ? "" : "s"}`}
                                data-cell={`${sym}:${p}`}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 8,
                                  background: n > 0 ? c.bg : "transparent",
                                  color: n > 0 ? c.ink : "rgb(var(--c-charcoal) / 0.25)",
                                  ...type(11, 16.5, 800),
                                }}
                              >
                                {n || "·"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-charcoal-faint" style={type(10.5, 15.2, 400, { marginTop: 10 })}>
                  {G.SYMPTOMS_GRID_NOTE}
                </p>
              </>
            )}
          </CycleCard>
        </>
      )}
      <CycleFooter />
    </div>
  );
};
