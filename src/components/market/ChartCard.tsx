import React, { useLayoutEffect, useRef, useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { marketPalette } from "../../theme/marketTokens";
import { PointsFigure } from "./PointsFigure";
import { deltaTone } from "./pointsModel";
import { FOCUS_CSS } from "./usePress";
import {
  axisLabels,
  barCentre,
  barGap,
  barHeights,
  barIndexAt,
  barsPath,
  centredLine,
  funnelWidth,
  lineGeo,
  scrubIndex,
  tooltipLeft,
} from "./chartModel";
import { appLocale } from "../../i18n/format";

// Market + Share 3.0 · ChartCard (HANDOVER §4 B-MA.7, P-MA.6, §5: kind line |
// bar | funnel, range, series, scrub / tap, tooltip). Markup and behaviour
// from Professional Marketplace Screens lines 497–531 (`lineCard`,
// `barCard`, `scrub`, the funnel) and Business Marketplace Screens lines
// 483–535 (`lineCardData`, `scrubber`, `red`, `rate`, `expandTo`) and
// 539–562 (the expanded chart, `ex`, `toggleCompare`).
//
// The card: radius 20, --card, border 1px --border, padding 16. The question
// 13.5 / 19 800 (B-MA.7: a row with the lucide maximize-2 16 stroke 2 --faint,
// margin-top 2, gap 10; tapping it expands). The figure row (baseline, gap 8,
// margin-top 4): the total 26 / 32 800 tabular (+ the 8.4 × 15 leaf for
// points), the change 12 / 700 green (red when it starts with "−"), "vs
// previous {unit}" 11 --faint.
// - line: the plot 120 tall, margin-top 22, touch-action none, crosshair;
//   grid at y 10 / 60 / 110 in --div; area rgba(174,161,220,0.22); line
//   #AEA1DC 2 round; on pointer down / move the nearest point (`scrub`):
//   a 1px #7D6BB5 guide, a 4 white dot with a 2px #7D6BB5 ring and the
//   tooltip (top −22, 110 wide, centred and kept inside; #241F1B, #FFFFFF
//   11 / 700, radius 8, padding 3 8) "{date} · {value}".
// - bar: the plot 110 tall + its 1px base (content-box, 111 as rendered; W3), margin-top 24, bars along the bottom (gap 10 /
//   6 / 3 / 1 by count), border-bottom 1px --div and lines at 0 and 55;
//   bars #AEA1DC radius 3 3 0 0, value / max × 96 (at least 2); tapping one
//   highlights it #7D6BB5 and shows its tooltip. The whole plot hit-tests
//   (each bar gets a full-height target).
// - funnel: margin-top 14, steps (gap 10) with label 11.5 600 --ink2 and value
//   800 over a 14-tall radius 4 --soft track and the bar at its share
//   (min 6px); then "Rate over time" 10.5 / 700 --faint (margin-top 14) over
//   a 36-tall line #AEA1DC 1.6.
// - the axis: first / middle / last date, 10 --tert, margin-top 6.
// The plot spans the card body (322 at 390; the board's fixed 326 overflows
// it by 4) and re-measures on resize. The scrub / tap state starts empty
// (the board's preset positions are demo frames) and resets when the range
// or series changes. Keyboard: the plot is a slider (arrows, Home, End).
// Dark (D-05): the guide, ring and tapped bar #C3B3FB, the tooltip inverted
// (#F5F3FA on #121317), the compare line --teal.

export type ChartKind = "line" | "bar" | "funnel";

export interface FunnelStep {
  label: string;
  /** As shown ("1,260", "46 · 2.4%"). */
  value: string;
  /** The bar's share of the track, 0..1 (the first step is 1). */
  fraction: number;
  color?: string;
}

const FUNNEL_COLORS = ["#AEA1DC", "#7D6BB5", "#4F8F8A"];

export interface ChartCardProps {
  kind: ChartKind;
  question: string;
  total: string;
  /** Points: the leaf after the total. */
  leaf?: boolean;
  /** "+12%", "−3%", "+0.1 pt". */
  delta?: string | null;
  /** The range's unit for "vs previous {unit}" ("30 days", "week"). */
  unit: string;
  /** Resets the scrub / tap when it changes (the selected range). */
  range: string;
  /** One date label per point ("Oct 21"); the axis shows first / middle / last. */
  labels: readonly string[];
  series: readonly number[];
  /** The tooltip value: "1,260 views", "46 vouchers", "16,800 pts". */
  formatValue?: (v: number) => string;
  /** Funnel steps (kind "funnel"). */
  steps?: readonly FunnelStep[];
  /** The funnel's rate over time. */
  rateSeries?: readonly number[];
  /** The axis row (default: line and bar; P-MA.6 shows it under the funnel too). */
  showAxis?: boolean;
  /** B-MA.7: the question row expands to the full-screen chart. */
  onExpand?: () => void;
  /**
   * Replaces the "vs previous {unit}" line (W3, additive): a string shows it
   * instead, null hides it (a figure with nothing to compare against).
   */
  note?: string | null;
  /**
   * Point markers (W3, additive; the kept B13 promotion starts on the
   * listing charts): a 6 px --teal dot under the point or bar, and the
   * tooltip adds " · {label}" there.
   */
  markers?: readonly { index: number; label: string }[];
  className?: string;
  style?: React.CSSProperties;
}

/** Colours that differ in dark (D-05). */
function chartInk(dark: boolean) {
  return {
    scrub: dark ? "#C3B3FB" : "#7D6BB5",
    tipBg: dark ? "#F5F3FA" : "#241F1B",
    tipInk: dark ? "#121317" : "#FFFFFF",
  };
}

/** The plot's measured width (the board's 326 until it lays out). */
function useWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.max(1, el.getBoundingClientRect().width));
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** A selection that only counts while its key (range + series) is current. */
function useSelection(key: string): [number | undefined, (i: number | undefined) => void] {
  const [sel, setSel] = useState<{ key: string; i: number | undefined }>({ key, i: undefined });
  const i = sel.key === key ? sel.i : undefined;
  return [i, (next) => setSel((s) => (s.key === key && s.i === next ? s : { key, i: next }))];
}

