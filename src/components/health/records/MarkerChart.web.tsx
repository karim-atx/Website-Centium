import React, { useState } from "react";
import { isRtl, t } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";
import { StatusWord, rangeText } from "./kit";

// Website viewport v1 · the biomarker history chart (WC-HE Records Web v3,
// chart(): the Biomarkers attention card "compact" and the marker page
// "big"): the y axis in the marker's unit with gridlines, a point per result
// at its date, value labels in the status colour, the reference band with
// its limit line(s) and labels, a tooltip on hover / focus, the x axis with
// each result's month. The time axis runs right to left in Arabic.
//
// Literal values from the reference: grid columns (axis width) and 10 gap,
// rows (plot, 24 x axis); top padding 28 (compact 22) for the unit label;
// gridlines 1px #241F1B@7%; band #357A4D@8%, limit 1.4 dashed 5 4 #357A4D,
// labels 12/16 700 #357A4D (the band's 10 in and 8 up, the limit's at the
// end 3 above); line 2.2 round; points 12 (hovered 14) with a 2.5 ring, white
// (hovered filled), hit 28; value labels 13 (compact 12) / 16 800, 10 above;
// tick and month labels 12/16 600 #8C8378 (a limit tick 700 #357A4D); out of
// range #C2453F, in range #4F7F78; about 6 ticks (compact 3); "All" pads the
// first and last result by 8% of the span (at least 20 days); tooltip min 168,
// pad 10 14, r12, white, shadow 0 8 24 #241F1B@14% + 0.5px ring: the date 12/16
// 600 #8C8378, value 17/24 800 with the status word, the report 13/20 #5B5349.

const OUT = "#C2453F";
const IN = "#4F7F78";
const LIMIT = "#357A4D";
const DAY = 864e5;

export interface MarkerPoint {
  key: string;
  date: string;
  value: number;
  status: "low" | "normal" | "high" | null;
  source: string;
}

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const colourOf = (s: MarkerPoint["status"], threshold: boolean) => (threshold || s === null ? "#7D6BB5" : s === "normal" ? IN : OUT);
const clean = (v: number) => String(Number(v.toFixed(6)));

function step(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
}

const monthYear = (d: string) => {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(appLocale() ?? "en-US", { month: "short", year: "numeric", timeZone: "UTC" });
};

