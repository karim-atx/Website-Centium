import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { SheetField } from "../../../components/food/SheetField";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { useApp } from "../../../context/AppContext";
import { listFoods, searchFoods, type FoodSearchResult } from "../../../services/food";
import {
  FOOD_UNITS,
  PLAN_MEALS,
  draftError,
  mealName,
  unitWord,
  type ItemDraft,
  type ItemKind,
  type MealSlot,
} from "../../../services/premium/g4";
import { t, tx } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · adding to (or editing) a day and meal of the member's own meal
// plan: a recipe with its servings, a food or one of the member's own foods
// with an amount and unit (the app's food search, services/food), or a note.
// A refused save (ATXQ1 has already asked for the prompt) keeps everything
// that was entered; `locked` (a free member) shows the Premium label on Save.

type Tab = "recipe" | "food" | "note";
const TABS: Tab[] = ["recipe", "food", "note"];
const tabName = (k: Tab) => (k === "recipe" ? t("Recipe") : k === "food" ? t("Food") : t("Note"));
const tabOf = (k: ItemKind): Tab => (k === "custom_food" ? "food" : k);

export interface PlanItemSheetProps {
  open: boolean;
  /** Editing: the item's draft (its kind is fixed). Null to add. */
  initial: ItemDraft | null;
  /** The food's name when editing a food (the search shows it as chosen). */
  initialFoodName?: string | null;
  meal: MealSlot;
  dayLabel: string;
  locked: boolean;
  onClose: () => void;
  /** Saves; returns the sentence to show when it was refused, or null. */
  onSave: (draft: ItemDraft, meal: MealSlot) => Promise<string | null>;
}

export function PlanItemSheet(p: PlanItemSheetProps) {
  if (!p.open) return null;
  return <SheetBody {...p} />;
}

