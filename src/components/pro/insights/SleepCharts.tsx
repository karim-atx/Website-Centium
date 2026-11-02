import React, { useMemo, useRef, useState } from "react";
import { Lightbulb, MoveHorizontal, Pin } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK, NO_ICON_SCALE } from "../proInk";
import { LegendChip, ProChart, Swatch } from "../ProChart";
import { PRO_CHART_RANGES, signedNum } from "../proRules";
import { ProCardSkeleton, ProError } from "../states";
import { clockParts, formatMinutes12, hourLabel12 } from "../../../utils/time12";
import { fetchMetricRows, fetchSleepNights, type MetricRow, type SleepNight, type SleepStage } from "../../../services/pro/insights";
import { addDays, bucketLabel, bucketTitle, bucketsFor, daysBetween, dayLabel, hm, meanByBucket, monthShort, RANGE_DAYS, tipDay, type Bucket, type ChartRange } from "./insightsModel";
import {
  asleepByDay,
  bedtimeAxis,
  bedtimeByBucket,
  bedtimeLine,
  HYPNO_LEVELS,
  hypnogramLine,
  hypnogramNight,
  hypnogramOf,
  nightStats,
  SHORT_NIGHT_MIN,
  STAGE_LABEL,
  stageColours,
  STAGES,
  stagesByBucket,
  stagesLine,
  type NightStats,
} from "./sleepModel";
import { StatBoxes, type StatBox } from "./parts";
import { useRead, type ReadState } from "./reads";
import { isRtl, t, tn, tx } from "../../../i18n/core";

/**
 * Release 3 · W9 Insights › Vitals › Sleep (TR9 v5 "Sleep · stages" and
 * "Sleep · scrolled, bedtime and hypnogram"; source gen/r14.js vcard14,
 * sleepStages14, bedtime14, hypno14; boxes gen/r12.js VIT12 Sleep) and the
 * client page's Trends › Sleep group (CL2 v5 "Sleep open", gen/r10.js
 * chartIn10 "Sleep per night (h)").
 *
 * Data: sleep_details (main nights) with their sleep_segments, read through
 * Activity and vitals (services/pro/insights fetchSleepNights); the
 * duration falls back to the health_metrics sleep rows (sleepModel).
 *
 * Literal values (vcard14): card r20, card fill and border, pad 14 14 12,
 * m-bottom 12; title 13 / 700; range W M 3M Y in a soft r9 track (24 high,
 * 10.5 / 800); question 11.5 text.faint; the dark tooltip r12 7 10.
 * - Stages: a 320 × 150 box, scale to 9 h (grid 3 / 6 / 9 with right 8.5
 *   labels), bars 26 wide at X = 22 + i (W - 44) / (n - 1), stacked Deep,
 *   REM, Light, Awake with a 1 gap, r2 (Awake r5), 0.92 except the pinned
 *   bar, which has the dashed r8 outline; colours sleepCols14.
 * - Bedtime: rows 15 high, bar 10 r5, the axis 9 PM to 9 AM (ticks every
 *   3 h, 8.5 text.tertiary), the pinned night in prDark at full opacity,
 *   others in primary at 0.75; no scrub.
 * - Hypnogram: a 320 × 110 box, rows Awake, REM, Light, Deep at 8 + l × 22,
 *   blocks 8 high r2 from x 40, 1.2 connectors at 0.7, ticks every 2 h.
 *
 * Not drawn (no data source; flagged in the W9 report): the "7 h goal" line
 * and its Goal chip, the "Target bedtime" band, and the late-bedtime dot
 * colours, which all need a sleep target the backend doesn't store.
 */

const W = 320;

/**
 * Round F (F10): in right to left, time runs from right to left. Each chart
 * mirrors every x it draws (SVG text anchors are logical, so the labels
 * follow) and keeps the unmirrored x for the pointer and the tooltip side.
 */
const mirror = () => {
  const rtl = isRtl();
  return (v: number) => (rtl ? W - v : v);
};

