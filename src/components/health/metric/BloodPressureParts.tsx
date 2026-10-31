import React from "react";
import { AlertCircle, ArrowUp, Check, Clock, Hand, HeartPulse, Info, Sunrise, Sunset } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { useLoopWhileVisible } from "../useLoopWhileVisible";
import { MetricHero, hairline, mc, metricIconInk, metricTextInk, useHealthMode } from "./MetricKit";
import { daysOf, monthLetter, type MetricRange, type Period } from "./periods";
import { isRtl } from "../../../i18n/core";
import { BP_CATEGORIES, type BpCategory } from "../../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL, BP_CATEGORY_RANGE, BP_DETAIL_FOOTER, SEVERE_READING_MESSAGE } from "../../../services/blood-pressure/guidance";
import { PREGNANCY_FLAG_COPY, type PregnancyFlag } from "../../../services/pregnancy/checks";
import { PREGNANCY_BP_LEVELS, REVIEWED } from "../../../services/health-metrics/clinicalCopy";
import type { BloodPressureReading } from "../../../services/blood-pressure";

// Blood pressure (HE1.6 family) hero, safety cards, charts, tiles and the
// reference card. Literal values from health-handover.md HE1.6 / .a / .d / .m
// / .y; chart geometry measured from the 2x PNGs (recorded in the
// checklists). Safety text only from its constants, never retyped.

const K = "blood-pressure" as const;

/** Range status colours (Shared rules; V6-04): Normal green, every other category red. */
export const rangeInk = (inRange: boolean, dark: boolean) => (inRange ? (dark ? "#6DC08A" : "#357A4D") : dark ? "#E8837C" : "#C2453F");

// ---------------------------------------------------------------------------
// Safety cards above the hero (KEEP-SAFETY K1, K2)

/**
 * K1 (HE1.6.a "after Close, the same message stays on the HE1.6 card above
 * the hero while the latest reading is very high"): #FCEDEC r22 (dark
 * #3C2A30) pad 14, tile 32 r10 #FCEDEC (dark #3C2A30; HE1.6.a #52) with
 * AlertCircle 17 #A4231C (dark #F09A8E*),
 * title "Very high reading" 13.5/20.3 700 (HE1.6.a #54 words), text 12/18 400
 * SEVERE_READING_MESSAGE word for word, never truncated, and "How to measure"
 * 12/18 700 #7D6BB5 (dark #C3B3FB, High contrast #4B3BA0).
 *
 * Pregnancy (OURS-health-bp-pregnancy-levels #2): Urgent uses the same red
 * card; Same day a white card + 0.5px hairline; title and text are
 * PREGNANCY_FLAG_COPY verbatim (via the flag).
 */
