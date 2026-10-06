import { test } from "node:test";
import assert from "node:assert/strict";
import { COLOR_THEMES, normalizeColorTheme } from "./colorThemes";

test("the five themes, Centium first", () => {
  assert.deepEqual(COLOR_THEMES.map((t) => t.value), ["centium", "sky", "rose", "gold", "coral"]);
});

test("the retired themes move to their nearest new theme (D2)", () => {
  assert.equal(normalizeColorTheme("ocean"), "sky");
  assert.equal(normalizeColorTheme("sunset"), "coral");
  assert.equal(normalizeColorTheme("berry"), "rose");
});

test("current values are kept and anything else is Centium", () => {
  for (const t of ["centium", "sky", "rose", "gold", "coral"]) assert.equal(normalizeColorTheme(t), t);
  assert.equal(normalizeColorTheme("lavender"), "centium");
  assert.equal(normalizeColorTheme(undefined), "centium");
  assert.equal(normalizeColorTheme(3), "centium");
});
