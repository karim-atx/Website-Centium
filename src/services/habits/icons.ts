import type { HabitIconKey } from "../../types";

// The values of public.habit_icon (Stage A1, HANDOVER_API.md "Habit icons").
//
// AN ENUM, NOT FREE TEXT, so the database already refuses anything else with
// 22P02. This list is checked before the write so the user gets a sentence
// instead of a generic failure, and on the read so a value this build does
// not know (a later migration adding a 21st) renders as CircleDot rather than
// crashing the row on a missing component.
//
// Kept (8): the semantic names production rows already hold. New (12): named
// after the Lucide icon the MO1.1.1.1 picker draws.
export const HABIT_ICON_KEYS = [
  "water",
  "steps",
  "workout",
  "journal",
  "meditation",
  "sleep",
  "book",
  "custom",
  "glass_water",
  "moon",
  "sun",
  "apple",
  "salad",
  "coffee",
  "bike",
  "heart",
  "smile",
  "music",
  "phone_off",
  "timer",
] as const satisfies readonly HabitIconKey[];

// Compile-time guard that the list and the type are the same set: adding a
// value to one without the other fails here.
type Missing = Exclude<HabitIconKey, (typeof HABIT_ICON_KEYS)[number]>;
const _exhaustive: Missing extends never ? true : never = true;
void _exhaustive;

export function isHabitIconKey(value: unknown): value is HabitIconKey {
  return typeof value === "string" && (HABIT_ICON_KEYS as readonly string[]).includes(value);
}

/** A stored icon as the UI may render it: unknown values fall back to `custom`. */
export function toHabitIcon(value: unknown): HabitIconKey {
  return isHabitIconKey(value) ? value : "custom";
}

/** Mirrors the enum. Returns a sentence, or null. */
export function validateHabitIcon(value: unknown): string | null {
  return isHabitIconKey(value) ? null : "Pick an icon for the habit.";
}
