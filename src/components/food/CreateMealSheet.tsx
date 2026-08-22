import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Search, Plus, X, UtensilsCrossed } from "lucide-react";
import { mockFoods } from "../../data/mockFoods";
import type { Food, CustomMealItem } from "../../types";
import { useApp } from "../../context/AppContext";
import { foodCategoryIcon } from "../../utils/icons";

// V4: Meal Prep reworked — "Create Meal" groups several existing food items
// under one title (e.g. eggs + tea + bread + cream cheese -> "Omelette
// Breakfast"); logging that title later logs every item individually.
// Inspired by MyNetDiary's approach, not copied.
export const CreateMealSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { customFoods, addCustomMeal } = useApp();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CustomMealItem[]>([]);
  const [title, setTitle] = useState("");

  const allFoods = useMemo(() => [...customFoods, ...mockFoods], [customFoods]);
  const filtered = useMemo(
    () => (query.trim() ? allFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())) : []),
    [allFoods, query]
  );

  const reset = () => {
    setQuery("");
    setItems([]);
    setTitle("");
  };

  const addItem = (food: Food) => {
    if (items.some((i) => i.food.id === food.id)) return;
    setItems((prev) => [...prev, { food, quantity: 1 }]);
    setQuery("");
  };
  const removeItem = (foodId: string) => setItems((prev) => prev.filter((i) => i.food.id !== foodId));

  const save = () => {
    if (!title.trim() || items.length === 0) return;
    addCustomMeal(title, items);
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
          <div className="relative mb-2.5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a food to add…"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </div>
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
