import { isOffline } from "../network-error";
import { t } from "../../i18n/core";

// Why a food search came back empty, kept apart from services/food/index.ts so
// it can be tested without a Supabase client.

export type FoodSearchFailure = "offline" | "error";

/** Either query failing counts; a dropped connection outranks any other cause. */
export function searchFailure(errors: ReadonlyArray<unknown>): FoodSearchFailure | null {
  const failed = errors.filter((e) => e != null);
  if (failed.length === 0) return null;
  return failed.some((e) => isOffline(e)) ? "offline" : "error";
}

/**
 * The line an empty result shows when the search could not run, or null when
 * it did run and "not found" is the truth. The device's own offline flag
 * counts too: a search typed with no connection never reached the server.
 */
export function searchEmptyLine(failure: FoodSearchFailure | null, online: boolean): string | null {
  if (failure === "offline" || (failure !== null && !online)) {
    return t("You're offline. Search needs a connection.");
  }
  if (failure === "error") return t("Couldn't search. Try again.");
  return null;
}
