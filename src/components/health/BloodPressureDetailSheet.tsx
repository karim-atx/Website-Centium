import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { BloodPressureReading } from "../../services/blood-pressure";
import {
  averageReading,
  BP_CATEGORIES,
  categoryCounts,
  classifyBloodPressure,
  isSevere,
  splitByTimeOfDay,
  type BpCategory,
} from "../../services/blood-pressure/classify";
import {
  BP_CATEGORY_COLOR,
  BP_CATEGORY_LABEL,
  BP_DETAIL_FOOTER,
  BP_NO_READINGS,
  SEVERE_READING_MESSAGE,
} from "../../services/blood-pressure/guidance";
import { AlertTriangle, Pencil, Plus } from "lucide-react";

// The expanded blood-pressure view.
//
// MODELLED ON THE HEART-RATE DETAIL BLOCK, which is the closest sibling: a
// vital, a stat row, and a period selector. It diverges where blood pressure
// does — two numbers rather than one, so the chart draws two series against
// shared category bands, and a split by time of day, because a morning reading
// and an evening one are different measurements of the same person.
//
// THE SAME HONEST-DATA RULES AS 71ea8f8 THROUGHOUT. A period with no readings
// says so rather than averaging nothing; the category counts are of readings
// that exist; morning and evening each report null when that half of the day
// is empty. Nothing is interpolated between readings and no band is drawn for
// a period nobody measured.

type Period = "weekly" | "monthly" | "yearly";
const PERIOD_DAYS: Record<Period, number> = { weekly: 7, monthly: 30, yearly: 365 };
const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

/** The chart's y-range, wide enough to show the bands that matter. */
const CHART_MIN = 40;
const CHART_MAX = 200;

/**
 * The category bands, as horizontal stripes behind the lines.
 *
 * DRAWN OFF THE SYSTOLIC THRESHOLDS ONLY, and labelled as such, because a
 * single y-axis cannot carry both scales honestly — 80 means Stage 1 on the
 * diastolic line and comfortably normal on the systolic one. Shading by the
 * systolic thresholds and saying so is better than shading by a blend of the
 * two, which would be a band that matches neither series.
 */
const SYSTOLIC_BANDS: { from: number; to: number; category: BpCategory }[] = [
  { from: CHART_MIN, to: 120, category: "normal" },
  { from: 120, to: 130, category: "elevated" },
  { from: 130, to: 140, category: "stage1" },
  { from: 140, to: 180, category: "stage2" },
  { from: 180, to: CHART_MAX, category: "severe" },
];

