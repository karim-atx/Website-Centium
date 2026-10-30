import React from "react";
import { hourLabel12 } from "../../../utils/time12";
import type { MetricKey } from "../MetricWidget";
import { mc, useHealthMode } from "./MetricKit";
import { isRtl } from "../../../i18n/core";

/**
 * Day view by hour (HE1.2.d / HE1.4.d chart, Database B1 activity_hourly):
 * 24 bars in the 326 × 146 viewBox, baseline at y 117, axis labels 10/600
 * #8C8378 at y 139 ("12 AM · 6 AM · 12 PM · 6 PM", 12-hour, X-14), bars in
 * the metric main, the current hour today in the metric accent, hours ahead
 * as ghost outlines (1px #241F1B@18%). Bar width and pitch derived from the
 * week chart (20 on 46.6 → 8 on 13.6 for 24 bars); exact geometry of the
 * handover's hourly chart is measured per page in its checklist row.
 */
export const HourlyBars: React.FC<{
  metric: MetricKey;
  /** value per hour 0-23 (null = nothing reported). */
  values: (number | null)[];
  /** The current hour when the day is today, else null. */
  nowHour: number | null;
  label: (hour: number, value: number | null) => string;
}> = ({ metric, values, nowHour, label }) => {
  const { dark, hc } = useHealthMode();
  const BASE = 117;
  const TOP = 12;
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const pitch = 326 / 24;
  const w = 8;
  const faint = hc ? "rgb(var(--c-charcoal))" : dark ? "#B8B3C7" : "#8C8378";
  const ghost = dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.18)";
  // Round F (F10): in right to left, the hours run from right to left. Every x
  // on the 326 grid is mirrored (a bar by its far edge); SVG text anchors are
  // logical, so the labels follow.
  const rtl = isRtl();
  const mx = (x: number) => (rtl ? 326 - x : x);
  return (
    <svg viewBox="0 0 326 146" width="100%" height={146} role="list" style={{ display: "block", overflow: "visible" }}>
      <line x1={0} x2={326} y1={BASE + 0.5} y2={BASE + 0.5} stroke={hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"} />
      {values.map((v, h) => {
        const x = mx(h * pitch + (pitch - w) / 2 + (rtl ? w : 0));
        const ahead = nowHour !== null && h > nowHour;
        if (ahead)
          return <rect key={h} x={x + 0.5} y={BASE - 6.5} width={w - 1} height={6} rx={3} fill="none" stroke={ghost} role="listitem" aria-label={label(h, null)} />;
        const hh = v ? Math.max(3, ((v as number) / max) * (BASE - TOP)) : 0;
        return (
          <rect
            key={h}
            x={x}
            y={BASE - hh}
            width={w}
            height={hh}
            rx={Math.min(4, hh / 2)}
            fill={h === nowHour ? mc(metric, "accent") : mc(metric, "main")}
            role="listitem"
            aria-label={label(h, v)}
          />
        );
      })}
      {[0, 6, 12, 18].map((h, i) => (
        <text key={h} x={mx(h * pitch + (i === 0 ? 0 : pitch / 2))} y={139} textAnchor={i === 0 ? "start" : "middle"} fontSize={10} fontWeight={600} fill={faint}>
          {hourLabel12(h)}
        </text>
      ))}
    </svg>
  );
};
