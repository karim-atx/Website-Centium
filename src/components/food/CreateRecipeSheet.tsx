import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Search, Plus, X, UtensilsCrossed, Minus } from "lucide-react";
import { mockFoods } from "../../data/mockFoods";
import type { Food, CustomFood, Recipe, RecipeItem, ServingUnit } from "../../types";
import { useApp } from "../../context/AppContext";
import { foodCategoryIcon } from "../../utils/icons";
import { MacroStrip, sumItems, divideTotals, PREP_LAV, type PrepItem } from "./mealPrepShared";

const EMPTY_FOODS: CustomFood[] = [];

const servingUnitOptions: ServingUnit[] = ["serving", "g", "ml", "cup", "tbsp", "tsp"];

// Mobile handoff item 10 — mirrors CreateMealSheet.tsx's structure exactly
// (same search+inline-custom-food-creation UI, same per-item quantity/unit
// controls), with the deltas the handoff calls out explicitly:
//   - No meal-type chips: a recipe's meal is chosen at LOG time (see the
//     Meal selector on MealPrepFlowSheet's detail screen), never stored here.
//   - "Number of servings" (required) replaces it, and an optional "Steps"
//     textarea is added after the ingredient list — field order here follows
//     CentiumMealPrep.dc.html's createScreen literally (name → servings →
//     ingredients → live macro strip → steps → Save), which differs slightly
//     from the README prose's "name → steps → ingredients" ordering; the
//     handoff's own instructions (CLAUDE.md) say the markup wins on conflict.
//   - Each ingredient also gets an optional free-text `note` (handoff Q3,
//     e.g. "400g dry"), alongside quantity+unit — RecipeItem carries it,
//     CustomMealItem does not.
//   - The live macro strip divides by the currently-typed servings count, so
//     it always reads PER SERVING and re-divides as that number changes.
//   - Editing shows Delete (README: "Editing also shows delete") — the old
//     per-card X button this replaced is gone now that the tab opens a List
//     screen instead of showing meals/recipes inline.
export const CreateRecipeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  clientId?: string;
  editRecipe?: Recipe | null;
}> = ({ open, onClose, clientId, editRecipe }) => {
  const {
    customFoods,
    clientCustomFoods,
    addRecipe,
    updateRecipe,
    removeRecipe,
    addClientCustomFood,
    addCustomFood,
    addClientRecipe,
    updateClientRecipe,
    removeClientRecipe,
  } = useApp();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RecipeItem[]>(editRecipe?.items ?? []);
  const [title, setTitle] = useState(editRecipe?.title ?? "");
  const [servings, setServings] = useState(editRecipe ? String(editRecipe.servings) : "4");
  const [steps, setSteps] = useState(editRecipe?.steps ?? "");
  const [creatingFood, setCreatingFood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [foodDraft, setFoodDraft] = useState({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });

  React.useEffect(() => {
    if (open) {
      setItems(editRecipe?.items ?? []);
      setTitle(editRecipe?.title ?? "");
      setServings(editRecipe ? String(editRecipe.servings) : "4");
      setSteps(editRecipe?.steps ?? "");
      setConfirmDelete(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editRecipe]);

  const ownFoods = clientId ? clientCustomFoods[clientId] ?? EMPTY_FOODS : customFoods;
  const allFoods = useMemo(() => [...ownFoods, ...mockFoods], [ownFoods]);
  const filtered = useMemo(
    () => (query.trim() ? allFoods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())) : []),
    [allFoods, query]
  );

  const servingsN = Math.max(1, Number(servings) || 1);
  const perServing = divideTotals(sumItems(items as PrepItem[]), servingsN);

  const reset = () => {
    setQuery("");
    setItems([]);
    setTitle("");
    setServings("4");
    setSteps("");
    setCreatingFood(false);
    setConfirmDelete(false);
    setFoodDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
  };

  const addItem = (food: Food) => {
    if (items.some((i) => i.food.id === food.id)) return;
    setItems((prev) => [...prev, { food, quantity: 1 }]);
    setQuery("");
  };
  const removeItem = (foodId: string) => setItems((prev) => prev.filter((i) => i.food.id !== foodId));
  const updateItemField = (foodId: string, patch: Partial<Pick<RecipeItem, "quantity" | "unit" | "note">>) =>
    setItems((prev) => prev.map((i) => (i.food.id === foodId ? { ...i, ...patch } : i)));
  const cycleUnit = (foodId: string, current: ServingUnit | undefined) => {
    const idx = servingUnitOptions.indexOf(current ?? "serving");
    const next = servingUnitOptions[(idx + 1) % servingUnitOptions.length];
    updateItemField(foodId, { unit: next });
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
    addItem(food);
    setCreatingFood(false);
    setFoodDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
  };

  const save = async () => {
    if (!title.trim() || items.length === 0 || saving) return;
    setSaveError(null);

    if (clientId) {
      if (editRecipe) updateClientRecipe(clientId, editRecipe.id, title, items, servingsN, steps || undefined);
      else addClientRecipe(clientId, title, items, servingsN, steps || undefined);
    } else {
      setSaving(true);
      const message = editRecipe
        ? await updateRecipe(editRecipe.id, title, items, servingsN, steps || undefined)
        : await addRecipe(title, items, servingsN, steps || undefined);
      setSaving(false);
      if (message) {
        setSaveError(message);
        return;
      }
    }
    reset();
    onClose();
  };

  const doDelete = async () => {
    if (!editRecipe) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (clientId) removeClientRecipe(clientId, editRecipe.id);
    else await removeRecipe(editRecipe.id);
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
      title={editRecipe ? "Edit Recipe" : "Create Recipe"}
    >
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Recipe name</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lentil Mujaddara"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Number of servings</span>
          <input
            value={servings}
            onChange={(e) => setServings(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="4"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {items.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
              Ingredients ({items.length})
            </span>
            <div className="space-y-1.5">
              {items.map((i) => {
                const Icon = foodCategoryIcon[i.food.category] ?? UtensilsCrossed;
                return (
                  <div key={i.food.id} className="bg-cream-soft rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className="text-primary-dark shrink-0" />
                        <span className="text-sm font-medium text-charcoal truncate">{i.food.name}</span>
                      </div>
                      <button onClick={() => removeItem(i.food.id)} className="tap text-charcoal-faint shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pl-[26px]">
                      <button
                        onClick={() => updateItemField(i.food.id, { quantity: Math.max(0.1, +(i.quantity - 1).toFixed(1)) })}
                        className="tap w-6 h-6 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft shrink-0"
                        aria-label={`Decrease ${i.food.name} quantity`}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-semibold text-charcoal w-6 text-center tabular-nums">{i.quantity}</span>
                      <button
                        onClick={() => updateItemField(i.food.id, { quantity: +(i.quantity + 1).toFixed(1) })}
                        className="tap w-6 h-6 rounded-full bg-cream-card flex items-center justify-center text-charcoal-soft shrink-0"
                        aria-label={`Increase ${i.food.name} quantity`}
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        onClick={() => cycleUnit(i.food.id, i.unit)}
                        className="tap text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1"
                      >
                        {i.unit ?? "serving"}
                      </button>
                    </div>
                    {/* Handoff Q3: free-text alongside quantity+unit, e.g. "400g dry". */}
                    <div className="pl-[26px] mt-1.5">
                      <input
                        value={i.note ?? ""}
                        onChange={(e) => updateItemField(i.food.id, { note: e.target.value })}
                        placeholder="Note, e.g. 400g dry"
                        className="w-full rounded-lg bg-cream-card border border-charcoal/10 px-2.5 py-1.5 text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Add ingredients</span>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a food to add…"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setCreatingFood((v) => !v)}
              aria-label={clientId ? "Create a new food for this client" : "Create a new food"}
              title={clientId ? "Create a new food for this client" : "Create a new food"}
              className={`tap w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                creatingFood ? "bg-primary text-white border-primary" : "bg-cream-soft border-charcoal/10 text-charcoal-soft"
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
                className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                value={foodDraft.serving}
                onChange={(e) => setFoodDraft((d) => ({ ...d, serving: e.target.value }))}
                placeholder="Serving size"
                className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="grid grid-cols-4 gap-1.5">
                {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                  <input
                    key={k}
                    value={foodDraft[k]}
                    onChange={(e) => setFoodDraft((d) => ({ ...d, [k]: e.target.value.replace(/[^\d.]/g, "") }))}
                    placeholder={k === "calories" ? "kcal" : k}
                    inputMode="decimal"
                    className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-2 py-2 text-xs text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ))}
              </div>
              <Button fullWidth size="sm" onClick={saveFood} disabled={!foodDraft.name.trim() || !foodDraft.calories}>
                Add to recipe
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
                  className="tap w-full flex items-center justify-between rounded-xl px-3 py-2 bg-primary-pale/60 hover:bg-primary-pale text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-charcoal">{f.name}</span>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Plus size={12} /> Add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <MacroStrip t={perServing} note={`Per serving ÷ ${servingsN}, updating as ingredients are added.`} />
        )}

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Steps (optional)</span>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={3}
            placeholder="Fry the onions until deep brown…"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </label>

        {saveError && (
          <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-3">{saveError}</p>
        )}
        <Button
          fullWidth
          size="lg"
          onClick={() => void save()}
          disabled={!title.trim() || items.length === 0 || saving}
          style={{ background: PREP_LAV.cta }}
        >
          {saving ? "Saving…" : editRecipe ? "Save changes" : "Save recipe"}
        </Button>
        <p className="text-[11px] text-charcoal-faint text-center">
          {`Search "${title || "this recipe's title"}" from the Recipes detail screen to log it.`}
        </p>

        {editRecipe && (
          <button
            onClick={() => void doDelete()}
            className="tap w-full text-center text-xs font-semibold text-status-high py-2"
          >
            {confirmDelete ? "Tap again to delete this recipe" : "Delete recipe"}
          </button>
        )}
      </div>
    </BottomSheet>
  );
};
