import type React from "react";
import type { Food, MealType, ServingUnit } from "../../types";
import { servingMultiplier, mealLabels } from "../../services/nutrition";
import { useIsDark } from "../../hooks/useIsDark";
import { FOOD_DARK } from "./foodDark";

// Shared building blocks for mobile handoff item 10 (Food > Meal Prep
// redesign): the Custom Meals + Recipes widget cards on MealPrepPanel, and
// the List/Detail/Create screens for both. One file so the macro bar and
// macro strip render identically everywhere the handoff shows them, and so
// the literal handoff colors (README lines 613-774, CentiumMealPrep.dc.html)
// live in exactly one place instead of drifting between call sites.

/** The common shape of a CustomMealItem/RecipeItem for read-only rendering. */
export interface PrepItem {
  food: Food;
  quantity: number;
  unit?: ServingUnit;
  note?: string;
  source?: "catalog" | "custom";
}

export interface MacroTotals {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

/**
 * Sums an ingredient/item list's macros using `servingMultiplier` (the same
 * gram-aware math `logFoodEntry`/`snapshotFromFood` use to write a diary
 * entry), so a card's preview numbers match what actually gets logged
 * instead of drifting like the old `entryMultiplier`-only total did.
 */
export function sumItems(items: PrepItem[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, i) => {
      const m = servingMultiplier(i.food.serving, i.quantity, i.unit ?? "serving");
      return {
        kcal: acc.kcal + i.food.calories * m,
        p: acc.p + i.food.protein * m,
        c: acc.c + i.food.carbs * m,
        f: acc.f + i.food.fat * m,
      };
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

export function divideTotals(t: MacroTotals, by: number): MacroTotals {
  const n = by > 0 ? by : 1;
  return { kcal: t.kcal / n, p: t.p / n, c: t.c / n, f: t.f / n };
}

// Literal handoff colors (README 613-774 + CentiumMealPrep.dc.html), as the
// tokens whose light values they are (#241F1B / #5B5349 / #8C8378), so they
// follow dark mode (Mobile v5.1 R3, no light islands).
export const PREP_CHARCOAL = "rgb(var(--c-charcoal))";
export const PREP_SOFT = "rgb(var(--c-charcoal-soft))";
export const PREP_FAINT = "rgb(var(--c-charcoal-muted))";

/**
 * The grey 4-column macro strip on the Detail and Create screens (00-
 * FOUNDATIONS §0.3): equal cells, figures in the macro trio's type-on-white
 * colours, protein and fat to at most one decimal (Math.round(x*10)/10, so a
 * whole figure reads "16g", not "16.0g"), carbs and kcal whole — literal
 * from CentiumMealPrep.dc.html's `macroStrip`.
 */
export const MacroStrip: React.FC<{ t: MacroTotals; note?: string }> = ({ t, note }) => {
  const dark = useIsDark();
  const rows: [string, string, string][] = [
    [String(Math.round(t.kcal)), "kcal", PREP_CHARCOAL],
    [`${Math.round(t.p * 10) / 10}g`, "protein", dark ? FOOD_DARK.protein : "#7D6BB5"],
    [`${Math.round(t.c)}g`, "carbs", dark ? FOOD_DARK.carbs : "#8175C2"],
    [`${Math.round(t.f * 10) / 10}g`, "fat", dark ? FOOD_DARK.fat : "#4274D7"],
  ];
  return (
    <div>
      <div className="grid grid-cols-4" style={{ background: dark ? FOOD_DARK.box : "#F4F4F6", borderRadius: 16, padding: "13px 0" }}>
        {rows.map((r, k) => (
          <div key={k} style={{ textAlign: "center", borderLeft: k === 0 ? "none" : `1px solid ${dark ? FOOD_DARK.rule : "#E2E3E7"}` }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: r[2] }}>{r[0]}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: PREP_FAINT }}>{r[1]}</p>
          </div>
        ))}
      </div>
      {note && <p style={{ margin: "7px 2px 0", fontSize: 10.5, color: PREP_FAINT }}>{note}</p>}
    </div>
  );
};

// Master handover item 11: meal chips run Breakfast, Snacks, Lunch, Dinner
// (approved decision 7: "Snacks" everywhere, from the shared mealLabels).
export const PREP_MEAL_ORDER: MealType[] = ["breakfast", "snack", "lunch", "dinner"];
export const prepMealLabel = (m: MealType) => mealLabels[m];

// Item 11: solid primary fills for the flow's own buttons (List "Create",
// Create "Save", Detail "Add to Diary") and the selected meal pill — teal for
// meals, lavender for recipes.
//
// Mobile v5.1 R2: white sits on these, so each is the closest brand shade
// that clears 4.5:1. The board's #79A8A1 and #A198DF carry white at about
// 2.6:1; secondary.deep #4F7F78 is 4.53:1 and primary-fill is 4.52:1 or more.
export const PREP_PRIMARY = { meals: "#4F7F78", recipes: "rgb(var(--c-primary-fill))" } as const;

export function capsLabelStyle(color: string): React.CSSProperties {
  return { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color };
}
