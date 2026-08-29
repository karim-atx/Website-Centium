import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { Plus, X, ClipboardList, UtensilsCrossed, Pencil } from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";
import { entryMultiplier } from "../../services/nutrition";
import type { CustomMeal } from "../../types";

// V4: Meal Prep reworked from a per-meal-type planner into "Create Meal" —
// group existing food items under one title; searching that title from Add
// Food logs every item individually. Inspired by MyNetDiary, not copied.
export default function MealPrepPanel() {
  const { customMeals, removeCustomMeal } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  // V10 (QA 10.0): "Creating a meal prep should also allow you to edit and delete it."
  const [editingMeal, setEditingMeal] = useState<CustomMeal | null>(null);

  return (
    <div className="space-y-5 animate-fade-slide-up">
      <Card className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-charcoal">Custom Meals</p>
          <p className="text-xs text-charcoal-faint">
            Group foods you eat together, then log the whole meal by name from Add Food.
          </p>
        </div>
      </Card>

      <div className="space-y-2.5">
        {customMeals.map((m) => {
          const totalCal = Math.round(m.items.reduce((s, i) => s + i.food.calories * entryMultiplier(i), 0));
          return (
            <Card key={m.id} padded={false}>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-charcoal">{m.title}</p>
                  <p className="text-[11px] text-charcoal-faint">
                    {m.items.length} item{m.items.length !== 1 ? "s" : ""} · {totalCal} kcal total
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingMeal(m)}
                    className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                    aria-label={`Edit ${m.title}`}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => removeCustomMeal(m.id)}
                    className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint"
                    aria-label={`Remove ${m.title}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
                {m.items.map((i) => {
                  const Icon = foodCategoryIcon[i.food.category] ?? UtensilsCrossed;
                  return (
                    <span
                      key={i.food.id}
                      className="flex items-center gap-1 text-[11px] font-medium text-charcoal-soft bg-cream-soft rounded-full px-2 py-1"
                    >
                      <Icon size={11} /> {i.food.name}
                    </span>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {customMeals.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No custom meals yet — create your first one.</p>
          </Card>
        )}
      </div>

      <Button variant="outline" fullWidth onClick={() => setCreateOpen(true)}>
        <Plus size={15} /> Create Meal
      </Button>

      <CreateMealSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <CreateMealSheet open={!!editingMeal} onClose={() => setEditingMeal(null)} editMeal={editingMeal} />
    </div>
  );
}
