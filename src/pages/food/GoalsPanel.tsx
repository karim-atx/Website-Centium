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
import { Sparkles, Check, Minus, Plus } from "lucide-react";

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
  const [planError, setPlanError] = useState<string | null>(null);
  const [desiredWeightDraft, setDesiredWeightDraft] = useState(
    String(nutritionGoal.desiredWeightKg ?? user.weightKg)
  );
  const [weightGoalError, setWeightGoalError] = useState<string | null>(null);

  // V6 (QA 6.0): "Existing plan" is a dietitian-provided plan — the client
  // can view it but only the dietitian edits it (from the professional UI),
  // so every editable control here locks while it's selected.
  const locked = nutritionGoal.planType === "existing";

  const tdee = calculateTDEE(user);
  const targets = targetsFromGoal(nutritionGoal);
  // V9 (QA 9.0): "TDEE estimate should include the maintenance calorie as
  // well as the calories based on what goal is chosen" — same formula
  // "Use suggested target" applies, shown alongside the maintenance figure.
  const suggestedForGoal = Math.round(
    nutritionGoal.weightGoal === "lose"
      ? tdee - ((nutritionGoal.weeklyRateKg || 0.5) * 7700) / 7
      : nutritionGoal.weightGoal === "gain"
      ? tdee + ((nutritionGoal.weeklyRateKg || 0.5) * 7700) / 7
      : tdee
  );
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

  // V7 (QA 7.0): a desired weight that contradicts the chosen direction
  // (e.g. wanting to "lose" but entering a heavier target) is rejected with
  // an explanation instead of silently accepted.
  const confirmDesiredWeight = () => {
    if (nutritionGoal.desiredWeightConfirmed) {
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      setWeightGoalError(null);
      return;
    }
    const kg = Number(desiredWeightDraft);
    if (!kg) return;
    if (nutritionGoal.weightGoal === "lose" && kg >= user.weightKg) {
      setWeightGoalError(`Desired weight must be lower than your current weight (${user.weightKg}kg) to lose weight.`);
      return;
    }
    if (nutritionGoal.weightGoal === "gain" && kg <= user.weightKg) {
      setWeightGoalError(`Desired weight must be higher than your current weight (${user.weightKg}kg) to gain weight.`);
      return;
    }
    setWeightGoalError(null);
    setNutritionGoal({ ...nutritionGoal, desiredWeightKg: kg, desiredWeightConfirmed: true });
  };

  // Switching goal direction invalidates whatever desired weight was
  // typed/confirmed for the previous direction (setWeightGoal itself clears
  // the stored value; this just resets the on-screen draft to match).
  const changeWeightGoal = (g: WeightGoalType) => {
    setWeightGoal(g, nutritionGoal.weeklyRateKg || 0.5);
    setDesiredWeightDraft("");
    setWeightGoalError(null);
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
              onClick={() => changeWeightGoal(g.value)}
              disabled={locked}
              className={`tap rounded-xl py-2.5 text-xs font-semibold border transition-colors disabled:opacity-50 ${
                nutritionGoal.weightGoal === g.value
                  ? "bg-primary text-white border-primary"
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
                  disabled={nutritionGoal.desiredWeightConfirmed || locked}
                  inputMode="decimal"
                  className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <span className="text-xs text-charcoal-faint">kg</span>
                <button
                  onClick={confirmDesiredWeight}
                  disabled={locked}
                  aria-label={nutritionGoal.desiredWeightConfirmed ? "Edit desired weight" : "Confirm desired weight"}
                  className={`tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors disabled:opacity-50 ${
                    nutritionGoal.desiredWeightConfirmed
                      ? "bg-charcoal/10 border-transparent text-charcoal-faint"
                      : "bg-primary border-primary text-white"
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
              </div>
              {weightGoalError && (
                <p className="text-xs font-semibold text-[#C0392B] mt-1.5">{weightGoalError}</p>
              )}
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
                disabled={locked || !nutritionGoal.desiredWeightConfirmed}
                className="w-full disabled:opacity-50"
                style={{ accentColor: nutritionGoal.weightGoal === "gain" ? "#3F9165" : "#C0392B" }}
              />
              <p className="text-xs text-charcoal-faint mt-1">
                {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
              </p>
              {/* V8 (QA 8.0): "desired weekly rate can only be edited once
                  desired weight is added." */}
              {!locked && !nutritionGoal.desiredWeightConfirmed && (
                <p className="text-[11px] text-charcoal-faint mt-1">
                  Add and confirm a desired weight above to set your weekly rate.
                </p>
              )}
            </label>
          </>
        )}

        {locked && (
          <p className="text-xs text-charcoal-faint mt-4">
            Locked — only your dietitian can edit this plan.
          </p>
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
          <p className="text-xs text-primary-dark bg-primary-pale rounded-full px-3 py-1.5 mt-3 inline-block">
            At this rate, reach {desiredWeightKg}kg by {reachDate}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            TDEE estimate
          </p>
          <Sparkles size={14} className="text-primary" />
        </div>
        <p className="text-2xl font-bold text-charcoal mb-1">{tdee.toLocaleString()} kcal</p>
        <p className="text-xs text-charcoal-faint mb-2">
          Estimated maintenance calories at your current weight (Mifflin-St Jeor) — a prototype
          estimate, adjust as needed.
        </p>
        {nutritionGoal.weightGoal !== "maintain" && (
          <p className="text-xs text-charcoal bg-cream-soft rounded-full px-3 py-1.5 mb-2 inline-block">
            {suggestedForGoal.toLocaleString()} kcal to {nutritionGoal.weightGoal} weight at your
            current rate
          </p>
        )}
        {tdeeAtGoal !== null && (
          <p className="text-xs text-primary-dark bg-primary-pale rounded-full px-3 py-1.5 mb-3 inline-block">
            ≈ {tdeeAtGoal.toLocaleString()} kcal once you reach {nutritionGoal.desiredWeightKg}kg
          </p>
        )}
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={applySuggested} disabled={locked}>
            Use suggested target
          </Button>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Daily calorie target
        </p>
        {/* V10 (QA 10.0): "I want another better way to edit daily calorie
            target instead of pressing a pencil icon" — a +/- stepper (same
            pattern already used for food quantity) plus direct typing,
            with an explicit Save that only appears once the value changes. */}
        <div className="flex items-center gap-2.5 mb-1">
          <button
            onClick={() => !locked && setCalorieDraft(String(Math.max(0, Number(calorieDraft || 0) - 50)))}
            disabled={locked}
            aria-label="Decrease by 50 kcal"
            className="tap w-9 h-9 rounded-full bg-cream-soft shadow-soft flex items-center justify-center text-charcoal disabled:opacity-50 shrink-0"
          >
            <Minus size={14} />
          </button>
          <input
            value={calorieDraft}
            onChange={(e) => setCalorieDraft(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            disabled={locked}
            className="w-24 text-center rounded-xl bg-cream-soft border border-charcoal/10 px-2 py-2 text-lg font-bold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          <button
            onClick={() => !locked && setCalorieDraft(String(Number(calorieDraft || 0) + 50))}
            disabled={locked}
            aria-label="Increase by 50 kcal"
            className="tap w-9 h-9 rounded-full bg-cream-soft shadow-soft flex items-center justify-center text-charcoal disabled:opacity-50 shrink-0"
          >
            <Plus size={14} />
          </button>
          <span className="text-sm text-charcoal-faint">kcal</span>
        </div>
        {!locked && Number(calorieDraft || 0) !== nutritionGoal.targetCalories && (
          <Button
            size="sm"
            className="mt-1"
            onClick={() => {
              const kcal = Number(calorieDraft);
              if (!kcal) return;
              setNutritionGoal({ ...nutritionGoal, targetCalories: kcal });
            }}
          >
            <Check size={13} /> Save target
          </Button>
        )}
      </Card>

      <Card>
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
          Macro distribution
        </p>
        <MacroSplitEditor
          split={nutritionGoal.macroSplit}
          calories={nutritionGoal.targetCalories}
          onChange={setMacroSplit}
          disabled={locked}
        />
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center bg-primary-pale rounded-xl py-2">
            <p className="text-sm font-bold text-primary-dark">{targets.protein}g</p>
            <p className="text-[10px] text-primary-dark/70">Protein</p>
          </div>
          <div className="text-center bg-gold-pale rounded-xl py-2">
            <p className="text-sm font-bold text-charcoal">{targets.carbs}g</p>
            <p className="text-[10px] text-charcoal-soft">Carbs</p>
          </div>
          <div className="text-center bg-teal-pale rounded-xl py-2">
            <p className="text-sm font-bold text-teal-dark">{targets.fat}g</p>
            <p className="text-[10px] text-teal-dark/70">Fat</p>
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
                // V10 (QA 10.0): "Pressing existing plan, will tell the
                // client that the professional will be responsible for the
                // goals and macros. if they don't have a hired professional,
                // make it so that when pressed it reverts back to custom
                // plan with an error message saying that they should hire a
                // professional."
                if (p === "existing") {
                  if (!user.linkedProfessionalName) {
                    setPlanError("You need to hire a professional before switching to an existing plan.");
                    setNutritionGoal({ ...nutritionGoal, planType: "custom" });
                    return;
                  }
                  setPlanError(null);
                  applyExistingPlan();
                } else {
                  setPlanError(null);
                  setNutritionGoal({ ...nutritionGoal, planType: p });
                }
              }}
            >
              {p === "custom" ? "Custom plan" : "Existing plan"}
            </Chip>
          ))}
        </div>
        {planError && <p className="text-xs font-semibold text-[#C0392B] mt-3">{planError}</p>}
        {!planError && nutritionGoal.planType === "existing" && (
          <p className="text-xs text-charcoal-faint mt-3">
            {user.linkedProfessionalName} is responsible for your goals and macros while this plan is
            active — weight goal, calorie target and macro distribution can only be changed by them.
          </p>
        )}
      </Card>
    </div>
  );
}