const Tooltip: React.FC<{ left: number; top: number; width: number; text: string; shown: boolean; big?: boolean }> = ({ left, top, width, text, shown, big }) => {
  const dark = useIsDark();
  const c = chartInk(dark);
  return (
    <div aria-hidden style={{ position: "absolute", top, left, width, textAlign: "center", opacity: shown ? 1 : 0, pointerEvents: "none" }}>
      <span style={{ display: "inline-block", background: c.tipBg, color: c.tipInk, borderRadius: 8, padding: big ? "4px 9px" : "3px 8px", fontSize: textPx(big ? 11.5 : 11), fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
};

/** Arrow-key scrubbing for a plot (role slider). */
function sliderKeys(i: number | undefined, n: number, set: (i: number) => void) {
  return (e: React.KeyboardEvent) => {
    if (n <= 0) return;
    const cur = i ?? -1;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(n - 1, cur + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur < 0 ? n - 1 : Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    set(next);
  };
}

const MaximizeIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", marginTop: 2, ...NO_ICON_SCALE }}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

export const ChartCard: React.FC<ChartCardProps> = ({
  kind,
  question,
  total,
  leaf,
  delta,
  unit,
  range,
  labels,
  series,
  formatValue = (v) => Math.round(v).toLocaleString(appLocale("en-US")),
  steps = [],
  rateSeries = [],
  showAxis,
  onExpand,
  note,
  markers = [],
  className,
  style,
}) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const c = chartInk(dark);
  const [plotRef, w] = useWidth<HTMLDivElement>(326);
  const n = series.length;
  const [i, setI] = useSelection(`${range}|${n}|${labels[0] ?? ""}`);
  const tone = deltaTone(delta);
  const [ax0, ax1, ax2] = axisLabels(labels);
  const has = i !== undefined && i >= 0 && i < n;
  const mark = has ? markers.find((k) => k.index === i) : undefined;
  const tip = has ? `${labels[i!] ?? ""} · ${formatValue(series[i!])}${mark ? ` · ${mark.label}` : ""}` : "";
  const axis = showAxis ?? kind !== "funnel";

  const head = onExpand ? (
    <button
      type="button"
      onClick={onExpand}
      className="market-focus hit"
      style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, width: "100%", padding: 0, border: 0, background: "none", font: "inherit", color: m.ink, textAlign: "left", cursor: "pointer" }}
    >
      <span style={{ fontSize: textPx(13.5), lineHeight: linePx(19), fontWeight: 800 }}>{question}</span>
      <MaximizeIcon color={m.faint} />
    </button>
  ) : (
    <div style={{ fontSize: textPx(13.5), lineHeight: linePx(19), fontWeight: 800 }}>{question}</div>
  );

  const fromPointer = (e: React.PointerEvent<HTMLDivElement>, hit: (x: number, width: number, count: number) => number) => {
    const r = e.currentTarget.getBoundingClientRect();
    const j = hit(e.clientX - r.left, r.width, n);
    if (j >= 0) setI(j);
  };

  let plot: React.ReactNode = null;
  if (kind === "line") {
    const g = lineGeo(series, w, 120);
    const gx = has ? g.px(i!) : 0;
    const gy = has ? g.py(series[i!]) : 0;
    plot = (
      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label={question}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={has ? i : undefined}
        aria-valuetext={has ? tip : "Tap or drag the chart"}
        onPointerDown={(e) => fromPointer(e, scrubIndex)}
        onPointerMove={(e) => fromPointer(e, scrubIndex)}
        onKeyDown={sliderKeys(i, n, setI)}
        className="market-focus"
        style={{ position: "relative", height: 120, marginTop: 22, touchAction: "none", cursor: "crosshair" }}
      >
        <svg width={w} height={120} viewBox={`0 0 ${w} 120`} aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          <path d={`M0 10H${w}M0 60H${w}M0 110H${w}`} stroke={m.div} strokeWidth={1} />
          <path d={g.area} fill="rgba(174,161,220,0.22)" />
          <path d={g.line} fill="none" stroke="#AEA1DC" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <line x1={gx.toFixed(1)} x2={gx.toFixed(1)} y1={0} y2={120} stroke={c.scrub} strokeWidth={1} opacity={has ? 1 : 0} />
          <circle cx={gx.toFixed(1)} cy={gy.toFixed(1)} r={4} fill="#FFFFFF" stroke={c.scrub} strokeWidth={2} opacity={has ? 1 : 0} />
          {markers.filter((k) => k.index >= 0 && k.index < n).map((k) => (
            <circle key={k.index} data-marker cx={g.px(k.index).toFixed(1)} cy={117} r={3} fill={m.teal} />
          ))}
        </svg>
        <Tooltip left={tooltipLeft(gx, w)} top={-22} width={110} text={tip} shown={has} />
      </div>
    );
  } else if (kind === "bar") {
    const hs = barHeights(series);
    plot = (
      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label={question}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={has ? i : undefined}
        aria-valuetext={has ? tip : "Tap a bar"}
        onPointerDown={(e) => fromPointer(e, barIndexAt)}
        onKeyDown={sliderKeys(i, n, setI)}
        className="market-focus"
        style={{ position: "relative", height: 110, boxSizing: "content-box", marginTop: 24, display: "flex", alignItems: "flex-end", gap: barGap(n), borderBottom: `1px solid ${m.div}`, cursor: "pointer", touchAction: "manipulation" }}
      >
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: `1px solid ${m.div}` }} />
        <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 55, borderTop: `1px solid ${m.div}` }} />
        {hs.map((h, j) => (
          <div key={j} aria-hidden style={{ position: "relative", flex: 1, minWidth: 0, height: h, background: j === i ? c.scrub : "#AEA1DC", borderRadius: "3px 3px 0 0" }} />
        ))}
        {markers.filter((k) => k.index >= 0 && k.index < n).map((k) => (
          <span key={k.index} data-marker aria-hidden style={{ position: "absolute", bottom: -4, left: barCentre(k.index, w, n) - 3, width: 6, height: 6, borderRadius: 999, background: m.teal }} />
        ))}
        <Tooltip left={tooltipLeft(has ? barCentre(i!, w, n) : 0, w)} top={-22} width={110} text={tip} shown={has} />
      </div>
    );
  } else {
    plot = (
      <Funnel steps={steps} rateSeries={rateSeries} plotRef={plotRef} w={w} />
    );
  }

  return (
    <div className={className} style={{ lineHeight: "normal", borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: 16, color: m.ink, ...style }}>
      <style>{FOCUS_CSS}</style>
      {head}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        {leaf ? (
          <PointsFigure value={total} mark="leaf" size={26} weight={800} lineHeight={32} />
        ) : (
          <span style={{ fontSize: textPx(26), lineHeight: linePx(32), fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</span>
        )}
        {delta ? <span style={{ fontSize: textPx(12), fontWeight: 700, color: tone === "high" ? m.high : tone === "faint" ? m.faint : m.good }}>{delta}</span> : null}
        {note === null ? null : <span style={{ fontSize: textPx(11), color: m.faint }}>{note ?? `vs previous ${unit}`}</span>}
      </div>
      {plot}
      {axis ? (
        <div aria-hidden style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: textPx(10), color: m.tert }}>
          <span>{ax0}</span>
          <span>{ax1}</span>
          <span>{ax2}</span>
        </div>
      ) : null}
    </div>
  );
};

