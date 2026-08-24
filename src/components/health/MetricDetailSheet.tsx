import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Sparkline } from "./Sparkline";
import { PeriodBarChart } from "./PeriodBarChart";
import { StackedSleepBar, StackedSleepColumns, sleepStageLegend, type SleepStages } from "./StackedSleepBar";
import { CaloriesRing } from "./CaloriesRing";
import { sleepDetail } from "../../data/mockHealthData";
import type { HealthMetric } from "../../types";
import { Lock } from "lucide-react";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const periodTabs: { value: Period; label: string }[] = [
  { value: "daily", label: "D" },
  { value: "weekly", label: "W" },
  { value: "monthly", label: "M" },
  { value: "yearly", label: "Y" },
];

// Auto-sourced metrics (per QA: "cannot be edited since they get their data
// automatically via either Apple or Android Health") — only Water stays
// user-editable, handled by its own WaterDetailSheet instead of this one.
const AUTO_SOURCED_TYPES = new Set(["weight", "bodyFat", "steps", "sleep", "caloriesBurned"]);

// Deterministic small variation used only to synthesize longer-period demo
// aggregates from a single week of real-looking data — same spirit as the
// synthesis already used in StepsPeriodCard.
const wobble = (i: number, spread = 0.08) => 1 + Math.sin(i * 1.7) * spread;

