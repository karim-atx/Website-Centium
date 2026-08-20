import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Search } from "lucide-react";
import { mockFoods } from "../../data/mockFoods";
import type { Food, MealType } from "../../types";
import { useApp } from "../../context/AppContext";

export const MealPrepPicker: React.FC<{
  open: boolean;
  onClose: () => void;
  meal: MealType;
}> = ({ open, onClose, meal }) => {
  const { addMealPrepItem } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(1);

  const filtered = useMemo(
    () => mockFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const reset = () => {
    setQuery("");
    setSelected(null);
    setQuantity(1);
  };

  const handleAdd = () => {
    if (!selected) return;
    addMealPrepItem(meal, selected, quantity);
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
      title="Plan a food"
    >
      {!selected ? (
        <div className="animate-fade-slide-up">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods to plan…"
              className="w-full rounded-2xl bg-cream-soft pl-10 pr-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar">
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="tap w-full flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-cream-soft text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{f.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{f.name}</p>
                    <p className="text-[11px] text-charcoal-faint">{f.serving}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-charcoal-soft">{f.calories} kcal</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">{selected.emoji}</span>
            <div>
              <p className="font-display font-semibold text-lg text-charcoal">{selected.name}</p>
              <p className="text-xs text-charcoal-faint">{selected.serving}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-6">
            <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="tap w-8 h-8 rounded-full bg-cream-card shadow-soft text-charcoal"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-charcoal">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="tap w-8 h-8 rounded-full bg-cream-card shadow-soft text-charcoal"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button fullWidth onClick={handleAdd}>
              Add to plan
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
