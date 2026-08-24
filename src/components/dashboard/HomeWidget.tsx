import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { ProgressBar } from "../ui/ProgressBar";
import { WaterFillContainer } from "./WaterFillContainer";
import { MacroRing } from "./MacroRing";
import { SleepStageWheel } from "../health/SleepStageWheel";
import { healthMetrics, sleepDetail } from "../../data/mockHealthData";
import { todaysWorkout } from "../../data/mockWorkouts";
import { sumNutrition, targetsFromGoal } from "../../services/nutrition";
import { Footprints, Scale, Moon, Dumbbell, ArrowUp, ArrowDown, Droplet, CheckSquare, BookOpen, Utensils } from "lucide-react";
import { habitIcon } from "../../utils/icons";
import { YogaFigureIcon } from "../mind/YogaFigureIcon";

export const HomeWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const navigate = useNavigate();
  const { metricValues, water, waterGoalMl, foodLog, nutritionGoal, workoutLog, habits, journalEntries } = useApp();
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

  const header = (label: string, icon: React.ReactNode, onClick?: () => void) => (
    <button onClick={onClick} className="tap flex items-center gap-2 mb-2 text-left w-full">
      {icon}
      <span className="text-xs font-semibold text-charcoal-soft">{label}</span>
    </button>
  );

  switch (widget.type) {
    case "steps": {
      if (!isLarge) {
        return (
          <div>
            {header("Steps", <Footprints size={15} className="text-sky" />, () => navigate("/health"))}
            <p className="text-2xl font-bold text-charcoal leading-none">
              {metricValues.steps.toLocaleString()}
            </p>
          </div>
        );
      }
      return (
        <div>
          {header("Steps", <Footprints size={15} className="text-sky" />, () => navigate("/health"))}
          <p className="text-3xl font-bold text-charcoal leading-none mb-1">
            {metricValues.steps.toLocaleString()}{" "}
            <span className="text-sm font-normal text-charcoal-faint">/ 10,000</span>
          </p>
          <ProgressBar progress={metricValues.steps / 10000} color="#4C8FD1" height={6} />
          <div className="flex justify-between mt-2.5 text-xs text-charcoal-faint">
            <span>Weekly avg: {weeklyStepsAvg.toLocaleString()}</span>
            <span className="text-sohati-dark font-semibold">↑ 6%</span>
          </div>
        </div>
      );
    }

    case "weight": {
      if (!isLarge) {
        return (
          <div>
            {header("Weight", <Scale size={15} className="text-sohati" />, () => navigate("/health"))}
            <p className="text-2xl font-bold text-charcoal leading-none">{metricValues.weight} kg</p>
          </div>
        );
      }
      return (
        <div>
          {header("Weight", <Scale size={15} className="text-sohati" />, () => navigate("/health"))}
          <p className="text-3xl font-bold text-charcoal leading-none mb-1.5">{metricValues.weight} kg</p>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5 mb-2">
            <ArrowDown size={10} /> 0.6 kg this week
          </span>
          <p className="text-xs text-charcoal-faint">Weekly trend: {weeklyTrendPct}%</p>
        </div>
      );
    }

    case "water": {
      const pct = water / waterGoalMl;
      if (!isLarge) {
        return (
          <div className="flex items-center gap-3">
            <WaterFillContainer pct={pct} height={48} width={30} orientation="vertical" />
            <div>
              {header("Water", <Droplet size={15} className="text-sky" />, () => navigate("/health"))}
              <p className="text-lg font-bold text-charcoal leading-none">{(water / 1000).toFixed(1)}L</p>
            </div>
          </div>
        );
      }
      return (
        <div>
          {header("Water intake", <Droplet size={15} className="text-sky" />, () => navigate("/health"))}
          <p className="text-2xl font-bold text-charcoal leading-none mb-1">
            {(water / 1000).toFixed(2)}L{" "}
            <span className="text-sm font-normal text-charcoal-faint">/ {(waterGoalMl / 1000).toFixed(1)}L</span>
          </p>
          <WaterFillContainer pct={pct} height={20} width="100%" orientation="horizontal" />
          <p className="text-xs text-charcoal-faint mt-1.5">{Math.round(pct * 100)}% of today's goal</p>
        </div>
      );
    }

    case "sleep": {
      if (!isLarge) {
        return (
          <div>
            {header("Sleep", <Moon size={15} className="text-berry" />, () => navigate("/health"))}
            <p className="text-2xl font-bold text-charcoal leading-none">
              {Math.floor(sleepMeta.current)}h {Math.round((sleepMeta.current % 1) * 60)}m
            </p>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-3">
          <SleepStageWheel stages={sleepDetail} />
          <div>
            {header("Sleep", <Moon size={15} className="text-berry" />, () => navigate("/health"))}
            <p className="text-2xl font-bold text-charcoal leading-none mb-1.5">
              {Math.floor(sleepMeta.current)}h {Math.round((sleepMeta.current % 1) * 60)}m
            </p>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
              <ArrowUp size={10} /> +0.3h vs weekly avg
            </span>
          </div>
        </div>
      );
    }

    case "nutrition": {
      const kcalProgress = totals.calories / targets.calories;
      if (!isLarge) {
        return (
          <div className="flex items-center gap-3">
            <MacroRing progress={kcalProgress} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={44} strokeWidth={5}>
              <span className="text-[10px] font-bold text-charcoal">
                {Math.round((kcalProgress || 0) * 100)}%
              </span>
            </MacroRing>
            <div>
              {header("Nutrition", <Utensils size={15} className="text-sohati" />, () => navigate("/food"))}
              <p className="text-lg font-bold text-charcoal leading-none">
                {Math.round(totals.calories)} <span className="text-xs font-normal text-charcoal-faint">kcal</span>
              </p>
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-4">
          <MacroRing progress={kcalProgress} protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={72} strokeWidth={8}>
            <div className="text-center">
              <p className="text-base font-bold text-charcoal leading-none">{Math.round(totals.calories)}</p>
              <p className="text-[9px] text-charcoal-faint">of {targets.calories}</p>
            </div>
          </MacroRing>
          <div className="flex-1 space-y-1.5">
            {header("Nutrition", <Utensils size={15} className="text-sohati" />, () => navigate("/food"))}
            <div className="flex justify-between text-xs">
              <span className="text-charcoal-soft">Protein</span>
              <span className="text-charcoal-faint">{Math.round(totals.protein)}/{targets.protein}g</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-charcoal-soft">Carbs</span>
              <span className="text-charcoal-faint">{Math.round(totals.carbs)}/{targets.carbs}g</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-charcoal-soft">Fat</span>
              <span className="text-charcoal-faint">{Math.round(totals.fat)}/{targets.fat}g</span>
            </div>
          </div>
        </div>
      );
    }

    case "workout": {
      const done = !!todaysWorkoutLog?.completed;
      if (!isLarge) {
        return (
          <div>
            {header("Workout", <Dumbbell size={15} className="text-charcoal" />, () => navigate("/workout"))}
            <p className="text-lg font-bold text-charcoal leading-none">{done ? "Done ✓" : "Pending"}</p>
          </div>
        );
      }
      return (
        <div>
          {header("Workout", <Dumbbell size={15} className="text-charcoal" />, () => navigate("/workout"))}
          <p className="text-xl font-bold text-charcoal leading-none mb-1.5">{todaysWorkout.name}</p>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
              done ? "text-sohati-dark bg-sohati-pale" : "text-ember-dark bg-ember-pale"
            }`}
          >
            {done ? "Completed ✓" : "Not started yet"}
          </span>
          <p className="text-xs text-charcoal-faint mt-1.5">
            {todaysWorkout.exercises.length} exercises · ~{todaysWorkout.durationMin} min
          </p>
        </div>
      );
    }

    case "habits": {
      const done = habits.filter((h) => h.done).length;
      if (!isLarge) {
        return (
          <div>
            {header("Habits", <CheckSquare size={15} className="text-sohati" />, () => navigate("/mind"))}
            <p className="text-2xl font-bold text-charcoal leading-none">
              {done}/{habits.length}
            </p>
          </div>
        );
      }
      return (
        <div>
          {header("Habits", <CheckSquare size={15} className="text-sohati" />, () => navigate("/mind"))}
          <p className="text-3xl font-bold text-charcoal leading-none mb-2">
            {done}/{habits.length} <span className="text-sm font-normal text-charcoal-faint">done today</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {habits.slice(0, 5).map((h) => (
              <span
                key={h.id}
                className={`w-7 h-7 rounded-full bg-sohati-pale flex items-center justify-center ${h.done ? "" : "opacity-30"}`}
              >
                {React.createElement(habitIcon[h.icon], { size: 13, className: "text-sohati-dark" })}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "journal": {
      const todaysEntry = journalEntries.some((e) => e.date === "2026-08-20");
      if (!isLarge) {
        return (
          <div>
            {header("Journal", <BookOpen size={15} className="text-charcoal" />, () => navigate("/mind"))}
            <p className="text-lg font-bold text-charcoal leading-none">
              {todaysEntry ? "Written ✓" : "Not yet"}
            </p>
          </div>
        );
      }
      return (
        <div>
          {header("Journal", <BookOpen size={15} className="text-charcoal" />, () => navigate("/mind"))}
          <p className="text-xl font-bold text-charcoal leading-none mb-1.5">
            {todaysEntry ? "Today's entry written ✓" : "Reflect on your day"}
          </p>
          <p className="text-xs text-charcoal-faint">{journalEntries.length} entries total</p>
        </div>
      );
    }

    case "meditation": {
      if (!isLarge) {
        return (
          <div>
            {header("Meditation", <YogaFigureIcon size={15} className="text-berry" />, () => navigate("/mind"))}
            <p className="text-lg font-bold text-charcoal leading-none">5 min</p>
          </div>
        );
      }
      return (
        <div>
          {header("Meditation", <YogaFigureIcon size={15} className="text-berry" />, () => navigate("/mind"))}
          <p className="text-xl font-bold text-charcoal leading-none mb-1.5">Breathing, stretching & yoga</p>
          <span className="inline-flex items-center text-xs font-semibold text-berry bg-berry-pale rounded-full px-2 py-0.5">
            Open library
          </span>
        </div>
      );
    }

    default:
      return null;
  }
};