export const MetricDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  metric: HealthMetric | null;
  current: number;
}> = ({ open, onClose, metric, current }) => {
  const [period, setPeriod] = useState<Period>("daily");
  const [lastType, setLastType] = useState<string | null>(null);
  if (metric && metric.type !== lastType) {
    setLastType(metric.type);
    if (period !== "daily") setPeriod("daily");
  }
  if (!metric) return null;

  const isSleep = metric.type === "sleep";
  const isSteps = metric.type === "steps";
  const isWeight = metric.type === "weight";
  const isCalories = metric.type === "caloriesBurned";
  const isAuto = AUTO_SOURCED_TYPES.has(metric.type);

  const dailyHistory = metric.history.map((h) => h.value);
  const dailyLabels = metric.history.map((h) =>
    new Date(`${h.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" })
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={metric.label}>
      <div className="animate-fade-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-4xl font-bold text-charcoal leading-none">
              {metric.type === "sleep"
                ? `${Math.floor(current)}h ${Math.round((current % 1) * 60)}m`
                : current.toLocaleString()}
              {metric.type !== "sleep" && (
                <span className="text-base font-normal text-charcoal-faint ml-1">{metric.unit}</span>
              )}
            </p>
            <p className="text-xs text-charcoal-faint mt-1">
              {metric.trend >= 0 ? "↑" : "↓"} {Math.abs(metric.trend)} {metric.unit} vs last week
            </p>
          </div>
          {isAuto && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint bg-cream-soft rounded-full px-2.5 py-1">
              <Lock size={10} /> Auto-synced
            </span>
          )}
        </div>

        {!isCalories && (
          <div className="flex items-center gap-1 bg-cream-soft rounded-full p-0.5 w-fit mb-4">
            {periodTabs.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`tap w-8 h-7 text-[11px] font-bold rounded-full leading-none ${
                  period === p.value ? "bg-sohati text-white" : "text-charcoal-faint"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Steps: bar chart per period (moved here from the compact widget per QA) */}
        {isSteps &&
          (() => {
            const weeklyAvg = Math.round(dailyHistory.reduce((s, v) => s + v, 0) / dailyHistory.length);
            const weeklyTotals = Array.from({ length: 6 }, (_, i) => Math.round(weeklyAvg * 7 * wobble(i)));
            const monthlyTotals = Array.from({ length: 6 }, (_, i) => Math.round(weeklyAvg * 30 * wobble(i, 0.12)));
            const yearlyTotals = Array.from({ length: 4 }, (_, i) => Math.round(weeklyAvg * 365 * wobble(i, 0.06)));
            const view = {
              daily: { values: dailyHistory, labels: dailyLabels },
              weekly: { values: weeklyTotals, labels: weeklyTotals.map((_, i) => `W${i + 1}`) },
              monthly: { values: monthlyTotals, labels: monthlyTotals.map((_, i) => `M${i + 1}`) },
              yearly: { values: yearlyTotals, labels: yearlyTotals.map((_, i) => `Y${i + 1}`) },
            }[period];
            return (
              <div className="mb-4">
                <PeriodBarChart values={view.values} labels={view.labels} color="#4C8FD1" />
                <p className="text-xs text-charcoal-faint mt-2">
                  Avg: {Math.round(view.values.reduce((a, b) => a + b, 0) / view.values.length).toLocaleString()}
                </p>
              </div>
            );
          })()}

        {/* Weight: trend line + highest/lowest per period */}
        {isWeight &&
          (() => {
            const base = dailyHistory[dailyHistory.length - 1];
            const weeklyVals = dailyHistory;
            const monthlyVals = Array.from({ length: 8 }, (_, i) => +(base * wobble(i, 0.03)).toFixed(1));
            const yearlyVals = Array.from({ length: 12 }, (_, i) => +(base * wobble(i, 0.05)).toFixed(1));
            const allVals = Array.from({ length: 16 }, (_, i) => +(base * wobble(i, 0.06)).toFixed(1));
            const values = { daily: weeklyVals, weekly: weeklyVals, monthly: monthlyVals, yearly: yearlyVals }[
              period === "daily" ? "weekly" : period
            ] ?? allVals;
            const high = Math.max(...values);
            const low = Math.min(...values);
            return (
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  <Sparkline values={values} color="#7D6BB5" width={240} height={70} />
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="text-ember-dark font-semibold">↑ High {high.toFixed(1)}kg</span>
                  <span className="text-sky font-semibold">↓ Low {low.toFixed(1)}kg</span>
                </div>
              </div>
            );
          })()}

        {/* Calories burned: Apple-Fitness-ring-inspired flame fill */}
        {isCalories && (
          <div className="flex flex-col items-center mb-4">
            <CaloriesRing progress={current / 2600} />
            <p className="text-xs text-charcoal-faint mt-2">{current.toLocaleString()} / 2,600 kcal goal</p>
          </div>
        )}

        {!isSleep && !isSteps && !isWeight && !isCalories && (
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {metric.history.map((h, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-charcoal-faint mb-1">{dailyLabels[i]}</p>
                <p className="text-xs font-semibold text-charcoal">{Math.round(h.value)}</p>
              </div>
            ))}
          </div>
        )}

        {isSleep && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center justify-between bg-sohati-pale rounded-2xl px-4 py-3 mb-4">
              <span className="text-sm font-semibold text-sohati-dark">Sleep score</span>
              <span className="text-2xl font-bold text-sohati-dark">{sleepDetail.score}</span>
            </div>

            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Sleep stages
            </p>

            {period === "daily" ? (
              <StackedSleepBar stages={sleepDetail} />
            ) : (
              (() => {
                const counts = { weekly: 7, monthly: 6, yearly: 12 }[period] ?? 7;
                const items = Array.from({ length: counts }, (_, i) => {
                  const f = wobble(i, 0.15);
                  const stages: SleepStages = {
                    remMin: Math.round(sleepDetail.remMin * f),
                    deepMin: Math.round(sleepDetail.deepMin * f),
                    lightMin: Math.round(sleepDetail.lightMin * f),
                    awakeMin: Math.round(sleepDetail.awakeMin * (2 - f)),
                  };
                  const label =
                    period === "weekly" ? "SMTWTFS"[i] : period === "monthly" ? `W${i + 1}` : `${i + 1}`;
                  return { stages, label };
                });
                return <StackedSleepColumns items={items} />;
              })()
            )}

            <div className="flex flex-wrap gap-3 mt-3 mb-4">
              {sleepStageLegend.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-charcoal-soft">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                </span>
              ))}
            </div>

            {period === "daily" && (
              <p className="text-xs text-charcoal-soft leading-relaxed mb-2">{sleepDetail.summary}</p>
            )}
            <p className="text-[11px] text-charcoal-faint">
              Sleep stage data is sourced from Apple/Android Health when connected — mocked here.
            </p>
          </div>
        )}

        {isAuto && !isSleep && (
          <p className="text-[11px] text-charcoal-faint mt-2">
            Synced automatically from Apple/Android Health — not manually editable.
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