const prDark = (dark: boolean) => (dark ? "#C3B3FB" : "#7D6BB5");

// ---------------------------------------------------------------------------
// The card shell (vcard14)
// ---------------------------------------------------------------------------

const RangeTrack: React.FC<{ range: ChartRange; onRange: (r: ChartRange) => void }> = ({ range, onRange }) => (
  <span role="tablist" aria-label={t("Range")} className="flex" style={{ gap: 2, padding: 2, borderRadius: 9, background: INK.soft }}>
    {PRO_CHART_RANGES.map((r) => {
      const on = r === range;
      return (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onRange(r)}
          className="relative flex items-center justify-center before:absolute before:inset-x-0 before:-inset-y-[10px] before:content-['']"
          style={{ height: 24, minWidth: 28, padding: "0 6px", borderRadius: 7, fontSize: textPx(10.5), fontWeight: 800, background: on ? INK.card : "transparent", color: on ? INK.ch : INK.chF, boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : undefined }}
        >
          {tx(r, "chart range")}
        </button>
      );
    })}
  </span>
);

/** The pinned tooltip, placed from the inline start (`x` unmirrored). */
const Tip: React.FC<{ title: string; lines: string[]; x: number }> = ({ title, lines, x }) => {
  const dark = useIsDark();
  return (
    <div
      aria-live="polite"
      className="absolute z-[2]"
      style={{ ...(x / W > 0.55 ? { insetInlineEnd: 0 } : { insetInlineStart: `${Math.max(0, (x / W) * 100 - 24).toFixed(0)}%` }), top: -2, maxWidth: "calc(100% - 8px)", borderRadius: 12, background: dark ? "#F5F3FA" : "#241F1B", color: dark ? "#121317" : "#FFFFFF", padding: "7px 10px", boxShadow: "0 8px 20px rgba(0,0,0,0.22)" }}
    >
      <p className="flex items-center whitespace-nowrap" style={{ gap: 4, fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
        <Pin size={10} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
        {title}
      </p>
      {lines.map((l, i) => (
        <p key={i} style={{ fontSize: textPx(12), fontWeight: 700, lineHeight: 1.35 }}>
          {l}
        </p>
      ))}
    </div>
  );
};

const Card: React.FC<{ title: string; question?: string; right?: React.ReactNode; children: React.ReactNode; legend?: React.ReactNode; insight?: string | null; scrub?: boolean }> = ({ title, question, right, children, legend, insight, scrub = true }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 14px 12px", marginBottom: 12 }}>
    <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 8 }}>
      <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, minWidth: 0 }}>{title}</p>
      {right}
    </div>
    {question && <p style={{ fontSize: textPx(11.5), color: INK.chF, margin: "-4px 0 8px" }}>{question}</p>}
    {children}
    {legend && (
      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
        {legend}
      </div>
    )}
    {insight && (
      <p className="flex" style={{ gap: 6, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45, marginTop: 10 }}>
        <Lightbulb size={13} strokeWidth={2} aria-hidden style={{ color: INK.prAccent, flexShrink: 0, marginTop: 2 }} />
        {insight}
      </p>
    )}
    {scrub && (
      <p aria-hidden className="flex items-center" style={{ gap: 5, fontSize: textPx(10), color: INK.chT, marginTop: 6 }}>
        <MoveHorizontal size={11} strokeWidth={2} />
        {t("Drag sideways to scrub, tap to pin")}
      </p>
    )}
  </div>
);

/** A static legend chip (a key, not a toggle), drawn as ProChart's goal chip. */
const KeyChip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 5, height: 26, padding: "0 9px", borderRadius: 8, border: `1px solid ${INK.b10}`, fontSize: textPx(10.5), fontWeight: 700, color: INK.chS }}>
    {children}
    {label}
  </span>
);

