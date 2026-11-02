import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canGoToPlanWeek,
  dayKcal,
  dayOffsetIn,
  draftColumns,
  draftError,
  draftOf,
  g4Missing,
  g4On,
  itemDetail,
  itemKcal,
  itemKind,
  itemTitle,
  itemsByMeal,
  moveItem,
  nextPosition,
  parseItems,
  parsePlan,
  planWeekOf,
  shiftWeek,
  weekDays,
  amountText,
  groceryView,
  parseGrocery,
  withChecked,
  PHOTO_MAX_BYTES,
  daysApartText,
  newestFirst,
  pairOrder,
  pairReady,
  parsePair,
  parsePhotos,
  photoErrorText,
  photoFileError,
  photoNote,
  photoPath,
  photoType,
  photosAddable,
  photosVisible,
  takenOnValid,
  PREMIUM_DB_THEMES,
  parseColorThemes,
  themeAccess,
  themeName,
  FREE_DESIGNS,
  SHARE_DESIGN_KEYS,
  insightAreaLabel,
  insightsToggleShown,
  PREMIUM_DESIGNS,
  designAccess,
  parseShareDesigns,
  insightsView,
  parseCycleInsights,
  phaseName,
  type PlanItem,
} from "./g4.ts";
import { COLOR_THEMES, PREMIUM_COLOR_THEMES, isPremiumTheme, normalizeColorTheme } from "../../theme/colorThemes.ts";
import { fromDbColorTheme, toDbColorTheme } from "../presentation/mapping.ts";
import { isPremiumThemeRefusal } from "../presentation/save.ts";
import { FREE_BACKGROUND, PREMIUM_BACKGROUND, designKeyOf, isPremiumBackground, premiumColours } from "../../components/share/client/premiumDesigns.ts";
import { cardColours } from "../../components/share/client/clientCardModel.ts";

// ---- hidden while off ----

test("G4 shows only with the switch known on; a missing function or table reads as no G4", () => {
  assert.equal(g4On(null), false);
  assert.equal(g4On(undefined), false);
  assert.equal(g4On({ premiumOn: false }), false);
  assert.equal(g4On({ premiumOn: true }), true);
  for (const code of ["PGRST202", "42883", "PGRST205", "42P01"]) assert.equal(g4Missing({ code }), true, code);
  assert.equal(g4Missing({ status: 404 }), true);
  for (const code of ["ATXQ1", "ATX08", "23505", undefined]) assert.equal(g4Missing({ code }), false, String(code));
  assert.equal(g4Missing(null), false);
});

// ---- the week ----

test("the planner's week starts on Monday, whatever day it is asked for", () => {
  // 2026-11-02 is a Monday.
  assert.equal(planWeekOf("2026-11-02"), "2026-11-02");
  assert.equal(planWeekOf("2026-11-04"), "2026-11-02");
  assert.equal(planWeekOf("2026-11-08"), "2026-11-02"); // Sunday belongs to the week before it
  assert.equal(planWeekOf("2026-11-09"), "2026-11-09");
  // Across a month and a year.
  assert.equal(planWeekOf("2027-01-01"), "2026-12-28");
  assert.deepEqual(weekDays("2026-12-28"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-02"), 0);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-08"), 6);
  assert.equal(dayOffsetIn("2026-11-02", "2026-11-09"), null);
  assert.equal(shiftWeek("2026-11-02", 1), "2026-11-09");
  assert.equal(shiftWeek("2026-11-02", -1), "2026-10-26");
  // A year either way.
  assert.equal(canGoToPlanWeek("2026-11-02", "2026-11-04"), true);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", 52), "2026-11-04"), true);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", 53), "2026-11-04"), false);
  assert.equal(canGoToPlanWeek(shiftWeek("2026-11-02", -53), "2026-11-04"), false);
});

// ---- items ----

const row = (o: Record<string, unknown>) => ({ id: "i1", plan_id: "p1", day_offset: 0, meal: "breakfast", position: 0, ...o });