const Funnel: React.FC<{ steps: readonly FunnelStep[]; rateSeries: readonly number[]; plotRef: React.RefObject<HTMLDivElement | null>; w: number }> = ({ steps, rateSeries, plotRef, w }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <>
      <div ref={plotRef} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, k) => (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: textPx(11.5) }}>
              <span style={{ fontWeight: 600, color: m.ink2 }}>{s.label}</span>
              <span style={{ fontWeight: 800 }}>{s.value}</span>
            </div>
            <div style={{ marginTop: 4, height: 14, borderRadius: 4, background: m.soft, overflow: "hidden" }}>
              <div style={{ height: "100%", width: funnelWidth(k === 0 ? 1 : s.fraction, w), borderRadius: 4, background: s.color ?? FUNNEL_COLORS[k % FUNNEL_COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: textPx(10.5), fontWeight: 700, color: m.faint }}>Rate over time</div>
      <svg width={w} height={36} viewBox={`0 0 ${w} 36`} aria-hidden style={{ display: "block", marginTop: 4, ...NO_ICON_SCALE }}>
        <path d={lineGeo(rateSeries, w, 36).line} fill="none" stroke="#AEA1DC" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </>
  );
};

// ---------------------------------------------------------------------------
// The range control (P-MA.6 / B-MA.7 header, lines 486–488 / 471–473): a
// track --subtrack, padding 4, radius 12, gap 4; buttons 44 × 32 radius 9
// 12px; active --subactive / --onfill 700, idle transparent / --subink 600.

