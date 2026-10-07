import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APP_DEFAULT,
  changedColumns,
  fromDbColorTheme,
  presentationToRow,
  rowToPresentation,
  samePresentation,
  toDbColorTheme,
} from "./mapping";
import { COLOR_THEMES } from "../../theme/colorThemes";

test("the app's five themes map to the five contract values", () => {
  assert.deepEqual(
    COLOR_THEMES.map((t) => toDbColorTheme(t.value)),
    ["centium", "sky_slate", "rose_blush", "gold_amber", "coral_terracotta"]
  );
});

test("never writes a retired value", () => {
  for (const t of COLOR_THEMES) {
    assert.ok(!["ocean", "sunset", "berry"].includes(toDbColorTheme(t.value)));
  }
});

test("reads the five back, and the retired three through the D2 mapping", () => {
  assert.equal(fromDbColorTheme("centium"), "centium");
  assert.equal(fromDbColorTheme("sky_slate"), "sky");
  assert.equal(fromDbColorTheme("rose_blush"), "rose");
  assert.equal(fromDbColorTheme("gold_amber"), "gold");
  assert.equal(fromDbColorTheme("coral_terracotta"), "coral");
  assert.equal(fromDbColorTheme("ocean"), "sky");
  assert.equal(fromDbColorTheme("sunset"), "coral");
  assert.equal(fromDbColorTheme("berry"), "rose");
  assert.equal(fromDbColorTheme(null), "centium");
});

test("a row round-trips, auto included", () => {
  const row = {
    theme: "auto" as const,
    color_theme: "gold_amber" as const,
    larger_text: true,
    reduce_motion: false,
    high_contrast: true,
    bigger_tap_targets: true,
  };
  const p = rowToPresentation(row);
  assert.deepEqual(p, {
    theme: "auto",
    colorTheme: "gold",
    largerText: true,
    reduceMotion: false,
    highContrast: true,
    biggerTargets: true,
  });
  assert.deepEqual(presentationToRow(p), row);
});

test("an unknown theme mode reads as auto, missing toggles as off", () => {
  assert.deepEqual(rowToPresentation({ theme: "sepia" }), {
    theme: "auto",
    colorTheme: "centium",
    largerText: false,
    reduceMotion: false,
    highContrast: false,
    biggerTargets: false,
  });
});

test("only the changed columns are written", () => {
  assert.deepEqual(changedColumns(APP_DEFAULT, { ...APP_DEFAULT, highContrast: true }), { high_contrast: true });
  assert.deepEqual(changedColumns(APP_DEFAULT, { ...APP_DEFAULT, theme: "dark", colorTheme: "rose" }), {
    theme: "dark",
    color_theme: "rose_blush",
  });
  assert.deepEqual(changedColumns(APP_DEFAULT, APP_DEFAULT), {});
  assert.ok(samePresentation(APP_DEFAULT, { ...APP_DEFAULT }));
  assert.ok(!samePresentation(APP_DEFAULT, { ...APP_DEFAULT, biggerTargets: true }));
});