test("an item is a recipe, a food, one of my own foods, or a note, by the reference it holds", () => {
  assert.equal(itemKind({ recipe_id: "r" }), "recipe");
  assert.equal(itemKind({ food_id: "f" }), "food");
  assert.equal(itemKind({ custom_food_id: "c" }), "custom_food");
  assert.equal(itemKind({ note: "Lemons" }), "note");
  assert.equal(itemKind({ recipe_id: null, food_id: null, custom_food_id: null }), "note");

  const items = parseItems([
    row({ id: "a", recipe_id: "r1", servings: 2, recipes: { title: "Porridge", servings: 2 } }),
    row({ id: "b", food_id: "f1", quantity: "200", unit: "ml", foods: { name: "Milk", serving_label: "100 ml", calories: 60 } }),
    row({ id: "c", custom_food_id: "c1", quantity: 1, unit: "serving", custom_foods: { name: "My bar", serving_label: "1 bar", calories: 210 } }),
    row({ id: "d", note: "Eat out" }),
    row({ id: "e", recipe_id: "r2", servings: 1, recipes: null }),
    // Not an item: a bad day or meal.
    row({ id: "x", day_offset: 7 }),
    row({ id: "y", meal: "brunch" }),
    null,
  ]);
  assert.deepEqual(items.map((i) => [i.id, i.kind]), [["a", "recipe"], ["b", "food"], ["c", "custom_food"], ["d", "note"], ["e", "recipe"]]);
  // G fixes: deleting a recipe or food takes its lines with it, so a nameless line is never "deleted": plain "Recipe".
  assert.deepEqual(items.map(itemTitle), ["Porridge", "Milk", "My bar", "Eat out", "Recipe"]);
  assert.deepEqual(items.map((i) => itemDetail(i, "en-US")), ["2 servings", "200 ml", "1 serving", "Note", "1 serving"]);
  assert.equal(parsePlan({ id: "p1", week_start: "2026-11-02", name: "My meal plan" })?.weekStart, "2026-11-02");
  assert.equal(parsePlan(null), null);
});

const item = (o: Partial<PlanItem>): PlanItem => ({
  id: "x", planId: "p", dayOffset: 0, meal: "breakfast", kind: "note", refId: null, servings: null, quantity: null, unit: null, note: "n",
  position: 0, name: null, servingLabel: null, kcalPerServing: null, ...o,
});

test("a day's items come by meal (breakfast, lunch, dinner, snacks) in position order, and new ones go last", () => {
  const list = [
    item({ id: "s", meal: "snack", position: 0 }),
    item({ id: "b2", meal: "breakfast", position: 2 }),
    item({ id: "b1", meal: "breakfast", position: 1 }),
    item({ id: "d", meal: "dinner", position: 0 }),
    item({ id: "tue", dayOffset: 1, meal: "lunch" }),
  ];
  assert.deepEqual(itemsByMeal(list, 0).map((g) => [g.meal, g.items.map((i) => i.id)]), [["breakfast", ["b1", "b2"]], ["dinner", ["d"]], ["snack", ["s"]]]);
  assert.deepEqual(itemsByMeal(list, 2), []);
  assert.equal(nextPosition(list, 0, "breakfast"), 3);
  assert.equal(nextPosition(list, 0, "lunch"), 0);
});

test("moving an item swaps it with its neighbour in the same meal and renumbers only what changed", () => {
  const list = [item({ id: "a", position: 0 }), item({ id: "b", position: 1 }), item({ id: "c", position: 2 }), item({ id: "other", meal: "lunch", position: 0 })];
  assert.deepEqual(moveItem(list, "b", -1), [{ id: "b", position: 0 }, { id: "a", position: 1 }]);
  assert.deepEqual(moveItem(list, "b", 1), [{ id: "c", position: 1 }, { id: "b", position: 2 }]);
  assert.deepEqual(moveItem(list, "a", -1), []);
  assert.deepEqual(moveItem(list, "c", 1), []);
  assert.deepEqual(moveItem(list, "other", 1), []);
  assert.deepEqual(moveItem(list, "nope", 1), []);
  // Gaps and ties are tidied into 0..n-1.
  const gappy = [item({ id: "a", position: 5 }), item({ id: "b", position: 9 })];
  assert.deepEqual(moveItem(gappy, "b", -1), [{ id: "b", position: 0 }, { id: "a", position: 1 }]);
});

