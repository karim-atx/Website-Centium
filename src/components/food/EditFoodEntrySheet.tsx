import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { FoodLogEntry, ServingUnit } from "../../types";
import { Minus, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";

const servingUnitOptions: { value: ServingUnit; label: string }[] = [
  { value: "serving", label: "serving" },
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
];

// V4: "Logged foods should be editable, to be able to change quantities or
// adjust when needed" — tapping a diary entry opens this instead of only
// being able to add more.
export const EditFoodEntrySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  entry: FoodLogEntry | null;
}> = ({ open, onClose, entry }) => {
  const { updateFoodEntry, removeFoodEntry } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<ServingUnit>("serving");

  useEffect(() => {
    if (entry) {
      setQuantity(entry.quantity);
      setUnit(entry.unit ?? "serving");
    }
  }, [entry]);

  if (!entry) return null;
  const Icon = foodCategoryIcon[entry.food.category] ?? UtensilsCrossed;

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Logged Food">
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
            <Icon size={19} className="text-sohati-dark" />
          </span>
          <div>
            <p className="font-display font-semibold text-lg text-charcoal">{entry.food.name}</p>
            <p className="text-xs text-charcoal-faint">{entry.food.serving}</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-3">
          <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, +(q - 1).toFixed(1)))}
              className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold text-charcoal">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => +(q + 1).toFixed(1))}
              className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Unit</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {servingUnitOptions.map((u) => (
            <button
              key={u.value}
              onClick={() => setUnit(u.value)}
              className={`tap rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors ${
                unit === u.value ? "bg-sohati text-white border-sohati" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={() => {
              removeFoodEntry(entry.id);
              onClose();
            }}
            className="!border-ember/30 !text-ember-dark"
          >
            <Trash2 size={15} />
          </Button>
          <Button
            fullWidth
            onClick={() => {
              updateFoodEntry(entry.id, { quantity, unit });
              onClose();
            }}
          >
            Save changes
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