function within(readings: BloodPressureReading[], days: number): BloodPressureReading[] {
  const cutoff = Date.now() - days * 86400000;
  return readings.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ARM_LABEL: Record<string, string> = { left: "Left arm", right: "Right arm" };
const POSITION_LABEL: Record<string, string> = {
  sitting: "Sitting",
  standing: "Standing",
  lying: "Lying down",
};

export const BloodPressureDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (reading: BloodPressureReading) => void;
}> = ({ open, onClose, onAdd, onEdit }) => {
  const { bloodPressure } = useApp();
  const [period, setPeriod] = useState<Period>("weekly");

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    if (period !== "weekly") setPeriod("weekly");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const inPeriod = within(bloodPressure, PERIOD_DAYS[period]);
  const average = averageReading(inPeriod);
  const counts = categoryCounts(inPeriod);
  const { morning, evening } = splitByTimeOfDay(inPeriod);
  const morningAvg = averageReading(morning);
  const eveningAvg = averageReading(evening);
  const latest = bloodPressure[0] ?? null;
  const latestSevere = latest ? isSevere(latest.systolic, latest.diastolic) : false;

  // Oldest first for the chart, so time runs left to right.
  const points = [...inPeriod].reverse();
  const y = (mmHg: number) =>
    100 - ((Math.min(CHART_MAX, Math.max(CHART_MIN, mmHg)) - CHART_MIN) / (CHART_MAX - CHART_MIN)) * 100;
  const x = (i: number) => (points.length <= 1 ? 50 : (i / (points.length - 1)) * 100);

  return (
    <BottomSheet open={open} onClose={onClose} title="Blood pressure">
      <div className="animate-fade-slide-up">
        {latestSevere && latest && (
          <div
            role="alert"
            className="flex gap-2.5 rounded-2xl px-3.5 py-3 mb-4"
            style={{ background: "rgba(164,35,28,0.08)" }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#A4231C" }} />
            <p className="text-[12px] leading-[1.5] font-semibold" style={{ color: "#7E1B15" }}>
              {SEVERE_READING_MESSAGE}
            </p>
          </div>
        )}

        {/* --- the period selector ---------------------------------------- */}
        <div className="flex items-center gap-1 bg-cream-soft rounded-full p-0.5 w-fit mb-4">
          {PERIOD_TABS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`tap px-3 h-7 text-[11px] font-bold rounded-full leading-none ${
                period === p.value ? "bg-primary text-white" : "text-charcoal-faint"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {inPeriod.length === 0 ? (
          <p className="text-sm text-charcoal-faint mb-4">
            {BP_NO_READINGS} in this period.
          </p>
        ) : (
          <>
            {/* --- the chart ---------------------------------------------- */}
            <div className="mb-1.5">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height={150} style={{ display: "block" }}>
                {SYSTOLIC_BANDS.map((b) => (
                  <rect
                    key={b.category}
                    x={0}
                    y={y(b.to)}
                    width={100}
                    height={Math.max(0, y(b.from) - y(b.to))}
                    fill={BP_CATEGORY_COLOR[b.category]}
                    opacity={0.09}
                  />
                ))}
                {/* Two series. A single reading draws its dots and no line,
                    the same rule the other metrics follow. */}
                {points.length > 1 && (
                  <>
                    <polyline
                      points={points.map((r, i) => `${x(i)},${y(r.systolic)}`).join(" ")}
                      fill="none"
                      stroke="#A4231C"
                      strokeWidth={0.9}
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      points={points.map((r, i) => `${x(i)},${y(r.diastolic)}`).join(" ")}
                      fill="none"
                      stroke="#4A3DA0"
                      strokeWidth={0.9}
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
                {points.map((r, i) => (
                  <g key={r.id}>
                    <circle cx={x(i)} cy={y(r.systolic)} r={1.4} fill="#A4231C" vectorEffect="non-scaling-stroke" />
                    <circle cx={x(i)} cy={y(r.diastolic)} r={1.4} fill="#4A3DA0" vectorEffect="non-scaling-stroke" />
                  </g>
                ))}
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mb-4">
              <span className="flex items-center gap-1.5 text-[10.5px] text-charcoal-soft">
                <span className="w-2.5 h-[2px] rounded-full" style={{ background: "#A4231C" }} /> Systolic
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] text-charcoal-soft">
                <span className="w-2.5 h-[2px] rounded-full" style={{ background: "#4A3DA0" }} /> Diastolic
              </span>
              <span className="text-[10px] text-charcoal-faint">Bands follow the systolic thresholds</span>
            </div>

            {/* --- averages ----------------------------------------------- */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center bg-cream-soft rounded-xl py-2.5">
                <p className="text-sm font-bold text-charcoal tabular-nums">
                  {average ? `${average.systolic}/${average.diastolic}` : "—"}
                </p>
                <p className="text-[10px] text-charcoal-faint">Average</p>
              </div>
              <div className="text-center bg-cream-soft rounded-xl py-2.5">
                <p className="text-sm font-bold text-charcoal tabular-nums">
                  {morningAvg ? `${morningAvg.systolic}/${morningAvg.diastolic}` : "—"}
                </p>
                <p className="text-[10px] text-charcoal-faint">Morning</p>
              </div>
              <div className="text-center bg-cream-soft rounded-xl py-2.5">
                <p className="text-sm font-bold text-charcoal tabular-nums">
                  {eveningAvg ? `${eveningAvg.systolic}/${eveningAvg.diastolic}` : "—"}
                </p>
                <p className="text-[10px] text-charcoal-faint">Evening</p>
              </div>
            </div>
            <p className="text-[10.5px] text-charcoal-faint mb-4">
              {inPeriod.length} reading{inPeriod.length === 1 ? "" : "s"} · {morning.length} morning ·{" "}
              {evening.length} evening. Morning is before noon.
            </p>

            {/* --- how many in each category ------------------------------ */}
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Readings by category
            </p>
            <div className="space-y-1.5 mb-5">
              {BP_CATEGORIES.map((c) => {
                const n = counts[c];
                const pct = inPeriod.length > 0 ? (n / inPeriod.length) * 100 : 0;
                return (
                  <div key={c} className="flex items-center gap-2.5">
                    <span className="w-[86px] shrink-0 text-[11px] font-semibold text-charcoal-soft">
                      {BP_CATEGORY_LABEL[c]}
                    </span>
                    <span className="flex-1 h-2 rounded-full bg-cream-soft overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, background: BP_CATEGORY_COLOR[c] }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right text-[11px] font-bold text-charcoal tabular-nums">
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* --- the readings themselves -------------------------------- */}
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              All readings
            </p>
            <div className="space-y-1.5 mb-4">
              {inPeriod.map((r) => {
                const category = classifyBloodPressure(r.systolic, r.diastolic);
                return (
                  <div key={r.id} className="flex items-start gap-2.5 rounded-xl bg-cream-soft px-3.5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[15px] font-extrabold text-charcoal tabular-nums">
                          {r.systolic}/{r.diastolic}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: BP_CATEGORY_COLOR[category] }}
                        >
                          {BP_CATEGORY_LABEL[category]}
                        </span>
                        {r.pulse != null && (
                          <span className="text-[11px] text-charcoal-faint">{r.pulse} bpm</span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-charcoal-faint mt-0.5">
                        {formatWhen(r.recordedAt)}
                        {r.arm && ` · ${ARM_LABEL[r.arm]}`}
                        {r.position && ` · ${POSITION_LABEL[r.position]}`}
                      </p>
                      {r.notes && (
                        <p className="text-[11px] text-charcoal-soft mt-1 leading-snug">{r.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onEdit(r)}
                      aria-label={`Edit the reading from ${formatWhen(r.recordedAt)}`}
                      className="tap w-7 h-7 rounded-full bg-cream-card flex items-center justify-center text-charcoal-faint shrink-0"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Button fullWidth variant="secondary" onClick={onAdd}>
          <Plus size={14} /> Add a reading
        </Button>

        <p className="text-[11px] leading-[1.5] text-charcoal-faint text-center mt-4">
          {BP_DETAIL_FOOTER}
        </p>
      </div>
    </BottomSheet>
  );
};
