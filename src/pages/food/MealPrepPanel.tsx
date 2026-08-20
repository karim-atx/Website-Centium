import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { mealOrder, mealLabels } from "../../services/nutrition";
import { MealPrepPicker } from "../../components/food/MealPrepPicker";
import type { MealType } from "../../types";
import { Plus, X, ClipboardList } from "lucide-react";

export default function MealPrepPanel() {
  const { mealPrepPlan, removeMealPrepItem } = useApp();
  const [pickerMeal, setPickerMeal] = useState<MealType | null>(null);

  const totalPlanned = mealOrder.reduce((sum, m) => sum + mealPrepPlan[m].length, 0);
  const totalCalories = mealOrder.reduce(
    (sum, m) => sum + mealPrepPlan[m].reduce((s, i) => s + i.food.calories * i.quantity, 0),
    0
  );

  return (
    <div className="space-y-5 animate-fade-slide-up">
      <Card className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-sohati" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">Meal Prep</p>
          <p className="text-xs text-charcoal-faint">
            {totalPlanned} foods planned · {Math.round(totalCalories).toLocaleString()} kcal total
          </p>
        </div>
      </Card>

      {mealOrder.map((meal) => {
        const items = mealPrepPlan[meal];
        const cal = items.reduce((s, i) => s + i.food.calories * i.quantity, 0);
        return (
          <div key={meal}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-base font-semibold text-charcoal">
                {mealLabels[meal]}
              </h3>
              {items.length > 0 && <span className="text-xs text-charcoal-faint">{Math.round(cal)} kcal</span>}
            </div>
            <Card padded={false} className="divide-y divide-charcoal/[0.04]">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.food.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{item.food.name}</p>
                      <p className="text-[11px] text-charcoal-faint">
                        {item.quantity !== 1 ? `${item.quantity} × ` : ""}
                        {item.food.serving}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-charcoal-soft">
                      {Math.round(item.food.calories * item.quantity)} kcal
                    </span>
                    <button
                      onClick={() => removeMealPrepItem(meal, item.id)}
                      className="tap w-6 h-6 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setPickerMeal(meal)}
                className="tap w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-sohati hover:bg-sohati-pale/40"
              >
                <Plus size={13} /> Plan food for {mealLabels[meal].toLowerCase()}
              </button>
            </Card>
          </div>
        );
      })}

      <p className="text-xs text-charcoal-faint text-center">
        Planned meals don't log automatically — add them from your diary on the day you eat them.
      </p>

      {pickerMeal && (
        <MealPrepPicker open={!!pickerMeal} onClose={() => setPickerMeal(null)} meal={pickerMeal} />
      )}
    </div>
  );
}
