import React from "react";
import { useWeightUnit, type WeightUnit } from "../../../services/preferences/units";
import { textPx, linePx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { MetricHero, HeroPill, hairline, metricTextInk, useHealthMode } from "./MetricKit";
import { daysOf, monthLetter, type MetricRange, type Period } from "./periods";
import { isRtl } from "../../../i18n/core";

// Weight trend (HE1.7 family): journey hero with the BMI row, the four range
// charts and the Units sheet. Literal values from health-handover.md HE1.7 /
// .d / .w / .y; chart geometry measured from the 2x PNGs (checklists). Weight
// is the one metric that follows the theme (--metric-weight-* = th tokens).
// Recovery-sensitive mode never reaches this file: the page renders no number.

const K = "weight" as const;

/** "Add your height in Profile to see your BMI": the BMI no-height text (kept verbatim from the old HE1 BMI line). */
export const BMI_NEEDS_HEIGHT = "Add your height in Profile to see your BMI";

// --- Units (OURS-health-overflow-menus #3; B3 app_preferences.unit_system) ----
// The account preference through the shared store (services/preferences/units); storage stays kg.
export type { WeightUnit };
const LB_PER_KG = 2.20462;
/** The shared display unit (Database B3 app_preferences.unit_system, services/preferences/units). */
export { useWeightUnit };
/** A kg value in the chosen unit, one decimal. */
export const inUnit = (kg: number, u: WeightUnit) => (u === "lb" ? kg * LB_PER_KG : kg);
export const fmtW = (kg: number, u: WeightUnit) => inUnit(kg, u).toFixed(1);
/** "↓ 0.3" / "↑ 0.2" / "0.0" (HE1.7 #63). */
export const deltaW = (kg: number, u: WeightUnit) => {
  const v = Math.round(inUnit(kg, u) * 10) / 10;
  return v === 0 ? "0.0" : `${v > 0 ? "↑" : "↓"} ${Math.abs(v).toFixed(1)}`;
};

export const WeightUnitsSheet: React.FC<{ open: boolean; unit: WeightUnit; onClose: () => void; onChange: (u: WeightUnit) => void }> = ({ open, unit, onClose, onChange }) => {
  const { dark } = useHealthMode();
  const options: { value: WeightUnit; label: string }[] = [
    { value: "kg", label: "Kilograms" },
    { value: "lb", label: "Pounds" },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="Units" chrome="partB">
      <div role="radiogroup" aria-label="Weight units" className="flex flex-wrap justify-center" style={{ gap: 8, paddingBottom: 24 }}>
        {options.map((o) => {
          const on = o.value === unit;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`tap ${on ? "bg-seg-active" : "bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text"}`}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 9999,
                fontSize: textPx(12.5),
                lineHeight: linePx(18.8),
                fontWeight: 700,
                border: on ? "none" : `0.5px solid ${dark ? "rgb(var(--c-primary-fill) / 0.5)" : "rgb(var(--th-aea1dc) / 0.5)"}`,
                color: on ? "rgb(var(--c-on-primary-fill))" : undefined,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Hero

export type BmiState =
  | { kind: "value"; bmi: number }
  | { kind: "text"; text: string }
  | null;

export interface WeightHeroData {
  /** The kg value shown (latest weigh-in). */
  nowKg: number;
  context: string | null;
  /** "52% there"; null without a goal. */
  progress: string | null;
  startKg: number | null;
  startLabel: string;
  goalKg: number | null;
  /** 0..1 along the strip for Now (journey); null = no goal (Now at the right of Start). */
  journey: number | null;
  bmi: BmiState;
  unit: WeightUnit;
}

/** WHO bands, the repo wording kept (V6-06: "normal weight"). */
export function bmiWord(bmi: number): string {
  return bmi < 18.5 ? "underweight" : bmi < 25 ? "normal weight" : bmi < 30 ? "overweight" : "obese";
}

/**
 * HE1.7 #8-#32: tint card 358 × 217.7 r22 pad 16 with p5.svg; value 40/40
 * 800 ls-1.6 + unit 14/21 700 ink; context 12/18 600 #5B5349 m-top 6; pill
 * "52% there". Journey: numbers 12/18 800 (start left, now centred over its
 * marker, goal right); track 326 × 8 r4 #FFFFFF@85% with the fill in the
 * theme pinned fill (#9A8CD6; dark #A991FE; HC #5B48B8), start dot 14
 * #5F5093 (dark #9A8CD6), Now marker 22 #9A8CD6 + 3.8 white border (dark
 * #A991FE / #1C1F28), goal dot 14 white + 1.6 dashed #5F5093; labels 10.5/15.8
 * (Start 600, Now 700, Goal 600) ink. BMI row m-top 6, top border 0.5px
 * #5F5093@15%, pad-top 10: "BMI" 9/13.5 700 ls1.8 caps; four segments in the
 * repo band proportions (0-18.5-25-30-40, measured 97.9 / 34.4 / 26.4 / 52.9
 * gap 2) #E4E1EE / #D3CFDE (dark #3A3D48* / #4A4757*); marker 3 × 13 r2
 * #5F5093; value 11/16.5 700 green #357A4D in the normal band, red #C2453F
 * outside (V6-06, wording "normal weight" kept).
 *
 * Motion (centium-he1.7-hero.gif, "loop 3 s"): the Now marker and fill slide
 * the last 6 into place in 0.9 s ease-out, no overshoot; a soft ring fades
 * over 1.4 s; hold. Gated by useLoopWhileVisible; static = at rest.
 */
export const WeightHero: React.FC<{
  data: WeightHeroData | null;
  loading?: boolean;
  ariaLabel?: string;
  empty?: React.ReactNode;
  onSetGoal: () => void;
}> = ({ data, loading, ariaLabel, empty, onSetGoal }) => {
  const { dark, hc } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  if (!data) {
    return (
      <MetricHero metric={K} pattern={5} padding="16px" loading={loading} ariaLabel={ariaLabel}>
        {empty}
      </MetricHero>
    );
  }
  const ink = metricTextInk(K, dark);
  const u = data.unit;
  const hasGoal = data.goalKg !== null && data.journey !== null;
  // Without a goal, Now sits at the strip's right end (Start → Now only).
  const pos = hasGoal ? (data.journey as number) : data.startKg !== null && data.startKg !== data.nowKg ? 1 : 0;
  const pct = `${pos * 100}%`;
  const fill = "rgb(var(--c-fill-pinned))";
  const dotDark = dark ? "rgb(var(--metric-weight-main))" : "rgb(var(--metric-weight-accent))";
  const primaryInk = hc && !dark ? "#4B3BA0" : ink;
  const anim = running ? "wtSlide 3s ease-out infinite" : "none";
  const segs: [number, string][] = [
    [18.5, dark ? "#3A3D48" : "#E4E1EE"],
    [6.5, dark ? "#4A4757" : "#D3CFDE"],
    [5, dark ? "#3A3D48" : "#E4E1EE"],
    [10, dark ? "#4A4757" : "#D3CFDE"],
  ];
  return (
    <MetricHero metric={K} pattern={5} padding="16px" loading={loading} ariaLabel={ariaLabel} style={{ minHeight: 217.7 }}>
      <div ref={ref}>
        <style>{`
          @keyframes wtSlide { 0% { transform: translateX(-6px); } 30%, 100% { transform: translateX(0); } }
          @keyframes wtRing { 0% { opacity: .9; transform: scale(1); } 47% { opacity: 0; transform: scale(1.7); } 100% { opacity: 0; transform: scale(1.7); } }
        `}</style>
        <div className="flex items-start justify-between" style={{ gap: 10 }}>
          <div className="flex items-baseline" style={{ gap: 5 }}>
            <span style={{ fontSize: 40, lineHeight: "40px", fontWeight: 800, letterSpacing: -1.6, color: "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums" }}>{fmtW(data.nowKg, u)}</span>
            <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 700, color: primaryInk }}>{u}</span>
          </div>
          {data.progress && (
            <HeroPill metric={K} color={primaryInk}>
              {data.progress}
            </HeroPill>
          )}
        </div>
        {data.context && <p style={{ marginTop: 6, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>{data.context}</p>}

        {data.startKg !== null && (
          <div data-wt-journey style={{ marginTop: 18 }}>
            <div className="relative" style={{ height: 18 }}>
              <span className="absolute start-0" style={num}>{fmtW(data.startKg, u)}</span>
              {pos > 0.12 && pos < 0.88 && (
                <span className="absolute" style={{ ...num, left: pct, transform: "translateX(-50%)" }}>
                  {fmtW(data.nowKg, u)}
                </span>
              )}
              {hasGoal ? (
                <span className="absolute end-0" style={num}>{fmtW(data.goalKg as number, u)}</span>
              ) : (
                pos >= 0.88 && <span className="absolute end-0" style={num}>{fmtW(data.nowKg, u)}</span>
              )}
            </div>
            <div className="relative" style={{ marginTop: 9, height: 8 }}>
              <div className="absolute inset-0" style={{ borderRadius: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)" }} />
              <div className="absolute start-0 top-0 bottom-0" data-wt-fill style={{ width: pct, borderRadius: 4, background: fill, transformOrigin: "left", animation: anim }} />
              <span className="absolute" style={{ insetInlineStart: 0, top: -3, width: 14, height: 14, borderRadius: 9999, background: dotDark }} />
              {hasGoal && (
                <span
                  className="absolute"
                  style={{ insetInlineEnd: 0, top: -3, width: 14, height: 14, borderRadius: 9999, background: dark ? "#1C1F28" : "#FFFFFF", border: `1.6px dashed ${dotDark}`, boxSizing: "border-box" }}
                />
              )}
              <span className="absolute" style={{ left: pct, top: -7, width: 22, height: 22, marginInlineStart: -11, animation: anim }} data-wt-now>
                {running && <span className="absolute inset-0" style={{ borderRadius: 9999, background: fill, animation: "wtRing 3s ease-out infinite" }} />}
                <span className="absolute inset-0" style={{ borderRadius: 9999, background: fill, border: `3.8px solid ${dark ? "#1C1F28" : "#FFFFFF"}`, boxSizing: "border-box" }} />
              </span>
            </div>
            <div className="relative" style={{ marginTop: 11, height: 16 }}>
              <span className="absolute start-0" style={{ ...lbl, color: primaryInk }}>{data.startLabel}</span>
              <span
                className="absolute"
                style={{ ...lbl, fontWeight: 700, color: primaryInk, ...(pos >= 0.88 ? { right: hasGoal ? 40 : 0 } : { left: pct, transform: "translateX(-50%)" }) }}
              >
                Now
              </span>
              {hasGoal ? (
                <span className="absolute end-0" style={{ ...lbl, color: primaryInk }}>Goal</span>
              ) : (
                <button
                  type="button"
                  onClick={onSetGoal}
                  className="tap absolute end-0 before:absolute before:-inset-y-[14px] before:-inset-x-1 before:content-['']"
                  style={{ ...lbl, fontWeight: 700, color: primaryInk, top: 0, display: pos >= 0.88 ? "none" : undefined }}
                >
                  Set a goal
                </button>
              )}
            </div>
            {!hasGoal && pos >= 0.88 && (
              <button type="button" onClick={onSetGoal} className="tap" style={{ ...lbl, marginTop: 4, fontWeight: 700, color: primaryInk, minHeight: 24 }}>
                Set a goal
              </button>
            )}
          </div>
        )}

        {data.bmi && (
          <div
            data-wt-bmi
            className="flex items-center"
            style={{ marginTop: 15, paddingTop: 10, gap: 10, borderTop: `0.5px solid ${dark ? "rgb(var(--metric-weight-main) / 0.15)" : "rgb(var(--metric-weight-accent) / 0.15)"}` }}
          >
            <span className="shrink-0 uppercase" style={{ fontSize: textPx(9), lineHeight: linePx(13.5), fontWeight: 700, letterSpacing: 1.8, color: primaryInk }}>
              BMI
            </span>
            {data.bmi.kind === "value" ? (
              <>
                <span className="relative flex-1 flex items-center" style={{ gap: 2, height: 13 }} aria-hidden>
                  {segs.map(([w, c], i) => (
                    <span key={i} style={{ flexGrow: w, flexBasis: 0, height: 5, borderRadius: 3, background: c }} />
                  ))}
                  <span
                    className="absolute"
                    style={{
                      top: 0,
                      width: 3,
                      height: 13,
                      borderRadius: 2,
                      marginInlineStart: -1.5,
                      background: dotDark,
                      left: `calc((100% - 6px) * ${Math.min(40, Math.max(0, data.bmi.bmi)) / 40} + ${[18.5, 25, 30].filter((b) => data.bmi && data.bmi.kind === "value" && data.bmi.bmi >= b).length * 2}px)`,
                    }}
                  />
                </span>
                <span
                  className="shrink-0 whitespace-nowrap"
                  data-wt-bmi-value
                  style={{
                    fontSize: textPx(11),
                    lineHeight: linePx(16.5),
                    fontWeight: 700,
                    color:
                      data.bmi.bmi >= 18.5 && data.bmi.bmi < 25 ? (dark ? "#6DC08A" : "#357A4D") : dark ? "#E8837C" : "#C2453F",
                  }}
                >
                  {data.bmi.bmi.toFixed(1)} · {bmiWord(data.bmi.bmi)}
                </span>
              </>
            ) : (
              <span className="flex-1" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
                {data.bmi.text}
              </span>
            )}
          </div>
        )}
      </div>
    </MetricHero>
  );
};

const num: React.CSSProperties = { fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 800, color: "rgb(var(--c-charcoal))", whiteSpace: "nowrap" };
const lbl: React.CSSProperties = { fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, whiteSpace: "nowrap" };

// ---------------------------------------------------------------------------
// Charts

/**
 * Geometry (HE1.7-full.png and the range PNGs): plot y 14 to 108, axis line
 * 118.9 #241F1B@8%, labels at 139. Weigh-in dot r4.5 white + 2 main ring;
 * latest / week dots filled main r4.5; ahead rings r5 1px #241F1B@18%;
 * smoothed trend 2 main; goal 1.5 dashed 4 4 in the ink colour labelled
 * "Goal 74.0 kg" right (10.5 700). Week on the 46.6 grid; month x 8 + day
 * pitch; year on the 27.2 grid. Day (viewBox 0 0 326 132): one kg scale,
 * today and the last weigh-in on a line y 52, dotted join, values above,
 * names below, three scale numbers at y 104.
 */
export const WeightChart: React.FC<{
  range: MetricRange;
  period: Period;
  byDay: Record<string, number>;
  today: string;
  goalKg: number | null;
  unit: WeightUnit;
  /** Day: the compared weigh-in. */
  compare?: { day: string; kg: number; label: string } | null;
  /** Year: the start day (first weigh-in). */
  startDay?: string | null;
}> = ({ range, period, byDay, today, goalKg, unit, compare, startDay }) => {
  const { dark, hc } = useHealthMode();
  const main = "rgb(var(--c-fill-pinned))";
  const ink = dark ? "rgb(var(--metric-weight-main))" : "rgb(var(--metric-weight-accent))";
  const ring = dark ? "#1C1F28" : "#FFFFFF";
  const ghost = dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  const axis = hairline(dark, hc, 0.08);
  const label = (bold: boolean): React.CSSProperties => ({
    fontSize: "calc(10.5px + var(--text-boost, 0px))",
    fontWeight: bold ? 800 : 600,
    fill: bold ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))",
  });
  const valLabel: React.CSSProperties = { fontSize: "calc(10.5px + var(--text-boost, 0px))", fontWeight: 700, fill: "rgb(var(--c-charcoal))" };
  // Round F (F10): in right to left, time runs from right to left: Week, Month
  // and Year mirror every x on the 326 grid (SVG text anchors are logical, so
  // the labels follow). Day is a weight scale, not a time axis: as drawn.
  const rtl = isRtl();
  const mx = (v: number) => (rtl ? 326 - v : v);
  const goalText = goalKg !== null ? `Goal ${fmtW(goalKg, unit)} ${unit}` : "";
  const days = daysOf(period).filter((d) => byDay[d] !== undefined);
  const scaleVals = (vals: number[]) => {
    const all = goalKg !== null ? [...vals, goalKg] : vals;
    const lo = Math.min(...all) - 0.5;
    const hi = Math.max(...all) + 0.5;
    return (v: number) => 108 - ((v - lo) / (hi - lo || 1)) * 94;
  };

  if (range === "day") {
    const todayKg = byDay[period.start];
    const pts = [compare ? compare.kg : null, todayKg ?? null].filter((v): v is number => v !== null);
    if (!pts.length) return <svg viewBox="0 0 326 132" width="100%" style={{ display: "block", height: "auto" }} data-wt-chart="day" />;
    const lo = Math.min(...pts) - 0.3;
    const hi = Math.max(...pts) + 0.3;
    const x = (v: number) => 30 + ((v - lo) / (hi - lo || 1)) * 266;
    return (
      <svg viewBox="0 0 326 132" width="100%" style={{ display: "block", height: "auto" }} data-wt-chart="day">
        <line x1={14} x2={312} y1={52} y2={52} stroke={axis} strokeWidth={1.5} />
        {compare && todayKg !== undefined && <line x1={x(compare.kg)} x2={x(todayKg)} y1={52} y2={52} stroke={main} strokeWidth={2} strokeDasharray="2 3" />}
        {compare && (
          <g>
            <circle cx={x(compare.kg)} cy={52} r={8} fill={ring} stroke={main} strokeWidth={2} />
            <text x={x(compare.kg)} y={34} textAnchor="middle" style={valLabel}>{`${fmtW(compare.kg, unit)} ${unit}`}</text>
            <text x={x(compare.kg)} y={76} textAnchor="middle" style={label(false)}>{compare.label}</text>
          </g>
        )}
        {todayKg !== undefined && (
          <g>
            <circle cx={x(todayKg)} cy={52} r={8} fill={main} />
            <text x={x(todayKg)} y={34} textAnchor="middle" style={valLabel}>{`${fmtW(todayKg, unit)} ${unit}`}</text>
            <text x={x(todayKg)} y={76} textAnchor="middle" style={{ ...label(true), fill: ink }}>{period.start === today ? "Today" : "This day"}</text>
          </g>
        )}
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <text key={i} x={[14, 163, 312][i]} y={104} textAnchor={["start", "middle", "end"][i] as "start"} style={label(false)}>
            {fmtW(v, unit)}
          </text>
        ))}
      </svg>
    );
  }

  if (range === "week") {
    const all = daysOf(period);
    const vals = days.map((d) => byDay[d]);
    const y = vals.length ? scaleVals(vals) : () => 60;
    const goalY = goalKg !== null && vals.length ? y(goalKg) : null;
    return (
      <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-wt-chart="week">
        <line x1={0} x2={326} y1={118.9} y2={118.9} stroke={axis} strokeWidth={1} />
        {goalY !== null && <GoalLine y={goalY} ink={ink} text={goalText} />}
        {all.map((d, i) => {
          const cx = mx(25.4 + 46.6 * i);
          const v = byDay[d];
          if (v === undefined) return d > today ? <circle key={d} cx={cx} cy={vals.length ? y(vals[vals.length - 1]) : 60} r={5} fill="none" stroke={ghost} strokeWidth={1} data-ghost /> : null;
          return (
            <g key={d} data-dot>
              <circle cx={cx} cy={y(v)} r={4.5} fill={main} />
              <text x={cx} y={y(v) - 10} textAnchor="middle" style={valLabel}>
                {fmtW(v, unit)}
              </text>
            </g>
          );
        })}
        {all.map((d, i) => (
          <text key={`l${d}`} x={mx(25.4 + 46.6 * i)} y={139} textAnchor="middle" style={label(d === today)}>
            {["S", "M", "T", "W", "T", "F", "S"][new Date(`${d}T12:00:00`).getDay()]}
          </text>
        ))}
      </svg>
    );
  }

  if (range === "month") {
    const n = daysOf(period).length;
    const x = (d: string) => mx(8 + ((Number(d.slice(8, 10)) - 1) * 310) / Math.max(1, n - 1));
    const vals = days.map((d) => byDay[d]);
    const y = vals.length ? scaleVals(vals) : () => 60;
    // Smoothed trend: the 7-day trailing average of weigh-ins at each weigh-in.
    const trend = days.map((d) => {
      const from = new Date(`${d}T12:00:00`).getTime() - 6 * 86400000;
      const win = Object.entries(byDay).filter(([k]) => k <= d && new Date(`${k}T12:00:00`).getTime() >= from).map(([, v]) => v);
      return { d, v: win.reduce((a, b) => a + b, 0) / win.length };
    });
    const goalY = goalKg !== null && vals.length ? y(goalKg) : null;
    return (
      <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-wt-chart="month">
        <line x1={0} x2={326} y1={118.9} y2={118.9} stroke={axis} strokeWidth={1} />
        {goalY !== null && <GoalLine y={goalY} ink={ink} text={goalText} />}
        {trend.length > 1 && <polyline points={trend.map((t) => `${x(t.d)},${y(t.v)}`).join(" ")} fill="none" stroke={main} strokeWidth={2} strokeLinejoin="round" data-trend />}
        {days.map((d) => (
          <circle key={d} cx={x(d)} cy={y(byDay[d])} r={4.5} fill={ring} stroke={main} strokeWidth={2} data-dot />
        ))}
        {[1, 8, 15, 22, 29].filter((dn) => dn <= n).map((dn) => (
          <text key={dn} x={mx(8 + ((dn - 1) * 310) / Math.max(1, n - 1))} y={139} textAnchor="middle" style={label(false)}>
            {dn}
          </text>
        ))}
      </svg>
    );
  }

  // Year: monthly averages from the start month; earlier months empty, months ahead as rings.
  const yr = period.start.slice(0, 4);
  const months = Array.from({ length: 12 }, (_, i) => {
    const prefix = `${yr}-${String(i + 1).padStart(2, "0")}`;
    const vs = Object.entries(byDay).filter(([d]) => d.startsWith(prefix)).map(([, v]) => v);
    return { i, prefix, v: vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null, ahead: `${prefix}-01` > today, current: today.startsWith(prefix) };
  });
  const startKg = startDay && startDay.startsWith(yr) ? byDay[startDay] : null;
  const vals = months.filter((m) => m.v !== null).map((m) => m.v as number);
  const y = vals.length ? scaleVals(startKg !== null && startKg !== undefined ? [...vals, startKg] : vals) : () => 60;
  const cx = (i: number) => mx(16.2 + 27.2 * i);
  const pts = months.filter((m) => m.v !== null);
  const goalY = goalKg !== null && vals.length ? y(goalKg) : null;
  const startMonth = startDay && startDay.startsWith(yr) ? Number(startDay.slice(5, 7)) - 1 : null;
  return (
    <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-wt-chart="year">
      <line x1={0} x2={326} y1={118.9} y2={118.9} stroke={axis} strokeWidth={1} />
      {goalY !== null && <GoalLine y={goalY} ink={ink} text={goalText} />}
      {pts.length > 1 && <polyline points={pts.map((m) => `${cx(m.i)},${y(m.v as number)}`).join(" ")} fill="none" stroke={main} strokeWidth={2} strokeLinejoin="round" data-trend />}
      {pts.map((m) => (
        <circle key={m.prefix} cx={cx(m.i)} cy={y(m.v as number)} r={m.current ? 6 : 4.5} fill={m.current ? main : ring} stroke={main} strokeWidth={2} data-dot />
      ))}
      {startMonth !== null && startKg !== null && startKg !== undefined && (
        <g data-start>
          <circle cx={cx(startMonth) - (rtl ? -9 : 9)} cy={y(startKg)} r={5.5} fill={ink} />
          <text x={cx(startMonth) - (rtl ? -9 : 9)} y={y(startKg) - 10} textAnchor="middle" style={{ ...valLabel, fill: ink }}>{`Start ${fmtW(startKg, unit)}`}</text>
        </g>
      )}
      {months.filter((m) => m.ahead).map((m) => (
        <circle key={`g${m.prefix}`} cx={cx(m.i)} cy={vals.length ? y(vals[vals.length - 1]) : 60} r={5} fill="none" stroke={ghost} strokeWidth={1} data-ghost />
      ))}
      {months.map((m) => (
        <text key={`l${m.prefix}`} x={cx(m.i)} y={139} textAnchor="middle" style={label(m.current)}>
          {monthLetter(m.i + 1)}
        </text>
      ))}
    </svg>
  );
};

const GoalLine: React.FC<{ y: number; ink: string; text: string }> = ({ y, ink, text }) => (
  <g data-goal-line>
    <line x1={0} x2={326} y1={y} y2={y} stroke={ink} strokeWidth={1.5} strokeDasharray="4 4" />
    <text x={isRtl() ? 0 : 326} y={y - 6} textAnchor="end" style={{ fontSize: "calc(10.5px + var(--text-boost, 0px))", fontWeight: 700, fill: ink }}>
      {text}
    </text>
  </g>
);

export function weightLegend(range: MetricRange, hasGoal: boolean, startLabel: string | null, dark: boolean): { label: string; swatch: React.ReactNode }[] {
  const main = "rgb(var(--c-fill-pinned))";
  const ink = dark ? "rgb(var(--metric-weight-main))" : "rgb(var(--metric-weight-accent))";
  const ring = <span style={{ width: 9, height: 9, borderRadius: 9999, border: `2px solid ${main}`, display: "inline-block", boxSizing: "border-box" }} />;
  const dot = <span style={{ width: 8, height: 8, borderRadius: 9999, background: main, display: "inline-block" }} />;
  const ghost = <span style={{ width: 9, height: 9, borderRadius: 9999, border: `1px solid ${dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}`, display: "inline-block" }} />;
  const line = <span style={{ width: 14, height: 2, background: main, display: "inline-block" }} />;
  const dash = <span style={{ width: 14, borderTop: `1.5px dashed ${ink}`, display: "inline-block" }} />;
  const out: { label: string; swatch: React.ReactNode }[] = [];
  if (range === "month") out.push({ label: "Weigh-in", swatch: ring }, { label: "Smoothed trend", swatch: line });
  if (range === "week") out.push({ label: "Weigh-in", swatch: dot }, { label: "Days ahead", swatch: ghost });
  if (range === "year") {
    out.push({ label: "Monthly average", swatch: line });
    if (startLabel) out.push({ label: startLabel, swatch: <span style={{ width: 8, height: 8, borderRadius: 9999, background: ink, display: "inline-block" }} /> });
  }
  if (range !== "day" && hasGoal) out.push({ label: "Goal", swatch: dash });
  return out;
}
