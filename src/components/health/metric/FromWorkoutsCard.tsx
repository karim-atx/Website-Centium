import React from "react";
import { Dumbbell } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { clock12 } from "../../../utils/time12";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import type { WorkoutKcalSession } from "../../../services/health-metrics/b1";
import { hairline, mc, metricIconInk, useHealthMode } from "./MetricKit";
import { appLocale } from "../../../i18n/format";

const n = (v: number) => Math.round(v).toLocaleString(appLocale("en-GB"));

/**
 * HE1.4 #14-#33 "From workouts" (Database B1 workout_sessions.kcal, HA-07):
 * card r18 white + 0.5px #241F1B@8% (dark #1C1F28 / #F5F3FA@8%), pad 14,
 * m-top 12; title 13/19.5 700 + "570 of 1,940 kcal" 10.5/15.8 600 #8C8378;
 * a row per session (tile 32 r10 tint, Dumbbell 17 #B07A35 / dark #D9A15B,
 * name 13.5/20.3 600, meta 11/16.5 400 #8C8378 "7:10 AM · 52 min", kcal
 * 14/21 800 + "kcal" 10.5/15.8 600 #8A5A1F), rows split by 0.5px @5%;
 * "Rest of the day" 12/18 600 #5B5349 with 12.5/18.8 800. Only Centium
 * sessions that carry a kcal; hidden when there are none (the handover
 * fallback). The "Strength" kind word is UNSPECIFIED in our data (routines
 * carry no kind): meta is time and duration.
 */
export const FromWorkoutsCard: React.FC<{ sessions: WorkoutKcalSession[]; dayTotal: number; onOpen: (id: string) => void }> = ({ sessions, dayTotal, onOpen }) => {
  const { dark, hc } = useHealthMode();
  // Recovery-sensitive mode (AJ R4): workout kcal are calorie numbers too.
  const hideNumbers = useHideNumbers();
  if (hideNumbers || sessions.length === 0) return null;
  const sum = sessions.reduce((s, x) => s + x.kcal, 0);
  const sep = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.05)" : "rgba(36,31,27,0.05)";
  const unit = <span style={{ marginInlineStart: 3, fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: dark ? "#B8B3C7" : mc("calories", "ink") }}>kcal</span>;
  return (
    <section style={{ marginTop: 12, borderRadius: 18, padding: 14, background: dark ? "#1C1F28" : "#FFFFFF", border: `0.5px solid ${hairline(dark, hc)}` }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>From workouts</h2>
        <span style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>{`${n(sum)} of ${n(Math.max(sum, dayTotal))} kcal`}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        {sessions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => onOpen(x.id)}
            className="tap w-full flex items-center text-start"
            style={{ gap: 11, padding: "9px 0", borderTop: i ? `0.5px solid ${sep}` : undefined }}
          >
            <span className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: mc("calories", "tint") }} aria-hidden>
              <Dumbbell size={17} strokeWidth={1.5} style={{ color: metricIconInk("calories", dark) }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{x.name}</span>
              <span className="block truncate" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>
                {[clock12(x.startedAt), x.durationSec ? `${Math.round(x.durationSec / 60)} min` : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="shrink-0 flex items-baseline">
              <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>{n(x.kcal)}</span>
              {unit}
            </span>
          </button>
        ))}
      </div>
      {dayTotal > sum && (
        <div className="flex items-center justify-between" style={{ marginTop: 6, paddingTop: 9, borderTop: `0.5px solid ${sep}` }}>
          <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Rest of the day</span>
          <span className="flex items-baseline">
            <span style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{n(dayTotal - sum)}</span>
            {unit}
          </span>
        </div>
      )}
    </section>
  );
};