test("a draft writes exactly one thing, inside the Database's checks", () => {
  assert.equal(draftError({ kind: "note", note: "  " }), "Write a note.");
  assert.equal(draftError({ kind: "note", note: "x".repeat(201) }), "Keep the note to 200 characters.");
  assert.equal(draftError({ kind: "recipe", refId: null, servings: "1" }), "Choose a recipe.");
  assert.equal(draftError({ kind: "food", refId: null, quantity: "1", unit: "g" }), "Choose a food.");
  for (const s of ["0", "21", "", "x"]) assert.ok(draftError({ kind: "recipe", refId: "r", servings: s }), s);
  for (const q of ["0", "10001", "-1", ""]) assert.ok(draftError({ kind: "food", refId: "f", quantity: q, unit: "g" }), q);
  assert.equal(draftError({ kind: "recipe", refId: "r", servings: "1,5" }), null);

  const none = { recipe_id: null, food_id: null, custom_food_id: null, servings: null, quantity: null, unit: null, note: null };
  assert.deepEqual(draftColumns({ kind: "note", note: " Lemons " }), { ...none, note: "Lemons" });
  assert.deepEqual(draftColumns({ kind: "recipe", refId: "r", servings: "1.5" }), { ...none, recipe_id: "r", servings: 1.5 });
  assert.deepEqual(draftColumns({ kind: "food", refId: "f", quantity: "200", unit: "ml" }), { ...none, food_id: "f", quantity: 200, unit: "ml" });
  assert.deepEqual(draftColumns({ kind: "custom_food", refId: "c", quantity: "2", unit: "serving" }), { ...none, custom_food_id: "c", quantity: 2, unit: "serving" });
  assert.equal(draftColumns({ kind: "recipe", refId: "r", servings: "0" }), null);

  // Editing round-trips.
  assert.deepEqual(draftOf(item({ kind: "recipe", refId: "r", servings: 2 })), { kind: "recipe", refId: "r", servings: "2" });
  assert.deepEqual(draftOf(item({ kind: "custom_food", refId: "c", quantity: 3, unit: "g" })), { kind: "custom_food", refId: "c", quantity: "3", unit: "g" });
});

test("calories show only where they can be worked out, and never while numbers are hidden (recovery-sensitive mode)", () => {
  const opts = { hideNumbers: false, recipeKcalPerServing: (id: string) => (id === "r" ? 250 : null), multiplier: (_l: string, q: number, u: string) => (u === "serving" ? q : q / 100) };
  const recipe = item({ kind: "recipe", refId: "r", servings: 2 });
  const milk = item({ kind: "food", refId: "f", quantity: 200, unit: "ml", kcalPerServing: 60, servingLabel: "100 ml" });
  const note = item({ kind: "note" });
  assert.equal(itemKcal(recipe, opts), 500);
  assert.equal(itemKcal(milk, opts), 120);
  assert.equal(itemKcal(note, opts), null);
  assert.equal(itemKcal(item({ kind: "recipe", refId: "gone", servings: 1 }), opts), null);
  assert.equal(dayKcal([500, 120, null], false), 620);
  assert.equal(dayKcal([null], false), null);
  const hidden = { ...opts, hideNumbers: true };
  assert.equal(itemKcal(recipe, hidden), null);
  assert.equal(itemKcal(milk, hidden), null);
  assert.equal(dayKcal([500, 120], true), null);
});

// ---- the grocery list ----

