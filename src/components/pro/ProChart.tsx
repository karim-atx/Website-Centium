import React, { useMemo, useRef, useState } from "react";
import { Lightbulb, MoveHorizontal, Pin } from "lucide-react";
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
 */

export interface ProChartSeries {
  key: string;
  label: string;
  type: "bar" | "line";
  color: string;
  values: (number | null)[];
  /** The previous period, drawn as the ghost line. */
  ghost?: boolean;
  /** Legend swatch: a dashed line for a planned or reference series. */
  dashed?: boolean;
  /** Bars drawn at 40% (a partial or planned bucket). */
  dim?: boolean[];
  /** Starts hidden (legend chip off). */
  hidden?: boolean;
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
  marks?: { index: number; label: string; color?: string }[];
  /** What the pinned tooltip says for a bucket: the caps title, then lines. */
  tooltip?: (index: number) => { title: string; lines: string[] } | null;
  insight?: string;
  /** Screen-reader summary of the whole chart. */
  summary?: string;
  height?: number;
}

const W = 320;
const PAD = 10;

export const ProChart: React.FC<ProChartProps> = ({ title, question, range, onRangeChange, x, min, max, series, band, goal, marks, tooltip, insight, summary, height = 140 }) => {
  const { theme } = useApp();
  const dark = theme === "dark";
  const H = height;
  const n = Math.max(2, x.length);
  const [off, setOff] = useState<Set<string>>(() => new Set(series.filter((s) => s.hidden).map((s) => s.key)));
  const [bandOff, setBandOff] = useState(false);
  const [pin, setPin] = useState<number | null>(null);
  const drag = useRef<{ moved: boolean; start: number } | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);

  const X = (i: number) => PAD + (i * (W - 2 * PAD)) / (n - 1);
  const Y = (v: number) => H - 18 - ((v - min) / (max - min || 1)) * (H - 34);

  const indexAt = (clientX: number): number => {
    const el = plotRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / Math.max(1, r.width)) * W;
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

  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 14px 12px", marginBottom: 12 }}>
      {title && (
        <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 8 }}>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{title}</p>
          {range && (
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
          )}
        </div>
      )}
      {question && <p style={{ fontSize: textPx(11.5), color: INK.chF, margin: "-4px 0 8px" }}>{question}</p>}
      <div
        ref={plotRef}
        role="group"
        tabIndex={0}
        aria-label={summary ?? insight ?? title ?? "Chart"}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg touch-pan-y select-none"
        style={{ paddingTop: pin != null && tip ? 38 : 4 }}
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
          {band && !bandOff && <rect x={0} y={Y(band.high)} width={W} height={Math.max(0, Y(band.low) - Y(band.high))} fill={INK.tealPale} opacity={0.9} />}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={Math.round(H * f)} y2={Math.round(H * f)} stroke={INK.b06} />
          ))}
          {goal != null && <line x1={0} x2={W} y1={Y(goal)} y2={Y(goal)} stroke={INK.tealDark} strokeWidth={1.4} strokeDasharray="4 3" />}
          {visible.map((se) =>
            se.type === "bar" ? (
              <g key={se.key}>
                {se.values.map((v, i) =>
                  v == null ? null : (
                    <rect key={i} x={X(i) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, H - 18 - Y(v))} rx={4} fill={se.color} opacity={se.dim?.[i] ? 0.4 : 1} />
                  )
                )}
              </g>
            ) : (
              <g key={se.key}>
                <path
                  d={
                    "M" +
                    se.values
                      .map((v, i) => (v == null ? null : `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`))
                      .filter(Boolean)
                      .join(" L")
                  }
                  fill="none"
                  stroke={se.color}
                  strokeWidth={se.ghost ? 1.8 : 2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={se.dashed && !se.ghost ? "4 3" : undefined}
                  opacity={se.ghost ? 0.45 : 1}
                />
                {!se.ghost &&
                  se.values.map((v, i) => {
                    if (v == null) return null;
                    const out = !!band && !bandOff && (v < band.low || v > band.high);
                    return <circle key={i} cx={X(i)} cy={Y(v)} r={out ? 4.5 : 3} fill={out ? INK.hi : INK.card} stroke={out ? INK.card : se.color} strokeWidth={2} />;
                  })}
              </g>
            )
          )}
          {(marks ?? []).map((m, i) => (
            <g key={i}>
              <circle cx={X(m.index)} cy={12} r={8} fill={m.color ?? "#D9A441"} />
              <text x={X(m.index)} y={15.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#FFFFFF">
                {m.label}
              </text>
            </g>
          ))}
          {pin != null && <line x1={px} x2={px} y1={0} y2={H - 18} stroke={INK.ch} strokeDasharray="2 2" />}
        </svg>
      </div>
      <div aria-hidden className="flex justify-between" style={{ fontSize: textPx(9.5), color: INK.chT, marginTop: 2 }}>
        {xLabels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      {(series.length > 0 || band) && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
          {series.map((se) => {
            const on = !off.has(se.key);
            return (
              <LegendChip key={se.key} on={on} label={se.label} onClick={() => toggle(se.key)}>
                {se.type === "bar" ? (
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: se.color, opacity: on ? 1 : 0.4 }} />
                ) : (
                  <span style={{ width: 12, borderTop: `2px ${se.dashed ? "dashed" : "solid"} ${se.color}`, opacity: on ? 1 : 0.4 }} />
                )}
              </LegendChip>
            );
          })}
          {band && (
            <LegendChip on={!bandOff} label={band.label} onClick={() => setBandOff((b) => !b)}>
              <span style={{ width: 12, height: 9, borderRadius: 2, background: INK.tealPale, border: `1px solid ${INK.tealDark}` }} />
            </LegendChip>
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
        Drag sideways to scrub, tap to pin
      </p>
    </div>
  );
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
