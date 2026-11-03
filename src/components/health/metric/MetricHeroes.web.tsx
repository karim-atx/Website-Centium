import React from "react";
import { Check, ArrowUp, AlertCircle, Gauge, HeartPulse } from "lucide-react";
import { t } from "../../../i18n/core";
import { WeightScaleIcon } from "../../icons/PartBIcons";
import { MetricHero } from "./MetricKit";
import { HeroWebLayout } from "./MetricKit.web";
import type { MetricKey } from "../MetricWidget";
import type { HrHeroData } from "./HeartRateParts";
import type { BpHeroData } from "./BloodPressureParts";
import type { WeightHeroData } from "./WeightParts";

// Website viewport v1 · the Heart rate, Blood pressure and Weight heroes on
// the web (WC-HE Health Web v5, heroVis: "HR range strip, BP wave, Weight
// journey track"). Each is a 326-wide visual: the metric icon 20 (sw 1.5) in
// the accent, the value 40/40 800 ls -1.4 with its unit 17 600 in the ink,
// the sub 13/18 600 (max 200) in the ink, all centred, over the metric's
// drawing; the stats, pills and source row in the hero column
// (HeroWebLayout). Static on the web (the reference draws no motion).

const mc = (metric: MetricKey, part: "main" | "accent" | "ink") => `rgb(var(--metric-${metric}-${part}))`;