test("the grocery list shows what's left to buy first, amounts in words, the recipes each line is for, and notes without an amount", () => {
  const lines = parseGrocery([
    { item_key: "c:milk:ml", name: "Milk", quantity: "600", unit: "ml", from_recipes: ["Porridge"], checked: false },
    { item_key: "n:1", name: "Lemons", quantity: null, unit: null, from_recipes: [], checked: false },
    { item_key: "c:oats:g", name: "Oats", quantity: 80, unit: "g", from_recipes: ["Porridge", "Flapjack"], checked: true },
    { item_key: "f:egg:serving", name: "Eggs", quantity: 1, unit: "serving", from_recipes: [], checked: false },
    { item_key: "f:x:cup", name: "Rice", quantity: 2.5, unit: "cup", from_recipes: null, checked: false },
    { item_key: "", name: "No key" },
    { item_key: "k", name: "" },
  ]);
  assert.equal(lines.length, 5);
  const v = groceryView(lines, "en-US");
  assert.deepEqual(v.toBuy.map((l) => [l.name, l.amount, l.from]), [
    ["Milk", "600 ml", "For Porridge"],
    ["Lemons", null, null],
    ["Eggs", "1 serving", null],
    ["Rice", "2.5 cups", null],
  ]);
  assert.deepEqual(v.done.map((l) => [l.name, l.amount, l.from, l.checked]), [["Oats", "80 g", "For Porridge, Flapjack", true]]);
  // A tick moves a line at once (and back if the save fails).
  const ticked = withChecked(lines, "n:1", true);
  assert.deepEqual(groceryView(ticked).done.map((l) => l.name), ["Lemons", "Oats"]);
  assert.deepEqual(groceryView(withChecked(ticked, "n:1", false)).done.map((l) => l.name), ["Oats"]);
  assert.equal(amountText(1, "cup"), "1 cup");
  assert.equal(amountText(2, "tbsp"), "2 tbsp");
});

// ---- progress photos ----

test("progress photos show nowhere in recovery-sensitive mode (or while it loads), with the switch off, or without G4", () => {
  assert.equal(photosVisible({ premiumOn: true, g4: true, hideNumbers: false }), true);
  assert.equal(photosVisible({ premiumOn: true, g4: true, hideNumbers: true }), false);
  assert.equal(photosVisible({ premiumOn: false, g4: true, hideNumbers: false }), false);
  assert.equal(photosVisible({ premiumOn: true, g4: false, hideNumbers: false }), false);
  // The Add button also needs i_may_add_progress_photos() to say yes (unknown = no).
  assert.equal(photosAddable({ visible: true, mayAdd: true }), true);
  assert.equal(photosAddable({ visible: true, mayAdd: false }), false);
  assert.equal(photosAddable({ visible: true, mayAdd: null }), false);
  assert.equal(photosAddable({ visible: false, mayAdd: true }), false);
});

test("a photo is checked before upload: jpeg, png, webp or heic, up to 10 MB, into my own folder", () => {
  const ok = (type: string, name = "a", size = 1000) => photoFileError({ type, name, size });
  assert.equal(ok("image/jpeg"), null);
  assert.equal(ok("image/png"), null);
  assert.equal(ok("image/webp"), null);
  assert.equal(ok("image/heic"), null);
  assert.equal(photoType({ type: "", name: "IMG_1.HEIC" }), "image/heic");
  assert.equal(photoType({ type: "image/heif", name: "x" }), "image/heic");
  assert.equal(photoType({ type: "image/jpg", name: "x" }), "image/jpeg");
  assert.equal(photoType({ type: "", name: "x.jpeg" }), "image/jpeg");
  assert.equal(ok("image/gif"), "Choose a JPEG, PNG, WebP or HEIC photo.");
  assert.equal(ok("application/pdf", "scan.pdf"), "Choose a JPEG, PNG, WebP or HEIC photo.");
  assert.equal(ok("image/jpeg", "a", 0), "That file is empty.");
  assert.equal(ok("image/jpeg", "a", PHOTO_MAX_BYTES), null);
  assert.equal(ok("image/jpeg", "a", PHOTO_MAX_BYTES + 1), "Choose a photo under 10 MB.");
  const owner = "0f8fad5b-d9cb-469f-a165-70867728950e";
  const path = photoPath(owner, "image/heic", "2026-11-02", "1b4e28ba-2fa1-11d2-883f-0016d3cca427");
  assert.equal(path.split("/")[0], owner);
  assert.match(path, /^[0-9a-f-]{36}\/2026-11-02-[0-9a-f]{24}\.heic$/);
  assert.ok(path.length >= 40 && path.length <= 300);
  assert.equal(photoNote("  "), null);
  assert.equal(photoNote(" Week 4 "), "Week 4");
  assert.equal(takenOnValid("2026-11-02", "2026-11-02"), true);
  assert.equal(takenOnValid("2026-11-03", "2026-11-02"), false);
  assert.equal(takenOnValid("02/11/2026", "2026-11-02"), false);
});

