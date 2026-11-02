// FO1.1 "Copy to…" labels, shared by the sheet and the diary's toast.
import { shiftDate } from "./date";
import type { MealType } from "../types";
import { appLocale } from "../i18n/format";
import { t, tk } from "../i18n/core";

export const COPY_MEALS: MealType[] = ["breakfast", "snack", "lunch", "dinner"];
export const COPY_MEAL_LABEL: Record<MealType, string> = {
  breakfast: tk("Breakfast"),
  snack: tk("Snacks"),
  lunch: tk("Lunch"),
  dinner: tk("Dinner"),
};

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
/** "Thu, Sep 24", or Today / Tomorrow. */
export function copyDayLabel(day: string, today: string): string {
  if (day === today) return t("Today");
  if (day === shiftDate(today, 1)) return t("Tomorrow");
  return utc(day).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
/** The toast's "Sat Sep 26". */
export const copyToastDate = (day: string) =>
  utc(day).toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).replace(",", "");
