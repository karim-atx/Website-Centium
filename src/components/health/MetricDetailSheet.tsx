import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { PeriodBarChart } from "./PeriodBarChart";
import { StackedSleepBar, StackedSleepColumns, sleepStageLegend } from "./StackedSleepBar";
import { CaloriesRing } from "./CaloriesRing";
import { useApp } from "../../context/AppContext";
import {
  averageOf,
  emptyHint,
  formatMetric,
  NO_READINGS,
  trendLabel,
  type MetricReadings,
} from "../../services/health-metrics/series";
import {
  bucketReadings,
  periodReadingCount,
  periodValue,
  PERIOD_LABEL,
  readingCountLabel,
  valueOn,
  type Period,
} from "../../services/health-metrics/periods";
import { CalendarDays, Pencil, Check, HeartPulse, Scale, Moon, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The expanded view behind every Health tab card.
//
// EVERY NUMBER IN HERE IS NOW A READING. What it used to do instead:
//
//   • Month and Year were `weeklyAvg * (1 + Math.sin(i * 1.7) * spread)` —
//     one week's figure nudged four and twelve ways.
//   • The calendar picker ran the chosen date through a string hash and
//     scaled the current value by it, so any day in history returned a
//     stable, plausible, invented number.
//   • The heart-rate block printed a fixed resting/range/average and four
//     "time in zone" tiles, none of which any table could have produced.
//   • The sleep block took one mock night and multiplied its four stages by
//     the same sine wave to make a week of them.
//
// A period with no readings in it now says so, and the chart is simply absent.

// V10 (QA 10.0): "Similar to the water widget, replace the lock icon in
// other widgets to minimalistic icons relevant to each widget" — a
// per-metric icon instead of a generic Lock next to "Keep auto-synced".
const autoSyncedIcon: Partial<Record<MetricReadings["type"], LucideIcon>> = {
  weight: Scale,
  heartRate: HeartPulse,
  sleep: Moon,
  caloriesBurned: Flame,
};

const periodTabs: { value: Period; label: string }[] = [
  { value: "daily", label: "D" },
  { value: "weekly", label: "W" },
  { value: "monthly", label: "M" },
  { value: "yearly", label: "Y" },
];

// Auto-sourced metrics (per QA: "cannot be edited since they get their data
// automatically via either Apple or Android Health") — only Water stays
// user-editable, handled by its own WaterDetailSheet instead of this one.
const AUTO_SOURCED_TYPES = new Set(["weight", "heartRate", "steps", "sleep", "caloriesBurned"]);

const hoursAndMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60}m`;

export const MetricDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  metric: MetricReadings | null;
  /** The latest reading, or null when there is none. */
  current: number | null;
  stepsGoal?: number;
  onEditStepsGoal?: (goal: number) => void;
}> = ({ open, onClose, metric, current, stepsGoal, onEditStepsGoal }) => {
  const { today, sleepNights } = useApp();
  const [period, setPeriod] = useState<Period>("daily");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [selectedSleepIdx, setSelectedSleepIdx] = useState<number | null>(null);
  const [editingStepsGoal, setEditingStepsGoal] = useState(false);
  const [stepsGoalDraft, setStepsGoalDraft] = useState("");
  // V9 (QA 9.0): "each detailed widget [should] be separate, and every time
  // the detailed widget is exited out, the calendar button is no longer
  // selected and needs to be chosen again" — this one sheet instance is
  // reused for every metric, so its calendar/period/sleep-bar selection is
  // reset on every fresh open instead of bleeding from the last metric (or
  // the last time this same metric was viewed).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    if (period !== "daily") setPeriod("daily");
    if (pickedDate !== null) setPickedDate(null);
    if (selectedSleepIdx !== null) setSelectedSleepIdx(null);
    if (editingStepsGoal) setEditingStepsGoal(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (!metric) return null;

  const isSleep = metric.type === "sleep";
  const isSteps = metric.type === "steps";
  const isWeight = metric.type === "weight";
  const isHeartRate = metric.type === "heartRate";
  const isCalories = metric.type === "caloriesBurned";
  const isAuto = AUTO_SOURCED_TYPES.has(metric.type);

  const buckets = bucketReadings(metric, period, today);
  const figure = period === "daily" ? current : periodValue(metric, period, today);
  const readings = periodReadingCount(metric, period, today);

  return (
    <BottomSheet open={open} onClose={onClose} title={metric.label}>
      <div className="animate-fade-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div>
            {/* NO FIGURE WITHOUT A READING IN THE PERIOD. Switching to Year on
                an account that logged twice last week used to produce a
                confident yearly average; it now says there is nothing there. */}
            <p className="text-4xl font-bold text-charcoal leading-none">
              {figure === null ? (
                <span className="text-lg font-semibold text-charcoal-faint">{NO_READINGS}</span>
              ) : (
                <>
                  {formatMetric(metric.type, figure)}
                  {!isSleep && (
                    <span className="text-base font-normal text-charcoal-faint ml-1">{metric.unit}</span>
                  )}
                </>
              )}
            </p>
            <p className="text-xs text-charcoal-faint mt-1">
              {figure === null
                ? (emptyHint(metric.type) ?? "Nothing recorded for this period")
                : period === "daily"
                ? trendLabel(metric) ?? readingCountLabel(readings)
                : `${PERIOD_LABEL[period]} · ${readingCountLabel(readings)}`}
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
            isAuto &&
            (() => {
              const Icon = autoSyncedIcon[metric.type];
              return (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint bg-cream-soft rounded-full px-2.5 py-1">
                  {Icon && <Icon size={10} />} Keep auto-synced
                </span>
              );
            })()
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
            {/* A DAY WITH NO READING SAYS SO. This used to hash the date into
                a multiplier, so every day ever picked returned a number. */}
            {(() => {
              const value = valueOn(metric, pickedDate);
              if (value === null) {
                return <p className="text-sm font-semibold text-primary-dark/80">No reading on this day</p>;
              }
              return (
                <p className="text-2xl font-bold text-primary-dark">
                  {formatMetric(metric.type, value)}
                  {!isSleep && ` ${metric.unit}`}
                </p>
              );
            })()}
          </div>
        )}

        {/* The chart, for every metric with more than a day's view selected.
            One bar per day, week or month that carries readings — so a chart
            with nothing behind it is simply not drawn. */}
        {!isCalories && !isSleep && period !== "daily" && (
          buckets.length > 0 ? (
            <div className="mb-4">
              <PeriodBarChart
                values={buckets.map((b) => b.value)}
                labels={buckets.map((b) => b.label)}
                color={isWeight ? "#7D6BB5" : isHeartRate ? "#E9736A" : "#4C8FD1"}
              />
              {isWeight && (
                <div className="flex justify-center gap-4 text-xs mt-2">
                  <span className="text-trend-high-text font-semibold">
                    ↑ High {Math.max(...buckets.map((b) => b.value)).toFixed(1)}kg
                  </span>
                  <span className="text-trend-low-text font-semibold">
                    ↓ Low {Math.min(...buckets.map((b) => b.value)).toFixed(1)}kg
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint text-center mb-4">
              Nothing recorded in this period.
            </p>
          )
        )}

        {isWeight && period === "daily" && current !== null && (
          <div className="mb-4 text-center">
            <p className="text-xs text-charcoal-faint">Latest reading — see the number above.</p>
          </div>
        )}

        {/* Heart rate: latest, range and average — each computed from the
            readings in the selected period.

            THE ZONE TILES ARE GONE. "Time in heart-rate zones today" showed
            Rest 19h40m / Fat burn 3h00m / Cardio 55m / Peak 25m, from a
            literal in mockHealthData. Zones are minutes spent between two
            bpm thresholds, which needs a continuous trace; health_metrics
            stores one value per reading and nothing writes even that. There
            is no honest version of this block, so it does not ship. */}
        {isHeartRate && (
          <div className="mb-4 animate-fade-slide-up">
            {(() => {
              const values = metric.history.map((p) => p.value);
              if (values.length === 0) return null;
              const average = averageOf(metric);
              return (
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-cream-soft rounded-xl py-2.5">
                    <p className="text-sm font-bold text-charcoal">{Math.round(values[values.length - 1])}</p>
                    <p className="text-[10px] text-charcoal-faint">Latest</p>
                  </div>
                  <div className="text-center bg-cream-soft rounded-xl py-2.5">
                    <p className="text-sm font-bold text-charcoal">
                      {values.length > 1
                        ? `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-charcoal-faint">Range (bpm)</p>
                  </div>
                  <div className="text-center bg-cream-soft rounded-xl py-2.5">
                    <p className="text-sm font-bold text-charcoal">{average === null ? "—" : Math.round(average)}</p>
                    <p className="text-[10px] text-charcoal-faint">Average</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Calories burned: Apple-Fitness-ring-inspired flame fill. The 2,600
            goal is the app's own target, not a reading, so it stands — but
            the ring needs a real figure to fill against. */}
        {isCalories && current !== null && (
          <div className="flex flex-col items-center mb-4">
            <CaloriesRing progress={current / 2600} />
            <p className="text-xs text-charcoal-faint mt-2">
              {Math.round(current).toLocaleString()} / 2,600 kcal goal
            </p>
          </div>
        )}

        {isSleep && (
          <div className="animate-fade-slide-up">
            {(() => {
              const night = metric.history.length > 0 ? sleepNights[sleepNights.length - 1] : null;
              const withStages = sleepNights.filter((n) => n.stages !== null);

              // NO BREAKDOWN WITHOUT A ROW. sleep_details is written by
              // nothing today — a stage breakdown comes from a wearable and
              // device sync is not built — so this is the usual case, and it
              // says so instead of showing a score of 82.
              if (!night && withStages.length === 0) {
                return (
                  <p className="text-xs text-charcoal-faint">
                    No sleep stage detail recorded. Stages and a sleep score come from a
                    connected device.
                  </p>
                );
              }

              return (
                <>
                  {night?.score != null && (
                    <div className="flex items-center justify-between bg-primary-pale rounded-2xl px-4 py-3 mb-4">
                      <span className="text-sm font-semibold text-primary-dark">Sleep score</span>
                      <span className="text-2xl font-bold text-primary-dark">{night.score}</span>
                    </div>
                  )}

                  {night?.stages && (
                    <>
                      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                        Total time asleep by stage
                      </p>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {sleepStageLegend.map((s) => {
                          const minutes = {
                            rem: night.stages!.remMin,
                            deep: night.stages!.deepMin,
                            light: night.stages!.lightMin,
                            awake: night.stages!.awakeMin,
                          }[s.key as "rem" | "deep" | "light" | "awake"];
                          return (
                            <div key={s.key} className="text-center bg-cream-soft rounded-xl py-2">
                              <p className="text-sm font-bold text-charcoal">{hoursAndMinutes(minutes)}</p>
                              <p className="text-[10px] text-charcoal-faint">{s.label}</p>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                        Sleep stages
                      </p>
                    </>
                  )}

                  {period === "daily"
                    ? night?.stages && <StackedSleepBar stages={night.stages} />
                    : (() => {
                        // ONE COLUMN PER NIGHT ON RECORD. This used to be
                        // seven, four or twelve columns built by scaling the
                        // single mock night through a sine wave.
                        const items = withStages.map((n) => ({
                          stages: n.stages!,
                          label: new Date(`${n.date}T00:00:00`).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          }),
                        }));
                        if (items.length === 0) {
                          return (
                            <p className="text-[11px] text-charcoal-faint text-center">
                              No nights with stage detail in this period.
                            </p>
                          );
                        }
                        const selected = selectedSleepIdx !== null ? items[selectedSleepIdx] : null;
                        return (
                          <>
                            <StackedSleepColumns
                              items={items}
                              selectedIndex={selectedSleepIdx}
                              onSelect={setSelectedSleepIdx}
                            />
                            <p className="text-[11px] text-charcoal-faint text-center mt-2">
                              {selected
                                ? `Comparing ${selected.label} against the rest`
                                : "Tap a bar to compare that night"}
                            </p>
                            {selected && (
                              <div className="bg-cream-soft rounded-2xl p-3.5 mt-2">
                                <p className="text-xs font-semibold text-charcoal mb-2">{selected.label}</p>
                                <StackedSleepBar stages={selected.stages} />
                              </div>
                            )}
                          </>
                        );
                      })()}

                  {night?.stages && (
                    <div className="flex flex-wrap gap-3 mt-3 mb-4">
                      {sleepStageLegend.map((s) => (
                        <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-charcoal-soft">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {period === "daily" && night?.summary && (
                    <p className="text-xs text-charcoal-soft leading-relaxed mb-2">{night.summary}</p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* WHERE THE NUMBER WOULD COME FROM, said once and truthfully. The
            old line claimed these were "synced automatically from Apple/
            Android Health", which no account has ever been: there is no
            device sync in this app. */}
        {isAuto && !isSteps && (
          <p className="text-[11px] text-charcoal-faint mt-2">
            {metric.type === "weight"
              ? "Logged by you, or synced from a connected device when that arrives."
              : "Recorded by a connected device. Device sync isn't available yet."}
          </p>
        )}
        {isSteps && (
          <p className="text-[11px] text-charcoal-faint mt-2">
            Recorded by a connected device — tap the pencil to set your daily goal. Device sync
            isn't available yet.
          </p>
        )}
      </div>
    </BottomSheet>
  );
};