/** Tap to pin, drag sideways to scrub, ← → and Esc on the keyboard (the ProChart standard). */
function useScrub(count: number, indexAt: (vx: number) => number, pin: number | null, setPin: (i: number | null) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ moved: boolean; start: number } | null>(null);
  const rtl = isRtl();
  // `indexAt` takes the unmirrored x: read from the inline start.
  const at = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return indexAt(((rtl ? r.right - clientX : clientX - r.left) / Math.max(1, r.width)) * W);
  };
  const props = {
    ref,
    role: "group" as const,
    tabIndex: 0,
    className: "relative outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg touch-pan-y select-none",
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      drag.current = { moved: false, start: e.clientX };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return;
      if (Math.abs(e.clientX - drag.current.start) > 6) drag.current.moved = true;
      if (drag.current.moved) setPin(at(e.clientX));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (!d.moved) {
        const i = at(e.clientX);
        setPin(pin === i ? null : i);
      }
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = (e.key === "ArrowRight") !== rtl ? 1 : -1;
        setPin(Math.max(0, Math.min(count - 1, pin == null ? (dir > 0 ? 0 : count - 1) : pin + dir)));
      } else if (e.key === "Escape") setPin(null);
    },
  };
  return props;
}

const xLabelsOf = (labels: string[]) => {
  const every = labels.length <= 8 ? 1 : Math.ceil(labels.length / 7);
  return labels.filter((_, i) => every === 1 || i % every === 0 || i === labels.length - 1);
};

// ---------------------------------------------------------------------------
// Sleep stages (sleepStages14)
// ---------------------------------------------------------------------------

