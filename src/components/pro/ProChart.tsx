import React, { useMemo, useRef, useState } from "react";
import { HelpCircle, Lightbulb, MoveHorizontal, Pin } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { textPx } from "../../theme/textSize";
import { INK, NO_ICON_SCALE } from "./proInk";
import { PRO_CHART_RANGES, type ProChartRange } from "./proRules";

/**
 * Release 3 · ProChart, the one chart standard (HANDOVER e: "Range W M 3M Y,
 * scrub and pin with tooltip, legend toggles, previous-period ghost, goal or
 * reference band, event markers, insight line"; source gen/r11.js chart11).
 *
 * Drawing (a 320 × h box, h 140, pad 10): grid at 25 / 50 / 75% (6% ink);
 * reference band in teal pale at 90%; goal a teal-dark 1.4 dashed (4 3) line;
 * bars 56% of a slot, r4; lines 2.4 round, points r3 card-filled in the series
 * colour, a point outside the band r4.5 in status.high; the previous-period
 * ghost 1.8 at 45%; event marks a gold r8 disc at the top with 9 / 800 white
 * text. Pin: a dashed text.primary line and the dark tooltip (r12, 7 10, a
 * 10 / 800 caps first line with the pin, 12 / 700 lines).
 *
 * Card: r20, card fill and border, pad 14 14 12. Title 13 / 700; range W M
 * 3M Y in a soft r9 track (24 high, 10.5 / 800, the active one a card chip);
 * the question 11.5 text.faint; x labels 9.5 text.tertiary (at most 8);
 * legend chips 26 high r8 that toggle a series; insight 12 text.soft with the
 * lightbulb in primary.accent; "Drag sideways to scrub, tap to pin".
 *
 * Accessibility: the chart has a text summary (`summary`, the insight line
 * when none) and keyboard scrub: focus it, ← → move the pin, Esc clears.
 *
 * W5 additions (optional props; every existing caller draws as before), for
 * the TR9 v5 vitals (gen/r14.js vcard14, bpChart14, hrChart14, wtChart14)
 * and the TR21 biomarker charts (gen/r16.js cc16, bioChart16):
 * - series types "points" (weigh-ins: hollow r3 points, no line), "range"
 *   (a filled min to max band with 1.2 edges at 80%) and "dumbbell" (BP: a
 *   3 wide connector, the top r5 filled, the bottom r4.2 hollow 2.2);
 *   `pointColor` / `lowColor` colour points per value; `smooth` curves a
 *   line; `labels` print the value over chosen points (10 / 800);
 * - `xPos` places each index on a true-date axis (0 to 1), with `xTicks`
 *   as positioned labels;
 * - `bands` (category bands with right-hand 8.5 / 700 labels) toggled by
 *   one legend chip (`bandsLabel`); `refs` reference lines with labels
 *   (lab limits, normal resting 60 and 100, critical);
 * - `marks` may sit at a true position (`pos`);
 * - `pinned` / `onPinnedChange` make the pin controlled (compare: one pin
 *   moves all three), `defaultPin` starts pinned;
 * - `right` replaces the W M 3M Y track (unit switch, 1Y 2Y All);
 *   `scrubHint` overrides the hint line; `questionIcon` adds the help glyph
 *   (cc16).
 */

export interface ProChartSeries {
  key: string;
  label: string;
  type: "bar" | "line" | "points" | "range" | "dumbbell";
  color: string;
  values: (number | null)[];
  /** range and dumbbell: the lower values (`values` are the upper). */
  low?: (number | null)[];
  /** The previous period, drawn as the ghost line. */
  ghost?: boolean;
  /** Legend swatch: a dashed line for a planned or reference series. */
  dashed?: boolean;
  /** Bars drawn at 40% (a partial or planned bucket). */
  dim?: boolean[];
  /** Starts hidden (legend chip off). */
  hidden?: boolean;
  /** A point's colour by its value (status-coloured points). */
  pointColor?: (index: number, value: number) => string;
  /** dumbbell: the lower point's colour. */
  lowColor?: (index: number, value: number) => string;
  /** line: a smoothed curve through the points. */
  smooth?: boolean;
  /** line: no points (a trend line). */
  noPoints?: boolean;
  /** line / points: print the value over these indexes. */
  labels?: number[];
  /** Legend swatch override. */
  swatch?: "dot" | "hollow" | "fill" | "bar" | "line";
  /** points: filled dots (status points) rather than hollow weigh-ins. */
  filled?: boolean;
  /** Not in the legend. */
  noLegend?: boolean;
}

