import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { ProgressRing } from "../ui/ProgressRing";
import { ProgressBar } from "../ui/ProgressBar";
import { WaterFillContainer } from "./WaterFillContainer";
import { healthMetrics } from "../../data/mockHealthData";
import { todaysWorkout } from "../../data/mockWorkouts";
import { sumNutrition, targetsFromGoal } from "../../services/nutrition";
import { Footprints, Scale, Moon, Dumbbell, Percent, ArrowUp, ArrowDown, Droplet } from "lucide-react";

const WATER_TARGET = 2500;

export const HomeWidget: React.FC<{ widget: WidgetConfig }> = ({ widget }) => {
  const navigate = useNavigate();
  const { metricValues, water, foodLog, nutritionGoal, workoutLog } = useApp();
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

    case "bodyFat": {
      if (!isLarge) {
        return (
          <div>
            {header("Body Fat", <Percent size={15} className="text-berry" />, () => navigate("/health"))}
            <p className="text-2xl font-bold text-charcoal leading-none">{metricValues.bodyFat}%</p>
          </div>
        );
      }
      return (
        <div>
          {header("Body Fat", <Percent size={15} className="text-berry" />, () => navigate("/health"))}
          <p className="text-3xl font-bold text-charcoal leading-none mb-1.5">{metricValues.bodyFat}%</p>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
            <ArrowDown size={10} /> 0.4% this week
          </span>
        </div>
      );
    }

    case "water": {
      const pct = water / WATER_TARGET;
      if (!isLarge) {
        return (
          <div className="flex items-center gap-3">
            <WaterFillContainer pct={pct} height={48} width={30} />
            <div>
              {header("Water", <Droplet size={15} className="text-sky" />, () => navigate("/mind"))}
              <p className="text-lg font-bold text-charcoal leading-none">{(water / 1000).toFixed(1)}L</p>
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-4">
          <WaterFillContainer pct={pct} height={80} width={44} />
          <div className="flex-1">
            {header("Water intake", <Droplet size={15} className="text-sky" />, () => navigate("/mind"))}
            <p className="text-2xl font-bold text-charcoal leading-none mb-1">
              {(water / 1000).toFixed(2)}L{" "}
              <span className="text-sm font-normal text-charcoal-faint">/ {(WATER_TARGET / 1000).toFixed(1)}L</span>
            </p>
            <p className="text-xs text-charcoal-faint">{Math.round(pct * 100)}% of today's goal</p>
          </div>
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
        <div>
          {header("Sleep", <Moon size={15} className="text-berry" />, () => navigate("/health"))}
          <p className="text-3xl font-bold text-charcoal leading-none mb-1.5">
            {Math.floor(sleepMeta.current)}h {Math.round((sleepMeta.current % 1) * 60)}m
          </p>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
            <ArrowUp size={10} /> +0.3h vs weekly avg
          </span>
        </div>
      );
    }

    case "nutrition": {
      const kcalProgress = totals.calories / targets.calories;
      if (!isLarge) {
        return (
          <div className="flex items-center gap-3">
            <ProgressRing progress={kcalProgress} size={44} strokeWidth={5} color="#1B6B52">
              <span className="text-[10px] font-bold text-charcoal">
                {Math.round((kcalProgress || 0) * 100)}%
              </span>
            </ProgressRing>
            <div>
              {header("Nutrition", <span />, () => navigate("/food"))}
              <p className="text-lg font-bold text-charcoal leading-none">
                {Math.round(totals.calories)} <span className="text-xs font-normal text-charcoal-faint">kcal</span>
              </p>
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-4">
          <ProgressRing progress={kcalProgress} size={72} strokeWidth={8} color="#1B6B52">
            <div className="text-center">
              <p className="text-base font-bold text-charcoal leading-none">{Math.round(totals.calories)}</p>
              <p className="text-[9px] text-charcoal-faint">of {targets.calories}</p>
            </div>
          </ProgressRing>
          <div className="flex-1 space-y-1.5">
            {header("Nutrition", <span />, () => navigate("/food"))}
            <div className="flex justify-between text-xs">
              <span className="text-charcoal-soft">Protein</span>
              <span className="text-charcoal-faint">{Math.round(totals.protein)}/{targets.protein}g</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-charcoal-soft">Carbs</span>
              <span className="text-charcoal-faint">{Math.round(totals.carbs)}/{targets.carbs}g</span>
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

    default:
      return null;
  }
};
