import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { FoodLogEntry, ServingUnit } from "../../types";
import { Minus, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";
import { updateDiaryEntry, deleteDiaryEntry, isRemoteEntryId } from "../../services/food";

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
  const [quantity, setQuantityRaw] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState("1");
  const setQuantity = (updater: number | ((q: number) => number)) => {
    setQuantityRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setQuantityDraft(String(next));
      return next;
    });
  };
  const [unit, setUnit] = useState<ServingUnit>("serving");
  // Writes go to the database first now, so they can fail and take time.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setQuantity(entry.quantity);
      setUnit(entry.unit ?? "serving");
      setError(null);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  /**
   * Saves the edit to food_log_entries, then mirrors it locally.
   *
   * The service rescales the snapshot with the same rescaleEntry() the local
   * updateFoodEntry uses, so the row and the local copy cannot drift apart.
   *
   * On failure the sheet stays open with the user's quantity and unit intact,
   * so retrying is one tap and nothing they typed is lost.
   */
  const handleSave = async () => {
    if (!entry || busy) return;
    setError(null);

    if (!isRemoteEntryId(entry.id)) {
      updateFoodEntry(entry.id, { quantity, unit });
      onClose();
      return;
    }

    setBusy(true);
    const result = await updateDiaryEntry(entry, quantity, unit);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Could not save that change.");
      return;
    }
    updateFoodEntry(entry.id, { quantity, unit });
    onClose();
  };

  /** Database first, like the diary's swipe-to-delete. Never optimistic. */
  const handleDelete = async () => {
    if (!entry || busy) return;
    setError(null);

    if (!isRemoteEntryId(entry.id)) {
      removeFoodEntry(entry.id);
      onClose();
      return;
    }

    setBusy(true);
    const result = await deleteDiaryEntry(entry.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Could not delete that entry.");
      return;
    }
    removeFoodEntry(entry.id);
    onClose();
  };

  if (!entry) return null;
  const Icon = foodCategoryIcon[entry.display.category] ?? UtensilsCrossed;

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit Logged Food">
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
            <Icon size={19} className="text-primary-dark" />
          </span>
          <div>
            <p className="font-display font-semibold text-lg text-charcoal">{entry.name}</p>
            <p className="text-xs text-charcoal-faint">{entry.display.serving}</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-3">
          <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(0.1, +(q - 1).toFixed(1)))}
              className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
            >
              <Minus size={14} />
            </button>
            <input
              value={quantityDraft}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                setQuantityDraft(v);
                const n = Number(v);
                if (v && !Number.isNaN(n) && n > 0) setQuantityRaw(n);
              }}
              onBlur={() => setQuantityDraft(String(quantity))}
              inputMode="decimal"
              className="w-14 text-center font-semibold text-charcoal bg-transparent focus:outline-none"
            />
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
                unit === u.value ? "bg-primary text-white border-primary" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs font-semibold text-status-high text-center mb-3">{error}</p>
        )}

        <div className="flex gap-2.5">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={busy}
            className="!border-teal/30 !text-teal-dark"
          >
            <Trash2 size={15} />
          </Button>
          <Button fullWidth onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