export const MarkerChartWeb: React.FC<{
  points: MarkerPoint[];
  low: number | null;
  high: number | null;
  unit: string;
  /** Threshold markers: no band and no status colours. */
  threshold?: boolean;
  compact?: boolean;
  /** The period's length in days (null = All: the results' own span). */
  spanDays: number | null;
  today: string;
  height: number;
  label: string;
  dateLabel: (d: string) => string;
  emptyText: string;
}> = ({ points, low, high, unit, threshold = false, compact = false, spanDays, today, height, label, dateLabel, emptyText }) => {
  const [hover, setHover] = useState<number | null>(null);
  const rtl = isRtl();
  const lowL = threshold ? null : low;
  const highL = threshold ? null : high;
  // Time domain.
  let t0: number;
  let t1: number;
  if (spanDays === null && points.length) {
    const a = ms(points[0].date);
    const b = ms(points[points.length - 1].date);
    const pd = Math.max((b - a) * 0.08, 20 * DAY);
    t0 = a - pd;
    t1 = b + pd;
  } else {
    t1 = ms(today);
    t0 = t1 - (spanDays ?? 365) * DAY;
  }
  const X = (d: string) => 5 + ((ms(d) - t0) / (t1 - t0)) * 90;
  const sx = (x: number) => (rtl ? 100 - x : x);
  // Value domain.
  const limits = [lowL, highL].filter((v): v is number => v !== null);
  const vals = [...limits, ...points.map((p) => p.value)];
  let lo = vals.length ? Math.min(...vals) : 0;
  let hi = vals.length ? Math.max(...vals) : 1;
  if (hi - lo < Math.max(Math.abs(hi) * 0.2, 1e-6)) {
    const pad = Math.max(Math.abs(hi) * 0.2, 1);
    lo -= pad / 2;
    hi += pad / 2;
  }
  const st = step((hi - lo) / (compact ? 3 : 6));
  const y0 = Math.floor((lo - (hi - lo) * 0.06) / st) * st;
  const y1 = Math.ceil((hi + (hi - lo) * 0.1) / st) * st;
  const Y = (v: number) => 100 - ((v - y0) / (y1 - y0)) * 100;
  const ticks: number[] = [];
  for (let v = y0; v <= y1 + st * 1e-6; v += st) ticks.push(Number(v.toFixed(6)));
  const fs = compact ? 12 : 13;
  const axW = Math.max(...ticks.map((v) => clean(v).length), unit.length * 0.75) * 8 + 4;
  const padT = compact ? 22 : 28;
  const latest = points[points.length - 1];
  const lineColour = latest ? colourOf(latest.status, threshold) : IN;
  const bandTop = highL !== null ? Y(highL) : 0;
  const bandBottom = lowL !== null ? Y(lowL) : 100;
  const range = rangeText(lowL, highL);
  // x labels: one per result month, at most 6, never the same month twice.
  const every = Math.max(1, Math.ceil(points.length / 6));
  const xs: { x: number; l: string }[] = [];
  points.forEach((p, i) => {
    const l = monthYear(p.date);
    if (i % every === 0 && !xs.some((e) => e.l === l)) xs.push({ x: X(p.date), l });
  });
  if (!points.length) {
    const d0 = new Date(t0).toISOString().slice(0, 10);
    xs.push({ x: 5, l: monthYear(d0) }, { x: 95, l: monthYear(today) });
  }
  const lbl: React.CSSProperties = { position: "absolute", fontSize: 12, lineHeight: "16px", fontWeight: 600, color: "#8C8378", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
  const tip = hover !== null ? points[hover] : null;
  return (
    <div className="relative" style={{ height }} role="group" aria-label={label} data-web-marker-chart={compact ? "compact" : "big"}>
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `${axW}px minmax(0,1fr)`, gridTemplateRows: "minmax(0,1fr) 24px", columnGap: 10 }}>
        <div className="relative" style={{ gridColumn: 1, gridRow: 1, marginTop: padT }} aria-hidden data-chart="yaxis">
          <span style={{ ...lbl, insetInlineEnd: 0, top: -padT }}>{unit}</span>
          {ticks.map((v) => {
            const lim = limits.includes(v);
            return (
              <span key={v} style={{ ...lbl, insetInlineEnd: 0, top: `${Y(v)}%`, transform: "translateY(-50%)", color: lim ? LIMIT : "#8C8378", fontWeight: lim ? 700 : 600 }}>
                {clean(v)}
              </span>
            );
          })}
        </div>
        <div className="relative" style={{ gridColumn: 2, gridRow: 1, marginTop: padT }} data-chart="plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {ticks.map((v) => (
              <line key={v} x1={0} x2={100} y1={Y(v)} y2={Y(v)} stroke="rgba(36,31,27,0.07)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {limits.length > 0 && <rect x={0} y={bandTop} width={100} height={Math.max(0, bandBottom - bandTop)} fill="rgba(53,122,77,0.08)" />}
            {limits.map((v) => (
              <line key={`l${v}`} x1={0} x2={100} y1={Y(v)} y2={Y(v)} stroke={LIMIT} strokeDasharray="5 4" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            ))}
            {points.length > 1 && (
              <polyline
                points={points.map((p) => `${sx(X(p.date))},${Y(p.value)}`).join(" ")}
                fill="none"
                stroke={lineColour}
                strokeWidth={2.2}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </svg>
          {limits.length > 0 && range !== "–" && (
            <span aria-hidden style={{ ...lbl, insetInlineStart: 10, bottom: `calc(${100 - bandBottom}% + 8px)`, fontWeight: 700, color: LIMIT }} data-chart="band">
              {t("Reference: {range} {unit}", { range, unit })}
            </span>
          )}
          {limits.map((v) => (
            <span key={`ll${v}`} aria-hidden style={{ ...lbl, insetInlineEnd: 6, top: `${Y(v)}%`, transform: "translateY(calc(-100% - 3px))", fontWeight: 700, color: LIMIT }} data-chart="lim">
              {clean(v)}
            </span>
          ))}
          {points.map((p, i) =>
            hover === i ? null : (
              <span
                key={`v${p.key}`}
                aria-hidden
                style={{ position: "absolute", insetInlineStart: `${X(p.date)}%`, top: `${Y(p.value)}%`, transform: `translate(${rtl ? "50%" : "-50%"}, calc(-100% - 10px))`, fontSize: fs, lineHeight: "16px", fontWeight: 800, color: colourOf(p.status, threshold), fontVariantNumeric: "tabular-nums", pointerEvents: "none", whiteSpace: "nowrap" }}
                data-chart="val"
              >
                {p.value}
              </span>
            ),
          )}
          {points.map((p, i) => {
            const on = hover === i;
            const c = colourOf(p.status, threshold);
            return (
              <button
                key={`d${p.key}`}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${p.value} ${unit}, ${dateLabel(p.date)}, ${p.source}`}
                className="absolute grid place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ insetInlineStart: `${X(p.date)}%`, top: `${Y(p.value)}%`, width: 28, height: 28, marginInlineStart: -14, marginTop: -14, zIndex: 2, cursor: "pointer" }}
                data-chart="pt"
              >
                <span style={{ width: on ? 14 : 12, height: on ? 14 : 12, borderRadius: 999, boxSizing: "border-box", background: on ? c : "#FFFFFF", border: `2.5px solid ${c}`, transition: "all .12s" }} />
              </button>
            );
          })}
          {tip && hover !== null && (
            <div
              role="tooltip"
              style={{
                position: "absolute",
                insetInlineStart: `${X(tip.date)}%`,
                top: `${Y(tip.value)}%`,
                transform: `translate(${(() => {
                  const x = X(tip.date);
                  const v = x > 72 ? "calc(-100% + 18px)" : x < 28 ? "-18px" : "-50%";
                  return rtl ? (v === "-50%" ? "50%" : v === "-18px" ? "18px" : "calc(100% - 18px)") : v;
                })()}, calc(-100% - 16px))`,
                zIndex: 3,
                minWidth: 168,
                boxSizing: "border-box",
                padding: "10px 14px",
                borderRadius: 12,
                background: "#FFFFFF",
                boxShadow: "0 8px 24px rgba(36,31,27,0.14), 0 0 0 0.5px rgba(36,31,27,0.08)",
                pointerEvents: "none",
              }}
              data-chart="tip"
            >
              <span className="block" style={{ fontSize: 12, lineHeight: "16px", fontWeight: 600, color: "#8C8378" }}>
                {dateLabel(tip.date)}
              </span>
              <span className="flex items-baseline whitespace-nowrap" style={{ gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#241F1B" }}>{`${tip.value} ${unit}`}</span>
                {!threshold && <StatusWord status={tip.status} size={13} line={20} icon={13} />}
              </span>
              <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                {tip.source}
              </span>
            </div>
          )}
          {points.length === 0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="whitespace-nowrap" style={{ padding: "6px 14px", borderRadius: 999, background: "#FFFFFF", boxShadow: "0 0 0 0.5px rgba(36,31,27,0.1)", fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#8C8378" }}>
                {emptyText}
              </span>
            </div>
          )}
        </div>
        <div className="relative" style={{ gridColumn: 2, gridRow: 2 }} aria-hidden data-chart="xaxis">
          {xs.map((e) => (
            <span key={e.l} style={{ ...lbl, insetInlineStart: `${e.x}%`, top: 6, transform: `translateX(${rtl ? "50%" : "-50%"})` }}>
              {e.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
