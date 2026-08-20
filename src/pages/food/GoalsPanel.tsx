import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { MacroSplitEditor } from "../../components/food/MacroSplitEditor";
import { Sparkline } from "../../components/health/Sparkline";
import { useApp } from "../../context/AppContext";
import { calculateTDEE, targetsFromGoal } from "../../services/nutrition";
import { healthMetrics } from "../../data/mockHealthData";
import type { WeightGoalType, PlanType } from "../../types";
import { Sparkles } from "lucide-react";

const goalOptions: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

export default function GoalsPanel() {
  const { user, nutritionGoal, setWeightGoal, setMacroSplit, setNutritionGoal } = useApp();
  const [calorieDraft, setCalorieDraft] = useState(String(nutritionGoal.targetCalories));

  const tdee = calculateTDEE(user);
  const targets = targetsFromGoal(nutritionGoal);
  const weight = healthMetrics.find((m) => m.type === "weight")!;

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
              {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
            </p>
          </label>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            Weight trend
          </p>
          <span className="text-xs text-charcoal-faint">7 days</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-charcoal">{weight.current} kg</p>
            <p className="text-xs text-charcoal-faint">
              {weight.trend < 0 ? "↓" : "↑"} {Math.abs(weight.trend)} kg this week
            </p>
          </div>
          <Sparkline values={weight.history.map((h) => h.value)} color="#1B6B52" width={120} height={40} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
            TDEE estimate
          </p>
          <Sparkles size={14} className="text-sohati" />
        </div>
        <p className="text-2xl font-bold text-charcoal mb-1">{tdee.toLocaleString()} kcal</p>
        <p className="text-xs text-charcoal-faint mb-4">
          Estimated maintenance calories (Mifflin-St Jeor) — a prototype estimate, adjust as needed.
        </p>
        <Button size="sm" variant="secondary" onClick={applySuggested}>
          Use suggested target
        </Button>
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
              onClick={() => setNutritionGoal({ ...nutritionGoal, planType: p })}
            >
              {p === "custom" ? "Custom plan" : "Existing plan"}
            </Chip>
          ))}
        </div>
        {nutritionGoal.planType === "existing" && (
          <p className="text-xs text-charcoal-faint mt-3">
            Browse dietitian-built plans in Professionals — coming soon to this prototype.
          </p>
        )}
      </Card>
    </div>
  );
}