test("photos come newest first, and a pair is shown earlier first with the days between", () => {
  const photos = parsePhotos([
    { photo_id: "b", taken_on: "2026-10-01", pose: "side", note: null, storage_path: "u/b.jpg", created_at: "2026-10-01T09:00:00Z" },
    { photo_id: "a", taken_on: "2026-11-01", pose: "front", note: "Week 8", storage_path: "u/a.jpg", created_at: "2026-11-01T09:00:00Z" },
    { photo_id: "c", taken_on: "2026-10-01", pose: "weird", storage_path: "u/c.jpg", created_at: "2026-10-01T10:00:00Z" },
    { photo_id: "x", taken_on: null, storage_path: "u/x.jpg" },
  ]);
  assert.deepEqual(photos.map((p) => p.id), ["b", "a", "c"]);
  assert.equal(photos[2].pose, "other");
  assert.deepEqual(newestFirst(photos).map((p) => p.id), ["a", "c", "b"]);
  const [early, late] = pairOrder(photos[1], photos[0]);
  assert.deepEqual([early.id, late.id], ["b", "a"]);
  assert.deepEqual(pairOrder(photos[2], photos[0]).map((p) => p.id), ["b", "c"]); // same day: the one added first
  const pair = parsePair([{ first_photo_id: "a", first_taken_on: "2026-11-01", first_path: "u/a.jpg", second_photo_id: "b", second_taken_on: "2026-10-01", second_path: "u/b.jpg", days_between: 31 }]);
  assert.equal(pair?.first.id, "b"); // earlier first, even if a row came back the other way
  assert.equal(pair?.daysBetween, 31);
  assert.equal(parsePair([]), null);
  assert.equal(daysApartText(31), "31 days apart");
  assert.equal(daysApartText(1), "1 day apart");
  assert.equal(daysApartText(0), "Same day");
  assert.equal(pairReady("a", "b"), true);
  assert.equal(pairReady("a", "a"), false);
  assert.equal(pairReady("a", null), false);
  assert.equal(photoErrorText("ATX08"), "Choose two of your own photos.");
});

// ---- colour themes ----

