import { strict as assert } from "node:assert";
import { test } from "node:test";
import { HABIT_ICON_KEYS, isHabitIconKey, toHabitIcon, validateHabitIcon } from "./icons.ts";

// HANDOVER_API.md, Stage A1 "Habit icons".
const KEPT = ["water", "steps", "workout", "journal", "meditation", "sleep", "book", "custom"];
const NEW = [
  "glass_water", "moon", "sun", "apple", "salad", "coffee",
  "bike", "heart", "smile", "music", "phone_off", "timer",
];

test("the list is exactly the 20 values of public.habit_icon", () => {
  assert.equal(HABIT_ICON_KEYS.length, 20);
  assert.equal(new Set(HABIT_ICON_KEYS).size, 20);
  assert.deepEqual([...HABIT_ICON_KEYS].sort(), [...KEPT, ...NEW].sort());
});

test("every kept and new value is accepted", () => {
  for (const k of [...KEPT, ...NEW]) {
    assert.equal(isHabitIconKey(k), true, k);
    assert.equal(validateHabitIcon(k), null, k);
  }
});

test("anything else is refused before the write", () => {
  for (const bad of ["", "Droplet", "GlassWater", "glass-water", "WATER", null, undefined, 3]) {
    assert.equal(isHabitIconKey(bad), false, String(bad));
    assert.equal(typeof validateHabitIcon(bad), "string", String(bad));
  }
});

test("a stored value this build does not know renders as custom", () => {
  assert.equal(toHabitIcon("sleep"), "sleep");
  assert.equal(toHabitIcon("phone_off"), "phone_off");
  assert.equal(toHabitIcon("rocket"), "custom");
  assert.equal(toHabitIcon(null), "custom");
});