export interface ProChartProps {
  title?: string;
  /** The question the chart answers (11.5 under the title). */
  question?: string;
  range?: ProChartRange;
  onRangeChange?: (r: ProChartRange) => void;
  /** x labels, one per bucket. */
  x: string[];
  min: number;
  max: number;
  series: ProChartSeries[];
  band?: { low: number; high: number; label: string };
  goal?: number;
  marks?: { index: number; label: string; color?: string; pos?: number }[];
  /** What the pinned tooltip says for a bucket: the caps title, then lines. */
  tooltip?: (index: number) => { title: string; lines: string[] } | null;
  insight?: string;
  /** Screen-reader summary of the whole chart. */
  summary?: string;
  height?: number;
  /** W5: true-date x positions (0 to 1), one per index. */
  xPos?: number[];
  /** W5: positioned x labels (0 to 1) instead of `x`. */
  xTicks?: { pos: number; label: string }[];
  /** W5: category bands drawn under everything, with their labels at the right. */
  bands?: { low: number; high: number; fill: string; label?: string }[];
  /** W5: the legend chip that toggles `bands`. */
  bandsLabel?: string;
  /** W5: reference lines. */
  refs?: { value: number; label?: string; color?: string; dashed?: boolean; side?: "left" | "right" }[];
  /** W5: the goal line's label (drawn at the left, 9 / 800 teal dark). */
  goalLabel?: string;
  /** W5: controlled pin. */
  pinned?: number | null;
  onPinnedChange?: (index: number | null) => void;
  /** W5: start pinned on this index (uncontrolled). */
  defaultPin?: number | null;
  /** W5: replaces the range track at the right of the title. */
  right?: React.ReactNode;
  scrubHint?: string;
  questionIcon?: boolean;
  /** W5: drawn inside the card, without its own border (a chart inside a group). */
  flat?: boolean;
  /** W5: an extra legend chip for the goal line. */
  goalLegend?: string;
}

const W = 320;
const PAD = 10;