test("a Premium theme is hidden while the switch is off or unlisted, locked without Premium, open with it; the five stay free", () => {
  const rows = parseColorThemes([
    { theme: "centium", name: null, premium: false, locked: false },
    { theme: "forest_sage", name: "Forest sage", premium: true, locked: true },
    { theme: "midnight_indigo", name: "Midnight indigo", premium: true, locked: false },
    { theme: "ocean_teal", name: "Ocean teal", premium: true, locked: false },
    { theme: null },
  ]);
  assert.equal(rows.length, 4);
  assert.equal(rows[1].name, "Forest sage");
  assert.equal(rows[0].name, null);
  // G fixes: the app's own t() label for a theme it knows; the Database's name only for a key it doesn't.
  assert.equal(themeName("forest_sage", "Forest sage", rows), "Forest sage");
  assert.equal(themeName("midnight_indigo", "Midnight indigo", [{ theme: "midnight_indigo", name: "Something else", premium: true, locked: false }]), "Midnight indigo");
  assert.equal(themeName("ocean_teal", null, rows), "Ocean teal");
  assert.equal(themeName("ocean_teal", null, null), "ocean_teal");
  assert.equal(themeAccess("forest_sage", { premiumOn: true, rows }), "locked");
  assert.equal(themeAccess("midnight_indigo", { premiumOn: true, rows }), "open");
  assert.equal(themeAccess("plum_lilac", { premiumOn: true, rows }), "hidden"); // not listed
  assert.equal(themeAccess("forest_sage", { premiumOn: false, rows }), "hidden");
  assert.equal(themeAccess("forest_sage", { premiumOn: true, rows: null }), "hidden"); // loading or unknown
  assert.deepEqual(PREMIUM_DB_THEMES, ["forest_sage", "midnight_indigo", "plum_lilac"]);
  // The app's ids, the Database's values, and the five unchanged.
  assert.deepEqual(COLOR_THEMES.map((t) => t.value), ["centium", "sky", "rose", "gold", "coral"]);
  assert.deepEqual(PREMIUM_COLOR_THEMES.map((t) => [t.value, toDbColorTheme(t.value)]), [["forest", "forest_sage"], ["midnight", "midnight_indigo"], ["plum", "plum_lilac"]]);
  for (const t of PREMIUM_COLOR_THEMES) {
    assert.equal(fromDbColorTheme(t.db), t.value);
    assert.equal(normalizeColorTheme(t.value), t.value); // a chosen Premium theme stays the member's
    assert.equal(isPremiumTheme(t.value), true);
  }
  assert.equal(isPremiumTheme("sky"), false);
  // ATXQ1 (or ATXQ0) from saving device_presentation_settings is the prompt, not a retry.
  assert.equal(isPremiumThemeRefusal({ code: "ATXQ1" }), true);
  assert.equal(isPremiumThemeRefusal({ code: "P0001", message: "ATXQ0: not yet" }), true);
  assert.equal(isPremiumThemeRefusal({ code: "42501" }), false);
});

// ---- share-card designs ----

