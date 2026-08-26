import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Sparkline } from "./Sparkline";
import { PeriodBarChart } from "./PeriodBarChart";
import { StackedSleepBar, StackedSleepColumns, sleepStageLegend, type SleepStages } from "./StackedSleepBar";
import { CaloriesRing } from "./CaloriesRing";
import { sleepDetail } from "../../data/mockHealthData";
import type { HealthMetric } from "../../types";
import { Lock, CalendarDays, Pencil, Check } from "lucide-react";

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

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// V7 (QA 7.0): "Day" is that specific day, "Week" is Monday-Sunday, "Month"
// is the 4 weeks of that month, "Year" is January-December — real calendar
// granularity at every level, instead of the previous D/W/M/Y tabs each
// jumping straight to a different aggregation than their name implied.
const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" })
);

export const MetricDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  metric: HealthMetric | null;
  current: number;
  stepsGoal?: number;
  onEditStepsGoal?: (goal: number) => void;
}> = ({ open, onClose, metric, current, stepsGoal, onEditStepsGoal }) => {
  const [period, setPeriod] = useState<Period>("daily");
  const [lastType, setLastType] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [selectedSleepIdx, setSelectedSleepIdx] = useState<number | null>(null);
  const [editingStepsGoal, setEditingStepsGoal] = useState(false);
  const [stepsGoalDraft, setStepsGoalDraft] = useState("");
  if (metric && metric.type !== lastType) {
    setLastType(metric.type);
    if (period !== "daily") setPeriod("daily");
  }
  if (!metric) return null;

  const isSleep = metric.type === "sleep";
  const isSteps = metric.type === "steps";
  const isWeight = metric.type === "weight";
  const isBodyFat = metric.type === "bodyFat";
  const isTrend = isWeight || isBodyFat;
  const isCalories = metric.type === "caloriesBurned";
  const isAuto = AUTO_SOURCED_TYPES.has(metric.type);

  const dailyHistory = metric.history.map((h) => h.value);
  const weekdayLabels = metric.history.map((h) =>
    new Date(`${h.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })
  );

  // Deterministic mock value for an arbitrary picked date, in the same
  // spirit as the rest of this prototype's synthesized longer-range data.
  const valueForDate = (iso: string) => {
    const seed = hashString(`${metric.type}-${iso}`);
    const f = wobble(seed % 20, 0.15);
    return isTrend ? +(current * f).toFixed(1) : Math.round(current * f);
  };

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
          {isSteps && onEditStepsGoal ? (
            <button
              onClick={() => {
                setStepsGoalDraft(String(stepsGoal ?? 10000));
                setEditingStepsGoal(true);
              }}
              aria-label="Edit daily step count goal"
              className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0"
            >
              <Pencil size={13} />
            </button>
          ) : (
            isAuto && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint bg-cream-soft rounded-full px-2.5 py-1">
                <Lock size={10} /> Auto-synced
              </span>
            )
          )}
        </div>

        {/* V8 (QA 8.0): "Pressing the edit feature only prompts you to edit
            daily step count goal" — the count stays auto-synced; only the
            target is user-configurable. */}
        {isSteps && editingStepsGoal && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-charcoal-soft mb-1.5">Daily step goal</p>
            <div className="flex items-center gap-2 bg-cream-soft rounded-2xl px-4 py-3">
              <input
                autoFocus
                value={stepsGoalDraft}
                onChange={(e) => setStepsGoalDraft(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="flex-1 bg-transparent text-lg font-bold text-charcoal focus:outline-none"
              />
              <button
                onClick={() => {
                  const n = Number(stepsGoalDraft);
                  if (n > 0) onEditStepsGoal?.(n);
                  setEditingStepsGoal(false);
                }}
                className="tap w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
                aria-label="Save step goal"
              >
                <Check size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {!isCalories && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-cream-soft rounded-full p-0.5 w-fit">
              {periodTabs.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPeriod(p.value);
                    setPickedDate(null);
                    setSelectedSleepIdx(null);
                  }}
                  className={`tap w-8 h-7 text-[11px] font-bold rounded-full leading-none ${
                    period === p.value ? "bg-primary text-white" : "text-charcoal-faint"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint cursor-pointer relative">
              <CalendarDays size={13} />
              <input
                type="date"
                // V8 (QA 8.0): "pressing the calendar a set date would
                // redirect you to the day alone, and does not affect week
                // or month" — picking a date always jumps to Day view.
                onChange={(e) => {
                  if (!e.target.value) return;
                  setPickedDate(e.target.value);
                  setPeriod("daily");
                  setSelectedSleepIdx(null);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Pick a specific date"
              />
            </label>
          </div>
        )}

        {pickedDate && (
          <div className="bg-primary-pale rounded-2xl px-4 py-3 mb-4 text-center">
            <p className="text-xs font-semibold text-primary-dark/70 mb-1">
              {new Date(`${pickedDate}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-2xl font-bold text-primary-dark">
              {metric.type === "sleep"
                ? `${Math.floor(valueForDate(pickedDate))}h ${Math.round((valueForDate(pickedDate) % 1) * 60)}m`
                : `${valueForDate(pickedDate).toLocaleString()} ${metric.unit}`}
            </p>
          </div>
        )}

        {/* Steps: bar chart per period (moved here from the compact widget
            per QA). V8 (QA 8.0): week/month/year bars are the average daily
            steps for that unit (not a redundant total on top of the day
            count) — the day view drops the chart entirely, same treatment
            as the weight/body fat trend's daily case just below. */}
        {isSteps &&
          period !== "daily" &&
          (() => {
            const weeklyAvg = Math.round(dailyHistory.reduce((s, v) => s + v, 0) / dailyHistory.length);
            const weekOfMonthAvgs = Array.from({ length: 4 }, (_, i) => Math.round(weeklyAvg * wobble(i)));
            const monthOfYearAvgs = Array.from({ length: 12 }, (_, i) => Math.round(weeklyAvg * wobble(i, 0.12)));
            const view = {
              weekly: { values: dailyHistory, labels: weekdayLabels },
              monthly: { values: weekOfMonthAvgs, labels: weekOfMonthAvgs.map((_, i) => `Week ${i + 1}`) },
              yearly: { values: monthOfYearAvgs, labels: monthNames },
            }[period];
            return (
              <div className="mb-4">
                <PeriodBarChart values={view.values} labels={view.labels} color="#4C8FD1" />
              </div>
            );
          })()}

        {/* Weight / Body Fat: trend line, real Day/Week/Month/Year granularity */}
        {isTrend &&
          (() => {
            const base = dailyHistory[dailyHistory.length - 1];
            const dayVal = [base];
            const weekVals = dailyHistory; // Mon-Sun, real 7-day history
            const monthVals = Array.from({ length: 4 }, (_, i) => +(base * wobble(i, 0.03)).toFixed(1));
            const yearVals = Array.from({ length: 12 }, (_, i) => +(base * wobble(i, 0.05)).toFixed(1));
            const values = { daily: dayVal, weekly: weekVals, monthly: monthVals, yearly: yearVals }[period];
            const unit = isWeight ? "kg" : "%";
            if (period === "daily") {
              return (
                <div className="mb-4 text-center">
                  <p className="text-xs text-charcoal-faint">Today's reading — see the number above.</p>
                </div>
              );
            }
            const high = Math.max(...values);
            const low = Math.min(...values);
            return (
              <div className="mb-4">
                <div className="flex justify-center mb-2">
                  <Sparkline values={values} color="#7D6BB5" width={240} height={70} />
                </div>
                <div className="flex justify-center gap-4 text-xs">
                  <span className="text-teal-dark font-semibold">
                    ↑ High {high.toFixed(1)}{unit}
                  </span>
                  <span className="text-sky font-semibold">
                    ↓ Low {low.toFixed(1)}{unit}
                  </span>
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

        {!isSleep && !isSteps && !isTrend && !isCalories && (
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {metric.history.map((h, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] text-charcoal-faint mb-1">{weekdayLabels[i]}</p>
                <p className="text-xs font-semibold text-charcoal">{Math.round(h.value)}</p>
              </div>
            ))}
          </div>
        )}

        {isSleep && (
          <div className="animate-fade-slide-up">
            <div className="flex items-center justify-between bg-primary-pale rounded-2xl px-4 py-3 mb-4">
              <span className="text-sm font-semibold text-primary-dark">Sleep score</span>
              <span className="text-2xl font-bold text-primary-dark">{sleepDetail.score}</span>
            </div>

            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Total time asleep by stage
            </p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {sleepStageLegend.map((s) => {
                const minutes = { rem: sleepDetail.remMin, deep: sleepDetail.deepMin, light: sleepDetail.lightMin, awake: sleepDetail.awakeMin }[
                  s.key as "rem" | "deep" | "light" | "awake"
                ];
                return (
                  <div key={s.key} className="text-center bg-cream-soft rounded-xl py-2">
                    <p className="text-sm font-bold text-charcoal">
                      {Math.floor(minutes / 60)}h{minutes % 60}m
                    </p>
                    <p className="text-[10px] text-charcoal-faint">{s.label}</p>
                  </div>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Sleep stages
            </p>

            {period === "daily" ? (
              <StackedSleepBar stages={sleepDetail} />
            ) : (
              (() => {
                const counts = { weekly: 7, monthly: 4, yearly: 12 }[period] ?? 7;
                const items = Array.from({ length: counts }, (_, i) => {
                  const f = wobble(i, 0.15);
                  const stages: SleepStages = {
                    remMin: Math.round(sleepDetail.remMin * f),
                    deepMin: Math.round(sleepDetail.deepMin * f),
                    lightMin: Math.round(sleepDetail.lightMin * f),
                    awakeMin: Math.round(sleepDetail.awakeMin * (2 - f)),
                  };
                  const label =
                    period === "weekly"
                      ? weekdayLabels[i] ?? `Day ${i + 1}`
                      : period === "monthly"
                      ? `Week ${i + 1}`
                      : monthNames[i];
                  return { stages, label };
                });
                const selected = selectedSleepIdx !== null ? items[selectedSleepIdx] : null;
                return (
                  <>
                    <StackedSleepColumns items={items} selectedIndex={selectedSleepIdx} onSelect={setSelectedSleepIdx} />
                    <p className="text-[11px] text-charcoal-faint text-center mt-2">
                      {selected ? `Comparing ${selected.label} against the rest` : "Tap a bar to compare that sleep cycle"}
                    </p>
                    {selected && (
                      <div className="bg-cream-soft rounded-2xl p-3.5 mt-2">
                        <p className="text-xs font-semibold text-charcoal mb-2">{selected.label}</p>
                        <StackedSleepBar stages={selected.stages} />
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {sleepStageLegend.map((s) => {
                            const minutes = {
                              rem: selected.stages.remMin,
                              deep: selected.stages.deepMin,
                              light: selected.stages.lightMin,
                              awake: selected.stages.awakeMin,
                            }[s.key as "rem" | "deep" | "light" | "awake"];
                            return (
                              <div key={s.key} className="text-center">
                                <p className="text-xs font-bold text-charcoal">
                                  {Math.floor(minutes / 60)}h{minutes % 60}m
                                </p>
                                <p className="text-[9px] text-charcoal-faint">{s.label}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
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

        {isAuto && !isSleep && !isSteps && (
          <p className="text-[11px] text-charcoal-faint mt-2">
            Synced automatically from Apple/Android Health — not manually editable.
          </p>
        )}
        {isSteps && (
          <p className="text-[11px] text-charcoal-faint mt-2">
            Synced automatically from Apple/Android Health — tap the pencil to set your daily goal.
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