/** Points to a smooth path (horizontal-tangent cubic segments, as wtChart14). */
function smoothPath(pts: [number, number][]): string {
  return pts
    .map((p, i) => {
      if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      const q = pts[i - 1];
      const mx = (q[0] + p[0]) / 2;
      return `C ${mx.toFixed(1)} ${q[1].toFixed(1)}, ${mx.toFixed(1)} ${p[1].toFixed(1)}, ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    })
    .join(" ");
}

export const ProChart: React.FC<ProChartProps> = ({
  title,
  question,
  range,
  onRangeChange,
  x,
  min,
  max,
  series,
  band,
  goal,
  marks,
  tooltip,
  insight,
  summary,
  height = 140,
  xPos,
  xTicks,
  bands,
  bandsLabel,
  refs,
  goalLabel,
  pinned,
  onPinnedChange,
  defaultPin = null,
  right,
  scrubHint,
  questionIcon,
  flat,
  goalLegend,
}) => {
  const { theme } = useApp();
  const dark = theme === "dark";
  const H = height;
  const n = Math.max(2, x.length);
  const [off, setOff] = useState<Set<string>>(() => new Set(series.filter((s) => s.hidden).map((s) => s.key)));
  const [bandOff, setBandOff] = useState(false);
  const [bandsOff, setBandsOff] = useState(false);
  const [ownPin, setOwnPin] = useState<number | null>(defaultPin);
  const controlled = pinned !== undefined;
  const pin = controlled ? pinned : ownPin;
  const setPin = (next: number | null | ((p: number | null) => number | null)) => {
    const v = typeof next === "function" ? next(pin ?? null) : next;
    if (!controlled) setOwnPin(v);
    onPinnedChange?.(v);
  };
  const drag = useRef<{ moved: boolean; start: number } | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const X = (i: number) => (xPos ? PAD + (xPos[i] ?? 0) * (W - 2 * PAD) : PAD + (i * (W - 2 * PAD)) / (n - 1));
  const Y = (v: number) => H - 18 - ((v - min) / (max - min || 1)) * (H - 34);
  const clampY = (v: number) => Y(Math.max(min, Math.min(max, v)));

  const indexAt = (clientX: number): number => {
    const el = plotRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / Math.max(1, r.width)) * W;
    if (xPos) {
      let best = 0;
      for (let i = 1; i < x.length; i++) if (Math.abs(X(i) - vx) < Math.abs(X(best) - vx)) best = i;
      return best;
    }
    return Math.max(0, Math.min(x.length - 1, Math.round(((vx - PAD) / (W - 2 * PAD)) * (n - 1))));
  };

  const tip = pin != null && tooltip ? tooltip(pin) : null;
  const px = pin != null ? X(pin) : 0;

  const labelEvery = x.length <= 8 ? 1 : Math.ceil(x.length / 7);
  const xLabels = useMemo(() => x.map((l, i) => (labelEvery === 1 || i % labelEvery === 0 || i === x.length - 1 ? l : null)).filter((l): l is string => l != null), [x, labelEvery]);

  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const visible = series.filter((s) => !off.has(s.key));
  const bw = ((W - 2 * PAD) / n) * 0.56;
  const tipLines = tip ? tip.lines.length : 0;

  const body = (
    <>
      {title && (
        <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 8 }}>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, minWidth: 0 }}>{title}</p>
          {right ??
            (range && (
              <span role="tablist" aria-label="Range" className="flex" style={{ gap: 2, padding: 2, borderRadius: 9, background: INK.soft }}>
                {PRO_CHART_RANGES.map((r) => {
                  const on = r === range;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => onRangeChange?.(r)}
                      className="relative flex items-center justify-center before:absolute before:inset-x-0 before:-inset-y-[10px] before:content-['']"
                      style={{
                        height: 24,
                        minWidth: 28,
                        padding: "0 6px",
                        borderRadius: 7,
                        fontSize: textPx(10.5),
                        fontWeight: 800,
                        background: on ? INK.card : "transparent",
                        color: on ? INK.ch : INK.chF,
                        boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : undefined,
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </span>
            ))}
        </div>
      )}
      {question && (
        <p className="flex" style={{ gap: 5, fontSize: textPx(11.5), color: INK.chF, margin: "-4px 0 8px" }}>
          {questionIcon && <HelpCircle size={12} strokeWidth={2} aria-hidden style={{ color: INK.chT, flexShrink: 0, marginTop: 2 }} />}
          {question}
        </p>
      )}
      <div
        ref={plotRef}
        role="group"
        tabIndex={0}
        aria-label={summary ?? insight ?? title ?? "Chart"}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg touch-pan-y select-none"
        style={{ paddingTop: pin != null && tip ? (tipLines <= 1 ? 38 : 24 + tipLines * 15) : 4 }}
        onPointerDown={(e) => {
          drag.current = { moved: false, start: e.clientX };
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          if (Math.abs(e.clientX - drag.current.start) > 6) drag.current.moved = true;
          if (drag.current.moved) setPin(indexAt(e.clientX));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (!d.moved) {
            const i = indexAt(e.clientX);
            setPin((p) => (p === i ? null : i));
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const dir = e.key === "ArrowRight" ? 1 : -1;
            setPin((p) => Math.max(0, Math.min(x.length - 1, p == null ? (dir > 0 ? 0 : x.length - 1) : p + dir)));
          } else if (e.key === "Escape") setPin(null);
        }}
      >
        {tip && (
          <div
            aria-live="polite"
            className="absolute z-[2]"
            style={{
              ...(px / W > 0.55 ? { right: 0 } : { left: `${Math.max(0, (px / W) * 100 - 24).toFixed(0)}%` }),
              top: -2,
              maxWidth: "calc(100% - 8px)",
              borderRadius: 12,
              background: dark ? "#F5F3FA" : "#241F1B",
              color: dark ? "#121317" : "#FFFFFF",
              padding: "7px 10px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.22)",
            }}
          >
            <p className="flex items-center whitespace-nowrap" style={{ gap: 4, fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
              <Pin size={10} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
              {tip.title}
            </p>
            {tip.lines.map((l, i) => (
              <p key={i} style={{ fontSize: textPx(12), fontWeight: 700, lineHeight: 1.35 }}>
                {l}
              </p>
            ))}
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden style={{ display: "block", overflow: "visible", ...NO_ICON_SCALE }}>
          {bands &&
            !bandsOff &&
            bands.map((b, i) => (
              <g key={`bd${i}`}>
                <rect x={0} y={clampY(b.high)} width={W} height={Math.max(0, clampY(b.low) - clampY(b.high))} fill={b.fill} />
                {b.label && (
                  <text x={W - 4} y={(clampY(b.low) + clampY(b.high)) / 2 + 3} textAnchor="end" fontSize={8.5} fontWeight={700} fill={INK.chF}>
                    {b.label}
                  </text>
                )}
              </g>
            ))}
          {band && !bandOff && <rect x={0} y={clampY(band.high)} width={W} height={Math.max(0, clampY(band.low) - clampY(band.high))} fill={INK.tealPale} opacity={0.9} />}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={Math.round(H * f)} y2={Math.round(H * f)} stroke={INK.b06} />
          ))}
          {(refs ?? []).map((r, i) =>
            r.value < min || r.value > max ? null : (
              <g key={`rf${i}`}>
                <line x1={0} x2={W} y1={Y(r.value)} y2={Y(r.value)} stroke={r.color ?? INK.tealDark} strokeWidth={1.2} strokeDasharray={r.dashed === false ? undefined : "4 3"} opacity={r.dashed === false ? 0.7 : 1} />
                {r.label && (
                  <text x={r.side === "right" ? W - 2 : 2} y={Y(r.value) - 4} textAnchor={r.side === "right" ? "end" : "start"} fontSize={8.5} fontWeight={800} fill={r.color ?? INK.tealDark}>
                    {r.label}
                  </text>
                )}
              </g>
            )
          )}
          {goal != null && <line x1={0} x2={W} y1={Y(goal)} y2={Y(goal)} stroke={INK.tealDark} strokeWidth={1.4} strokeDasharray="4 3" />}
          {goal != null && goalLabel && (
            <text x={4} y={Y(goal) - 5} fontSize={9} fontWeight={800} fill={INK.tealDark}>
              {goalLabel}
            </text>
          )}
          {visible.map((se) => {
            if (se.type === "bar")
              return (
                <g key={se.key}>
                  {se.values.map((v, i) =>
                    v == null ? null : (
                      <rect key={i} x={X(i) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, H - 18 - Y(v))} rx={4} fill={se.pointColor ? se.pointColor(i, v) : se.color} opacity={se.dim?.[i] ? 0.4 : 1} />
                    )
                  )}
                </g>
              );
            if (se.type === "range") {
              const idx = se.values.map((v, i) => (v != null && se.low?.[i] != null ? i : -1)).filter((i) => i >= 0);
              if (!idx.length) return null;
              const top = idx.map((i) => [X(i), Y(se.values[i] as number)] as [number, number]);
              const bot = idx.map((i) => [X(i), Y(se.low![i] as number)] as [number, number]);
              const line = (p: [number, number][]) => "M" + p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L");
              return (
                <g key={se.key}>
                  <path d={`${line(top)} ${[...bot].reverse().map((q) => `L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ")} Z`} fill={se.color} />
                  <path d={line(top)} fill="none" stroke={INK.pr} strokeWidth={1.2} opacity={0.8} />
                  <path d={line(bot)} fill="none" stroke={INK.pr} strokeWidth={1.2} opacity={0.8} />
                </g>
              );
            }
            if (se.type === "dumbbell")
              return (
                <g key={se.key}>
                  {se.values.map((v, i) => {
                    const lo = se.low?.[i];
                    if (v == null || lo == null) return null;
                    return (
                      <g key={i}>
                        <line x1={X(i)} x2={X(i)} y1={Y(v)} y2={Y(lo)} stroke={dark ? "rgba(245,243,250,0.35)" : "rgba(36,31,27,0.28)"} strokeWidth={3} strokeLinecap="round" />
                        <circle cx={X(i)} cy={Y(v)} r={5} fill={se.pointColor ? se.pointColor(i, v) : se.color} stroke={INK.card} strokeWidth={1.6} />
                        <circle cx={X(i)} cy={Y(lo)} r={4.2} fill={INK.card} stroke={se.lowColor ? se.lowColor(i, lo) : se.color} strokeWidth={2.2} />
                      </g>
                    );
                  })}
                </g>
              );
            if (se.type === "points")
              return (
                <g key={se.key}>
                  {se.values.map((v, i) =>
                    v == null ? null : se.filled ? (
                      <circle key={i} cx={X(i)} cy={Y(v)} r={pin === i ? 5.5 : 4.5} fill={se.pointColor ? se.pointColor(i, v) : se.color} stroke={INK.card} strokeWidth={2} />
                    ) : (
                      <circle key={i} cx={X(i)} cy={Y(v)} r={pin === i ? 4.2 : 3} fill={pin === i ? se.color : INK.card} stroke={se.pointColor ? se.pointColor(i, v) : se.color} strokeWidth={1.6} />
                    )
                  )}
                  {(se.labels ?? []).map((i) =>
                    se.values[i] == null ? null : (
                      <text key={`l${i}`} x={X(i)} y={Y(se.values[i] as number) - 10} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK.ch}>
                        {se.values[i]}
                      </text>
                    )
                  )}
                </g>
              );
            const pts = se.values.map((v, i) => (v == null ? null : ([X(i), Y(v)] as [number, number]))).filter((p): p is [number, number] => !!p);
            return (
              <g key={se.key}>
                {pts.length > 0 && (
                  <path
                    d={se.smooth ? smoothPath(pts) : "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")}
                    fill="none"
                    stroke={se.color}
                    strokeWidth={se.ghost ? 1.8 : se.smooth ? 2.6 : 2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={se.dashed && !se.ghost ? "4 3" : undefined}
                    opacity={se.ghost ? 0.45 : 1}
                  />
                )}
                {!se.ghost &&
                  !se.noPoints &&
                  se.values.map((v, i) => {
                    if (v == null) return null;
                    const out = !!band && !bandOff && (v < band.low || v > band.high);
                    const col = se.pointColor ? se.pointColor(i, v) : null;
                    if (col) return <circle key={i} cx={X(i)} cy={Y(v)} r={pin === i ? 5.5 : 4.5} fill={col} stroke={INK.card} strokeWidth={2} />;
                    return <circle key={i} cx={X(i)} cy={Y(v)} r={out ? 4.5 : 3} fill={out ? INK.hi : INK.card} stroke={out ? INK.card : se.color} strokeWidth={2} />;
                  })}
                {(se.labels ?? []).map((i) => {
                  const v = se.values[i];
                  if (v == null) return null;
                  const y = Y(v);
                  return (
                    <text key={`l${i}`} x={X(i)} y={y - 24 > 0 ? y - 10 : y + 18} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK.ch}>
                      {v}
                    </text>
                  );
                })}
              </g>
            );
          })}
          {(marks ?? []).map((m, i) => {
            const mx = m.pos != null ? PAD + m.pos * (W - 2 * PAD) : X(m.index);
            return (
              <g key={i}>
                <circle cx={mx} cy={12} r={8} fill={m.color ?? "#D9A441"} />
                <text x={mx} y={15.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#FFFFFF">
                  {m.label}
                </text>
              </g>
            );
          })}
          {pin != null && <line x1={px} x2={px} y1={0} y2={H - 18} stroke={INK.ch} strokeDasharray="2 2" />}
        </svg>
      </div>
      {xTicks ? (
        <div aria-hidden className="relative" style={{ height: 14, marginTop: 2 }}>
          {xTicks.map((t, i) => (
            <span key={i} className="absolute whitespace-nowrap" style={{ left: `${(t.pos * 100).toFixed(1)}%`, transform: `translateX(-${(t.pos * 100).toFixed(1)}%)`, fontSize: textPx(9.5), color: INK.chT }}>
              {t.label}
            </span>
          ))}
        </div>
      ) : (
        <div aria-hidden className="flex justify-between" style={{ fontSize: textPx(9.5), color: INK.chT, marginTop: 2 }}>
          {xLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
      {(series.some((s) => !s.noLegend) || band || (bands && bandsLabel) || goalLegend) && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
          {series
            .filter((se) => !se.noLegend)
            .map((se) => {
              const on = !off.has(se.key);
              const sw = se.swatch ?? (se.type === "bar" ? "bar" : se.type === "points" ? "hollow" : se.type === "range" ? "fill" : se.type === "dumbbell" ? "dot" : "line");
              return (
                <LegendChip key={se.key} on={on} label={se.label} onClick={() => toggle(se.key)}>
                  <Swatch kind={sw} color={se.color} dashed={se.dashed} on={on} />
                </LegendChip>
              );
            })}
          {bands && bandsLabel && (
            <LegendChip on={!bandsOff} label={bandsLabel} onClick={() => setBandsOff((b) => !b)}>
              <Swatch kind="fill" color={INK.hiBg} on={!bandsOff} />
            </LegendChip>
          )}
          {band && (
            <LegendChip on={!bandOff} label={band.label} onClick={() => setBandOff((b) => !b)}>
              <span style={{ width: 12, height: 9, borderRadius: 2, background: INK.tealPale, border: `1px solid ${INK.tealDark}` }} />
            </LegendChip>
          )}
          {goalLegend && (
            <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 5, height: 26, padding: "0 9px", borderRadius: 8, border: `1px solid ${INK.b10}`, fontSize: textPx(10.5), fontWeight: 700, color: INK.chS }}>
              <span style={{ width: 12, borderTop: `2px dashed ${INK.tealDark}` }} />
              {goalLegend}
            </span>
          )}
        </div>
      )}
      {insight && (
        <p className="flex" style={{ gap: 6, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45, marginTop: 10 }}>
          <Lightbulb size={13} strokeWidth={2} aria-hidden style={{ color: INK.prAccent, flexShrink: 0, marginTop: 2 }} />
          {insight}
        </p>
      )}
      <p aria-hidden className="flex items-center" style={{ gap: 5, fontSize: textPx(10), color: INK.chT, marginTop: 6 }}>
        <MoveHorizontal size={11} strokeWidth={2} />
        {scrubHint ?? "Drag sideways to scrub, tap to pin"}
      </p>
    </>
  );

  if (flat) return <div>{body}</div>;
  return <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 14px 12px", marginBottom: 12 }}>{body}</div>;
};

