import type React from "react";
import type { Food, MealType, ServingUnit } from "../../types";
import { servingMultiplier, mealLabels } from "../../services/nutrition";

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

// Literal handoff colors (README 613-774 + CentiumMealPrep.dc.html).
export const PREP_CHARCOAL = "#241F1B";
export const PREP_SOFT = "#5B5349";
export const PREP_FAINT = "#8C8378";
export const PREP_TEAL = { text: "#3C6B65", container: "rgba(162,200,194,0.17)", caps: "rgba(60,107,101,0.78)", badgeBg: "rgba(162,200,194,0.45)", rowBg: "rgba(162,200,194,0.34)", cta: "rgba(121,168,161,0.9)" };
export const PREP_LAV = { text: "#5F5093", container: "rgba(174,161,220,0.17)", caps: "rgba(95,80,147,0.78)", badgeBg: "rgba(174,161,220,0.45)", rowBg: "rgba(174,161,220,0.32)", cta: "rgba(161,152,223,0.95)" };

/**
 * The 104x8 macro bar used on both the widget-card preview rows and the List
 * rows — three segments sized by each macro's share of TOTAL GRAMS, not
 * calories. Master handover item 11: segment width = grams / totalGrams x
 * 100% of the 104px track, unrounded, so a 16/61/22 g item reads 16.8, 64.1
 * and 23.1px.
 */
export const MacroBar: React.FC<{ p: number; c: number; f: number }> = ({ p, c, f }) => {
  const total = p + c + f;
  const w = (g: number) => (total > 0 ? `${(g / total) * 100}%` : 0);
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, width: 104, flex: "none" }}>
      <span style={{ display: "flex", height: 8, borderRadius: 3, overflow: "hidden", background: "rgba(36,31,27,0.07)" }}>
        <span style={{ width: w(p), background: "#7D6BB5" }} />
        <span style={{ width: w(c), background: "#AEA1DC" }} />
        <span style={{ width: w(f), background: "#A2C8C2" }} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        <span style={{ color: "#A79E93" }}>P {Math.round(p)}g</span>
        <span style={{ color: "rgba(36,31,27,0.2)" }}>|</span>
        <span style={{ color: "#A79E93" }}>C {Math.round(c)}g</span>
        <span style={{ color: "rgba(36,31,27,0.2)" }}>|</span>
        <span style={{ color: "#A79E93" }}>F {Math.round(f)}g</span>
      </span>
    </span>
  );
};

/**
 * The grey 4-column macro strip on the Detail and Create screens (00-
 * FOUNDATIONS §0.3): equal cells, figures in the macro trio's type-on-white
 * colours, protein and fat to at most one decimal (Math.round(x*10)/10, so a
 * whole figure reads "16g", not "16.0g"), carbs and kcal whole — literal
 * from CentiumMealPrep.dc.html's `macroStrip`.
 */
export const MacroStrip: React.FC<{ t: MacroTotals; note?: string }> = ({ t, note }) => {
  const rows: [string, string, string][] = [
    [String(Math.round(t.kcal)), "kcal", PREP_CHARCOAL],
    [`${Math.round(t.p * 10) / 10}g`, "protein", "#7D6BB5"],
    [`${Math.round(t.c)}g`, "carbs", "#8175C2"],
    [`${Math.round(t.f * 10) / 10}g`, "fat", "#4274D7"],
  ];
  return (
    <div>
      <div className="grid grid-cols-4" style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 0" }}>
        {rows.map((r, k) => (
          <div key={k} style={{ textAlign: "center", borderLeft: k === 0 ? "none" : "1px solid #E2E3E7" }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: r[2] }}>{r[0]}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: PREP_FAINT }}>{r[1]}</p>
          </div>
        ))}
      </div>
      {note && <p style={{ margin: "7px 2px 0", fontSize: 10.5, color: PREP_FAINT }}>{note}</p>}
    </div>
  );
};

// Master handover item 11: meal chips run Breakfast, Snack, Lunch, Dinner
// (singular "Snack"; the shared mealLabels keeps "Snacks" for other screens).
export const PREP_MEAL_ORDER: MealType[] = ["breakfast", "snack", "lunch", "dinner"];
export const prepMealLabel = (m: MealType) => (m === "snack" ? "Snack" : mealLabels[m]);

// Item 11: solid primary fills for the flow's own buttons (List "Create",
// Create "Save", Detail "Add to Diary") and the selected meal pill — teal for
// meals, lavender for recipes.
export const PREP_PRIMARY = { meals: "#79A8A1", recipes: "#A198DF" } as const;

export function capsLabelStyle(color: string): React.CSSProperties {
  return { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color };
}
