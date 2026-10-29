// Release 3 · W5 the NU screens' labels and colours (apart from the
// components so Fast refresh keeps working). Labels only: conflicts and their
// severity always come from food_conflicts, never from these strings.

import { ALLERGEN_LABEL } from "../client/clientFormat";
import { dietLabel } from "../../../utils/dietaryRestrictions";
import type { ConflictRow } from "./nutritionModel";

/** The board's macro colours (gen r13 dayTotal13, r14): protein, carbs, fat. */
export const MACRO_COLOUR = { p: "#7D6BB5", c: "#AEA1DC", f: "#A2C8C2" } as const;

export const allergenLabel = (a: string): string => ALLERGEN_LABEL[a] ?? a;
export const restrictionLabel = (r: string): string => dietLabel(r);

/** NU11 / NU12 titles (FINAL_PLAN 3 templates: "{food_name} contains {allergen}", "… may contain … Check this.", "{food_name} isn't {restriction}"). */
export function conflictTitle(name: string, row: ConflictRow): string {
  if (row.kind === "allergy_confirmed") return `${name} contains ${allergenLabel(row.allergen ?? "").toLowerCase()}`;
  if (row.kind === "allergy_check") return `${name} may contain ${allergenLabel(row.allergen ?? "").toLowerCase()}. Check this.`;
  return `${name} isn't ${restrictionLabel(row.restriction ?? "").toLowerCase()}`;
}

/** NU11 / NU12 lines; the severity only from the client's structured allergy. */
export function conflictBody(first: string, row: ConflictRow): string {
  if (row.kind === "allergy_confirmed")
    return `${first} is allergic to ${allergenLabel(row.allergen ?? "").toLowerCase()}${row.severity ? ` (${row.severity})` : ""}. Foods with an allergen are blocked by default.`;
  if (row.kind === "allergy_check") return `The name suggests it. Check the ingredients with ${first}.`;
  return `${first} follows ${restrictionLabel(row.restriction ?? "")}. You can still add it if you've agreed this with ${first}.`;
}
