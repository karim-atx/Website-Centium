import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { ConfirmCard } from "../ui/ConfirmCard";
import { usePrepForm } from "./usePrepForm";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { CustomMeal, MealType, Recipe } from "../../types";
import { sumNutrientMaps, servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { getFoodNutrients } from "../../services/food-nutrients";
import { NutrientDetailSections } from "./NutrientSections";
import {
  MacroStrip,
  sumItems,
  divideTotals,
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

type Screen = "detail" | "advanced" | "edit";

/**
 * One saved meal or recipe (handover 2026-09-29 FO3.2): Detail → (Advanced),
 * and Edit IN THE SAME POPUP. The Custom tab's sub-tab lists replace the old
 * List screen; the header pencil is replaced by an Edit button in the footer,
 * which turns this sheet into the same form as creating the item (usePrepForm),
 * prefilled, titled "Edit …". Save returns to the detail; the back chevron
 * leaves edit mode without saving, asking first if anything changed; delete
 * asks, then removes the item and closes.
 */
export const MealPrepFlowSheet: React.FC<{
  kind: PrepKind;
  itemId: string;
  /** Opened from a row's ⋮ Edit. */
  startEditing?: boolean;
  onClose: () => void;
}> = ({ kind, itemId, startEditing = false, onClose }) => {
  const { customMeals, recipes, selectedDate, logCustomMeal, logRecipe, removeCustomMeal, removeRecipe } = useApp();
  const isR = kind === "recipes";
  // Item 11: the flow's own primaries are solid (#79A8A1 / #A198DF).
  const accentCta = PREP_PRIMARY[kind];

  const [screen, setScreen] = useState<Screen>(startEditing ? "edit" : "detail");
  const [qty, setQty] = useState("1");
  // CentiumMealPrep.dc.html's state starts `meal: "lunch"` and never resets
  // it per item, so Add to Diary is enabled from the first frame.
  const [meal, setMeal] = useState<MealType>("lunch");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "discard-back" | "discard-close">(null);
  const [busy, setBusy] = useState(false);

  const item: CustomMeal | Recipe | null = isR
    ? recipes.find((r) => r.id === itemId) ?? null
    : customMeals.find((m) => m.id === itemId) ?? null;

  const form = usePrepForm({
    kind,
    active: screen === "edit",
    editMeal: isR ? null : (item as CustomMeal | null),
    editRecipe: isR ? (item as Recipe | null) : null,
    onDone: () => setScreen("detail"),
    onDeleteRequest: () => setConfirm("delete"),
  });

  useEffect(() => {
    setQty("1");
    setLogError(null);
  }, [itemId]);

  const total = item ? sumItems(item.items as PrepItem[]) : { kcal: 0, p: 0, c: 0, f: 0 };
  const servings = item && "servings" in item ? item.servings : 1;
  const per = isR ? divideTotals(total, servings) : total;

  const doLog = async () => {
    if (!item || logging) return;
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

  const doDelete = async () => {
    if (!item) return;
    setBusy(true);
    if (isR) await removeRecipe(item.id);
    else await removeCustomMeal(item.id);
    setBusy(false);
    setConfirm(null);
    onClose();
  };

  const leaveEdit = () => {
    if (form.searchBack) return form.searchBack();
    if (form.dirty) setConfirm("discard-back");
    else setScreen("detail");
  };
  const close = () => (screen === "edit" && form.dirty ? setConfirm("discard-close") : onClose());

  // Titles per screen, literal from CentiumMealPrep.dc.html's `titles` map:
  // the detail step is generic ("Meal"/"Recipe" — the item's own name is shown
  // in the body instead).
  const title = screen === "edit" ? form.title : screen === "advanced" ? "Nutrient details" : isR ? "Recipe" : "Meal";

  return (
    <>
      <BottomSheet
        light
        open
        onClose={close}
        onBack={screen === "edit" ? leaveEdit : screen === "advanced" ? () => setScreen("detail") : undefined}
        title={title}
        footer={
          screen === "detail" && item ? (
            <button
              onClick={() => setScreen("edit")}
              className="tap w-full inline-flex items-center justify-center"
              style={{ height: 48, gap: 8, borderRadius: 14, background: "#FFFFFF", border: `1.5px solid ${accentCta}`, color: accentCta, fontSize: 15, fontWeight: 700 }}
            >
              <Pencil size={15} /> Edit
            </button>
          ) : undefined
        }
      >
        {screen === "edit" && item && form.body}
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
            onAdvanced={() => setScreen("advanced")}
            onLog={() => void doLog()}
            logging={logging}
            logError={logError}
          />
        )}
        {!item && <p style={{ margin: 0, fontSize: 13, color: PREP_FAINT }}>Nothing saved yet.</p>}
        {screen === "advanced" && <AdvancedScreen kind={kind} item={item} qty={qty} />}
      </BottomSheet>

      <ConfirmCard
        open={confirm === "delete"}
        title={`Delete ${item?.title ?? (isR ? "this recipe" : "this meal")}?`}
        subtitle={isR ? "The recipe is removed. Past diary entries stay." : "The meal is removed. Past diary entries stay."}
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
          else {
            form.leaveForm();
            setScreen("detail");
          }
        }}
      />
    </>
  );
};

const prepPillStyle = (on: boolean, accent: string): React.CSSProperties => ({
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: on ? 700 : 500,
  border: `1px solid ${on ? accent : "#E5E6EB"}`,
  background: on ? accent : "#FAFAFB",
  color: on ? "#FFFFFF" : PREP_CHARCOAL,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flex: "none",
});

const DetailScreen: React.FC<{
  kind: PrepKind;
  item: CustomMeal | Recipe;
  total: { kcal: number; p: number; c: number; f: number };
  per: { kcal: number; p: number; c: number; f: number };
  qty: string;
  setQty: (v: string) => void;
  meal: MealType;
  setMeal: (m: MealType) => void;
  onAdvanced: () => void;
  onLog: () => void;
  logging: boolean;
  logError: string | null;
}> = ({ kind, item, total, per, qty, setQty, meal, setMeal, onAdvanced, onLog, logging, logError }) => {
  const isR = kind === "recipes";
  const accent = PREP_PRIMARY[kind];
  const q = Number(qty) > 0 ? Number(qty) : 1;
  const shown = { kcal: per.kcal * q, p: per.p * q, c: per.c * q, f: per.f * q };
  const recipe = isR ? (item as Recipe) : null;

  return (
    <div className="flex flex-col gap-3 animate-fade-slide-up">
      <div className="min-w-0">
        <p className="text-[19px] font-extrabold tracking-[-0.015em] truncate" style={{ color: PREP_CHARCOAL }}>
          {item.title}
        </p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: PREP_FAINT }}>
          {isR ? `${recipe!.servings} servings · ${Math.round(total.kcal)} kcal total` : `${item.items.length} foods`}
        </p>
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
              style={{ ...prepPillStyle(meal === m, accent), flex: 1, minWidth: 0, padding: "8px 4px" }}
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
          disabled={logging}
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