function SheetBody({ initial, initialFoodName, meal: meal0, dayLabel, locked, onClose, onSave }: PlanItemSheetProps) {
  const { recipes } = useApp();
  const [meal, setMeal] = useState<MealSlot>(meal0);
  const [tab, setTab] = useState<Tab>(initial ? tabOf(initial.kind) : "recipe");
  const [recipeId, setRecipeId] = useState<string | null>(initial?.kind === "recipe" ? initial.refId : null);
  const [servings, setServings] = useState(initial?.kind === "recipe" ? initial.servings : "1");
  const [food, setFood] = useState<{ id: string; kind: "food" | "custom_food"; name: string } | null>(
    initial && (initial.kind === "food" || initial.kind === "custom_food") && initial.refId ? { id: initial.refId, kind: initial.kind, name: initialFoodName ?? "" } : null
  );
  const [quantity, setQuantity] = useState(initial && (initial.kind === "food" || initial.kind === "custom_food") ? initial.quantity : "1");
  const [unit, setUnit] = useState(initial && (initial.kind === "food" || initial.kind === "custom_food") ? initial.unit : "serving");
  const [note, setNote] = useState(initial?.kind === "note" ? initial.note : "");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoodSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The app's food search: the browse list when the box is empty.
  useEffect(() => {
    if (tab !== "food") return;
    let live = true;
    const id = window.setTimeout(() => {
      const term = query.trim();
      void (term ? searchFoods(term).then((r) => r.foods) : listFoods()).then((foods) => live && setFound(foods.slice(0, 40)));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [tab, query]);

  const draft: ItemDraft =
    tab === "recipe" ? { kind: "recipe", refId: recipeId, servings } : tab === "note" ? { kind: "note", note } : { kind: food?.kind ?? "food", refId: food?.id ?? null, quantity, unit };

  const save = async () => {
    const bad = draftError(draft);
    if (bad) return setError(bad);
    setBusy(true);
    const refused = await onSave(draft, meal);
    setBusy(false);
    if (refused) setError(refused);
  };

  const chip = (on: boolean) =>
    `tap rounded-full px-3 py-1.5 text-[12px] font-bold border ${on ? "bg-primary-fill text-on-primary-fill border-transparent" : "bg-cream-card text-charcoal-soft border-charcoal/10"}`;
  const own = recipes;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={initial ? t("Edit") : t("Add to {day}", { day: dayLabel })}
      size="tall"
      footer={
        <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={() => void save()}>
          <span className="inline-flex items-center gap-2">
            {initial ? t("Save") : t("Add")}
            {locked && <PremiumLabel />}
          </span>
        </Button>
      }
    >
      <div data-g4="plan-item-sheet" className="pb-2">
        <p className="mb-2 text-[12px] font-semibold text-charcoal-soft">{t("Meal")}</p>
        <div role="radiogroup" aria-label={t("Meal")} className="flex flex-wrap gap-1.5">
          {PLAN_MEALS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={meal === m} onClick={() => setMeal(m)} className={chip(meal === m)}>
              {mealName(m)}
            </button>
          ))}
        </div>

        {!initial && (
          <div role="tablist" aria-label={t("What to add")} className="mt-4 flex gap-1 rounded-xl bg-cream-soft p-1">
            {TABS.map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => {
                  setTab(k);
                  setError(null);
                }}
                className={`tap flex-1 rounded-lg py-1.5 text-[12.5px] font-bold ${tab === k ? "bg-cream-card text-charcoal shadow-soft" : "text-charcoal-soft"}`}
              >
                {tabName(k)}
              </button>
            ))}
          </div>
        )}

        {tab === "recipe" && (
          <div className="mt-4">
            {own.length === 0 ? (
              <p className="text-[12.5px] text-charcoal-faint">{t("You have no recipes yet. Create one in Food › Custom › Recipes.")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {own.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={recipeId === r.id}
                      onClick={() => setRecipeId(r.id)}
                      className={`tap w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-start ${recipeId === r.id ? "bg-primary-pale" : "bg-cream-soft"}`}
                    >
                      <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold text-charcoal">{r.title}</span>
                      {recipeId === r.id && <Check size={15} aria-hidden className="shrink-0 text-primary-deep-text" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <SheetField label={t("Servings")} value={servings} onChange={setServings} placeholder="1" numeric />
            </div>
          </div>
        )}

        {tab === "food" && (
          <div className="mt-4">
            {food ? (
              <div className="flex items-center gap-2 rounded-xl bg-primary-pale px-3 py-2.5">
                <span className="flex-1 min-w-0 truncate text-[13.5px] font-semibold text-charcoal">{food.name}</span>
                {!initial && (
                  <button type="button" onClick={() => setFood(null)} className="tap text-[12px] font-bold text-primary-deep-text underline">
                    {t("Change")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 rounded-xl bg-cream-soft px-3 py-2">
                  <Search size={15} aria-hidden className="shrink-0 text-charcoal-faint" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("Search foods")}
                    aria-label={t("Search foods")}
                    className="w-full bg-transparent text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none"
                  />
                </label>
                <ul className="mt-2 flex max-h-[240px] flex-col gap-1 overflow-y-auto">
                  {found === null ? (
                    <li className="py-3 text-center text-[12.5px] text-charcoal-faint">{t("Loading…")}</li>
                  ) : found.length === 0 ? (
                    <li className="py-3 text-center text-[12.5px] text-charcoal-faint">{t("No foods found.")}</li>
                  ) : (
                    found.map((f) => (
                      <li key={`${f.source}:${f.id}`}>
                        <button
                          type="button"
                          onClick={() => setFood({ id: f.id, kind: f.source === "custom" ? "custom_food" : "food", name: f.name })}
                          className="tap w-full rounded-lg px-3 py-2 text-start text-[13.5px] text-charcoal hover:bg-cream-soft"
                        >
                          <span className="block truncate font-semibold">{f.name}</span>
                          <span className="block truncate text-[11.5px] text-charcoal-faint">{f.servingLabel}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
            <div className="mt-3">
              <SheetField label={tx("Amount", "food quantity")} value={quantity} onChange={setQuantity} placeholder="1" numeric />
            </div>
            <div role="radiogroup" aria-label={t("Unit")} className="mt-2 flex flex-wrap gap-1.5">
              {FOOD_UNITS.map((u) => (
                <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)} className={chip(unit === u)}>
                  {unitWord(u)}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "note" && (
          <div className="mt-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-charcoal-soft">{t("Note")}</span>
              <textarea
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("For example: eat out with friends")}
                className="w-full rounded-xl bg-cream-soft px-3 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-semibold text-status-high">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
