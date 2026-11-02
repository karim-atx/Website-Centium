// Release 3 · W5 the NU screens' labels and colours (apart from the
// components so Fast refresh keeps working). Labels only: conflicts and their
// severity always come from food_conflicts, never from these strings.

import { ALLERGEN_LABEL } from "../client/clientFormat";
import { dietLabel } from "../../../utils/dietaryRestrictions";
import type { ConflictRow } from "./nutritionModel";
import { t, tk } from "../../../i18n/core";

/** The board's macro colours (gen r13 dayTotal13, r14): protein, carbs, fat. */
export const MACRO_COLOUR = { p: "#7D6BB5", c: "#AEA1DC", f: "#A2C8C2" } as const;

// The labels are English keys (tk in clientFormat, dietaryRestrictions); shown through t().
export const allergenLabel = (a: string): string => (ALLERGEN_LABEL[a] ? t(ALLERGEN_LABEL[a]) : a);
export const restrictionLabel = (r: string): string => t(dietLabel(r));

const SEVERITY_LABEL: Record<string, string> = { mild: tk("mild"), moderate: tk("moderate"), severe: tk("severe") };
/** An allergy's severity in the app's language (the stored value is English). */
export const severityLabel = (s: string): string => (SEVERITY_LABEL[s] ? t(SEVERITY_LABEL[s]) : s);

/** NU11 / NU12 titles (FINAL_PLAN 3 templates: "{food_name} contains {allergen}", "… may contain … Check this.", "{food_name} isn't {restriction}"). */
export function conflictTitle(name: string, row: ConflictRow): string {
  if (row.kind === "allergy_confirmed") return t("{food} contains {allergen}", { food: name, allergen: allergenLabel(row.allergen ?? "").toLowerCase() });
  if (row.kind === "allergy_check") return t("{food} may contain {allergen}. Check this.", { food: name, allergen: allergenLabel(row.allergen ?? "").toLowerCase() });
  return t("{food} isn't {restriction}", { food: name, restriction: restrictionLabel(row.restriction ?? "").toLowerCase() });
}

/** NU11 / NU12 lines; the severity only from the client's structured allergy. */
export function conflictBody(first: string, row: ConflictRow): string {
  if (row.kind === "allergy_confirmed")
    return row.severity
      ? t("{name} is allergic to {allergen} ({severity}). Foods with an allergen are blocked by default.", { name: first, allergen: allergenLabel(row.allergen ?? "").toLowerCase(), severity: severityLabel(row.severity) })
      : t("{name} is allergic to {allergen}. Foods with an allergen are blocked by default.", { name: first, allergen: allergenLabel(row.allergen ?? "").toLowerCase() });
  if (row.kind === "allergy_check") return t("The name suggests it. Check the ingredients with {name}.", { name: first });
  return t("{name} follows {restriction}. You can still add it if you've agreed this with {name}.", { name: first, restriction: restrictionLabel(row.restriction ?? "") });
}