export const StagesChart: React.FC<{ nights: NightStats[]; range: ChartRange; onRange: (r: ChartRange) => void; today: string; firstName: string; pin: number | null; onPin: (i: number | null) => void }> = ({ nights, range, onRange, today, firstName, pin, onPin }) => {
  const dark = useIsDark();
  const col = stageColours(dark);
  const [off, setOff] = useState<Set<SleepStage>>(new Set());
  const b = bucketsFor(range, today);
  const agg = stagesByBucket(b, nights);
  const n = Math.max(2, b.length);
  const H = 150;
  const most = Math.max(0, ...agg.map((a) => (a ? (a.deep + a.rem + a.light + a.awake) / 60 : 0)));
  const mx = Math.max(9, Math.ceil(most / 3) * 3);
  const step = (W - 44) / (n - 1);
  const mir = mirror();
  const UX = (i: number) => 22 + i * step;
  const X = (i: number) => mir(UX(i));
  const Y = (v: number) => 6 + ((mx - v) / mx) * (H - 24);
  const bw = Math.min(26, step * 0.7);
  const visible = STAGES.filter((s) => !off.has(s));
  const scrub = useScrub(b.length, (vx) => Math.max(0, Math.min(b.length - 1, Math.round((vx - 22) / step))), pin, onPin);
  const a = pin != null ? agg[pin] : null;
  const tip = pin != null ? { title: bucketTitle(range, b[pin]), lines: a ? [t("{asleep} asleep · {awake} awake", { asleep: hm(a.asleep), awake: hm(a.awake) }), t("Deep {deep} · REM {rem}", { deep: hm(a.deep), rem: hm(a.rem) }), ...(a.n > 1 ? [tn(a.n, "Average of {n} nights", "Average of {n} nights")] : [])] : [t("No stages this night")] } : null;
  const grid = Array.from({ length: mx / 3 }, (_, i) => (i + 1) * 3);
  const staged = nights.filter((x) => x.hasStages && x.date >= b[0].start && x.date <= today);
  const mean = (f: (x: NightStats) => number) => (staged.length ? staged.reduce((s, x) => s + f(x), 0) / staged.length : 0);
  return (
    <Card
      title={t("Sleep stages")}
      question={t("Is {firstName} getting enough deep and REM sleep?", { firstName })}
      right={<RangeTrack range={range} onRange={onRange} />}
      legend={STAGES.map((s) => (
        <LegendChip
          key={s}
          on={!off.has(s)}
          label={t(STAGE_LABEL[s])}
          onClick={() =>
            setOff((prev) => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s);
              else next.add(s);
              return next;
            })
          }
        >
          <Swatch kind="bar" color={col[s]} on={!off.has(s)} />
        </LegendChip>
      ))}
      insight={stagesLine(staged, hm)}
    >
      <div {...scrub} aria-label={staged.length ? tn(staged.length, "Sleep stages: deep {deep}, REM {rem}, light {light} a night on average over {n} night.", "Sleep stages: deep {deep}, REM {rem}, light {light} a night on average over {n} nights.", { deep: hm(mean((x) => x.deep ?? 0)), rem: hm(mean((x) => x.rem ?? 0)), light: hm(mean((x) => x.light ?? 0)) }) : t("Sleep stages")} style={{ paddingTop: tip ? 24 + tip.lines.length * 15 : 4 }}>
        {tip && pin != null && <Tip title={tip.title} lines={tip.lines} x={UX(pin)} />}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          {grid.map((v) => (
            <g key={v}>
              <line x1={0} x2={W} y1={Y(v)} y2={Y(v)} stroke={INK.b06} />
              <text x={mir(W - 2)} y={Y(v) - 3} textAnchor="end" fontSize={8.5} fill={INK.chT}>{t("{n}h", { n: v })}</text>
            </g>
          ))}
          {agg.map((x, i) => {
            if (!x) return null;
            let y0 = 0;
            return (
              <g key={i}>
                {visible.map((s, k) => {
                  const h = x[s] / 60;
                  const y1 = y0 + h;
                  const r = <rect key={s} x={X(i) - bw / 2} y={Y(y1) + (k ? 1 : 0)} width={bw} height={Math.max(1, Y(y0) - Y(y1) - (k ? 1 : 0))} rx={s === "awake" ? 5 : 2} fill={col[s]} opacity={i === pin ? 1 : 0.92} />;
                  y0 = y1;
                  return h > 0 ? r : null;
                })}
              </g>
            );
          })}
          {pin != null && <rect x={X(pin) - bw / 2 - 3} y={2} width={bw + 6} height={H - 20} rx={8} fill="none" stroke={INK.ch} strokeWidth={1.2} strokeDasharray="2 2" opacity={0.6} />}
        </svg>
      </div>
      <div aria-hidden className="flex justify-between" style={{ fontSize: textPx(9.5), color: INK.chT, marginTop: 2, padding: "0 10px" }}>
        {xLabelsOf(b.map((x) => bucketLabel(range, x))).map((l, i) => (
          <span key={i} className="whitespace-nowrap">
            {l}
          </span>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Bedtime (bedtime14)
// ---------------------------------------------------------------------------

const rowLabel = (range: ChartRange, bk: Bucket, i: number) => {
  if (range === "W") return bucketLabel("W", bk);
  if (range === "M") return i % 7 === 0 ? dayLabel(bk.start) : "";
  if (range === "Y") return monthShort(bk.start);
  return dayLabel(bk.start);
};

export const BedtimeChart: React.FC<{ nights: NightStats[]; range: ChartRange; onRange: (r: ChartRange) => void; today: string; pin: number | null }> = ({ nights, range, onRange, today, pin }) => {
  const dark = useIsDark();
  const b = bucketsFor(range, today);
  const rows = bedtimeByBucket(b, nights);
  const dense = b.length > 14;
  const rh = dense ? 9 : 15;
  const bar = dense ? 6 : 10;
  const L = range === "W" ? 30 : 40;
  const H = b.length * rh + 18;
  const axis = bedtimeAxis(rows.filter((r): r is { bed: number; wake: number; n: number } => !!r));
  const mir = mirror();
  const UX = (m: number) => L + ((m - axis.from) / (axis.to - axis.from)) * (W - L - 8);
  const X = (m: number) => mir(UX(m));
  /** A bar from `a` to `b` (`w` wide): its left edge, the end of the bar when mirrored. */
  const barX = (a: number, w: number) => (isRtl() ? X(a) - w : X(a));
  const ticks: number[] = [];
  for (let m = axis.from; m <= axis.to; m += 180) ticks.push(m);
  const beds = nights.filter((x) => x.bed != null && x.date >= b[0].start && x.date <= today).map((x) => x.bed as number);
  const avg = beds.length ? Math.round(beds.reduce((s, x) => s + x, 0) / beds.length) : null;
  return (
    <Card
      title={t("Bedtime")}
      question={t("How regular are bedtime and wake time?")}
      right={<RangeTrack range={range} onRange={onRange} />}
      legend={
        <KeyChip label={t("Asleep")}>
          <Swatch kind="bar" color={INK.pr} on />
        </KeyChip>
      }
      insight={bedtimeLine(beds)}
      scrub={false}
    >
      <div role="img" aria-label={avg != null ? tn(beds.length, "Bedtime {time} on average over {n} night.", "Bedtime {time} on average over {n} nights.", { time: formatMinutes12(avg % 1440) }) : t("Bedtime")} style={{ paddingTop: 4 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          {ticks.map((m) => (
            <g key={m}>
              <line x1={X(m)} x2={X(m)} y1={0} y2={H - 18} stroke={INK.b06} />
              <text x={X(m)} y={H - 4} textAnchor="middle" fontSize={8.5} fill={INK.chT}>
                {hourLabel12((m / 60) % 24)}
              </text>
            </g>
          ))}
          {b.map((bk, i) => {
            const r = rows[i];
            const y = i * rh + 3;
            const label = rowLabel(range, bk, i);
            const on = i === pin;
            return (
              <g key={bk.start}>
                {label && (
                  <text x={mir(0)} y={y + (dense ? 6 : 9)} fontSize={9} fontWeight={700} fill={INK.chF}>
                    {label}
                  </text>
                )}
                {r && <rect x={barX(r.bed, Math.max(2, UX(r.wake) - UX(r.bed)))} y={y} width={Math.max(2, UX(r.wake) - UX(r.bed))} height={bar} rx={bar / 2} fill={on ? prDark(dark) : INK.pr} opacity={on ? 1 : 0.75} />}
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Hypnogram (hypno14)
// ---------------------------------------------------------------------------

export const Hypnogram: React.FC<{ night: NightStats; firstName: string }> = ({ night, firstName }) => {
  const dark = useIsDark();
  const col = stageColours(dark);
  const [off, setOff] = useState<Set<SleepStage>>(new Set());
  const [pin, setPin] = useState<number | null>(null);
  const h = useMemo(() => hypnogramOf(night.segments), [night.segments]);
  const H = 110;
  const total = h?.total ?? 1;
  const mir = mirror();
  const UX = (m: number) => 40 + (m / total) * (W - 44);
  const X = (m: number) => mir(UX(m));
  /** A block's left edge for width `w` from `a`: the end of the block when mirrored. */
  const barX = (a: number, w: number) => (isRtl() ? X(a) - w : X(a));
  const Y = (l: number) => 8 + l * 22;
  // Scrub in 5-minute steps.
  const steps = Math.max(1, Math.ceil(total / 5) + 1);
  const scrub = useScrub(steps, (vx) => Math.max(0, Math.min(steps - 1, Math.round((((vx - 40) / (W - 44)) * total) / 5))), pin, setPin);
  const minuteAt = (i: number) => Math.min(total, i * 5);
  const clockAt = (m: number) => {
    const d = new Date((h?.start ?? 0) + m * 60000);
    return d.getHours() * 60 + d.getMinutes();
  };
  const blockAt = (m: number) => h?.blocks.find((x) => m >= x.from && m < x.to) ?? h?.blocks[h.blocks.length - 1] ?? null;
  const ticks: number[] = [];
  for (let m = 0; m <= total; m += 120) ticks.push(m);
  const blocks = (h?.blocks ?? []).filter((x) => !off.has(x.stage));
  const tipBlock = pin != null ? blockAt(minuteAt(pin)) : null;
  return (
    <Card
      title={t("Night of {date}", { date: tipDay(night.date) })}
      question={t("Hypnogram: when {firstName} woke and how sleep cycled.", { firstName })}
      legend={STAGES.map((s) => (
        <LegendChip
          key={s}
          on={!off.has(s)}
          label={t(STAGE_LABEL[s])}
          onClick={() =>
            setOff((prev) => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s);
              else next.add(s);
              return next;
            })
          }
        >
          <Swatch kind="bar" color={col[s]} on={!off.has(s)} />
        </LegendChip>
      ))}
      insight={hypnogramLine(h)}
    >
      <div {...scrub} aria-label={hypnogramLine(h) ?? t("Hypnogram")} style={{ paddingTop: tipBlock ? 38 : 4 }}>
        {pin != null && tipBlock && <Tip title={formatMinutes12(clockAt(minuteAt(pin)))} lines={[t(STAGE_LABEL[tipBlock.stage])]} x={UX(minuteAt(pin))} />}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          {HYPNO_LEVELS.map((s, i) => (
            <g key={s}>
              <line x1={mir(40)} x2={mir(W)} y1={Y(i)} y2={Y(i)} stroke={INK.b06} />
              <text x={mir(0)} y={Y(i) + 3} fontSize={9} fontWeight={700} fill={INK.chF}>
                {t(STAGE_LABEL[s])}
              </text>
            </g>
          ))}
          {blocks.map((x, i) => {
            const next = blocks[i + 1];
            return (
              <g key={i}>
                <rect x={barX(x.from, Math.max(1.5, UX(x.to) - UX(x.from)))} y={Y(x.level) - 4} width={Math.max(1.5, UX(x.to) - UX(x.from))} height={8} rx={2} fill={col[x.stage]} />
                {next && Math.abs(next.from - x.to) < 1 && <line x1={X(next.from)} x2={X(next.from)} y1={Y(x.level)} y2={Y(next.level)} stroke={col[next.stage]} strokeWidth={1.2} opacity={0.7} />}
              </g>
            );
          })}
          {ticks.map((m) => (
            <text key={m} x={X(m)} y={H - 2} textAnchor="middle" fontSize={8.5} fill={INK.chT}>
              {formatMinutes12(clockAt(m))}
            </text>
          ))}
          {pin != null && <line x1={X(minuteAt(pin))} x2={X(minuteAt(pin))} y1={0} y2={H - 14} stroke={INK.ch} strokeDasharray="2 2" />}
        </svg>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Insights › Vitals › Sleep
// ---------------------------------------------------------------------------

/** The empty stages card ("No sleep stages yet"), in the vcard14 shell. */
const NoStages: React.FC<{ firstName: string }> = ({ firstName }) => (
  <Card title={t("Sleep stages")} scrub={false}>
    <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>{t("No sleep stages yet. They fill in when {firstName}'s sleep syncs with stages from a wearable.", { firstName })}</p>
  </Card>
);

const signedMin = (d: number) => signedNum(Math.round(d), (a) => t("{n}m", { n: a }));

/**
 * The Sleep sub-tab: the stages chart when any night has stages (else the
 * duration chart `duration` and the empty stages card), the VIT12 boxes,
 * then Bedtime and the hypnogram of the pinned night when there is data
 * for them.
 */
export const SleepView: React.FC<{
  nights: ReadState<SleepNight[]>;
  durationRows: MetricRow[];
  /** The duration chart (Insights SimpleView) for the given per-day rows (hours). */
  duration: (rows: MetricRow[]) => React.ReactNode;
  range: ChartRange;
  onRange: (r: ChartRange) => void;
  today: string;
  winStart: string;
  firstName: string;
}> = ({ nights, durationRows, duration, range, onRange, today, winStart, firstName }) => {
  const stats = useMemo(() => (nights.data ?? []).map(nightStats), [nights.data]);
  const b = bucketsFor(range, today);
  const agg = stagesByBucket(b, stats);
  const lastWithData = agg.reduce<number | null>((acc, x, i) => (x ? i : acc), null);
  const [chosen, setChosen] = useState<number | null | undefined>(undefined);
  const pin = chosen === undefined ? lastWithData : chosen;
  const changeRange = (r: ChartRange) => {
    setChosen(undefined);
    onRange(r);
  };
  const anyStages = stats.some((x) => x.hasStages);
  const anyBed = stats.some((x) => x.bed != null && x.wake != null);
  const night = hypnogramNight(stats, pin != null ? b[pin] ?? null : null);

  // VIT12 boxes over the page window, against the window before it.
  const winDays = daysBetween(winStart, today) + 1;
  const prevStart = addDays(winStart, -winDays);
  const asleep = asleepByDay(stats, durationRows.map((r) => ({ day: r.day, value: r.value })));
  // sleep_details first, else health_metrics: one row a day in hours, for the duration chart.
  const durationChartRows: MetricRow[] = [...asleep.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1)).map(([day, min]) => ({ type: "sleep", value: min / 60, at: `${day}T12:00:00`, day, rest: false }));
  const inWin = (d: string) => d >= winStart && d <= today;
  const inPrev = (d: string) => d >= prevStart && d < winStart;
  const slept = [...asleep.entries()];
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const m = mean(slept.filter(([d]) => inWin(d)).map(([, v]) => v));
  const pm = mean(slept.filter(([d]) => inPrev(d)).map(([, v]) => v));
  const bedNow = mean(stats.filter((x) => x.bed != null && inWin(x.date)).map((x) => x.bed as number));
  const bedPrev = mean(stats.filter((x) => x.bed != null && inPrev(x.date)).map((x) => x.bed as number));
  const short = slept.filter(([d, v]) => inWin(d) && v < SHORT_NIGHT_MIN).length;
  const shortPrev = slept.filter(([d, v]) => inPrev(d) && v < SHORT_NIGHT_MIN).length;
  const anyPrev = slept.some(([d]) => inPrev(d));
  const sd = m != null && pm != null ? m - pm : null;
  const bd = bedNow != null && bedPrev != null ? bedNow - bedPrev : null;
  const bedParts = bedNow != null ? clockParts(bedNow % 1440) : null;
  const boxes: StatBox[] = [
    { label: t("Sleep per night"), value: m != null ? hm(m) : "–", delta: sd != null && Math.round(sd) !== 0 ? signedMin(sd) : null, dir: sd == null || Math.round(sd) === 0 ? null : sd > 0 ? "up" : "down", sub: t("{n}-day average", { n: winDays }) },
    ...(anyBed
      ? [
          {
            label: t("Bedtime"),
            value: bedParts ? `${bedParts.hour}:${String(bedParts.minute).padStart(2, "0")}` : "–",
            unit: bedParts?.meridiem,
            delta: bd != null && Math.round(bd) !== 0 ? signedMin(bd) : null,
            dir: bd == null || Math.round(bd) === 0 ? null : bd > 0 ? "down" : "up",
            sub: t("Average"),
          } as StatBox,
        ]
      : []),
    { label: t("Nights under 6 h"), value: slept.some(([d]) => inWin(d)) ? String(short) : "–", delta: anyPrev && short !== shortPrev ? signedNum(short - shortPrev) : null, dir: !anyPrev || short === shortPrev ? null : short > shortPrev ? "down" : "up", sub: winDays === 1 ? t("Last night") : tn(winDays, "Last {n} days", "Last {n} days") },
  ];

  return (
    <>
      {nights.data === undefined ? (
        nights.error ? (
          <>
            {durationChartRows.length > 0 && duration(durationChartRows)}
            <div style={{ marginBottom: 12 }}>
              <ProError onRetry={nights.retry} />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <ProCardSkeleton lines={3} height={160} />
          </div>
        )
      ) : anyStages ? (
        <StagesChart nights={stats} range={range} onRange={changeRange} today={today} firstName={firstName} pin={pin} onPin={(i) => setChosen(i)} />
      ) : (
        <>
          {duration(durationChartRows)}
          <NoStages firstName={firstName} />
        </>
      )}
      <StatBoxes boxes={boxes} />
      {anyBed && <BedtimeChart nights={stats} range={range} onRange={changeRange} today={today} pin={pin} />}
      {night && <Hypnogram key={night.date} night={night} firstName={firstName} />}
    </>
  );
};

// ---------------------------------------------------------------------------
// Client page › Trends › Sleep (CL2 v5, chartIn10 "Sleep per night (h)")
// ---------------------------------------------------------------------------

export const SleepTrendChart: React.FC<{ clientId: string; today: string; initial: ChartRange }> = ({ clientId, today, initial }) => {
  const dark = useIsDark();
  const [range, setRange] = useState<ChartRange>(initial);
  const since = addDays(today, -(RANGE_DAYS[range] * 2));
  const nights = useRead(true, () => fetchSleepNights(clientId, since), [clientId, since]);
  const dur = useRead(true, () => fetchMetricRows(clientId, ["sleep"], since), [clientId, since]);
  if (nights.data === undefined || dur.data === undefined) {
    const failed = nights.error ? nights : dur.error ? dur : null;
    return failed ? <ProError onRetry={failed.retry} /> : <ProCardSkeleton lines={3} height={150} />;
  }
  const stats = nights.data.map(nightStats);
  const per = [...asleepByDay(stats, dur.data.map((r) => ({ day: r.day, value: r.value }))).entries()].map(([day, v]) => ({ day, value: v / 60 }));
  if (!per.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>{t("No sleep logged yet.")}</p>;
  const b = bucketsFor(range, today);
  const g = bucketsFor(range, today, 1);
  const v = meanByBucket(b, per).map((x) => (x == null ? null : Math.round(x * 10) / 10));
  const gv = meanByBucket(g, per).map((x) => (x == null ? null : Math.round(x * 10) / 10));
  const all = [...v, ...gv].filter((x): x is number => x != null);
  const lo = Math.max(0, Math.floor(Math.min(...all) - 1));
  const hi = Math.ceil(Math.max(...all) + 1);
  const shown = v.filter((x): x is number => x != null);
  const avg = shown.length ? shown.reduce((s, x) => s + x, 0) / shown.length : null;
  const staged = stats.filter((x) => x.hasStages && x.date >= b[0].start);
  const sm = (f: (x: NightStats) => number) => staged.reduce((s, x) => s + f(x), 0) / Math.max(1, staged.length);
  return (
    <>
      <ProChart
        flat
        title={t("Sleep per night (h)")}
        range={range}
        onRangeChange={setRange}
        x={b.map((x) => bucketLabel(range, x))}
        min={lo}
        max={hi}
        series={[
          { key: "a", label: t("Actual"), type: "line", color: dark ? "#C3B3FB" : "#5F5093", values: v },
          { key: "g", label: t("Previous period"), type: "line", color: INK.chT, ghost: true, values: gv },
        ]}
        tooltip={(i) => ({ title: bucketTitle(range, b[i]), lines: [v[i] != null ? t("{time} asleep", { time: hm((v[i] as number) * 60) }) : t("No sleep logged")] })}
        summary={avg != null ? t("Sleep per night {time} on average.", { time: hm(avg * 60) }) : undefined}
      />
      <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>
        {staged.length ? t("Stages: Deep {deep} · REM {rem} · Light {light} a night on average.", { deep: hm(sm((x) => x.deep ?? 0)), rem: hm(sm((x) => x.rem ?? 0)), light: hm(sm((x) => x.light ?? 0)) }) : t("No sleep stages yet.")}
      </p>
    </>
  );
};
