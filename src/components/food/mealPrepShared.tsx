import type React from "react";
import type { Food, ServingUnit } from "../../types";
import { servingMultiplier } from "../../services/nutrition";

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
 * calories. Segment widths are `grams / totalGrams * 104`, each rounded
 * independently (not as a running remainder), which is what makes a
 * 16/61/22 g item read 17/64/23px: 16/99*104=16.81→17, 61/99*104=64.04→64,
 * 22/99*104=23.11→23 (acceptance criterion, README line 765).
 */
export const MacroBar: React.FC<{ p: number; c: number; f: number }> = ({ p, c, f }) => {
  const total = p + c + f;
  const w = (g: number) => (total > 0 ? Math.round((g / total) * 104) : 0);
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
 * The grey 4-column macro strip used on List row's counterpart (Detail/
 * Create screens) — literal from CentiumMealPrep.dc.html's `macroStrip()`.
 * Distinct color set from MacroBar above (that one is the handoff's own
 * doing — this strip's protein/carbs/fat tones are not the same hexes as
 * the 104px bar's, per the dc.html JS).
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
      <div style={{ background: "#F4F4F6", borderRadius: 16, display: "flex", padding: "13px 0" }}>
        {rows.map((r, k) => (
          <div key={k} style={{ flex: 1, textAlign: "center", borderLeft: k === 0 ? "none" : "1px solid #E2E3E7" }}>
            <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: r[2] }}>{r[0]}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: PREP_FAINT }}>{r[1]}</p>
          </div>
        ))}
      </div>
      {note && <p style={{ margin: "7px 2px 0", fontSize: 10.5, color: PREP_FAINT }}>{note}</p>}
    </div>
  );
};

export function capsLabelStyle(color: string): React.CSSProperties {
  return { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color };
}