const HeroValue: React.FC<{ metric: MetricKey; icon: React.ReactNode; value: React.ReactNode; unit?: string; sub?: React.ReactNode; padTop: number }> = ({ metric, icon, value, unit, sub, padTop }) => (
  <div className="relative flex flex-col items-center text-center" style={{ paddingTop: padTop }}>
    {icon}
    <span className="flex items-baseline whitespace-nowrap" style={{ marginTop: 6, gap: 4 }}>
      <span data-hero-value style={{ fontSize: 40, lineHeight: "40px", fontWeight: 800, letterSpacing: -1.4, fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>
        {value}
      </span>
      {unit && <span style={{ fontSize: 17, fontWeight: 600, color: mc(metric, "ink") }}>{unit}</span>}
    </span>
    {sub && <span style={{ marginTop: 6, maxWidth: 200, fontSize: 13, lineHeight: "18px", fontWeight: 600, color: mc(metric, "ink") }}>{sub}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Heart rate: 326 × 160, pad-top 8. The strip on the 40 to 180 bpm scale at
// y 138: track 8 round in the accent @18%, the range in the main, the marker
// r7 white with a 2.5 accent ring; low / high 12 700 accent at y 156 under
// their ends, the marker's label 12 700 accent at y 124. A scale, drawn left
// to right in both directions (as on mobile).

export const HeartRateHeroWeb: React.FC<{ data: HrHeroData; loading?: boolean; ariaLabel?: string }> = ({ data, loading, ariaLabel }) => {
  const K = "heart-rate" as const;
  const X = (b: number) => ((Math.max(40, Math.min(180, b)) - 40) / 140) * 326;
  const single = data.low === data.high;
  const close = X(data.high) - X(data.low) < 36;
  const label = { fontSize: 12, fontWeight: 700, fill: mc(K, "accent"), fontFamily: "inherit" } as const;
  return (
    <MetricHero metric={K} pattern={3} padding="" loading={loading} ariaLabel={ariaLabel}>
      <HeroWebLayout
        metric={K}
        visualWidth={326}
        pills={[data.change, data.rangeText].filter((p): p is string => !!p)}
        visual={
          <div className="relative" style={{ height: 160 }} data-hr-hero>
            <svg viewBox="0 0 326 160" width={326} height={160} aria-hidden className="absolute start-0 top-0 block overflow-visible" data-hr-strip>
              <line x1={0} y1={138} x2={326} y2={138} stroke="rgba(150,47,47,0.18)" strokeWidth={8} strokeLinecap="round" />
              {!single && <line x1={X(data.low)} y1={138} x2={X(data.high)} y2={138} stroke={mc(K, "main")} strokeWidth={8} strokeLinecap="round" data-hr-fill />}
              <circle cx={X(data.marker)} cy={138} r={7} fill="#FFFFFF" stroke={mc(K, "accent")} strokeWidth={2.5} data-hr-dot />
              {!single && (
                <>
                  <text x={X(data.low)} y={156} textAnchor={close ? "end" : "middle"} style={label}>
                    {data.low}
                  </text>
                  <text x={X(data.high)} y={156} textAnchor={close ? "start" : "middle"} style={label}>
                    {data.high}
                  </text>
                </>
              )}
              <text x={Math.max(30, Math.min(296, X(data.marker)))} y={124} textAnchor="middle" style={label}>
                {data.markerLabel}
              </text>
            </svg>
            <HeroValue metric={K} padTop={8} icon={<HeartPulse size={20} strokeWidth={1.5} aria-hidden style={{ color: mc(K, "accent") }} />} value={data.value} unit={data.unit} />
          </div>
        }
      />
    </MetricHero>
  );
};

// ---------------------------------------------------------------------------
// Blood pressure: 326 × 150, pad-top 8; the reading 40/40 800 with "mmHg"
// under it; the pulse wave 326 × 30 at y 118 (1.8 in the main). The category
// pill (in its range colour, with its icon) and the reading's facts in the
// hero column.

export const BloodPressureHeroWeb: React.FC<{ data: BpHeroData; wave: string; pregnancyFlags: string[]; loading?: boolean; ariaLabel?: string }> = ({
  data,
  wave,
  pregnancyFlags,
  loading,
  ariaLabel,
}) => {
  const K = "blood-pressure" as const;
  const pillInk = data.pill ? (data.pill.inRange ? "#357A4D" : "#C2453F") : undefined;
  const pills: React.ReactNode[] = [];
  if (data.pill)
    pills.push(
      <span className="inline-flex items-center" style={{ gap: 4, color: pillInk }} data-bp-pill>
        {data.pill.inRange ? <Check size={13} aria-hidden /> : pregnancyFlags.includes(data.pill.text) ? <AlertCircle size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />}
        {data.pill.text}
      </span>
    );
  for (const f of data.facts) if (f) pills.push(f);
  return (
    <MetricHero metric={K} pattern={4} padding="" loading={loading} ariaLabel={ariaLabel}>
      <HeroWebLayout
        metric={K}
        visualWidth={326}
        pills={pills}
        visual={
          <div className="relative" style={{ height: 150 }} data-bp-hero>
            <svg viewBox="0 0 326 30" width={326} height={30} preserveAspectRatio="none" aria-hidden className="absolute start-0 block overflow-visible" style={{ top: 118 }} data-bp-wave>
              <path d={wave} fill="none" stroke={mc(K, "main")} strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <HeroValue
              metric={K}
              padTop={8}
              icon={<Gauge size={20} strokeWidth={1.5} aria-hidden style={{ color: mc(K, "accent") }} />}
              value={`${data.systolic}/${data.diastolic}`}
              sub={t("mmHg")}
            />
          </div>
        }
      />
    </MetricHero>
  );
};

// ---------------------------------------------------------------------------
// Weight: 326 × 150, pad-top 6; the journey track 38 tall at y 112: track 8
// r999 #FFFFFF@85% (top 7), the fill to Now in the weight main, the start dot
// 12 in the accent (top 5), the goal ring 14 white with a 1.4 dashed accent
// border at the end (top 4), the Now knob 22 in the main with a 3.8 white
// border (top 0); "Start 107.0" / "Goal 100.0" 12 700 in the accent at top
// 24. Without a goal: no ring, Now at the end, and "Set a goal" there. The
// progress pill and the BMI (repo, kept) in the hero column.

export const WeightHeroWeb: React.FC<{
  data: WeightHeroData;
  fmt: (kg: number) => string;
  unitWord: string;
  bmi: React.ReactNode;
  onSetGoal: () => void;
  loading?: boolean;
  ariaLabel?: string;
}> = ({ data, fmt, unitWord, bmi, onSetGoal, loading, ariaLabel }) => {
  const K = "weight" as const;
  const hasGoal = data.goalKg !== null && data.journey !== null;
  const pos = hasGoal ? (data.journey as number) : data.startKg !== null && data.startKg !== data.nowKg ? 1 : 0;
  const pct = `${Math.max(0, Math.min(1, pos)) * 100}%`;
  const sp = (st: React.CSSProperties) => <span aria-hidden className="absolute" style={{ boxSizing: "border-box", borderRadius: 999, ...st }} />;
  const lbl: React.CSSProperties = { position: "absolute", top: 24, fontSize: 12, lineHeight: "16px", fontWeight: 700, color: mc(K, "accent"), whiteSpace: "nowrap" };
  const pills: React.ReactNode[] = [];
  if (data.progress) pills.push(data.progress);
  if (bmi) pills.push(bmi);
  return (
    <MetricHero metric={K} pattern={5} padding="" loading={loading} ariaLabel={ariaLabel}>
      <HeroWebLayout
        metric={K}
        visualWidth={326}
        pills={pills}
        visual={
          <div className="relative" style={{ height: 150 }} data-wt-hero>
            {data.startKg !== null && (
              <div className="absolute" style={{ insetInline: 0, top: 112, height: 38 }} data-wt-journey>
                {sp({ insetInline: 0, top: 7, height: 8, background: "rgba(255,255,255,0.85)" })}
                {sp({ insetInlineStart: 0, top: 7, height: 8, width: pct, background: mc(K, "main") })}
                {sp({ insetInlineStart: 0, top: 5, width: 12, height: 12, background: mc(K, "accent") })}
                {hasGoal && sp({ insetInlineEnd: 0, top: 4, width: 14, height: 14, background: "#FFFFFF", border: `1.4px dashed ${mc(K, "accent")}` })}
                {sp({ insetInlineStart: pct, top: 0, width: 22, height: 22, marginInlineStart: -11, background: mc(K, "main"), border: "3.8px solid #FFFFFF" })}
                <span style={{ ...lbl, insetInlineStart: 0 }}>{t("Start {n}", { n: fmt(data.startKg) })}</span>
                {hasGoal ? (
                  <span style={{ ...lbl, insetInlineEnd: 0 }}>{t("Goal {weight}", { weight: fmt(data.goalKg as number) })}</span>
                ) : (
                  <button type="button" onClick={onSetGoal} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...lbl, insetInlineEnd: 0 }}>
                    {t("Set a goal")}
                  </button>
                )}
              </div>
            )}
            <HeroValue
              metric={K}
              padTop={6}
              icon={<WeightScaleIcon size={20} strokeWidth={1.5} style={{ color: mc(K, "accent") }} />}
              value={fmt(data.nowKg)}
              unit={unitWord}
              sub={data.context}
            />
          </div>
        }
      />
    </MetricHero>
  );
};