test("the three Premium share designs: hidden while off or unlisted, locked without Premium; today's backgrounds untouched", () => {
  const rows = parseShareDesigns([
    { key: "centium", name: "Centium", premium: false, locked: false },
    { key: "pattern", name: "Pattern", premium: false, locked: false },
    { key: "photo", name: "Photo", premium: false, locked: false },
    { key: "bold", name: "Bold", premium: true, locked: true },
    { key: "gradient", name: "Gradient", premium: true, locked: false },
    { key: "premium_badge", name: "Premium badge", premium: true, locked: true },
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["centium", "pattern", "photo", "bold", "gradient", "premium_badge"]);
  // G fixes: the keys are centium, pattern, photo (free) and bold, gradient, premium_badge; "clean" is gone.
  assert.deepEqual([...SHARE_DESIGN_KEYS], rows.map((r) => r.key));
  assert.equal((SHARE_DESIGN_KEYS as readonly string[]).includes("clean"), false);
  // The sheet's three free backgrounds map to those keys, and back.
  assert.deepEqual(FREE_DESIGNS.map((k) => FREE_BACKGROUND[k]), ["B", "I", "P"]);
  assert.deepEqual(["B", "I", "P", "BOLD", "GRAD", "BADGE"].map(designKeyOf), ["centium", "pattern", "photo", "bold", "gradient", "premium_badge"]);
  assert.equal(designKeyOf("clean"), null);
  for (const k of FREE_DESIGNS) assert.equal(designAccess(k as never, { premiumOn: true, rows }), "hidden", "a free design is never a Premium chip");
  assert.equal(designAccess("bold", { premiumOn: true, rows }), "locked");
  assert.equal(designAccess("gradient", { premiumOn: true, rows }), "open");
  assert.equal(designAccess("bold", { premiumOn: false, rows }), "hidden");
  assert.equal(designAccess("bold", { premiumOn: true, rows: null }), "hidden");
  assert.equal(designAccess("bold", { premiumOn: true, rows: rows.slice(0, 3) }), "hidden"); // the switch off for me: only the free ones are listed
  assert.deepEqual(PREMIUM_DESIGNS.map((k) => PREMIUM_BACKGROUND[k]), ["BOLD", "GRAD", "BADGE"]);
  for (const bg of ["BOLD", "GRAD", "BADGE"] as const) {
    assert.equal(isPremiumBackground(bg), true);
    assert.equal(cardColours("workout", "story", bg).ink, "#FFFFFF");
    // Never on the sticker, which stays transparent with white stats.
    assert.equal(cardColours("workout", "sticker", bg).bg, "transparent");
  }
  for (const bg of ["B", "I", "P", null]) assert.equal(isPremiumBackground(bg), false);
  assert.equal(premiumColours("BOLD").acc, "#F6C445");
  // Today's three are what they were.
  assert.equal(cardColours("workout", "story", "B").bg, cardColours("workout", "story", "P").bg);
  assert.notEqual(cardColours("workout", "story", "I").ink, "#FFFFFF");
});

// ---- cycle insights ----

test("cycle insights (G fixes): nothing, just the note, or the four insights and the note; the lock for a free member", () => {
  // An empty list and a null note (not tracking, turned off, pregnant, no copy): nothing at all.
  const empty = parseCycleInsights([{ phase: "luteal", cycle_day: 21, insights: [], note: null }]);
  assert.deepEqual(empty, { phase: "luteal", cycleDay: 21, insights: [], note: null });
  assert.deepEqual(insightsView({ kind: "ready", value: empty }), { kind: "none" });
  // Only the note (not predictable yet, contraception, no phase): just the note, no Premium label.
  const noteOnly = parseCycleInsights([{ phase: null, cycle_day: null, insights: [], note: { key: "cycle.note", body: "Everyone's cycle is different." } }]);
  assert.deepEqual(insightsView({ kind: "ready", value: noteOnly }), { kind: "note", note: { key: "cycle.note", body: "Everyone's cycle is different." } });
  // A free member (ATXQ1): the locked card. ATXQ0, off, loading, failed: nothing.
  assert.deepEqual(insightsView({ kind: "premium" }), { kind: "locked" });
  for (const kind of ["hidden", "loading", "error"]) assert.deepEqual(insightsView({ kind }), { kind: "none" }, kind);
  // Otherwise the four insights, one per area, and the note.
  const full = parseCycleInsights([
    {
      phase: "follicular",
      cycle_day: "8",
      insights: [
        { key: "cycle.follicular.training", area: "training", title: "Energy", body: "Often rises." },
        { key: "cycle.follicular.food", area: "food", title: "Appetite", body: "Often steady." },
        { key: "cycle.follicular.sleep", area: "sleep", title: "Sleep", body: "Often easier." },
        { key: "cycle.follicular.mood", area: "mood", title: "Mood", body: "Often lifts." },
        { title: "", body: "dropped" },
        { title: "No body" },
        { key: "x", area: "weather", title: "Unknown area", body: "kept, unlabelled" },
      ],
      note: { key: "cycle.note", body: "Everyone's cycle is different." },
    },
  ]);
  assert.deepEqual(full.insights.map((i) => i.area), ["training", "food", "sleep", "mood", null]);
  assert.deepEqual(full.insights[0], { key: "cycle.follicular.training", area: "training", title: "Energy", body: "Often rises." });
  assert.equal(full.cycleDay, 8);
  assert.equal(full.note?.body, "Everyone's cycle is different.");
  const view = insightsView({ kind: "ready", value: full });
  assert.equal(view.kind, "card");
  assert.deepEqual(full.insights.map((i) => insightAreaLabel(i.area)), ["Training", "Food", "Sleep", "Mood", null]);
  // A note without a body is no note.
  assert.equal(parseCycleInsights([{ insights: [], note: { key: "cycle.note" } }]).note, null);
  assert.deepEqual(parseCycleInsights(null), { phase: null, cycleDay: null, insights: [], note: null });
  // The member's switch: only while the Premium switch is on, G4 is there and the value could be read.
  const on = { premiumOn: true };
  assert.equal(insightsToggleShown(on, true, true), true);
  assert.equal(insightsToggleShown(on, true, false), true);
  assert.equal(insightsToggleShown(on, true, null), false);
  assert.equal(insightsToggleShown(on, false, true), false);
  assert.equal(insightsToggleShown({ premiumOn: false }, true, true), false);
  assert.equal(insightsToggleShown(null, true, true), false);
  assert.equal(phaseName("menstrual"), "Period");
  assert.equal(phaseName("pregnant"), null);
});
