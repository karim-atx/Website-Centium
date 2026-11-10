// Release 3 · W5 the NU screens' labels and colours (apart from the
// components so Fast refresh keeps working). Labels only: conflicts and their
// severity always come from food_conflicts, never from these strings.

import { ALLERGEN_LABEL } from "../client/clientFormat";
import { dietLabel } from "../../../utils/dietaryRestrictions";
import { customLabel, isolateLabel, type ConflictRow } from "./nutritionModel";
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
  // FQ: an "Other" allergy (allergen null) is named by the client's own label, as written.
  const custom = row.kind === "allergy_check" && !row.allergen ? customLabel(row) : null;
  if (custom) return t("{food} may contain {allergen}. Check this.", { food: name, allergen: isolateLabel(custom) });
  if (row.kind === "allergy_check") return t("{food} may contain {allergen}. Check this.", { food: name, allergen: allergenLabel(row.allergen ?? "").toLowerCase() });
  return t("{food} isn't {restriction}", { food: name, restriction: restrictionLabel(row.restriction ?? "").toLowerCase() });
}

/** NU11 / NU12 lines; the severity only from the client's structured allergy. */
export function conflictBody(first: string, row: ConflictRow): string {
  if (row.kind === "allergy_confirmed")
    return row.severity
      ? t("{name} is allergic to {allergen} ({severity}). Foods with an allergen are blocked by default.", { name: first, allergen: allergenLabel(row.allergen ?? "").toLowerCase(), severity: severityLabel(row.severity) })
      : t("{name} is allergic to {allergen}. Foods with an allergen are blocked by default.", { name: first, allergen: allergenLabel(row.allergen ?? "").toLowerCase() });
  // FQ: an "Other" allergy carries the client's own severity (never confirmed: a name match only).
  const custom = row.kind === "allergy_check" && !row.allergen ? customLabel(row) : null;
  if (custom)
    return row.severity && SEVERITY_LABEL[row.severity]
      ? t("{name} added {allergy} as an allergy in their own words ({severity}). Only the name matches, so check the ingredients with {name}.", { name: first, allergy: isolateLabel(custom), severity: severityLabel(row.severity) })
      : t("{name} added {allergy} as an allergy in their own words. Only the name matches, so check the ingredients with {name}.", { name: first, allergy: isolateLabel(custom) });
  if (row.kind === "allergy_check") return t("The name suggests it. Check the ingredients with {name}.", { name: first });
  return t("{name} follows {restriction}. You can still add it if you've agreed this with {name}.", { name: first, restriction: restrictionLabel(row.restriction ?? "") });
}
