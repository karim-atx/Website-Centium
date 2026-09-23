import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sheetChipStyle } from "../ui/sheetChip";
import { useApp } from "../../context/AppContext";
import type { FoodLogEntry, ServingUnit } from "../../types";
import { Trash2, UtensilsCrossed, SlidersHorizontal } from "lucide-react";
import { foodCategoryIcon } from "../../utils/icons";
import { updateDiaryEntry, deleteDiaryEntry, isRemoteEntryId } from "../../services/food";
import { rescaleEntry, servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { getFoodNutrientsById } from "../../services/food-nutrients";
import { NutrientDetailSections } from "./NutrientSections";

const servingUnitOptions: { value: ServingUnit; label: string }[] = [
  { value: "serving", label: "serving" },
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
];

// Caps label at the top of a grey sheet container (00-FOUNDATIONS §0.3).
const sheetCapsLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8C8378",
};

// V4: "Logged foods should be editable, to be able to change quantities or
// adjust when needed" — tapping a diary entry opens this instead of only
// being able to add more.
export const EditFoodEntrySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  entry: FoodLogEntry | null;
}> = ({ open, onClose, entry }) => {
  const { updateFoodEntry, removeFoodEntry, nutritionGoal } = useApp();
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
  // Which write `busy` is for: a delete must not show "Saving…" on Save.
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mobile handoff item 2, Edit Logged Food's entry point (frame `fd1a`):
  // same "Advanced" second step as AddFoodSheet, inside this sheet via
  // BottomSheet's onBack.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Fallback fetch ONLY for entries logged before the nutrients snapshot
  // existed (entry.nutrients undefined) that still have a real catalog
  // foodId. Scaled to the entry's OWN stored quantity/unit, matching
  // entry.calories/protein/etc; the nutrient step then rescales it to the
  // amount being edited (see detailTotals below).
  const [fallbackNutrients, setFallbackNutrients] = useState<Record<string, number> | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setQuantity(entry.quantity);
      setUnit(entry.unit ?? "serving");
      setError(null);
      setBusy(false);
      setDeleting(false);
      setAdvancedOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  useEffect(() => {
    if (!entry || entry.nutrients || !entry.foodId) {
      setFallbackNutrients(null);
      setFallbackLoading(false);
      return;
    }
    let cancelled = false;
    setFallbackLoading(true);
    void getFoodNutrientsById(entry.foodId).then((data) => {
      if (cancelled) return;
      setFallbackLoading(false);
      if (!data) {
        setFallbackNutrients(null);
        return;
      }
      const m = servingMultiplier(entry.display.serving, entry.quantity, entry.unit ?? "serving");
      setFallbackNutrients(Object.fromEntries(Object.entries(data).map(([key, amount]) => [key, amount * m])));
    });
    return () => {
      cancelled = true;
    };
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
    setDeleting(true);
    const result = await deleteDiaryEntry(entry.id);
    setBusy(false);
    setDeleting(false);
    if (!result.ok) {
      setError(result.message ?? "Could not delete that entry.");
      return;
    }
    removeFoodEntry(entry.id);
    onClose();
  };

  if (!entry) return null;
  const Icon = foodCategoryIcon[entry.display.category] ?? UtensilsCrossed;

  // Entry's own stored per-nutrient totals — entry.nutrients when this entry
  // carries a snapshot, else the scaled fallback fetch for older entries
  // that predate it. Never coerced to zero; null means genuinely no data.
  const nutrientsForAdvanced = entry.nutrients ?? fallbackNutrients;
  const targets = targetsFromGoal(nutritionGoal);
  const entryMultiplier = servingMultiplier(entry.display.serving, entry.quantity, entry.unit ?? "serving");
  // Macro strip preview for the quantity/unit being edited.
  const preview = rescaleEntry(entry, quantity, unit);
  // Mobile handoff item 4: the nutrient step follows the amount being
  // edited, not the amount logged — the stored snapshot is rescaled by the
  // same ratio rescaleEntry() applies to the macros. Calories and macros
  // always come from the entry; every other nutrient only from its profile.
  const editMultiplier = servingMultiplier(entry.display.serving, quantity, unit);
  const editMultiplierDisplay = Math.round(editMultiplier * 100) / 100;
  const k = entryMultiplier > 0 ? editMultiplier / entryMultiplier : 1;
  const detailTotals: Record<string, number> = {
    ...(nutrientsForAdvanced
      ? Object.fromEntries(Object.entries(nutrientsForAdvanced).map(([key, amount]) => [key, amount * k]))
      : {}),
    calories: preview.calories,
    protein: preview.protein,
    total_fat: preview.fat,
    total_carbohydrates: preview.carbs,
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={advancedOpen ? "Nutrient details" : "Edit Logged Food"}
      onBack={advancedOpen ? () => setAdvancedOpen(false) : undefined}
    >
      {advancedOpen ? (
        <div className="animate-fade-slide-up flex flex-col gap-2.5">
          <p style={{ fontSize: 13, color: "#5B5349", margin: "0 2px 2px" }}>
            {entry.name} ·{" "}
            {editMultiplierDisplay === 1 ? entry.display.serving : `${editMultiplierDisplay} × ${entry.display.serving}`}
          </p>

          {fallbackLoading ? (
            <p className="text-center text-sm text-charcoal-faint py-8">Loading nutrients…</p>
          ) : (
            <NutrientDetailSections
              totals={detailTotals}
              calorieTarget={targets.calories}
              proteinTarget={targets.protein}
              carbTarget={targets.carbs}
              fatTarget={targets.fat}
            />
          )}

          <p style={{ fontSize: 10.5, lineHeight: 1.5, color: "#8C8378", margin: "6px 2px 0" }}>
            % of the FDA Daily Value for adults, from this food alone. Calorie and macro percentages use your
            Goals.
          </p>
        </div>
      ) : (
        // Mobile handoff item 3: the Add Food detail step's controls, with the
        // markup's per-block margins (editLoggedBody): header 14, controls 10,
        // macro strip 16, then the delete / Save changes / Advanced row.
        <div className="animate-fade-slide-up">
          <div className="flex items-center" style={{ gap: 13, marginBottom: 14 }}>
            <span
              className="flex items-center justify-center shrink-0"
              style={{ width: 48, height: 48, borderRadius: 15, background: "#EFECFB", color: "#6B4BE0" }}
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: "#241F1B" }}>
                {entry.name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#8C8378" }}>{entry.display.serving}</p>
            </div>
          </div>

          <div
            className="flex items-center"
            style={{ gap: 12, background: "#F4F4F6", borderRadius: 16, padding: "13px 14px", marginBottom: 10 }}
          >
            <span style={{ flex: "none", fontSize: 14.5, fontWeight: 500, color: "#575863" }}>Quantity</span>
            <input
              value={quantityDraft}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");
                setQuantityDraft(v);
                const n = Number(v);
                if (v && !Number.isNaN(n) && n > 0) setQuantityRaw(n);
              }}
              onBlur={() => setQuantityDraft(String(quantity))}
              inputMode="decimal"
              className="min-w-0 text-center focus:outline-none"
              style={{ flex: 1, background: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, color: "#241F1B" }}
            />
          </div>

          <div style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 14px", marginBottom: 10 }}>
            <p style={sheetCapsLabelStyle}>UNIT</p>
            <div
              className="flex overflow-x-auto no-scrollbar"
              style={{ gap: 7, margin: "9px -14px 0", padding: "0 14px" }}
            >
              {servingUnitOptions.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setUnit(u.value)}
                  className="tap transition-colors"
                  style={sheetChipStyle(unit === u.value)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Same rescaleEntry() the save uses, so the preview can't disagree
              with what gets written. */}
          <div className="grid grid-cols-4" style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 0", marginBottom: 16 }}>
            {[
              { value: `${Math.round(preview.calories)}`, color: "#241F1B", caption: "kcal" },
              { value: `${Math.round(preview.protein * 10) / 10}g`, color: "#7D6BB5", caption: "protein" },
              { value: `${Math.round(preview.carbs)}g`, color: "#8175C2", caption: "carbs" },
              { value: `${Math.round(preview.fat * 10) / 10}g`, color: "#4274D7", caption: "fat" },
            ].map((cell, i) => (
              <div
                key={cell.caption}
                className="text-center"
                style={i > 0 ? { borderLeft: "1px solid #E2E3E7" } : undefined}
              >
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: cell.color }}>{cell.value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8C8378" }}>{cell.caption}</p>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs font-semibold text-status-high text-center" style={{ marginBottom: 10 }}>
              {error}
            </p>
          )}

          <div className="flex" style={{ gap: 10 }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              aria-label="Delete entry"
              title="Delete entry"
              className="tap shrink-0 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              style={{ width: 60, height: 52, borderRadius: 14, background: "#FCEDEC", border: "1px solid #F2CFCC", color: "#B4372C" }}
            >
              <Trash2 size={19} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="tap inline-flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: "#A198DF", color: "#FFFFFF", fontSize: 15.5, fontWeight: 700 }}
            >
              {busy && !deleting ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              aria-label="Nutrient details"
              title="Nutrient details"
              className="tap shrink-0 flex items-center justify-center"
              style={{ width: 60, height: 52, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: "#241F1B" }}
            >
              <SlidersHorizontal size={20} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
