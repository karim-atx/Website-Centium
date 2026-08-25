import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Search, Plus, X, UtensilsCrossed } from "lucide-react";
import { mockFoods } from "../../data/mockFoods";
import type { Food, CustomFood, CustomMealItem, MealType } from "../../types";
import { useApp } from "../../context/AppContext";
import { foodCategoryIcon } from "../../utils/icons";
import { mealOrder, mealLabels } from "../../services/nutrition";

const EMPTY_FOODS: CustomFood[] = [];

// V4: Meal Prep reworked — "Create Meal" groups several existing food items
// under one title (e.g. eggs + tea + bread + cream cheese -> "Omelette
// Breakfast"); logging that title later logs every item individually.
// Inspired by MyNetDiary's approach, not copied.
// V7 (QA 7.0): also used by the professional's Meal Plan Builder — passing
// `clientId` scopes food creation to that client's own food database
// instead of the account's personal custom foods, and a meal-type tag
// (breakfast/lunch/snack/dinner) can now be set on the plan itself.
export const CreateMealSheet: React.FC<{ open: boolean; onClose: () => void; clientId?: string }> = ({
  open,
  onClose,
  clientId,
}) => {
  const { customFoods, clientCustomFoods, addCustomMeal, addClientCustomFood, addCustomFood } = useApp();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CustomMealItem[]>([]);
  const [title, setTitle] = useState("");
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [creatingFood, setCreatingFood] = useState(false);
  const [foodDraft, setFoodDraft] = useState({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });

  const ownFoods = clientId ? clientCustomFoods[clientId] ?? EMPTY_FOODS : customFoods;
  const allFoods = useMemo(() => [...ownFoods, ...mockFoods], [ownFoods]);
  const filtered = useMemo(
    () => (query.trim() ? allFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())) : []),
    [allFoods, query]
  );

  const reset = () => {
    setQuery("");
    setItems([]);
    setTitle("");
    setMealType(null);
    setCreatingFood(false);
    setFoodDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
  };

  const addItem = (food: Food) => {
    if (items.some((i) => i.food.id === food.id)) return;
    setItems((prev) => [...prev, { food, quantity: 1 }]);
    setQuery("");
  };
  const removeItem = (foodId: string) => setItems((prev) => prev.filter((i) => i.food.id !== foodId));

  const saveFood = () => {
    if (!foodDraft.name.trim() || !foodDraft.calories) return;
    const payload = {
      name: foodDraft.name.trim(),
      category: "homemade" as Food["category"],
      serving: foodDraft.serving || "1 serving",
      calories: Number(foodDraft.calories) || 0,
      protein: Number(foodDraft.protein) || 0,
      carbs: Number(foodDraft.carbs) || 0,
      fat: Number(foodDraft.fat) || 0,
    };
    const food = clientId ? addClientCustomFood(clientId, payload) : addCustomFood(payload);
    addItem(food);
    setCreatingFood(false);
    setFoodDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
  };

  const save = () => {
    if (!title.trim() || items.length === 0) return;
    addCustomMeal(title, items, mealType ?? undefined);
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create Meal"
    >
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Meal title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Omelette Breakfast"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Meal type</span>
          <div className="grid grid-cols-4 gap-2">
            {mealOrder.map((m) => (
              <button
                key={m}
                onClick={() => setMealType((prev) => (prev === m ? null : m))}
                className={`tap rounded-xl py-2 text-xs font-semibold border transition-colors ${
                  mealType === m ? "bg-sohati text-white border-sohati" : "bg-cream-soft border-transparent text-charcoal-soft"
                }`}
              >
                {mealLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
              Items in this meal ({items.length})
            </span>
            <div className="space-y-1.5">
              {items.map((i) => {
                const Icon = foodCategoryIcon[i.food.category] ?? UtensilsCrossed;
                return (
                  <div key={i.food.id} className="flex items-center justify-between bg-cream-soft rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="text-sohati-dark shrink-0" />
                      <span className="text-sm font-medium text-charcoal truncate">{i.food.name}</span>
                    </div>
                    <button onClick={() => removeItem(i.food.id)} className="tap text-charcoal-faint shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Add food items</span>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a food to add…"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
            </div>
            <button
              onClick={() => setCreatingFood((v) => !v)}
              aria-label={clientId ? "Create a new food for this client" : "Create a new food"}
              title={clientId ? "Create a new food for this client" : "Create a new food"}
              className={`tap w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                creatingFood ? "bg-sohati text-white border-sohati" : "bg-cream-soft border-charcoal/10 text-charcoal-soft"
              }`}
            >
              <Plus size={16} />
            </button>
          </div>

          {creatingFood && (
            <div className="space-y-2.5 bg-cream-soft rounded-2xl p-3.5 mb-3">
              {clientId && (
                <p className="text-[11px] text-charcoal-faint">
                  Saved only to this client's own food database — not your personal foods.
                </p>
              )}
              <input
                value={foodDraft.name}
                onChange={(e) => setFoodDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Food name"
                className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
              <input
                value={foodDraft.serving}
                onChange={(e) => setFoodDraft((d) => ({ ...d, serving: e.target.value }))}
                placeholder="Serving size"
                className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                  <input
                    key={k}
                    value={foodDraft[k]}
                    onChange={(e) => setFoodDraft((d) => ({ ...d, [k]: e.target.value.replace(/[^\d.]/g, "") }))}
                    placeholder={k === "calories" ? "kcal" : k}
                    inputMode="decimal"
                    className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-2 py-2 text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
                  />
                ))}
              </div>
              <Button
                fullWidth
                size="sm"
                onClick={saveFood}
                disabled={!foodDraft.name.trim() || !foodDraft.calories}
              >
                Add to meal
              </Button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="space-y-1 max-h-[220px] overflow-y-auto no-scrollbar">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => addItem(f)}
                  disabled={items.some((i) => i.food.id === f.id)}
                  className="tap w-full flex items-center justify-between rounded-xl px-3 py-2 bg-sohati-pale/60 hover:bg-sohati-pale text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-charcoal">{f.name}</span>
                  <span className="text-xs font-semibold text-sohati flex items-center gap-1">
                    <Plus size={12} /> Add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button fullWidth size="lg" onClick={save} disabled={!title.trim() || items.length === 0}>
          Save meal
        </Button>
        <p className="text-[11px] text-charcoal-faint text-center">
          Search "{title || "this meal's title"}" from Add Food to log every item at once.
        </p>
      </div>
    </BottomSheet>
  );
};
