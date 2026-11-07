// Professional handover v1, WP-LI.7 / .7.3 the unit chip's menu: a food whose
// serving states its gram weight can be counted in grams or servings; the
// switch keeps the portion. Pure (the caller reads the gram weight with
// services/nutrition gramsInServingLabel), so it runs under node --test.

export type PlanUnit = "g" | "serving";

/** The units on offer: grams and servings for a food with a gram weight, otherwise servings only. */
export function unitOptions(isFood: boolean, gramsPerServing: number | null): PlanUnit[] {
  return isFood && gramsPerServing ? ["g", "serving"] : ["serving"];
}

/** The same portion in the other unit: servings × the serving's grams, or grams ÷ them (2 decimals). */
export function convertUnit(item: { grams: number | null; servings: number | null }, gramsPerServing: number | null, to: PlanUnit): { grams: number | null; servings: number | null } {
  const per = gramsPerServing;
  if (to === "g") {
    if (item.grams != null) return { grams: item.grams, servings: null };
    return per ? { grams: Math.round((item.servings ?? 1) * per), servings: null } : { grams: null, servings: item.servings ?? 1 };
  }
  if (item.grams == null) return { grams: null, servings: item.servings ?? 1 };
  return { grams: null, servings: per ? Math.round((item.grams / per) * 100) / 100 : 1 };
}
