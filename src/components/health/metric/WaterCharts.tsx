import React from "react";
import { hourLabel12 } from "../../../utils/time12";
import { textPx, linePx } from "../../../theme/textSize";
import { mc, useHealthMode } from "./MetricKit";
import { daysOf, weekLetter, type Period } from "./periods";
import { weekdayColumn } from "../../../utils/week";
import { isRtl } from "../../../i18n/core";

// HE1.1 #27 day chart and HE1.1.m #27-#30 month grid.
//
// DAY CHART geometry, measured from HE1.1-full.png inside viewBox 0 0 326
// 146: goal line dashed #4A6AA3 1.5 at y 29.5 (goal = 87.5 tall above the
// baseline), "Goal 2.5 L" 10/700 right-aligned at y 21; baseline #EEEDED at
// y 117; axis 6am to 10pm across the full width, labels 10/600 #8C8378 at
// y 139 (first start-, last end-anchored).
// The stepped intake line and the drink markers need each drink's time
// (PB-H-04, Database stage B1, water_intakes). Until then the chart shows
// the day's total as one marker (open circle r 5.5, stroke 2 #4A6AA3, white
// fill) at the current time today or at the end of a past day, labelled with
// the total, and the dotted rest-of-day line #241F1B@18% from it.

const BASE = 117;
const GOAL_Y = 29.5;
const AXIS = [6, 10, 14, 18, 22];

