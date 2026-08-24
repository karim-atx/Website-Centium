import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { MacroSplitEditor } from "../../components/food/MacroSplitEditor";
import { WeightTrendChart } from "../../components/health/WeightTrendChart";
import { useApp } from "../../context/AppContext";
import { calculateTDEE, targetsFromGoal } from "../../services/nutrition";
import { healthMetrics } from "../../data/mockHealthData";
import type { WeightGoalType, PlanType } from "../../types";
import { Sparkles, Check } from "lucide-react";

const goalOptions: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

// V4: "Existing plan" applies a dietitian-provided target — a plausible
// stand-in preset, since the prototype doesn't wire real template content
// from the professional side through yet.
const existingPlanPreset = {
  weightGoal: "lose" as WeightGoalType,
  weeklyRateKg: 0.4,
  calorieAdjust: -400,
  macroSplit: { proteinPct: 35, carbsPct: 40, fatPct: 25 },
};

export default function GoalsPanel() {
  const { user, nutritionGoal, setWeightGoal, setMacroSplit, setNutritionGoal } = useApp();
  const [calorieDraft, setCalorieDraft] = useState(String(nutritionGoal.targetCalories));
  const [desiredWeightDraft, setDesiredWeightDraft] = useState(
    String(nutritionGoal.desiredWeightKg ?? user.weightKg)
  );

  const tdee = calculateTDEE(user);
  const targets = targetsFromGoal(nutritionGoal);
  // V5 (QA 5.0): the weight trend uses the weight provided in Profile
  // (user.weightKg), not the static mock — the mock's 7-day shape is kept
  // (this prototype has no daily weight-history log) but rescaled so it
  // actually ends at the user's real current weight.
  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const historyScale = user.weightKg / weightMeta.history[weightMeta.history.length - 1].value;
  const weightHistory = weightMeta.history.map((h) => ({ ...h, value: +(h.value * historyScale).toFixed(1) }));
  const weight = {
    current: user.weightKg,
    trend: +(weightHistory[weightHistory.length - 1].value - weightHistory[0].value).toFixed(1),
    history: weightHistory,
  };
  // TDEE at the goal weight — adapts as the weight goal / desired weight
  // change, since a lighter or heavier body has a different BMR.
  const tdeeAtGoal =
    nutritionGoal.weightGoal !== "maintain" && nutritionGoal.desiredWeightKg
      ? calculateTDEE({ ...user, weightKg: nutritionGoal.desiredWeightKg })
      : null;

  const rate = nutritionGoal.weeklyRateKg || 0.5;
  const desiredWeightKg = nutritionGoal.desiredWeightKg ?? user.weightKg;
  const weeksToGoal =
    nutritionGoal.weightGoal !== "maintain" && rate > 0
      ? Math.abs(desiredWeightKg - weight.current) / rate
      : 0;
  const reachDateObj = weeksToGoal > 0 ? new Date(Date.UTC(2026, 7, 20) + weeksToGoal * 7 * 86400000) : null;
  const reachDateIso = reachDateObj ? reachDateObj.toISOString().slice(0, 10) : null;
  const reachDate = reachDateObj
    ? reachDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const confirmDesiredWeight = () => {
    if (nutritionGoal.desiredWeightConfirmed) {
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      return;
    }
    const kg = Number(desiredWeightDraft);
    if (!kg) return;
    setNutritionGoal({ ...nutritionGoal, desiredWeightKg: kg, desiredWeightConfirmed: true });
  };

  const applyExistingPlan = () => {
    const suggested = calculateTDEE(user);
    setNutritionGoal({
      ...nutritionGoal,
      planType: "existing",
      weightGoal: existingPlanPreset.weightGoal,
      weeklyRateKg: existingPlanPreset.weeklyRateKg,
      targetCalories: Math.round(suggested + existingPlanPreset.calorieAdjust),
      macroSplit: existingPlanPreset.macroSplit,
    });
    setCalorieDraft(String(Math.round(suggested + existingPlanPreset.calorieAdjust)));
  };

  const applySuggested = () => {
    const suggested = calculateTDEE(user);
    const delta = (nutritionGoal.weeklyRateKg * 7700) / 7;
    const cals =
      nutritionGoal.weightGoal === "lose"
        ? suggested - delta
        : nutritionGoal.weightGoal === "gain"
        ? suggested + delta
        : suggested;
    setNutritionGoal({ ...nutritionGoal, targetCalories: Math.round(cals) });
    setCalorieDraft(String(Math.round(cals)));
  };

  return (
    <div className="space-y-5 animate-fade-slide-up">
      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Weight goal
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {goalOptions.map((g) => (
            <button
              key={g.value}
              onClick={() => setWeightGoal(g.value, nutritionGoal.weeklyRateKg || 0.5)}
              className={`tap rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                nutritionGoal.weightGoal === g.value
                  ? "bg-sohati text-white border-sohati"
                  : "bg-cream-soft border-transparent text-charcoal-soft"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {nutritionGoal.weightGoal !== "maintain" && (
          <>
            <label className="block mb-4">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Desired weight</span>
              <div className="flex items-center gap-2">
                <input
                  value={desiredWeightDraft}
                  onChange={(e) => setDesiredWeightDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  disabled={nutritionGoal.desiredWeightConfirmed}
                  inputMode="decimal"
                  className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20 disabled:opacity-60"
                />
                <span className="text-xs text-charcoal-faint">kg</span>
                <button
                  onClick={confirmDesiredWeight}
                  aria-label={nutritionGoal.desiredWeightConfirmed ? "Edit desired weight" : "Confirm desired weight"}
                  className={`tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    nutritionGoal.desiredWeightConfirmed
                      ? "bg-charcoal/10 border-transparent text-charcoal-faint"
                      : "bg-sohati border-sohati text-white"
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                Desired weekly rate (kg/week)
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={nutritionGoal.weeklyRateKg || 0.5}
                onChange={(e) => setWeightGoal(nutritionGoal.weightGoal, Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-charcoal-faint mt-1">
                {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
              </p>
            </label>
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            Weight trend
          </p>
          <span className="text-xs text-charcoal-faint">
            {reachDate ? "To goal" : "7 days"}
          </span>
        </div>
        <div className="mb-1">
          <p className="text-2xl font-bold text-charcoal">{weight.current} kg</p>
          <p className="text-xs text-charcoal-faint">
            {weight.trend < 0 ? "↓" : "↑"} {Math.abs(weight.trend)} kg this week
          </p>
        </div>
        <div className="flex justify-center">
          <WeightTrendChart
            history={weight.history}
            desiredWeightKg={reachDate ? desiredWeightKg : undefined}
            reachDate={reachDateIso}
            width={260}
            height={110}
          />
        </div>
        {reachDate && (
          <p className="text-xs text-sohati-dark bg-sohati-pale rounded-full px-3 py-1.5 mt-3 inline-block">
            At this rate, reach {desiredWeightKg}kg by {reachDate}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            TDEE estimate
          </p>
          <Sparkles size={14} className="text-sohati" />
        </div>
        <p className="text-2xl font-bold text-charcoal mb-1">{tdee.toLocaleString()} kcal</p>
        <p className="text-xs text-charcoal-faint mb-2">
          Estimated maintenance calories at your current weight (Mifflin-St Jeor) — a prototype
          estimate, adjust as needed.
        </p>
        {tdeeAtGoal !== null && (
          <p className="text-xs text-sohati-dark bg-sohati-pale rounded-full px-3 py-1.5 mb-3 inline-block">
            ≈ {tdeeAtGoal.toLocaleString()} kcal once you reach {nutritionGoal.desiredWeightKg}kg
          </p>
        )}
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={applySuggested}>
            Use suggested target
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Daily calorie target
        </p>
        <div className="flex items-center gap-2 mb-1">
          <input
            value={calorieDraft}
            onChange={(e) => setCalorieDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={() => setNutritionGoal({ ...nutritionGoal, targetCalories: Number(calorieDraft) || nutritionGoal.targetCalories })}
            inputMode="numeric"
            className="w-32 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2 text-lg font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
          <span className="text-sm text-charcoal-faint">kcal / day</span>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Macro distribution
        </p>
        <MacroSplitEditor
          split={nutritionGoal.macroSplit}
          calories={nutritionGoal.targetCalories}
          onChange={setMacroSplit}
        />
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center bg-sohati-pale rounded-xl py-2">
            <p className="text-sm font-bold text-sohati-dark">{targets.protein}g</p>
            <p className="text-[10px] text-sohati-dark/70">Protein</p>
          </div>
          <div className="text-center bg-gold-pale rounded-xl py-2">
            <p className="text-sm font-bold text-charcoal">{targets.carbs}g</p>
            <p className="text-[10px] text-charcoal-soft">Carbs</p>
          </div>
          <div className="text-center bg-ember-pale rounded-xl py-2">
            <p className="text-sm font-bold text-ember-dark">{targets.fat}g</p>
            <p className="text-[10px] text-ember-dark/70">Fat</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">Plan</p>
        <div className="flex gap-2">
          {(["custom", "existing"] as PlanType[]).map((p) => (
            <Chip
              key={p}
              active={nutritionGoal.planType === p}
              onClick={() => {
                if (p === "existing") applyExistingPlan();
                else setNutritionGoal({ ...nutritionGoal, planType: p });
              }}
            >
              {p === "custom" ? "Custom plan" : "Existing plan"}
            </Chip>
          ))}
        </div>
        {nutritionGoal.planType === "existing" && (
          <p className="text-xs text-charcoal-faint mt-3">
            {user.linkedProfessionalName
              ? `Applied the plan ${user.linkedProfessionalName} set for you — weight goal, calorie target and macros updated.`
              : "Applied a starter dietitian-style plan — connect with a professional in Professionals for one built for you."}
          </p>
        )}
      </Card>
    </div>
  );
}