const Swatch: React.FC<{ kind: "dot" | "hollow" | "fill" | "bar" | "line"; color: string; dashed?: boolean; on: boolean }> = ({ kind, color, dashed, on }) => {
  const o = on ? 1 : 0.4;
  if (kind === "bar") return <span style={{ width: 9, height: 9, borderRadius: 3, background: color, opacity: o }} />;
  if (kind === "dot") return <span style={{ width: 9, height: 9, borderRadius: 9999, background: color, opacity: o }} />;
  if (kind === "hollow") return <span style={{ width: 9, height: 9, borderRadius: 9999, border: `2px solid ${color}`, opacity: o }} />;
  if (kind === "fill") return <span style={{ width: 12, height: 9, borderRadius: 2, background: color, opacity: o }} />;
  return <span style={{ width: 12, borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`, opacity: o }} />;
};

const LegendChip: React.FC<{ on: boolean; label: string; onClick: () => void; children: React.ReactNode }> = ({ on, label, onClick, children }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className="relative inline-flex items-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[9px] before:content-['']"
    style={{
      gap: 5,
      height: 26,
      padding: "0 9px",
      borderRadius: 8,
      border: `1px solid ${on ? INK.b10 : INK.b06}`,
      background: on ? INK.card : INK.soft,
      fontSize: textPx(10.5),
      fontWeight: 700,
      color: on ? INK.chS : INK.chT,
    }}
  >
    {children}
    {label}
  </button>
);
