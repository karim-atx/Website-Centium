import type { ClientNutrition } from "../types";
import { formatDisplayDate } from "./date";

// One source of truth for how a client's food-diary state is worded to their
// professional. Five separate surfaces render this — the roster row, the
// client sheet's summary grid, its Food Diary card, the recovery-sensitive
// Meal rhythm card, and the collapsible clinical panel — and before this they
// each made their own decision, which is how one of them ended up printing a
// confident "0 kcal" for a client whose intake was simply unknown.
//
// THE FOUR STATES, and why none of them may borrow another's wording:
//
//   not shared   The professional has not been granted the food diary. Saying
//                "no meals logged" here would report the client's behaviour to
//                someone with no right to it, and would be a guess stated as
//                fact. Say only that it is not shared.
//   loading      Shared, not yet fetched. Must not read as an absence, or the
//                dashboard flashes "no meals logged" on every load and then
//                silently contradicts itself.
//   empty        Shared, nothing logged in the lookback window. A real answer.
//   figures      Shared, with totals for a named day.

/** Whether a professional may see this client's diary at all. */
export type FoodDiaryAccess = { foodDiary: boolean };

export type NutritionState = "not_shared" | "loading" | "empty" | "figures";

export function nutritionState(
  access: FoodDiaryAccess,
  nutrition: ClientNutrition | null | undefined
): NutritionState {
  if (!access.foodDiary) return "not_shared";
  if (nutrition === undefined) return "loading";
  if (nutrition === null) return "empty";
  return "figures";
}

/**
 * The standard one-line summary.
 *
 * Deliberately "last logged day" with its date rather than "yesterday". A
 * client who logs sporadically has no entries on most yesterdays, so the old
 * framing rendered 0 kcal for days they simply had not logged — the same
 * confident-zero problem in a different place.
 */
export function nutritionLine(
  access: FoodDiaryAccess,
  nutrition: ClientNutrition | null | undefined
): string {
  switch (nutritionState(access, nutrition)) {
    case "not_shared":
      return "Not sharing food diary";
    case "loading":
      return "Loading food diary…";
    case "empty":
      return "No meals logged yet";
    case "figures":
      return `${nutrition!.calories.toLocaleString()} kcal · ${formatDisplayDate(nutrition!.lastLoggedDate)}`;
  }
}

/**
 * The recovery-sensitive wording, for clients whose card is subject to the
 * QA 12.0 constraints: no large calorie totals, and no punitive missed-log
 * indicators, on the professional's routine surfaces.
 *
 * Two consequences worth stating rather than leaving implicit:
 *
 *   * No number is ever returned here. The figure still exists and is still
 *     reachable, but only inside the clinical panel, which is collapsed by
 *     default and takes a deliberate tap to open.
 *   * The empty and loading states deliberately say the SAME thing. "No meals
 *     logged yet" is exactly the missed-log indicator the constraint rules
 *     out, so absence is not reported at all here; both fall back to stating
 *     the sharing relationship. That makes the two indistinguishable on this
 *     surface, which is the intended trade.
 */
export function nutritionLineRecoverySensitive(
  access: FoodDiaryAccess,
  nutrition: ClientNutrition | null | undefined
): string {
  switch (nutritionState(access, nutrition)) {
    case "not_shared":
      return "Not sharing food diary";
    case "figures":
      return `Meals logged · ${formatDisplayDate(nutrition!.lastLoggedDate)}`;
    default:
      return "Sharing food diary";
  }
}
