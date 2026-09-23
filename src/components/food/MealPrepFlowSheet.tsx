import React, { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { CustomMeal, MealType, Recipe } from "../../types";
import { sumNutrientMaps, servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { getFoodNutrients } from "../../services/food-nutrients";
import { NutrientDetailSections } from "./NutrientSections";
import { sheetChipStyle } from "../ui/sheetChip";
import {
  MacroBar,
  MacroStrip,
  sumItems,
  divideTotals,
  PREP_TEAL,
  PREP_LAV,
  PREP_FAINT,
  PREP_SOFT,
  PREP_CHARCOAL,
  PREP_MEAL_ORDER,
  PREP_PRIMARY,
  prepMealLabel,
  type PrepItem,
} from "./mealPrepShared";

export type PrepKind = "meals" | "recipes";

// Grey sheet container (00-FOUNDATIONS §0.3).
const GREY_CONTAINER: React.CSSProperties = { background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" };

type Screen = "list" | "detail" | "advanced";

/**
 * List → Detail → (Advanced) for one card (Custom Meals or Recipes),
 * mirroring CentiumMealPrep.dc.html's `listScreen`/`detailScreen`/
 * `advancedScreen`. One BottomSheet, internal screen state — `onBack` steps
 * one level (detail → list, advanced → detail); the sheet's own X always
 * calls `onClose`, which is the handoff's "the X closes from anywhere back
 * to the Meal Prep tab" (detail → list → tab is three levels; `onBack`
 * covers the first two, `onClose` covers all of them at once).
 *
 * Create/edit stays a SEPARATE sheet (CreateMealSheet/CreateRecipeSheet,
 * already their own self-contained BottomSheet) rather than a third screen
 * here, matching how CreateMealSheet already worked before this handoff.
 * Both sheets can be mounted at once — opening Create on top of this one
 * (from the list's CTA or the detail pencil) simply stacks; closing Create
 * reveals this sheet again underneath with its state untouched, which is
 * what gives "Save returns to the list" for free.
 */
export const MealPrepFlowSheet: React.FC<{
  kind: PrepKind;
  open: boolean;
  initialScreen: Screen;
  initialItemId?: string;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}> = ({ kind, open, initialScreen, initialItemId, onClose, onEdit, onCreate }) => {
  const { customMeals, customMealsError, recipes, recipesError, selectedDate, logCustomMeal, logRecipe } = useApp();
  const isR = kind === "recipes";
  const accentText = isR ? PREP_LAV.text : PREP_TEAL.text;
  // Item 11: the flow's own primaries are solid (#79A8A1 / #A198DF); the
  // translucent card CTA colours stay on the Meal Prep tab's cards.
  const accentCta = PREP_PRIMARY[kind];

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [itemId, setItemId] = useState<string | undefined>(initialItemId);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("1");
  const [meal, setMeal] = useState<MealType | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Newest first: recipes already arrive that way (getRecipes orders
  // descending, item 11); custom meals keep their ascending query and are
  // reversed here instead (Part 4 Q2).
  const entries = useMemo<(CustomMeal | Recipe)[]>(
    () => (isR ? recipes : customMeals.slice().reverse()),
    [isR, recipes, customMeals]
  );
  const readError = isR ? recipesError : customMealsError;

  useEffect(() => {
    if (!open) return;
    setScreen(initialScreen);
    setItemId(initialItemId);
    setQuery("");
    setLogError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialScreen, initialItemId]);

  const item = entries.find((e) => e.id === itemId) ?? null;

  useEffect(() => {
    setQty("1");
    setLogError(null);
    setMeal(item && "mealType" in item ? (item.mealType ?? null) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (!open) return null;

  const total = item ? sumItems(item.items as PrepItem[]) : { kcal: 0, p: 0, c: 0, f: 0 };
  const servings = item && "servings" in item ? item.servings : 1;
  const per = isR ? divideTotals(total, servings) : total;

  const goBack = () => {
    if (screen === "advanced") setScreen("detail");
    else if (screen === "detail") setScreen("list");
  };

  const openDetail = (id: string) => {
    setItemId(id);
    setScreen("detail");
  };

  const doLog = async () => {
    if (!item || !meal || logging) return;
    setLogging(true);
    setLogError(null);
    try {
      if (isR) {
        const servingsToLog = Number(qty) > 0 ? Number(qty) : 1;
        await logRecipe(item.id, servingsToLog, meal, selectedDate);
      } else {
        // logCustomMeal has no quantity of its own (it always logs the
        // saved items once) — a custom meal's items are additive, so
        // logging it N times is equivalent to scaling every item by N.
        // Fractional quantities aren't meaningful here; round to whole
        // servings, minimum 1.
        const times = Math.max(1, Math.round(Number(qty) || 1));
        for (let i = 0; i < times; i++) {
          // eslint-disable-next-line no-await-in-loop
          await logCustomMeal(item.id, meal, selectedDate);
        }
      }
      onClose();
    } finally {
      setLogging(false);
    }
  };

  // Titles per screen, literal from CentiumMealPrep.dc.html's `titles` map:
  // the list carries the card's own name, the detail step is generic
  // ("Meal"/"Recipe" — the item's own name is shown in the body instead).
  const title =
    screen === "advanced" ? "Nutrient details" : screen === "detail" ? (isR ? "Recipe" : "Meal") : isR ? "Recipes" : "Custom Meals";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      // Item 11 back steps: advanced → detail → list → the Meal Prep tab.
      onBack={screen === "list" ? onClose : goBack}
      title={title}
    >
      {screen === "list" && (
        <ListScreen
          kind={kind}
          entries={entries}
          readError={readError}
          query={query}
          setQuery={setQuery}
          accentText={accentText}
          accentCta={accentCta}
          onOpen={openDetail}
          onCreate={onCreate}
        />
      )}
      {screen === "detail" && item && (
        <DetailScreen
          kind={kind}
          item={item}
          total={total}
          per={per}
          qty={qty}
          setQty={setQty}
          meal={meal}
          setMeal={setMeal}
          accentText={accentText}
          onEdit={() => onEdit(item.id)}
          onAdvanced={() => setScreen("advanced")}
          onLog={() => void doLog()}
          logging={logging}
          logError={logError}
        />
      )}
      {screen === "detail" && !item && (
        <p style={{ margin: 0, fontSize: 13, color: PREP_FAINT }}>Nothing saved yet.</p>
      )}
      {screen === "advanced" && (
        <AdvancedScreen kind={kind} item={item} qty={qty} />
      )}
    </BottomSheet>
  );
};

// ------------------------------------------------------------ List screen
const ListScreen: React.FC<{
  kind: PrepKind;
  entries: (CustomMeal | Recipe)[];
  readError: string | null;
  query: string;
  setQuery: (v: string) => void;
  accentText: string;
  accentCta: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
}> = ({ kind, entries, readError, query, setQuery, accentText, accentCta, onOpen, onCreate }) => {
  const isR = kind === "recipes";
  const filtered = entries.filter((e) => !query.trim() || e.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-3 animate-fade-slide-up">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={isR ? "Search recipes…" : "Search meals…"}
        className="w-full focus:outline-none placeholder:text-charcoal-faint"
        style={{ background: "#F4F4F6", border: "none", borderRadius: 14, padding: "11px 14px", fontSize: 14, color: PREP_CHARCOAL }}
      />

      {/* A failed read must never look empty (Part 4 Q7): the error line
          replaces the rows. */}
      {readError ? (
        <p style={{ margin: 0, fontSize: 13, color: PREP_SOFT }}>
          {isR ? "Couldn't load your recipes. Pull to retry." : "Couldn't load your meals. Pull to retry."}
        </p>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((x) => {
            const total = sumItems(x.items as PrepItem[]);
            const servings = "servings" in x ? x.servings : 1;
            const per = isR ? divideTotals(total, servings) : total;
            return (
              <button
                key={x.id}
                onClick={() => onOpen(x.id)}
                className="tap w-full flex items-center justify-between rounded-[14px] bg-white text-left"
                style={{ border: "1px solid rgba(36,31,27,0.1)", padding: "13px 12px", gap: 9 }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold truncate" style={{ color: PREP_CHARCOAL }}>
                    {x.title}
                  </span>
                  <span className="block mt-0.5 text-[11px]" style={{ color: PREP_FAINT }}>
                    {isR
                      ? `${(x as Recipe).servings} servings · ${x.items.length} ingredients`
                      : `${x.items.length} food${x.items.length !== 1 ? "s" : ""}`}
                  </span>
                </span>
                <MacroBar p={per.p} c={per.c} f={per.f} />
                <span className="flex-none text-right">
                  <span className="block text-sm font-bold tabular-nums" style={{ color: accentText }}>
                    {Math.round(per.kcal)} kcal
                  </span>
                  {isR && <span className="block text-[10px]" style={{ color: PREP_FAINT }}>per serving</span>}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-[13.5px] py-6" style={{ color: PREP_FAINT }}>
          {query.trim()
            ? "Nothing matches that search."
            : isR
              ? "No recipes yet — create your first one."
              : "No custom meals yet — create your first one."}
        </p>
      )}

      <button
        onClick={onCreate}
        className="tap w-full h-[52px] rounded-[14px] text-[15.5px] font-bold text-white"
        style={{ background: accentCta }}
      >
        {isR ? "Create Recipe" : "Create Meal"}
      </button>
    </div>
  );
};

// ---------------------------------------------------------- Detail screen
const DetailScreen: React.FC<{
  kind: PrepKind;
  item: CustomMeal | Recipe;
  total: { kcal: number; p: number; c: number; f: number };
  per: { kcal: number; p: number; c: number; f: number };
  qty: string;
  setQty: (v: string) => void;
  meal: MealType | null;
  setMeal: (m: MealType) => void;
  accentText: string;
  onEdit: () => void;
  onAdvanced: () => void;
  onLog: () => void;
  logging: boolean;
  logError: string | null;
}> = ({ kind, item, total, per, qty, setQty, meal, setMeal, accentText, onEdit, onAdvanced, onLog, logging, logError }) => {
  const isR = kind === "recipes";
  const q = Number(qty) > 0 ? Number(qty) : 1;
  const shown = { kcal: per.kcal * q, p: per.p * q, c: per.c * q, f: per.f * q };
  const recipe = isR ? (item as Recipe) : null;

  return (
    <div className="flex flex-col gap-3 animate-fade-slide-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[19px] font-extrabold tracking-[-0.015em] truncate" style={{ color: PREP_CHARCOAL }}>
            {item.title}
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: PREP_FAINT }}>
            {isR ? `${recipe!.servings} servings · ${Math.round(total.kcal)} kcal total` : `${item.items.length} foods`}
          </p>
        </div>
        <button onClick={onEdit} aria-label="Edit" className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center shrink-0" style={{ color: accentText }}>
          <Pencil size={13} />
        </button>
      </div>

      <MacroStrip t={shown} note={isR ? `Per serving × ${q}. Totals ÷ ${recipe!.servings} servings.` : `Whole meal × ${q}.`} />

      <div style={GREY_CONTAINER}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
          {isR ? "Ingredients" : "Foods"}
        </p>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {item.items.map((x, i) => {
            const rItem = x as PrepItem;
            const kcal = sumItems([rItem]).kcal;
            return (
              <div key={i} className="flex items-center gap-2 bg-white rounded-[10px] px-2.5 py-2">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold truncate" style={{ color: PREP_CHARCOAL }}>
                    {rItem.food.name}
                  </span>
                  {rItem.note && (
                    <span className="block text-[10.5px] italic" style={{ color: PREP_FAINT }}>
                      {rItem.note}
                    </span>
                  )}
                </span>
                <span className="flex-none text-[11.5px]" style={{ color: PREP_FAINT }}>
                  {rItem.quantity} {rItem.unit ?? "serving"}
                </span>
                <span className="flex-none w-12 text-right text-[11.5px] font-semibold tabular-nums" style={{ color: PREP_SOFT }}>
                  {Math.round(kcal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {isR && recipe!.steps && (
        <div style={GREY_CONTAINER}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
            Steps
          </p>
          <p className="mt-2.5 text-[13px] whitespace-pre-line" style={{ color: PREP_SOFT, lineHeight: 1.6 }}>
            {recipe!.steps}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3" style={GREY_CONTAINER}>
        <span className="flex-none" style={{ fontSize: 14.5, fontWeight: 500, color: "#575863" }}>
          {isR ? "Servings" : "Quantity"}
        </span>
        <input
          value={qty}
          inputMode="decimal"
          onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, ""))}
          className="flex-1 min-w-0 text-center outline-none"
          style={{ background: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, color: PREP_CHARCOAL }}
        />
      </div>

      <div style={GREY_CONTAINER}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
          Meal
        </p>
        <div className="flex" style={{ gap: 6, marginTop: 9 }}>
          {PREP_MEAL_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className="tap transition-colors"
              style={{ ...sheetChipStyle(meal === m), flex: 1, minWidth: 0, padding: "8px 4px" }}
            >
              {prepMealLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {logError && <p className="text-[11.5px] font-semibold text-status-high">{logError}</p>}

      <div className="flex items-center" style={{ gap: 10 }}>
        <button
          onClick={onLog}
          disabled={!meal || logging}
          className="tap flex-1 h-[52px] rounded-[14px] text-[15.5px] font-bold text-white disabled:opacity-40"
          style={{ background: PREP_PRIMARY[kind] }}
        >
          {logging ? "Logging…" : "Add to Diary"}
        </button>
        <button
          onClick={onAdvanced}
          aria-label="Nutrient details"
          title="Nutrient details"
          className="tap flex-none flex items-center justify-center"
          style={{ width: 60, height: 52, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: PREP_CHARCOAL }}
        >
          <SlidersHorizontal size={20} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------- Advanced screen
// Master handover item 11: the nutrient breakdown sums each nutrient across
// the ingredient foods — per ingredient, its profile amount x its own
// quantity multiplier; known = ingredients with a value; n = ingredients.
// Recipes: sum / servings x q. Meals: sum x q. Calories and macros come from
// each ingredient's own figures (always known); every other nutrient only
// from fetched profiles (catalog foods — custom foods have none). Rendered by
// the same breakdown Add Food and Edit Logged Food use (item 4), in its
// multi-ingredient mode ("No data" / "partial").
const AdvancedScreen: React.FC<{
  kind: PrepKind;
  item: CustomMeal | Recipe | null;
  qty: string;
}> = ({ kind, item, qty }) => {
  const { nutritionGoal } = useApp();
  const isR = kind === "recipes";
  const q = Number(qty) > 0 ? Number(qty) : 1;
  const targets = targetsFromGoal(nutritionGoal);

  const [state, setState] = useState<
    { loading: true } | { loading: false; totals: Record<string, number>; present: Record<string, number>; itemCount: number }
  >({ loading: true });

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setState({ loading: true });
    (async () => {
      const items = item.items as PrepItem[];
      const catalogItems = items.filter((i) => i.source === "catalog");
      const result = await getFoodNutrients(catalogItems.map((i) => i.food.id));
      if (cancelled) return;
      const perIngredientMaps = items.map((i) => {
        const m = servingMultiplier(i.food.serving, i.quantity, i.unit ?? "serving");
        const raw = i.source === "catalog" ? result.byFoodId[i.food.id] : undefined;
        const scaled = raw ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v * m])) : {};
        return {
          ...scaled,
          calories: i.food.calories * m,
          protein: i.food.protein * m,
          total_fat: i.food.fat * m,
          total_carbohydrates: i.food.carbs * m,
        };
      });
      const summed = sumNutrientMaps(perIngredientMaps);
      const factor = (isR && "servings" in item ? 1 / Math.max(1, item.servings) : 1) * q;
      const totals = Object.fromEntries(Object.entries(summed.totals).map(([k, v]) => [k, v * factor]));
      if (!cancelled) setState({ loading: false, totals, present: summed.present, itemCount: summed.itemCount });
    })();
    return () => {
      cancelled = true;
    };
  }, [item, isR, q]);

  if (!item) return <p style={{ margin: 0, fontSize: 13, color: PREP_FAINT }}>Nothing saved yet.</p>;

  return (
    <div className="flex flex-col gap-2.5 animate-fade-slide-up">
      <p style={{ margin: "0 2px 2px", fontSize: 13, color: PREP_SOFT }}>
        {isR ? `${item.title} · ${q} serving${q === 1 ? "" : "s"}` : `${item.title} × ${q}`}
      </p>
      {state.loading ? (
        <p className="text-center text-[13px] py-6" style={{ color: PREP_FAINT }}>
          Loading nutrient details…
        </p>
      ) : (
        <NutrientDetailSections
          totals={state.totals}
          present={state.present}
          itemCount={state.itemCount}
          calorieTarget={targets.calories}
          proteinTarget={targets.protein}
          carbTarget={targets.carbs}
          fatTarget={targets.fat}
        />
      )}
    </div>
  );
};
