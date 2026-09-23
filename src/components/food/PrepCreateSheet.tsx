import React, { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { sheetChipStyle } from "../ui/sheetChip";
import { useApp } from "../../context/AppContext";
import type { CustomMeal, Food, MealType, Recipe, ServingUnit } from "../../types";
import { searchFoods, listFoods, isUuid, type FoodSearchResult } from "../../services/food";
import {
  MacroStrip,
  sumItems,
  divideTotals,
  PREP_CHARCOAL,
  PREP_FAINT,
  PREP_MEAL_ORDER,
  prepMealLabel,
  capsLabelStyle,
  type PrepItem,
} from "./mealPrepShared";
import type { PrepKind } from "./MealPrepFlowSheet";

const servingUnitOptions: ServingUnit[] = ["serving", "g", "ml", "cup", "tbsp", "tsp"];

// Grey sheet container (00-FOUNDATIONS §0.3).
const containerStyle: React.CSSProperties = { background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" };
const fieldStyle: React.CSSProperties = {
  background: "#F4F4F6",
  border: "none",
  borderRadius: 14,
  padding: "11px 14px",
  fontSize: 14,
  color: PREP_CHARCOAL,
  width: "100%",
};
const labelClass = "block text-[12px] font-semibold text-charcoal-soft mb-1.5";

const toFood = (r: FoodSearchResult): Food => ({
  id: r.id,
  name: r.name,
  nameAr: r.nameAr ?? undefined,
  category: r.category,
  serving: r.servingLabel,
  calories: r.calories,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  isLebanese: r.isLebanese,
});

/**
 * Master handover item 11: Create / edit for Custom Meals and Recipes, one
 * screen for both. Name (and, for recipes, servings), the ingredients in a
 * grey container whose "Add food" opens the same food search Add Food uses
 * (real catalog plus the user's own foods, as a step inside this sheet), a
 * live macro strip (recipes per serving, re-dividing as servings change),
 * recipe steps, and Save plus — when editing — the destructive button (two
 * taps: the first arms it).
 *
 * With `clientId` (the professional meal-plan builder, meals only) the same
 * screen works on that client's plan: the search offers the catalog plus the
 * client's own foods, an inline food is saved to the client's food database,
 * and saving/deleting uses the client-meal actions.
 */
export const PrepCreateSheet: React.FC<{
  kind: PrepKind;
  open: boolean;
  onClose: () => void;
  editMeal?: CustomMeal | null;
  editRecipe?: Recipe | null;
  /** True when opened from the flow's List or Detail: the back chevron returns there. */
  hasPrevious?: boolean;
  /** Professional meal-plan builder: the client whose plan this meal belongs to. */
  clientId?: string;
}> = ({ kind, open, onClose, editMeal, editRecipe, hasPrevious, clientId }) => {
  const isR = kind === "recipes";
  const editing = isR ? editRecipe ?? null : editMeal ?? null;
  const {
    addCustomMeal,
    updateCustomMeal,
    removeCustomMeal,
    addRecipe,
    updateRecipe,
    removeRecipe,
    addCustomFood,
    clientCustomFoods,
    addClientCustomFood,
    addClientCustomMeal,
    updateClientCustomMeal,
    removeClientCustomMeal,
  } = useApp();

  const [step, setStep] = useState<"form" | "search">("form");
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("4");
  const [steps, setSteps] = useState("");
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [items, setItems] = useState<PrepItem[]>([]);
  const [qtyDrafts, setQtyDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Food search step.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creatingFood, setCreatingFood] = useState(false);
  const [foodDraft, setFoodDraft] = useState({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setTitle(editing?.title ?? "");
    setServings(isR ? String(editRecipe?.servings ?? 4) : "4");
    setSteps(isR ? editRecipe?.steps ?? "" : "");
    setMealType(!isR ? editMeal?.mealType ?? null : null);
    setItems(editing ? (editing.items as PrepItem[]) : []);
    setQtyDrafts({});
    setSaveError(null);
    setConfirmDelete(false);
    setQuery("");
    setCreatingFood(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMeal, editRecipe]);

  // Same service Add Food searches with; an empty box lists everything.
  useEffect(() => {
    if (!open || step !== "search") return;
    let cancelled = false;
    const term = query.trim();
    setSearching(true);
    const timer = window.setTimeout(
      () => {
        void (term ? searchFoods(term) : listFoods()).then((rows) => {
          if (cancelled) return;
          if (clientId) {
            // A client's plan: the catalog plus that client's own foods (not
            // the professional's personal ones).
            const own = (clientCustomFoods[clientId] ?? [])
              .filter((f) => !term || f.name.toLowerCase().includes(term.toLowerCase()))
              .map(
                (f): FoodSearchResult => ({
                  id: f.id,
                  source: "custom",
                  name: f.name,
                  nameAr: f.nameAr ?? null,
                  category: f.category,
                  servingLabel: f.serving,
                  calories: f.calories,
                  protein: f.protein,
                  carbs: f.carbs,
                  fat: f.fat,
                  isLebanese: false,
                  isVerified: false,
                  barcode: null,
                  overridesFoodId: null,
                })
              );
            setResults([...own, ...rows.filter((r) => r.source === "catalog")]);
          } else {
            setResults(rows);
          }
          setSearching(false);
        });
      },
      term ? 250 : 0
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, step, clientId, clientCustomFoods]);

  const servingsN = Math.max(1, Number(servings) || 1);
  const total = useMemo(() => sumItems(items), [items]);
  const strip = isR ? divideTotals(total, servingsN) : total;

  const addFood = (food: Food, source?: "catalog" | "custom") => {
    if (!items.some((i) => i.food.id === food.id)) {
      setItems((prev) => [...prev, { food, quantity: 1, unit: "serving", ...(source ? { source } : {}) }]);
    }
    setQuery("");
    setCreatingFood(false);
    setStep("form");
  };
  const patchItem = (index: number, patch: Partial<PrepItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setQtyDrafts({});
  };
  const typeQuantity = (index: number, raw: string) => {
    const v = raw.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");
    setQtyDrafts((prev) => ({ ...prev, [index]: v }));
    const n = Number(v);
    if (v && !Number.isNaN(n) && n > 0) patchItem(index, { quantity: n });
  };

  const saveFood = async () => {
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
    const food = clientId ? addClientCustomFood(clientId, payload) : await addCustomFood(payload);
    // A food saved to the database is a custom_foods row; one kept local only
    // (signed out, or the write failed) has no row to point at yet.
    addFood(food, isUuid(food.id) ? "custom" : undefined);
    setFoodDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
  };

  const close = () => {
    setStep("form");
    onClose();
  };

  const save = async () => {
    if (!title.trim() || items.length === 0 || saving) return;
    if (clientId && !isR) {
      // Client plans are local to the professional's workspace; these writes can't fail.
      if (editMeal) updateClientCustomMeal(clientId, editMeal.id, title, items, mealType ?? undefined);
      else addClientCustomMeal(clientId, title, items, mealType ?? undefined);
      close();
      return;
    }
    setSaving(true);
    setSaveError(null);
    const message = isR
      ? editRecipe
        ? await updateRecipe(editRecipe.id, title, items, servingsN, steps.trim() || undefined)
        : await addRecipe(title, items, servingsN, steps.trim() || undefined)
      : editMeal
        ? await updateCustomMeal(editMeal.id, title, items, mealType ?? undefined)
        : await addCustomMeal(title, items, mealType ?? undefined);
    setSaving(false);
    if (message) {
      setSaveError(message);
      return;
    }
    close();
  };

  const doDelete = async () => {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (clientId && !isR) removeClientCustomMeal(clientId, editing.id);
    else if (isR) await removeRecipe(editing.id);
    else await removeCustomMeal(editing.id);
    close();
  };

  const title_ = editing ? (isR ? "Edit Recipe" : "Edit Meal") : isR ? "Create Recipe" : "Create Meal";

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={step === "search" ? "Add food" : title_}
      onBack={step === "search" ? () => setStep("form") : hasPrevious ? close : undefined}
    >
      {step === "search" ? (
        <div className="flex flex-col gap-2.5 animate-fade-slide-up">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, meals or ingredients…"
            className="focus:outline-none placeholder:text-charcoal-faint"
            style={fieldStyle}
          />
          {searching ? (
            <p className="text-center text-[13px] py-4" style={{ color: PREP_FAINT }}>
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="text-center text-[13px] py-4" style={{ color: PREP_FAINT }}>
              {query.trim() ? "Nothing matches that search." : "No foods yet."}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {results.map((r) => {
                const added = items.some((i) => i.food.id === r.id);
                return (
                  <button
                    key={`${r.source}-${r.id}`}
                    onClick={() => addFood(toFood(r), r.source === "catalog" ? "catalog" : "custom")}
                    disabled={added}
                    className="tap w-full flex items-center justify-between gap-2.5 rounded-[12px] bg-white text-left disabled:opacity-40"
                    style={{ border: "1px solid rgba(36,31,27,0.1)", padding: "11px 12px" }}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold truncate" style={{ color: PREP_CHARCOAL }}>
                        {r.name}
                      </span>
                      <span className="block text-[11px]" style={{ color: PREP_FAINT }}>
                        {r.servingLabel}
                      </span>
                    </span>
                    <span className="flex-none text-[12px] font-semibold tabular-nums" style={{ color: PREP_FAINT }}>
                      {Math.round(r.calories)} kcal
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Kept from the previous builder: create a food inline when it
              isn't in the catalog yet. */}
          <button
            onClick={() => setCreatingFood((v) => !v)}
            className="tap self-start flex items-center gap-1 text-[12.5px] font-bold text-primary-deep-text mt-1"
          >
            <Plus size={13} /> Create a new food
          </button>
          {creatingFood && (
            <div className="flex flex-col gap-2" style={containerStyle}>
              {clientId && (
                <p className="text-[11px] text-charcoal-faint">
                  Saved only to this client's own food database — not your personal foods.
                </p>
              )}
              <input
                value={foodDraft.name}
                onChange={(e) => setFoodDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Food name"
                className="w-full rounded-[10px] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
              <input
                value={foodDraft.serving}
                onChange={(e) => setFoodDraft((d) => ({ ...d, serving: e.target.value }))}
                placeholder="Serving size"
                className="w-full rounded-[10px] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                  <input
                    key={k}
                    value={foodDraft[k]}
                    onChange={(e) =>
                      setFoodDraft((d) => ({ ...d, [k]: e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "") }))
                    }
                    placeholder={k === "calories" ? "kcal" : k}
                    inputMode="decimal"
                    className="w-full rounded-[10px] bg-white px-2 py-2 text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none"
                  />
                ))}
              </div>
              <button
                onClick={() => void saveFood()}
                disabled={!foodDraft.name.trim() || !foodDraft.calories}
                className="tap h-10 rounded-[12px] text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: "#A198DF" }}
              >
                Add to {isR ? "recipe" : "meal"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 animate-fade-slide-up">
          <label className="block">
            <span className={labelClass}>{isR ? "Recipe name" : "Meal name"}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isR ? "Lentil Mujaddara" : "Post-workout bowl"}
              className="focus:outline-none placeholder:text-charcoal-faint"
              style={fieldStyle}
            />
          </label>

          {isR && (
            <label className="block">
              <span className={labelClass}>Number of servings</span>
              <input
                value={servings}
                onChange={(e) => setServings(e.target.value.replace(/\D/g, ""))}
                onBlur={() => setServings(String(servingsN))}
                inputMode="numeric"
                className="focus:outline-none"
                style={fieldStyle}
              />
            </label>
          )}

          {/* Q1: custom meals keep their stored meal type; the detail screen
              pre-selects it at log time. */}
          {!isR && (
            <div style={containerStyle}>
              <p style={capsLabelStyle(PREP_FAINT)}>Meal</p>
              <div className="flex" style={{ gap: 6, marginTop: 9 }}>
                {PREP_MEAL_ORDER.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMealType((prev) => (prev === m ? null : m))}
                    className="tap transition-colors"
                    style={{ ...sheetChipStyle(mealType === m), flex: 1, minWidth: 0, padding: "8px 4px" }}
                  >
                    {prepMealLabel(m)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={containerStyle}>
            <div className="flex items-center justify-between">
              <p style={capsLabelStyle(PREP_FAINT)}>Ingredients</p>
              <button onClick={() => setStep("search")} className="tap flex items-center gap-1 text-[12.5px] font-bold text-primary-deep-text">
                <Plus size={13} /> Add food
              </button>
            </div>
            {items.length === 0 ? (
              <p className="mt-2 text-[12.5px]" style={{ color: PREP_FAINT }}>
                No foods added yet.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {items.map((it, i) => (
                  <div key={`${it.food.id}-${i}`} className="bg-white rounded-[10px]" style={{ padding: "9px 10px" }}>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 text-[13px] font-semibold truncate" style={{ color: PREP_CHARCOAL }}>
                        {it.food.name}
                      </span>
                      <button onClick={() => removeItem(i)} aria-label={`Remove ${it.food.name}`} className="tap shrink-0 text-charcoal-faint">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        value={qtyDrafts[i] ?? String(it.quantity)}
                        onChange={(e) => typeQuantity(i, e.target.value)}
                        onBlur={() => setQtyDrafts((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        })}
                        inputMode="decimal"
                        aria-label={`${it.food.name} quantity`}
                        className="w-14 shrink-0 text-center focus:outline-none"
                        style={{ background: "#F4F4F6", border: "none", borderRadius: 8, padding: "6px 8px", fontSize: 13.5, fontWeight: 700, color: PREP_CHARCOAL }}
                      />
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                        {servingUnitOptions.map((u) => (
                          <button
                            key={u}
                            onClick={() => patchItem(i, { unit: u })}
                            className="tap"
                            style={{ ...sheetChipStyle((it.unit ?? "serving") === u), padding: "5px 10px", fontSize: 12 }}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isR && (
                      <input
                        value={it.note ?? ""}
                        onChange={(e) => patchItem(i, { note: e.target.value })}
                        placeholder="Note, e.g. 400g dry"
                        className="w-full mt-1.5 rounded-[8px] px-2.5 py-1.5 text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none"
                        style={{ background: "#F4F4F6" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <MacroStrip
            t={strip}
            note={isR ? "Per serving, updating as ingredients are added." : "Whole meal, updating as foods are added."}
          />

          {isR && (
            <label className="block">
              <span className={labelClass}>Steps (optional)</span>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={3}
                placeholder="Fry the onions until deep brown…"
                className="focus:outline-none placeholder:text-charcoal-faint resize-none"
                style={fieldStyle}
              />
            </label>
          )}

          {saveError && <p className="text-[12px] font-semibold text-status-high">{saveError}</p>}

          <div className="flex" style={{ gap: 10 }}>
            {editing && (
              <button
                onClick={() => void doDelete()}
                aria-label={isR ? "Delete recipe" : "Delete meal"}
                title={isR ? "Delete recipe" : "Delete meal"}
                className="tap shrink-0 flex items-center justify-center"
                style={{ width: 60, height: 52, borderRadius: 14, background: "#FCEDEC", border: "1px solid #F2CFCC" }}
              >
                <Trash2 size={19} style={{ color: "#B4372C" }} />
              </button>
            )}
            <button
              onClick={() => void save()}
              disabled={!title.trim() || items.length === 0 || saving}
              className="tap flex-1 disabled:opacity-40 disabled:pointer-events-none"
              style={{ height: 52, borderRadius: 14, border: "none", background: "#A198DF", color: "#FFFFFF", fontSize: 15.5, fontWeight: 700 }}
            >
              {saving ? "Saving…" : editing ? "Save changes" : isR ? "Save recipe" : "Save meal"}
            </button>
          </div>
          {confirmDelete && (
            <p className="text-[12px] font-semibold text-status-high text-center">
              Tap again to delete this {isR ? "recipe" : "meal"}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
};