export const WaterDayChart: React.FC<{
  totalMl: number;
  goalMl: number;
  isToday: boolean;
  label: string;
  goalLabel: string;
  /** B1 water_intakes: each drink's hour (local, fractional) and amount, in time order. With them the chart draws the stepped intake line and a dot per drink (HE1.1 #27); without, the one day-total marker. */
  drinks?: { hour: number; ml: number }[];
}> = ({ totalMl, goalMl, isToday, label, goalLabel, drinks }) => {
  const { dark, hc } = useHealthMode();
  const ink = dark ? "#B8B3C7" : mc("water", "ink");
  const domain = Math.max(goalMl, totalMl);
  const yOf = (ml: number) => BASE - (ml / domain) * (BASE - GOAL_Y);
  const now = new Date();
  const hour = isToday ? now.getHours() + now.getMinutes() / 60 : 22;
  const x = Math.max(6, Math.min(326 - 6, ((Math.max(6, Math.min(22, hour)) - 6) / 16) * 326));
  const y = yOf(totalMl);
  const faint = hc ? "rgb(var(--c-charcoal))" : dark ? "#B8B3C7" : "#8C8378";
  // Round F (F10): in right to left, time runs from right to left. Every x on
  // the 326 grid is mirrored (edge decisions stay on the unmirrored x); SVG
  // text anchors are logical, so the labels follow.
  const rtl = isRtl();
  const mx = (v: number) => (rtl ? 326 - v : v);
  return (
    <svg viewBox="0 0 326 146" width="100%" height={146} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <line x1={mx(0)} x2={mx(326)} y1={BASE + 0.5} y2={BASE + 0.5} stroke={hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"} />
      <line x1={mx(2.4)} x2={mx(326)} y1={yOf(goalMl)} y2={yOf(goalMl)} stroke={ink} strokeWidth={1.5} strokeDasharray="4 4" />
      <text x={mx(326)} y={yOf(goalMl) - 8} textAnchor="end" fontSize={10} fontWeight={700} fill={ink}>
        {goalLabel}
      </text>
      {drinks && drinks.length > 0 && (() => {
        // Stepped line from 6am at 0, up by each drink at its time; dots at each step.
        const xOf = (h: number) => Math.max(0, Math.min(326, ((Math.max(6, Math.min(22, h)) - 6) / 16) * 326));
        let cum = 0;
        let d = `M${mx(0)} ${BASE}`;
        const dots: { x: number; y: number }[] = [];
        for (const k of drinks) {
          const xx = mx(xOf(k.hour));
          d += ` H${xx.toFixed(1)}`;
          cum += k.ml;
          const yy = yOf(cum);
          d += ` V${yy.toFixed(1)}`;
          dots.push({ x: xx, y: yy });
        }
        d += ` H${mx(x).toFixed(1)}`;
        return (
          <>
            <path d={d} fill="none" stroke={mc("water", "main")} strokeWidth={2} strokeLinejoin="round" />
            {dots.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill={mc("water", "main")} />
            ))}
          </>
        );
      })()}
      {totalMl > 0 && (
        <>
          {isToday && x < 320 && <line x1={mx(x + 7)} x2={mx(326)} y1={y} y2={y} stroke={dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"} strokeWidth={1.5} strokeDasharray="1.5 4" strokeLinecap="round" />}
          <circle cx={mx(x)} cy={y} r={5.5} fill={dark ? "#1C1F28" : "#FFFFFF"} stroke={mc("water", "accent")} strokeWidth={2} />
          <text x={mx(x)} y={y - 10} textAnchor={x > 300 ? "end" : "middle"} fontSize={9.5} fontWeight={700} fill={ink}>
            {label}
          </text>
        </>
      )}
      {AXIS.map((h, i) => (
        <text key={h} x={mx((i / (AXIS.length - 1)) * 326)} y={139} textAnchor={i === 0 ? "start" : i === AXIS.length - 1 ? "end" : "middle"} fontSize={10} fontWeight={600} fill={faint}>
          {hourLabel12(h)}
        </text>
      ))}
    </svg>
  );
};

/** Day-chart legend swatches: line 14 x 1.5 main, open circle 9, dashed goal (HE1.1 #28-#30). */
export const IntakeSwatch: React.FC = () => (
  <svg aria-hidden width={14} height={10} viewBox="0 0 14 10">
    <circle cx={7} cy={5} r={3.6} fill="none" stroke={mc("water", "accent")} strokeWidth={1.5} />
  </svg>
);

/**
 * HE1.1.m #27-#30: weekday letters 10/15 700 #8C8378 over a 7-column grid
 * (columns 47 wide, rows 6 apart); each day an outlined 30 ring (1.1px
 * #6E8FC9) holding a 26 dot of #6E8FC9 at 0.6 opacity that fills with the
 * day's % of goal (solid at goal), the date 9/13.5 600 #8C8378 2 under it.
 * Days ahead: empty outline. Tap a day: that day's Day view.
 */
export const WaterMonthGrid: React.FC<{
  period: Period;
  byDay: Record<string, number>;
  goalMl: number;
  today: string;
  onDay: (day: string) => void;
  dayLabel: (day: string, ml: number | null) => string;
}> = ({ period, byDay, goalMl, today, onDay, dayLabel }) => {
  const { dark, hc } = useHealthMode();
  const days = daysOf(period);
  const lead = weekdayColumn(new Date(`${days[0]}T00:00:00`));
  const faint = hc ? "rgb(var(--c-charcoal))" : dark ? "#B8B3C7" : "#8C8378";
  const main = mc("water", "main");
  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {[0, 1, 2, 3, 4, 5, 6].map(weekLetter).map((l, i) => (
          <span key={i} className="text-center" style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 700, color: faint }}>
            {l}
          </span>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", rowGap: 6, marginTop: 6 }}>
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const ml = byDay[d] && byDay[d] > 0 ? byDay[d] : null;
          const pct = ml === null ? 0 : Math.min(1, ml / goalMl);
          const atGoal = pct >= 1;
          const ahead = d > today;
          const inner = 14 + 12 * pct;
          return (
            <button
              key={d}
              type="button"
              disabled={ahead}
              onClick={() => onDay(d)}
              aria-label={dayLabel(d, ml)}
              className="tap flex flex-col items-center"
              style={{ gap: 2, minHeight: 44 }}
            >
              <span className="relative grid place-items-center rounded-full" style={{ width: 30, height: 30, background: atGoal ? main : undefined, border: `1.1px solid ${ahead ? (dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)") : main}` }}>
                {ml !== null && !atGoal && (
                  <span className="rounded-full" style={{ width: inner, height: inner, background: main, opacity: 0.6 }} />
                )}
              </span>
              <span style={{ fontSize: textPx(9), lineHeight: linePx(13.5), fontWeight: d === today ? 800 : 600, color: d === today ? "rgb(var(--c-charcoal))" : faint }}>{Number(d.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