export const ChartRangeControl = <R extends string>({ ranges, value, onChange, label = "Range" }: { ranges: readonly R[]; value: R; onChange: (r: R) => void; label?: string }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <div role="radiogroup" aria-label={label} style={{ flex: "none", display: "inline-flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
      <style>{FOCUS_CSS}</style>
      {ranges.map((r) => {
        const on = r === value;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r)}
            className="market-focus hit"
            style={{ width: 44, height: 32, border: 0, borderRadius: 9, font: "inherit", fontSize: textPx(12), cursor: "pointer", background: on ? m.subactive : "transparent", color: on ? m.onfill : m.subink, fontWeight: on ? 700 : 600 }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// The expanded chart (B-MA.7 "Full screen · compare", lines 551–562; the page
// supplies the back header and the offer / range row): the question 15 / 800;
// the figure row (baseline, gap 8, margin-top 4) 34 / 40 800, the change
// 12.5 / 700, "vs previous {unit}" 11.5 --faint; the "Compare to previous
// period" switch row (margin-top 14, 100%, space-between, gap 12, border 1px
// --border, radius 14, --card, padding 10 12; 13 / 700; the switch 42 × 26
// --fill on / --swoff off, the knob 22 at 18 / 2, top 2); the legend
// (margin-top 12, gap 16, 11 --ink2): a 16 × 3 #AEA1DC swatch "This {unit}",
// a 16 dashed 2px #6F9993 rule "Previous {unit}" (shown while comparing);
// the plot 240 tall (margin-top 30) with grid at 10 / 80 / 160 / 230, the
// area / line 2.2 (or the bars at 70% of each slot), the previous period
// #6F9993 2 dashed "5 4", the guide and a 4.5 dot; the tooltip (top −26,
// 150 wide, padding 4 9, 11.5 / 700) "{date} · {value}", "· before {prev}"
// while comparing; the axis 10.5 --tert.

export interface ExpandedChartProps {
  question: string;
  total: string;
  delta?: string | null;
  unit: string;
  range: string;
  labels: readonly string[];
  series: readonly number[];
  prev: readonly number[];
  bars?: boolean;
  formatValue?: (v: number) => string;
  compare: boolean;
  onCompareChange: (on: boolean) => void;
  /** As ChartCard's `note` (W3, additive): replaces "vs previous {unit}"; null hides it. */
  note?: string | null;
}

export const ExpandedChart: React.FC<ExpandedChartProps> = ({ question, total, delta, unit, range, labels, series, prev, bars, formatValue = (v) => Math.round(v).toLocaleString(appLocale("en-US")), compare, onCompareChange, note }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const c = chartInk(dark);
  const [plotRef, W] = useWidth<HTMLDivElement>(358);
  const H = 240;
  const n = series.length;
  const [i, setI] = useSelection(`${range}|${n}|${labels[0] ?? ""}`);
  const has = i !== undefined && i >= 0 && i < n;
  const max = Math.max(1, ...series, ...(compare ? prev : [])) * 1.1;
  const g = lineGeo(series, W, H, max);
  const gp = lineGeo(prev, W, H, max);
  const bw = W / Math.max(1, n);
  const gx = has ? (bars ? (i! + 0.5) * bw : g.px(i!)) : 0;
  const gy = has ? g.py(series[i!]) : 0;
  const tip = has ? `${labels[i!] ?? ""} · ${formatValue(series[i!])}${compare && prev[i!] !== undefined ? ` · before ${formatValue(prev[i!])}` : ""}` : "";
  const tone = deltaTone(delta);
  const compareInk = dark ? m.teal : "#6F9993";
  const [ax0, ax1, ax2] = axisLabels(labels);
  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <div style={{ fontSize: textPx(15), fontWeight: 800 }}>{question}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: textPx(34), lineHeight: linePx(40), fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{total}</span>
        {delta ? <span style={{ fontSize: textPx(12.5), fontWeight: 700, color: tone === "high" ? m.high : tone === "faint" ? m.faint : m.good }}>{delta}</span> : null}
        {note === null ? null : <span style={{ fontSize: textPx(11.5), color: m.faint }}>{note ?? `vs previous ${unit}`}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={compare}
        onClick={() => onCompareChange(!compare)}
        className="market-focus"
        style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: `1px solid ${m.border}`, borderRadius: 14, background: m.card, padding: "10px 12px", font: "inherit", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: textPx(13), fontWeight: 700, color: m.ink }}>Compare to previous period</span>
        <span aria-hidden style={{ width: 42, height: 26, borderRadius: 999, background: compare ? m.fill : m.swoff, position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: compare ? 18 : 2, top: 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 140ms ease" }} />
        </span>
      </button>
      <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: textPx(11), color: m.ink2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 16, height: 3, borderRadius: 2, background: "#AEA1DC" }} />
          This {unit}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, opacity: compare ? 1 : 0 }} aria-hidden={!compare}>
          <span aria-hidden style={{ width: 16, height: 0, borderTop: `2px dashed ${compareInk}` }} />
          Previous {unit}
        </span>
      </div>
      <div
        ref={plotRef}
        role="slider"
        tabIndex={0}
        aria-label={question}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={has ? i : undefined}
        aria-valuetext={has ? tip : "Tap or drag the chart"}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setI(scrubIndex(e.clientX - r.left, r.width, n));
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setI(scrubIndex(e.clientX - r.left, r.width, n));
        }}
        onKeyDown={sliderKeys(i, n, setI)}
        className="market-focus"
        style={{ position: "relative", height: H, marginTop: 30, touchAction: "none", cursor: "crosshair" }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          <path d={`M0 10H${W}M0 80H${W}M0 160H${W}M0 230H${W}`} stroke={m.div} strokeWidth={1} />
          {bars ? (
            <path d={barsPath(series, W, H, max)} fill="#AEA1DC" />
          ) : (
            <>
              <path d={g.area} fill="rgba(174,161,220,0.22)" />
              <path d={g.line} fill="none" stroke="#AEA1DC" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          <path d={bars ? centredLine(prev, W, H, max) : gp.line} fill="none" stroke={compareInk} strokeWidth={2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" opacity={compare ? 1 : 0} />
          <line x1={gx.toFixed(1)} x2={gx.toFixed(1)} y1={0} y2={H} stroke={c.scrub} strokeWidth={1} opacity={has ? 1 : 0} />
          <circle cx={gx.toFixed(1)} cy={gy.toFixed(1)} r={4.5} fill="#FFFFFF" stroke={c.scrub} strokeWidth={2} opacity={has ? 1 : 0} />
        </svg>
        <Tooltip left={tooltipLeft(gx, W, 150)} top={-26} width={150} text={tip} shown={has} big />
      </div>
      <div aria-hidden style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: textPx(10.5), color: m.tert }}>
        <span>{ax0}</span>
        <span>{ax1}</span>
        <span>{ax2}</span>
      </div>
    </div>
  );
};
