import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { ProgressRing } from "../ui/ProgressRing";
import { ProgressBar } from "../ui/ProgressBar";
import type { NutritionTotals } from "../../services/nutrition";
import { dailyTargets } from "../../services/nutrition";
import { ChevronRight } from "lucide-react";

export const NutritionCard: React.FC<{ totals: NutritionTotals }> = ({ totals }) => {
  const navigate = useNavigate();
  const kcalProgress = totals.calories / dailyTargets.calories;
  const remaining = Math.max(dailyTargets.calories - Math.round(totals.calories), 0);

  const macro = (label: string, value: number, target: number, color: string) => (
    <div className="flex-1">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold text-charcoal-soft">{label}</span>
        <span className="text-xs text-charcoal-faint">
          {Math.round(value)}/{target}g
        </span>
      </div>
      <ProgressBar progress={value / target} color={color} height={6} />
    </div>
  );

  return (
    <Card interactive onClick={() => navigate("/food")} className="animate-fade-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-charcoal">Nutrition</h3>
        <ChevronRight size={18} className="text-charcoal-faint" />
      </div>
      <div className="flex items-center gap-5">
        <ProgressRing progress={kcalProgress} size={92} strokeWidth={9} color="#7D6BB5">
          <div className="text-center">
            <p className="text-lg font-bold text-charcoal leading-none">
              {Math.round(totals.calories).toLocaleString()}
            </p>
            <p className="text-[10px] text-charcoal-faint mt-1">of {dailyTargets.calories}</p>
          </div>
        </ProgressRing>
        <div className="flex-1 space-y-3">
          {macro("Protein", totals.protein, dailyTargets.protein, "#7D6BB5")}
          {macro("Carbs", totals.carbs, dailyTargets.carbs, "#D9A441")}
          {macro("Fat", totals.fat, dailyTargets.fat, "#6F9993")}
        </div>
      </div>
      <p className="text-xs text-charcoal-soft mt-4 bg-cream-soft rounded-xl px-3 py-2 inline-block">
        {remaining > 0 ? `${remaining.toLocaleString()} kcal away from today's target` : "Target reached for today 🎉"}
      </p>
    </Card>
  );
};
