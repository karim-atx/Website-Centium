import React, { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Search, Pencil } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { CustomMeal, MealType, Recipe } from "../../types";
import { mealOrder, mealLabels, sumNutrientMaps, servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { getFoodNutrients } from "../../services/food-nutrients";
import { NutrientSections } from "./NutrientSections";
import { MacroBar, MacroStrip, sumItems, divideTotals, PREP_TEAL, PREP_LAV, PREP_FAINT, PREP_SOFT, PREP_CHARCOAL, type PrepItem } from "./mealPrepShared";

export type PrepKind = "meals" | "recipes";

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
  const accentCta = isR ? PREP_LAV.cta : PREP_TEAL.cta;

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [itemId, setItemId] = useState<string | undefined>(initialItemId);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("1");
  const [meal, setMeal] = useState<MealType | null>(null);
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Handoff acceptance: "newest-first display, CLIENT-SIDE ONLY" — the
  // services intentionally keep `created_at ascending`; reverse here only.
  const entries = useMemo<(CustomMeal | Recipe)[]>(
    () => (isR ? recipes.slice().reverse() : customMeals.slice().reverse()),
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
      onBack={screen === "list" ? undefined : goBack}
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
        <AdvancedScreen kind={kind} item={item} qty={qty} per={per} />
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
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isR ? "Search recipes…" : "Search meals…"}
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* A failed read must not look empty (handoff Q7) — distinct from
          "nothing matches this search" and from "nothing saved yet". */}
      {readError && (
        <p className="text-[11.5px] font-semibold text-status-high">
          {`Couldn't refresh your ${isR ? "recipes" : "custom meals"} — showing what was saved on this device.`}
        </p>
      )}

      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filtered.map((x) => {
            const total = sumItems(x.items as PrepItem[]);
            const servings = "servings" in x ? x.servings : 1;
            const per = isR ? divideTotals(total, servings) : total;
            return (
              <button
                key={x.id}
                onClick={() => onOpen(x.id)}
                className="tap w-full flex items-center justify-between gap-2.5 rounded-2xl bg-white text-left"
                style={{ border: "1px solid rgba(36,31,27,0.1)", padding: "13px 12px" }}
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
        className="tap w-full h-[52px] rounded-2xl text-[15.5px] font-bold text-white"
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

      <div className="rounded-2xl bg-[#F4F4F6] p-3.5">
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
          {isR ? "Ingredients" : "Foods"}
        </p>
        <div className="mt-2.5 flex flex-col gap-1.5">
          {item.items.map((x, i) => {
            const rItem = x as PrepItem;
            const kcal = sumItems([rItem]).kcal;
            return (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-2">
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
        <div className="rounded-2xl bg-[#F4F4F6] p-3.5">
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
            Steps
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: PREP_SOFT }}>
            {recipe!.steps}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-[#F4F4F6] p-3.5 flex items-center gap-3">
        <span className="flex-none text-[14.5px]" style={{ color: "#575863" }}>
          {isR ? "Servings" : "Quantity"}
        </span>
        <input
          value={qty}
          inputMode="decimal"
          onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ""))}
          className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2.5 text-center text-[15px] font-bold outline-none"
          style={{ color: PREP_CHARCOAL }}
        />
      </div>

      <div className="rounded-2xl bg-[#F4F4F6] p-3.5">
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PREP_FAINT }}>
          Meal
        </p>
        <div className="mt-2.5 flex gap-1.5">
          {mealOrder.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className="tap flex-1 min-w-0 rounded-lg py-2 text-[13px] font-semibold border transition-colors"
              style={
                meal === m
                  ? { background: accentText, borderColor: accentText, color: "#FFFFFF" }
                  : { background: "#FAFAFB", borderColor: "#E5E6EB", color: PREP_CHARCOAL }
              }
            >
              {mealLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {logError && <p className="text-[11.5px] font-semibold text-status-high">{logError}</p>}

      <div className="flex items-center gap-2.5">
        <button
          onClick={onLog}
          disabled={!meal || logging}
          className="tap flex-1 h-[52px] rounded-2xl text-[15.5px] font-bold text-white disabled:opacity-40"
          style={{ background: accentText }}
        >
          {logging ? "Logging…" : "Add to Diary"}
        </button>
        <button
          onClick={onAdvanced}
          aria-label="Nutrient details"
          title="Nutrient details"
          className="tap flex-none w-[60px] h-[52px] rounded-2xl bg-white flex items-center justify-center"
          style={{ border: "1px solid #E4E4E9", color: PREP_CHARCOAL }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
            <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" />
            <path d="M14 2v4M8 10v4M16 18v4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------- Advanced screen
// Handoff item 10, "Advanced view micronutrients": ingredient-summed
// nutrient totals, live-fetched per catalog ingredient and scaled by that
// ingredient's own servingMultiplier, divided by `servings` for a recipe.
// The macro figures reuse the same `per`/`qty` the Detail screen already
// shows (dc.html's advancedScreen does the same — the macros come from the
// items' own calories/protein/carbs/fat, not from food_nutrients). The
// deeper per-nutrient section list (vitamins, minerals, ...) renders via the
// shared NutrientSections component (item 9), same as the standalone
// Nutrient Summary page — see NutrientSummaryPage.tsx for the prop shape
// this mirrors.
const AdvancedScreen: React.FC<{
  kind: PrepKind;
  item: CustomMeal | Recipe | null;
  qty: string;
  per: { kcal: number; p: number; c: number; f: number };
}> = ({ kind, item, qty, per }) => {
  const { nutritionGoal, metricValues } = useApp();
  const isR = kind === "recipes";
  const q = Number(qty) > 0 ? Number(qty) : 1;
  const shown = { kcal: per.kcal * q, p: per.p * q, c: per.c * q, f: per.f * q };
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
        if (i.source !== "catalog") return null; // custom food: no per-nutrient data, honestly "no data"
        const raw = result.byFoodId[i.food.id];
        if (!raw) return null;
        const m = servingMultiplier(i.food.serving, i.quantity, i.unit ?? "serving");
        return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v * m]));
      });
      const summed = sumNutrientMaps(perIngredientMaps);
      const totals = isR && "servings" in item
        ? Object.fromEntries(Object.entries(summed.totals).map(([k, v]) => [k, v / item.servings]))
        : summed.totals;
      if (!cancelled) setState({ loading: false, totals, present: summed.present, itemCount: summed.itemCount });
    })();
    return () => {
      cancelled = true;
    };
  }, [item, isR]);

  if (!item) return <p style={{ margin: 0, fontSize: 13, color: PREP_FAINT }}>Nothing saved yet.</p>;

  return (
    <div className="flex flex-col gap-3 animate-fade-slide-up">
      <p style={{ margin: "0 2px 2px", fontSize: 13, color: PREP_SOFT }}>
        {item.title} · {isR ? `${q} serving${q === 1 ? "" : "s"}` : `× ${q}`}
      </p>
      <MacroStrip t={shown} />
      {state.loading ? (
        <p className="text-center text-[13px] py-6" style={{ color: PREP_FAINT }}>
          Loading nutrient details…
        </p>
      ) : (
        <NutrientSections
          totals={state.totals}
          present={state.present}
          itemCount={state.itemCount}
          calorieTarget={targets.calories}
          proteinTarget={targets.protein}
          carbTarget={targets.carbs}
          fatTarget={targets.fat}
          bodyWeightKg={metricValues.weight ?? null}
          filter="all"
          // itemCount === 0 here means this item's ingredients carry no
          // nutrient data, not an empty diary day — the page-level
          // "nothing logged today" framing doesn't apply.
          suppressEmptyState
        />
      )}
    </div>
  );
};
