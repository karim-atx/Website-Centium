import React, { useState } from "react";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { ConfirmCard } from "../ui/ConfirmCard";
import { useCustomFoodForm } from "./useCustomFoodForm";
import { logoTone } from "./logoTones";
import { foodCategoryIcon } from "../../utils/icons";
import { deleteCustomFood, type FoodSearchResult } from "../../services/food";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { FOOD_DARK } from "./foodDark";

/** FO3.2: Custom Foods is Dark Lavender. */
const CUSTOM_FOOD_ACCENT = "rgb(var(--th-7d67d9))";

/**
 * Handover 2026-09-29 FO3.2: one custom food's popup. View mode shows it with
 * Edit in the footer (full width, the only action); Edit turns the SAME popup
 * into the Create Custom Food form (useCustomFoodForm), prefilled, titled
 * "Edit Custom Food", with delete / Save changes / adjust. Save returns to
 * view mode; the back chevron leaves edit mode without saving, asking first
 * if anything changed. Delete asks, then removes the food for good — the
 * shared barcode product it may be a version of is never touched.
 */
export const CustomFoodSheet: React.FC<{
  food: FoodSearchResult | null;
  /** Opened from a row's ⋮ Edit. */
  startEditing?: boolean;
  onClose: () => void;
  onSaved: (food: FoodSearchResult) => void;
  onDeleted: (id: string) => void;
}> = ({ food, startEditing = false, onClose, onSaved, onDeleted }) => {
  const { syncCustomFood, forgetCustomFood } = useApp();
  const dark = useIsDark();
  const [editing, setEditing] = useState(startEditing);
  const [shown, setShown] = useState(food);
  const [confirm, setConfirm] = useState<null | "delete" | "discard-back" | "discard-close">(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useCustomFoodForm({
    editing: shown,
    onSaved: (saved) => {
      setShown(saved);
      syncCustomFood({
        id: saved.id,
        name: saved.name,
        category: saved.category,
        serving: saved.servingLabel,
        calories: saved.calories,
        protein: saved.protein,
        carbs: saved.carbs,
        fat: saved.fat,
        logoTone: saved.logoTone,
        nutrients: saved.nutrients,
      });
      onSaved(saved);
      setEditing(false);
    },
    onDeleteRequest: () => setConfirm("delete"),
  });

  if (!shown) return null;
  const tone = logoTone(shown.logoTone, dark) ?? (dark ? { bg: FOOD_DARK.iconTile, fg: FOOD_DARK.lavInk } : { bg: "rgb(var(--th-efecf9))", fg: CUSTOM_FOOD_ACCENT });
  const Icon = foodCategoryIcon[shown.category] ?? UtensilsCrossed;

  const leaveEditing = () => (form.dirty ? setConfirm("discard-back") : setEditing(false));
  const close = () => (editing && form.dirty ? setConfirm("discard-close") : onClose());

  const doDelete = async () => {
    setBusy(true);
    setDeleteError(null);
    const result = await deleteCustomFood(shown.id);
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setDeleteError(result.message ?? "Couldn't delete that food.");
      return;
    }
    forgetCustomFood(shown.id);
    onDeleted(shown.id);
  };

  return (
    <>
      <BottomSheet
        open
        onClose={close}
        onBack={editing ? leaveEditing : undefined}
        title={editing ? "Edit Custom Food" : shown.name}
        size={editing ? "tall" : "default"}
        footerRule={editing}
        footer={
          editing ? (
            form.footer
          ) : (
            <button
              onClick={() => {
                form.reset();
                setEditing(true);
              }}
              className="tap w-full inline-flex items-center justify-center"
              style={{ height: 52, gap: 8, borderRadius: 16, background: CUSTOM_FOOD_ACCENT, color: "#FFFFFF", fontSize: 15.5, fontWeight: 700 }}
            >
              <Pencil size={16} /> Edit
            </button>
          )
        }
      >
        {editing ? (
          form.body
        ) : (
          <div className="animate-fade-slide-up">
            <div className="flex items-center" style={{ gap: 13 }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{ width: 46, height: 46, borderRadius: 14, background: tone.bg, color: tone.fg }}
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>
                  {shown.name}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgb(var(--c-charcoal-muted))" }}>{shown.servingLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-4" style={{ gap: 7, marginTop: 16 }}>
              {[
                [`${Math.round(shown.calories)}`, "kcal"],
                [`${Math.round(shown.protein)}g`, "Protein"],
                [`${Math.round(shown.carbs)}g`, "Carbs"],
                [`${Math.round(shown.fat)}g`, "Fat"],
              ].map(([v, l]) => (
                <div key={l} className="text-center" style={{ background: dark ? FOOD_DARK.box : "#F4F4F6", borderRadius: 12, padding: "10px 4px" }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{v}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgb(var(--c-charcoal-muted))" }}>{l}</p>
                </div>
              ))}
            </div>
            {shown.barcode && (
              <div
                className="flex items-center justify-between"
                style={{ marginTop: 10, background: dark ? FOOD_DARK.box : "#F4F4F6", borderRadius: 12, padding: "13px 14px", fontSize: 13.5 }}
              >
                <span style={{ color: dark ? FOOD_DARK.label : "#575863" }}>Barcode</span>
                <span style={{ color: "rgb(var(--c-charcoal))", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{shown.barcode}</span>
              </div>
            )}
            {deleteError && (
              <p className="text-xs font-semibold text-status-high" style={{ marginTop: 10 }}>
                {deleteError}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
      {form.scanner}

      <ConfirmCard
        open={confirm === "delete"}
        title={`Delete ${shown.name}?`}
        subtitle="It's removed from your foods and from any recipes and meals that use it. Past diary entries stay."
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void doDelete()}
      />
      <ConfirmCard
        open={confirm === "discard-back" || confirm === "discard-close"}
        title="Discard your changes?"
        subtitle="What you changed won't be saved."
        confirmLabel="Discard"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const closing = confirm === "discard-close";
          setConfirm(null);
          if (closing) onClose();
          else setEditing(false);
        }}
      />
    </>
  );
};
