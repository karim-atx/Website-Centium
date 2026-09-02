import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { ProgressBar } from "../ui/ProgressBar";
import { WaterFillContainer } from "./WaterFillContainer";
import { MacroRing } from "./MacroRing";
import { SleepStageWheel } from "../health/SleepStageWheel";
import { healthMetrics, sleepDetail, heartRateDetail } from "../../data/mockHealthData";
import { todaysWorkout } from "../../data/mockWorkouts";
import { sumNutrition, targetsFromGoal } from "../../services/nutrition";
import {
  Footprints,
  Scale,
  Moon,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  Droplet,
  CheckSquare,
  BookOpen,
  Utensils,
  KeyRound,
  HeartPulse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { habitIcon } from "../../utils/icons";
import { YogaFigureIcon } from "../mind/YogaFigureIcon";
import { mockGyms } from "../../data/mockProfessionals";

export const HomeWidget: React.FC<{ widget: WidgetConfig; onWaterClick?: () => void; onGymPassesClick?: () => void }> = ({
  widget,
  onWaterClick,
  onGymPassesClick,
}) => {
  const navigate = useNavigate();
  const { metricValues, water, waterGoalMl, stepsGoal, foodLog, nutritionGoal, workoutLog, habits, journalEntries, gymPurchases, streaks } =
    useApp();
  const isLarge = widget.size === "large";

  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const weeklyStepsAvg = Math.round(
    stepsMeta.history.reduce((s, h) => s + h.value, 0) / stepsMeta.history.length
  );
  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const weeklyTrendPct = (
    ((weightMeta.history[weightMeta.history.length - 1].value - weightMeta.history[0].value) /
      weightMeta.history[0].value) *
    100
  ).toFixed(1);
  const sleepMeta = healthMetrics.find((m) => m.type === "sleep")!;

  const totals = sumNutrition(foodLog);
  const targets = targetsFromGoal(nutritionGoal);
  const todaysWorkoutLog = workoutLog[workoutLog.length - 1];

  // Design refinement §6.1: "remove decorative icon tints — all widget
  // icons become #A79E93 at 13px." Widget label drops to 10.5px/500.
  const header = (label: string, Icon: LucideIcon) => (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon size={13} className="text-charcoal-tertiary" />
      <span className="text-[10.5px] font-medium text-charcoal-faint">{label}</span>
    </div>
  );

  // Design refinement §4.3: "Data numeral (widget) 26px/800/-0.03em,
  // tabular." One shared numeral class for every widget's headline value.
  const numeral = "text-[26px] font-extrabold text-charcoal leading-none tracking-[-0.03em] tabular-nums";

  const wrap = (onClick: () => void, content: React.ReactNode) => (
    <div onClick={onClick} role="button" tabIndex={0} className="tap cursor-pointer">
      {content}
    </div>
  );

  switch (widget.type) {
    case "steps": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "steps" } });
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Steps", Footprints)}
            <p className={numeral}>{metricValues.steps.toLocaleString()}</p>
            <p className="text-[10.5px] text-charcoal-tertiary mt-0.5">
              of {stepsGoal.toLocaleString()} · {Math.round((metricValues.steps / stepsGoal) * 100)}%
            </p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Steps", Footprints)}
          <p className={`${numeral} mb-1`}>
            {metricValues.steps.toLocaleString()}{" "}
            <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">/ {stepsGoal.toLocaleString()}</span>
          </p>
          <ProgressBar progress={metricValues.steps / stepsGoal} color="#4C8FD1" height={6} />
          <div className="flex justify-between mt-2.5 text-[11px] text-charcoal-faint">
            <span>Weekly avg: {weeklyStepsAvg.toLocaleString()}</span>
            <span className="text-teal-deep-text font-semibold">↑ 6%</span>
          </div>
        </div>
      );
    }

    case "weight": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "weight" } });
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Weight", Scale)}
            <p className={numeral}>
              {metricValues.weight} <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">kg</span>
            </p>
          </div>
        );
      }
      // V8 (QA 8.0): "should show on the right side the desired weight, the
      // desired weekly rate, and the date of achieving this weight if
      // chosen — if not chosen leave empty for now."
      const hasGoal = nutritionGoal.weightGoal !== "maintain" && nutritionGoal.desiredWeightConfirmed && nutritionGoal.desiredWeightKg;
      let reachDate: string | null = null;
      if (hasGoal) {
        const rate = nutritionGoal.weeklyRateKg || 0.5;
        const weeksToGoal = rate > 0 ? Math.abs(nutritionGoal.desiredWeightKg! - metricValues.weight) / rate : 0;
        if (weeksToGoal > 0) {
          const reachDateObj = new Date(Date.UTC(2026, 7, 20) + weeksToGoal * 7 * 86400000);
          reachDate = reachDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      }
      return wrap(
        onClick,
        <div className="flex items-start justify-between gap-3">
          <div>
            {header("Weight", Scale)}
            <p className={`${numeral} mb-1.5`}>
              {metricValues.weight} <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">kg</span>
            </p>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-deep-text bg-teal-pale rounded-full px-2 py-0.5 mb-2">
              <ArrowDown size={10} /> 0.6 kg this week
            </span>
            <p className="text-[11px] text-charcoal-faint">Weekly trend: {weeklyTrendPct}%</p>
          </div>
          {hasGoal && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold text-charcoal-tertiary uppercase tracking-wide mb-1">Goal</p>
              <p className="text-sm font-bold text-charcoal">{nutritionGoal.desiredWeightKg} kg</p>
              <p className="text-[11px] text-charcoal-faint">
                {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg/wk
              </p>
              {reachDate && <p className="text-[11px] text-charcoal-faint mt-0.5">by {reachDate}</p>}
            </div>
          )}
        </div>
      );
    }

    case "heartRate": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "heartRate" } });
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Heart Rate", HeartPulse)}
            <p className={numeral}>
              {metricValues.heartRate} <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">bpm</span>
            </p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Heart Rate", HeartPulse)}
          <p className={`${numeral} mb-1.5`}>
            {metricValues.heartRate} <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">bpm</span>
          </p>
          <p className="text-[11px] text-charcoal-faint mb-1.5">Resting · avg {heartRateDetail.average} bpm</p>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-deep-text bg-teal-pale rounded-full px-2 py-0.5">
            Range {heartRateDetail.low}–{heartRateDetail.high} bpm today
          </span>
        </div>
      );
    }

    case "water": {
      const pct = water / waterGoalMl;
      // V7 (QA 7.0): "the water log in the plus sign should appear instead
      // when pressing the widget in the home screen" — pressing this widget
      // opens the same quick-log sheet the Health tab's "+" used to open;
      // that button is removed from Health entirely.
      const onClick = onWaterClick ?? (() => navigate("/app/health"));
      if (!isLarge) {
        return wrap(
          onClick,
          <div className="flex items-center gap-3">
            <WaterFillContainer pct={pct} height={48} width={30} orientation="vertical" />
            <div>
              {header("Water", Droplet)}
              <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] tabular-nums">
                {(water / 1000).toFixed(1)}L
              </p>
            </div>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Water intake", Droplet)}
          <p className={`${numeral} mb-1`}>
            {(water / 1000).toFixed(2)}L{" "}
            <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">/ {(waterGoalMl / 1000).toFixed(1)}L</span>
          </p>
          <WaterFillContainer pct={pct} height={20} width="100%" orientation="horizontal" />
          <p className="text-[11px] text-charcoal-faint mt-1.5">{Math.round(pct * 100)}% of today's goal</p>
        </div>
      );
    }

    case "sleep": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "sleep" } });
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Sleep", Moon)}
            <p className={numeral}>
              {Math.floor(sleepMeta.current)}h {Math.round((sleepMeta.current % 1) * 60)}m
            </p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div className="flex items-center gap-3">
          <SleepStageWheel stages={sleepDetail} />
          <div>
            {header("Sleep", Moon)}
            <p className={`${numeral} mb-1.5`}>
              {Math.floor(sleepMeta.current)}h {Math.round((sleepMeta.current % 1) * 60)}m
            </p>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-deep-text bg-primary-pale rounded-full px-2 py-0.5">
              <ArrowUp size={10} /> +0.3h vs weekly avg
            </span>
            <p className="text-[11px] text-charcoal-faint mt-1.5">Sleep score {sleepDetail.score}/100</p>
          </div>
        </div>
      );
    }

    case "nutrition": {
      const kcalProgress = totals.calories / targets.calories;
      const onClick = () => navigate("/app/food");
      if (!isLarge) {
        return wrap(
          onClick,
          <div className="flex items-center gap-3">
            <MacroRing progress={kcalProgress} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={44} strokeWidth={5}>
              <span className="text-[10px] font-bold text-charcoal">
                {Math.round((kcalProgress || 0) * 100)}%
              </span>
            </MacroRing>
            <div>
              {header("Nutrition", Utensils)}
              <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] tabular-nums">
                {Math.round(totals.calories)} <span className="text-[11px] font-semibold text-charcoal-tertiary tracking-normal">kcal</span>
              </p>
            </div>
          </div>
        );
      }
      // V8 (QA 8.0): horizontal bars per macro, color-coordinated with the
      // ring's own segments, showing grams left (target minus consumed).
      // Design refinement §6.1: one hue family (primary-dark/primary-light/
      // teal), gram figure moves to neutral charcoal so colour lives only
      // in the bar.
      const macroRows: { label: string; color: string; consumed: number; target: number }[] = [
        { label: "Protein", color: "#7D6BB5", consumed: totals.protein, target: targets.protein },
        { label: "Carbs", color: "#C8BFE9", consumed: totals.carbs, target: targets.carbs },
        { label: "Fat", color: "#A2C8C2", consumed: totals.fat, target: targets.fat },
      ];
      return wrap(
        onClick,
        <div>
          <div className="flex items-center gap-4 mb-3">
            <MacroRing progress={kcalProgress} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={72} strokeWidth={6}>
              <div className="text-center">
                <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.03em] tabular-nums">
                  {Math.round(totals.calories)}
                </p>
                <p className="text-[9.5px] text-charcoal-tertiary">of {targets.calories}</p>
              </div>
            </MacroRing>
            <div className="flex-1">{header("Nutrition", Utensils)}</div>
          </div>
          <div className="space-y-2">
            {macroRows.map((m) => {
              const left = Math.max(0, Math.round(m.target - m.consumed));
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-charcoal-soft">{m.label}</span>
                    <span className="font-semibold text-charcoal">{left}g left</span>
                  </div>
                  <ProgressBar progress={m.consumed / (m.target || 1)} color={m.color} height={4} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "workout": {
      const done = !!todaysWorkoutLog?.completed;
      const onClick = () => navigate("/app/workout");
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Workout", Dumbbell)}
            <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em]">{done ? "Done ✓" : "Pending"}</p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Workout", Dumbbell)}
          <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] mb-1.5">{todaysWorkout.name}</p>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
              done ? "text-primary-deep-text bg-primary-pale" : "text-teal-deep-text bg-teal-pale"
            }`}
          >
            {done ? "Completed ✓" : "Not started yet"}
          </span>
          <p className="text-[11px] text-charcoal-faint mt-1.5">
            {todaysWorkout.exercises.length} exercises · ~{todaysWorkout.durationMin} min
          </p>
          <p className="text-[11px] text-primary-deep-text font-semibold mt-1">
            🔥 {streaks.find((s) => s.id === "s3")?.days ?? 0} workout streak
          </p>
        </div>
      );
    }

    case "habits": {
      const done = habits.filter((h) => h.done).length;
      const onClick = () => navigate("/app/mind");
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Habits", CheckSquare)}
            <p className={numeral}>
              {done}/{habits.length}
            </p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Habits", CheckSquare)}
          <p className={`${numeral} mb-2`}>
            {done}/{habits.length} <span className="text-[12px] font-semibold text-charcoal-tertiary tracking-normal">done today</span>
          </p>
          <ProgressBar progress={habits.length ? done / habits.length : 0} color="#7D6BB5" height={4} />
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {habits.slice(0, 5).map((h) => (
              <span
                key={h.id}
                className={`w-7 h-7 rounded-full bg-primary-pale flex items-center justify-center ${h.done ? "" : "opacity-30"}`}
              >
                {React.createElement(habitIcon[h.icon], { size: 13, className: "text-primary-dark" })}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "journal": {
      const todaysEntry = journalEntries.some((e) => e.date === "2026-08-20");
      const onClick = () => navigate("/app/mind");
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Journal", BookOpen)}
            <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em]">
              {todaysEntry ? "Written ✓" : "Not yet"}
            </p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Journal", BookOpen)}
          <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] mb-1.5">
            {todaysEntry ? "Today's entry written ✓" : "Reflect on your day"}
          </p>
          <p className="text-[11px] text-charcoal-faint">{journalEntries.length} entries total</p>
          {journalEntries.length > 0 && (
            <p className="text-[11px] text-charcoal-faint mt-1">
              Last: {journalEntries[journalEntries.length - 1].date}
            </p>
          )}
        </div>
      );
    }

    case "meditation": {
      const onClick = () => navigate("/app/mind");
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Meditation", YogaFigureIcon as unknown as LucideIcon)}
            <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em]">5 min</p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Meditation", YogaFigureIcon as unknown as LucideIcon)}
          <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] mb-1.5">
            Breathing, stretching &amp; yoga
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-primary-deep-text bg-primary-pale rounded-full px-2 py-0.5">
            Open library
          </span>
          <p className="text-[11px] text-charcoal-faint mt-1.5">5-15 min sessions · guided or free-form</p>
        </div>
      );
    }

    case "gymPasses": {
      const passCount = Object.values(gymPurchases).reduce((n, arr) => n + arr.length, 0);
      const passNames = Object.entries(gymPurchases)
        .flatMap(([gymId, arr]) => arr.map(() => mockGyms.find((g) => g.id === gymId)?.name))
        .filter((n): n is string => !!n);
      const onClick = onGymPassesClick ?? (() => {});
      if (!isLarge) {
        return wrap(
          onClick,
          <div>
            {header("Gym Passes", KeyRound)}
            <p className={numeral}>{passCount}</p>
          </div>
        );
      }
      return wrap(
        onClick,
        <div>
          {header("Gym Passes", KeyRound)}
          <p className="text-[19px] font-extrabold text-charcoal leading-none tracking-[-0.02em] mb-1.5">
            {passCount > 0 ? `${passCount} active` : "None yet"}
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-primary-deep-text bg-primary-pale rounded-full px-2 py-0.5">
            Tap to show QR
          </span>
          {passNames.length > 0 && (
            <p className="text-[11px] text-charcoal-faint mt-1.5 truncate">{passNames.join(" · ")}</p>
          )}
        </div>
      );
    }

    default:
      return null;
  }
};