export const BpSafetyCard: React.FC<{
  kind: "severe" | "urgent" | "same-day";
  flag?: PregnancyFlag | null;
  onHowToMeasure: () => void;
}> = ({ kind, flag, onHowToMeasure }) => {
  const { dark, hc } = useHealthMode();
  const red = kind !== "same-day";
  const link = hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))";
  const title = kind === "severe" ? "Very high reading" : (flag?.label ?? "");
  const text = kind === "severe" ? SEVERE_READING_MESSAGE : (flag?.text ?? "");
  return (
    <section
      role={red ? "alert" : "status"}
      data-bp-safety={kind}
      className="flex"
      style={{
        marginBottom: 12,
        gap: 11,
        borderRadius: 22,
        padding: 14,
        background: red ? (dark ? "#3C2A30" : "#FCEDEC") : dark ? "#1C1F28" : "#FFFFFF",
        border: red ? undefined : `0.5px solid ${hairline(dark, hc)}`,
      }}
    >
      <span className="shrink-0 grid place-items-center" style={{ width: 32, height: 32, borderRadius: 10, background: dark ? "#3C2A30" : "#FCEDEC" }} aria-hidden>
        <AlertCircle size={17} strokeWidth={1.75} style={{ color: dark ? "#F09A8E" : "#A4231C" }} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{title}</h2>
        <p style={{ marginTop: 3, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 400, color: "rgb(var(--c-charcoal))" }}>{text}</p>
        <button
          type="button"
          onClick={onHowToMeasure}
          className="tap relative before:absolute before:-inset-y-[13px] before:-inset-x-1 before:content-['']"
          style={{ marginTop: 8, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: link }}
        >
          How to measure
        </button>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Hero

export interface BpHeroData {
  systolic: number;
  diastolic: number;
  /** Three fact lines (HE1.6 #13): pulse / arm · position / when, or count / avg pulse / period. */
  facts: (string | null)[];
  /** Category pill (Day / Week latest only, V6-05) or the pregnancy level. */
  pill: { text: string; inRange: boolean } | null;
}

/** "M3 26" … three arterial pulse shapes across 326 × 30 (HE1.6 #18, from the PNG). */
const PULSE_PATH = (() => {
  const w = 326 / 3;
  let d = "M0 27";
  for (let i = 0; i < 3; i++) {
    const x = i * w;
    d += ` C${x + 6} 24 ${x + 10} 6 ${x + 18} 5 C${x + 26} 4 ${x + 34} 13 ${x + 42} 16 C${x + 45} 17 ${x + 47} 13 ${x + 51} 14 C${x + 56} 15 ${x + 60} 19 ${x + 72} 21 L${x + w - 2} 26`;
  }
  return d;
})();

/**
 * HE1.6 #8-#18: tint card 358 × 208 r22 pad 18 16 with p4.svg. Left column
 * 112 wide: systolic 44/44 800 ls-1.8, divider 100 × 2 r1 main m 8 6,
 * diastolic, "mmHg" 12/18 700 metric ink m-top 6. Right column (x 162.5,
 * 196 wide): three facts 12.5/18.8 600 #241F1B gap 9 with 15 icons in the
 * metric dark accent (HeartPulse per the table; Hand and Clock read from the
 * PNG), then the category pill (#FFFFFF@85% pad 3 9, 11/16.5 700 + 13 icon:
 * Check in #357A4D for Normal, ArrowUp in #C2453F for the rest). Pulse wave
 * 326 × 30 m-top 12.
 *
 * Motion (centium-he1.6-hero.gif, "loop 3 s"): one pulse traced across the
 * card in 1.6 s, faded by 2.5 s, held; ease-in-out. useLoopWhileVisible
 * gates it; the static frame (and Reduce motion) is the full wave.
 */
export const BloodPressureHero: React.FC<{
  data: BpHeroData | null;
  loading?: boolean;
  empty?: { title: string; hint: string; onTap: () => void };
  ariaLabel?: string;
}> = ({ data, loading, empty, ariaLabel }) => {
  const { dark } = useHealthMode();
  const [ref, running] = useLoopWhileVisible<HTMLDivElement>();
  const ink = metricIconInk(K, dark);
  if (!data) {
    return (
      <MetricHero metric={K} pattern={4} padding="18px 16px" loading={loading} ariaLabel={ariaLabel} style={{ minHeight: 208 }}>
        {empty && (
          <button type="button" onClick={empty.onTap} className="tap block w-full text-center" style={{ padding: "54px 0" }}>
            <span className="block" style={{ fontSize: textPx(17), lineHeight: linePx(25.5), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>
              {empty.title}
            </span>
            <span className="block" style={{ marginTop: 2, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: metricTextInk(K, dark) }}>
              {empty.hint}
            </span>
          </button>
        )}
      </MetricHero>
    );
  }
  const icons = [HeartPulse, Hand, Clock];
  const pillInk = data.pill ? rangeInk(data.pill.inRange, dark) : undefined;
  return (
    <MetricHero metric={K} pattern={4} padding="18px 16px" loading={loading} ariaLabel={ariaLabel} style={{ minHeight: 208 }}>
      <div ref={ref}>
        <style>{`@keyframes bpTrace { 0% { stroke-dashoffset: 1; opacity: 1; } 53% { stroke-dashoffset: 0; opacity: 1; } 83%, 100% { stroke-dashoffset: 0; opacity: 0; } }`}</style>
        <div className="flex" style={{ gap: 18 }}>
          <div className="shrink-0 flex flex-col items-center" style={{ width: 112 }} data-bp-reading>
            <span style={{ fontSize: 44, lineHeight: "44px", fontWeight: 800, letterSpacing: -1.8, color: "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums" }}>{data.systolic}</span>
            <span aria-hidden style={{ width: 100, height: 2, borderRadius: 1, margin: "8px 6px", background: mc(K, "main") }} />
            <span style={{ fontSize: 44, lineHeight: "44px", fontWeight: 800, letterSpacing: -1.8, color: "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums" }}>{data.diastolic}</span>
            <span style={{ marginTop: 6, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: metricTextInk(K, dark) }}>mmHg</span>
          </div>
          <div className="min-w-0 flex-1 flex flex-col" style={{ gap: 9, paddingTop: 10 }}>
            {data.facts.map((f, i) => {
              if (!f) return null;
              const Icon = icons[i];
              return (
                <span key={i} className="flex items-center min-w-0" style={{ gap: 8, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
                  <Icon size={15} strokeWidth={1.5} style={{ color: ink }} className="shrink-0" aria-hidden />
                  <span className="truncate">{f}</span>
                </span>
              );
            })}
            {data.pill && (
              <span
                data-bp-pill
                className="inline-flex items-center self-start whitespace-nowrap"
                style={{ marginTop: 2, gap: 3, padding: "3px 9px", borderRadius: 9999, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)", color: pillInk, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 700 }}
              >
                {data.pill.inRange ? <Check size={13} aria-hidden /> : data.pill.text === PREGNANCY_FLAG_COPY.bpSameDayLabel || data.pill.text === PREGNANCY_FLAG_COPY.bpUrgentLabel ? <AlertCircle size={13} aria-hidden /> : <ArrowUp size={13} aria-hidden />}
                {data.pill.text}
              </span>
            )}
          </div>
        </div>
        <svg aria-hidden viewBox="0 0 326 30" width="100%" height={30} preserveAspectRatio="none" style={{ marginTop: 12, display: "block", overflow: "visible" }} data-bp-wave>
          <line x1={0} x2={326} y1={27.5} y2={27.5} stroke={mc(K, "main", 0.25)} strokeWidth={1} />
          <path d={PULSE_PATH} fill="none" stroke={mc(K, "main")} strokeWidth={1.6} strokeLinejoin="round" opacity={running ? 0.3 : 1} />
          {running && (
            <path d={PULSE_PATH} pathLength={1} fill="none" stroke={mc(K, "main")} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" style={{ animation: "bpTrace 3s ease-in-out infinite" }} />
          )}
        </svg>
      </div>
    </MetricHero>
  );
};

// ---------------------------------------------------------------------------
// Chart

/**
 * Geometry (HE1.6-full.png, HE1.6.d/.m/.y): plot from y ~0 (150 mmHg) to the
 * axis line y 118.5 (60 mmHg), widened when a reading falls outside; labels
 * at y 139. Week dumbbells on the HR grid (x 25.4 + 46.6 i): systolic dot r5.5
 * main, diastolic r5.5 dark accent, joined by a 3-wide main bar; ghosts =
 * 18-wide outline capsules #241F1B@18% between the reference lines. Dashed
 * reference lines 1.5 dark accent, dash 4 4, labels "120" above / "80" below
 * at the right (10.5 600). Past units of a month / year at 45%.
 */
/** A reading with its local day (utils/date localDayOf). */
export type BpDayReading = BloodPressureReading & { day: string };

export interface BpChartProps {
  range: MetricRange;
  period: Period;
  readings: BpDayReading[];
  today: string;
  reference: [number, number];
  /** Month: the period averages for the solid average lines. */
  average?: { systolic: number; diastolic: number } | null;
}

const HOUR0 = 5;
const HOURS = 18;

export const BloodPressureChart: React.FC<BpChartProps> = ({ range, period, readings, today, reference, average }) => {
  const { dark, hc } = useHealthMode();
  const sysFill = mc(K, "main");
  const diaFill = dark ? "#D08AB2" : mc(K, "accent");
  const refInk = dark ? "#D08AB2" : mc(K, "accent");
  const ghost = dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  const axisInk = hairline(dark, hc, 0.08);
  const allVals = readings.flatMap((r) => [r.systolic, r.diastolic]);
  const lo = Math.min(60, ...(allVals.length ? [Math.min(...allVals) - 5] : []), reference[1] - 20);
  const hi = Math.max(150, ...(allVals.length ? [Math.max(...allVals) + 5] : []), reference[0] + 20);
  const base = 118.5;
  const top = 6;
  const y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - top);
  // Round F (F10): in right to left, time runs from right to left. Every x on
  // the 326 grid is mirrored (the helpers below take unmirrored centres); SVG
  // text anchors are logical, so the labels follow.
  const rtl = isRtl();
  const mx = (v: number) => (rtl ? 326 - v : v);
  const label = (bold: boolean): React.CSSProperties => ({
    fontSize: "calc(10.5px + var(--text-boost, 0px))",
    fontWeight: bold ? 800 : 600,
    fill: bold ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))",
  });
  const dumbbell = (key: string, ux: number, s: number, d: number, alpha = 1, r = 5.5) => {
    const cx = mx(ux);
    return (
      <g key={key} opacity={alpha} data-dumbbell>
        <line x1={cx} x2={cx} y1={y(s)} y2={y(d)} stroke={sysFill} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={y(s)} r={r} fill={sysFill} />
        <circle cx={cx} cy={y(d)} r={r} fill={diaFill} />
      </g>
    );
  };
  const ghostCap = (key: string, cx: number, w = 18) => (
    <rect key={key} x={mx(cx) - w / 2 + 0.5} y={y(reference[0]) - w / 2} width={w - 1} height={y(reference[1]) - y(reference[0]) + w} rx={w / 2} fill="none" stroke={ghost} strokeWidth={1} data-ghost />
  );

  const refLines = (
    <g data-ref-lines>
      {reference.map((v, i) => (
        <g key={v}>
          <line x1={0} x2={326} y1={y(v)} y2={y(v)} stroke={refInk} strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={mx(326)} y={i === 0 ? y(v) - 5 : y(v) + 13} textAnchor="end" style={{ fontSize: "calc(10.5px + var(--text-boost, 0px))", fontWeight: 600, fill: metricTextInk(K, dark) }}>
            {v}
          </text>
        </g>
      ))}
    </g>
  );

  let body: React.ReactNode = null;
  let labels: React.ReactNode = null;

  if (range === "day") {
    const now = new Date();
    const nowX = period.start === today ? Math.max(0, Math.min(326, ((now.getHours() + now.getMinutes() / 60 - HOUR0) / HOURS) * 326)) : 326;
    const sorted = [...readings].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
    let lastX = -99;
    body = (
      <>
        {nowX < 326 && <rect x={rtl ? 0 : nowX} y={0} width={326 - nowX} height={base} fill={dark ? "rgba(255,255,255,0.03)" : "#FAFAFA"} />}
        {sorted.map((r) => {
          const d = new Date(r.recordedAt);
          let cx = Math.max(6, Math.min(320, ((d.getHours() + d.getMinutes() / 60 - HOUR0) / HOURS) * 326));
          // Readings a minute apart sit side by side, nudged 6 apart (HE1.6.d note).
          if (cx - lastX < 6) cx = lastX + 6;
          lastX = cx;
          return dumbbell(r.id, cx, r.systolic, r.diastolic);
        })}
      </>
    );
    labels = [6, 10, 14, 18, 22].map((h) => (
      <text key={h} x={mx(((h - HOUR0) / HOURS) * 326)} y={139} textAnchor="middle" style={label(false)}>
        {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
      </text>
    ));
  } else if (range === "week") {
    const days = daysOf(period);
    body = days.map((d, i) => {
      const cx = 25.4 + 46.6 * i;
      const rs = readings.filter((r) => r.day === d);
      if (!rs.length) return d > today ? ghostCap(d, cx) : null;
      // Several readings on one day stack in that day's slot (board note).
      return <g key={d}>{rs.map((r, j) => dumbbell(r.id, cx + (j - (rs.length - 1) / 2) * 6, r.systolic, r.diastolic))}</g>;
    });
    labels = days.map((d, i) => (
      <text key={d} x={mx(25.4 + 46.6 * i)} y={139} textAnchor="middle" style={label(d === today)}>
        {["S", "M", "T", "W", "T", "F", "S"][new Date(`${d}T12:00:00`).getDay()]}
      </text>
    ));
  } else if (range === "month") {
    const days = daysOf(period);
    const n = days.length;
    const x = (day: string) => mx(8 + ((Number(day.slice(8, 10)) - 1) * 310) / Math.max(1, n - 1));
    body = (
      <>
        {readings.map((r) => (
          <g key={r.id} data-dot>
            <circle cx={x(r.day)} cy={y(r.systolic)} r={4} fill={sysFill} />
            <circle cx={x(r.day)} cy={y(r.diastolic)} r={4} fill={diaFill} />
          </g>
        ))}
        {average && (
          <g data-avg-lines>
            <line x1={0} x2={326} y1={y(average.systolic)} y2={y(average.systolic)} stroke={sysFill} strokeWidth={1.5} />
            <line x1={0} x2={326} y1={y(average.diastolic)} y2={y(average.diastolic)} stroke={diaFill} strokeWidth={1.5} />
            <text x={mx(2)} y={y(average.systolic) - 5} style={{ fontSize: "calc(10.5px + var(--text-boost, 0px))", fontWeight: 600, fill: metricTextInk(K, dark) }}>
              Avg {average.systolic}
            </text>
            <text x={mx(2)} y={y(average.diastolic) + 14} style={{ fontSize: "calc(10.5px + var(--text-boost, 0px))", fontWeight: 600, fill: metricTextInk(K, dark) }}>
              Avg {average.diastolic}
            </text>
          </g>
        )}
      </>
    );
    labels = [1, 8, 15, 22, 29].filter((dn) => dn <= n).map((dn) => (
      <text key={dn} x={mx(8 + ((dn - 1) * 310) / Math.max(1, n - 1))} y={139} textAnchor="middle" style={label(false)}>
        {dn}
      </text>
    ));
  } else {
    const yr = period.start.slice(0, 4);
    body = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${yr}-${String(i + 1).padStart(2, "0")}`;
      const cx = 16.2 + 27.2 * i;
      const rs = readings.filter((r) => r.day.startsWith(prefix));
      if (!rs.length) return `${prefix}-01` > today ? ghostCap(prefix, cx, 12) : null;
      const s = Math.round(rs.reduce((a, r) => a + r.systolic, 0) / rs.length);
      const d = Math.round(rs.reduce((a, r) => a + r.diastolic, 0) / rs.length);
      return dumbbell(prefix, cx, s, d, today.startsWith(prefix) ? 1 : 0.45, 4.5);
    });
    labels = Array.from({ length: 12 }, (_, i) => (
      <text key={i} x={mx(16.2 + 27.2 * i)} y={139} textAnchor="middle" style={label(today.startsWith(`${yr}-${String(i + 1).padStart(2, "0")}`))}>
        {monthLetter(i + 1)}
      </text>
    ));
  }

  return (
    <svg viewBox="0 0 326 146" width="100%" style={{ display: "block", height: "auto" }} data-bp-chart={range}>
      <line x1={0} x2={326} y1={base} y2={base} stroke={axisInk} strokeWidth={1} />
      {refLines}
      {body}
      {labels}
    </svg>
  );
};

export function bpLegend(range: MetricRange, dark: boolean, pregnancy: boolean): { label: string; swatch: React.ReactNode }[] {
  const dot = (c: string) => <span style={{ width: 8, height: 8, borderRadius: 9999, background: c, display: "inline-block" }} />;
  const ghost = <span style={{ width: 10, height: 12, borderRadius: 3, border: `1px solid ${dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)"}`, display: "inline-block" }} />;
  const dash = <span style={{ width: 14, borderTop: `1.5px dashed ${dark ? "#D08AB2" : mc(K, "accent")}`, display: "inline-block" }} />;
  const line = <span style={{ width: 14, height: 1.5, background: mc(K, "main"), display: "inline-block" }} />;
  const items: { label: string; swatch: React.ReactNode }[] = [
    { label: "Systolic", swatch: dot(mc(K, "main")) },
    { label: "Diastolic", swatch: dot(dark ? "#D08AB2" : mc(K, "accent")) },
  ];
  if (range === "week") items.push({ label: "Days ahead", swatch: ghost });
  if (range === "year") items.push({ label: "Months ahead", swatch: ghost });
  if (range === "month") items.push({ label: "Averages", swatch: line });
  // OURS-health-bp-pregnancy-levels #3 (V6-19): "Pregnancy 140 / 90".
  items.push({ label: pregnancy ? "Pregnancy 140 / 90" : "Reference 120 / 80", swatch: dash });
  return items;
}

// ---------------------------------------------------------------------------
// Morning / Evening tiles (HE1.6 #27-#38)

export interface BpHalf {
  avg: { systolic: number; diastolic: number } | null;
  count: number;
  /** "Last week 124/79" for an empty half; null when there is none. */
  previous: string | null;
}

/**
 * Card in the tint r16 pad 10 2, m-top 10. Filled half: 20 tile r6 + 13
 * icon left of the value 17/19.6 800 ls-0.4 tnum; label 10/13 600 metric ink
 * m-top 3; sub-line 9.5/14.3 600 #8C8378. Empty half (stacked): 24 tile r8
 * above "No reading yet" 13/15 800 ls-0.3, label, then "Last week …".
 * Divider 0.5px #E5E7EB (dark #383B44).
 */
export const BpTiles: React.FC<{ morning: BpHalf; evening: BpHalf; countWord: (n: number) => string }> = ({ morning, evening, countWord }) => {
  const { dark, hc } = useHealthMode();
  const tileBg = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)";
  const iconInk = metricIconInk(K, dark);
  const half = (h: BpHalf, Icon: typeof Sunrise, label: string, i: number) => (
    <div
      key={label}
      data-bp-tile={label}
      className="flex-1 min-w-0 flex flex-col items-center justify-center text-center"
      style={{ padding: "0 6px", borderInlineStart: i ? `0.5px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "#383B44" : "#E5E7EB"}` : undefined }}
    >
      {h.avg ? (
        <span className="flex items-center" style={{ gap: 5 }}>
          <span className="grid place-items-center" style={{ width: 20, height: 20, borderRadius: 6, background: tileBg }}>
            <Icon size={13} strokeWidth={1.5} style={{ color: iconInk }} />
          </span>
          <span style={{ fontSize: textPx(17), lineHeight: linePx(19.6), fontWeight: 800, letterSpacing: -0.4, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>
            {h.avg.systolic}/{h.avg.diastolic}
          </span>
        </span>
      ) : (
        <>
          <span className="grid place-items-center" style={{ width: 24, height: 24, borderRadius: 8, background: tileBg }}>
            <Icon size={13} strokeWidth={1.5} style={{ color: iconInk }} />
          </span>
          <span style={{ marginTop: 3, fontSize: textPx(13), lineHeight: linePx(15), fontWeight: 800, letterSpacing: -0.3, color: "rgb(var(--c-charcoal))" }}>No reading yet</span>
        </>
      )}
      <span style={{ marginTop: 3, fontSize: textPx(10), lineHeight: linePx(13), fontWeight: 600, color: metricTextInk(K, dark) }}>{label}</span>
      {(h.avg ? countWord(h.count) : h.previous) && (
        <span style={{ marginTop: 3, fontSize: textPx(9.5), lineHeight: linePx(14.3), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>
          {h.avg ? countWord(h.count) : h.previous}
        </span>
      )}
    </div>
  );
  return (
    <div className="flex items-stretch" style={{ marginTop: 10, borderRadius: 16, padding: "10px 2px", background: mc(K, "tint") }}>
      {half(morning, Sunrise, "Morning", 0)}
      {half(evening, Sunset, "Evening", 1)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Reference card (HE1.6 #39-#47)

/**
 * #FAFAFB r18 pad 14 + 0.5px hairline (dark #262932), m-top 12; Info 15
 * #5B5349 + "Reference ranges" 12.5/18.8 700; rows pad 6 0 split by 0.5px
 * #241F1B@5%: label 11.5/17.3 700 (#241F1B for the latest reading's band
 * with " · latest", #5B5349 otherwise), range 11.5/17.3 400 #8C8378 right;
 * K4 kept: the period's count under the label (10.5/15.8 600 #8C8378); foot
 * BP_DETAIL_FOOTER 10.5/15.2 400 #8C8378 m-top 8. Neutral: no category
 * colours. In a pregnancy the adult rows step aside; the "Pregnancy levels"
 * rows are V6-03 copy and show only once REVIEWED.
 */
export const BpReferenceCard: React.FC<{
  latest: BpCategory | null;
  counts: Record<BpCategory, number> | null;
  pregnancy: boolean;
}> = ({ latest, counts, pregnancy }) => {
  const { dark, hc } = useHealthMode();
  const sep = hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.05)" : "rgba(36,31,27,0.05)";
  const row = (key: string, label: string, range: string, strong: boolean, count: number | null, first: boolean) => (
    <div key={key} className="flex items-start justify-between" style={{ gap: 10, padding: "6px 0", borderTop: first ? undefined : `0.5px solid ${sep}` }} data-ref-row={key}>
      <div className="min-w-0">
        <p style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 700, color: strong ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-soft))" }}>{label}</p>
        {count !== null && count > 0 && (
          <p style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}>
            {count} reading{count === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <p className="text-end" style={{ fontSize: textPx(11.5), lineHeight: linePx(17.3), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>
        {range}
      </p>
    </div>
  );
  const showAdult = !pregnancy;
  const showPregnancyLevels = pregnancy && REVIEWED;
  return (
    <section
      data-bp-reference
      style={{ marginTop: 12, borderRadius: 18, padding: 14, background: dark ? "#262932" : "#FAFAFB", border: `0.5px solid ${hairline(dark, hc)}` }}
    >
      {(showAdult || showPregnancyLevels) && (
        <>
          <h2 className="flex items-center" style={{ gap: 8, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
            <Info size={15} strokeWidth={1.75} style={{ color: "rgb(var(--c-charcoal-soft))" }} aria-hidden />
            {showAdult ? "Reference ranges" : PREGNANCY_BP_LEVELS.title}
          </h2>
          <div style={{ marginTop: 10 }}>
            {showAdult
              ? BP_CATEGORIES.map((c, i) => row(c, `${BP_CATEGORY_LABEL[c]}${latest === c ? " · latest" : ""}`, BP_CATEGORY_RANGE[c], latest === c, counts ? counts[c] : null, i === 0))
              : PREGNANCY_BP_LEVELS.rows.map((r, i) => row(r.label, r.label, r.range, false, null, i === 0))}
          </div>
        </>
      )}
      <p style={{ marginTop: showAdult || showPregnancyLevels ? 8 : 0, fontSize: textPx(10.5), lineHeight: linePx(15.2), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }} data-bp-footer>
        {BP_DETAIL_FOOTER}
      </p>
      {showPregnancyLevels && (
        <p style={{ marginTop: 4, fontSize: textPx(10.5), lineHeight: linePx(15.2), fontWeight: 400, color: "rgb(var(--c-charcoal-faint))" }}>{PREGNANCY_BP_LEVELS.ownTargets}</p>
      )}
    </section>
  );
};
