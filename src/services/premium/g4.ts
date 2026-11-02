// Round G4 · the member's meal planner and grocery list, progress photos,
// the Premium colour themes, the Premium share-card designs and cycle phase
// insights: the pure half (parsers, decisions, sentences). No React and no
// Supabase, so the tests read it directly.
//
// Contract: Database Round G4 (PR #58, migrations 20261226290000-320000;
// design-handover/round-g/DB_G4_HANDOVER.md).
//
// THE TWO RULES:
//   - with the switch off (premium_on false, still loading, a call answering
//     ATXQ0, or a Database without G4), NONE OF G4 SHOWS: every decision here
//     reads a missing answer as "hidden";
//   - progress photos show NOWHERE in recovery-sensitive mode: no button, no
//     list and no reader call (photosVisible).

import { t, tn, tx } from "../../i18n/core";
import { addDays, mondayOf } from "./g3";
import { isMissingFunction } from "./g2";
import type { MyPremium } from "./model";

type Row = Record<string, unknown>;
type Err = { code?: string | null; message?: string | null; details?: string | null; status?: number | null } | null | undefined;

const rowsOf = (data: unknown): Row[] => (Array.isArray(data) ? data : []).filter((x): x is Row => !!x && typeof x === "object");
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const ymd = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const obj = (v: unknown): Row | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : null);

// ---- hidden while off ----

/** G4 may show at all: the switch known to be on (loading and unknown read as off). */
export const g4On = (p: Pick<MyPremium, "premiumOn"> | null | undefined): boolean => p?.premiumOn === true;

/** A table the Database doesn't have yet (PostgREST PGRST205, Postgres 42P01). */
export function isMissingTable(e: Err): boolean {
  return !!e && (e.code === "PGRST205" || e.code === "42P01");
}

/** A G4 read that means "this Database has no G4": a missing function or table. */
export const g4Missing = (e: Err): boolean => isMissingFunction(e) || isMissingTable(e);

// ---- the week (the meal planner) ----

/** Monday 0 … Sunday 6, as member_meal_plan_items.day_offset. */
export const DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6] as const;

/** The plan's week for a day: its Monday (member_meal_plans.week_start). */
export const planWeekOf = (day: string): string => mondayOf(day);

/** The seven days of a week, Monday first. */
export const weekDays = (weekStart: string): string[] => DAY_OFFSETS.map((n) => addDays(weekStart, n));

/** A day's offset in its week (0 = Monday), or null outside it. */
export function dayOffsetIn(weekStart: string, day: string): number | null {
  const i = weekDays(weekStart).indexOf(day);
  return i < 0 ? null : i;
}

/** The week before or after. */
export const shiftWeek = (weekStart: string, by: number): string => addDays(weekStart, by * 7);

/** How far the planner goes: a year back and a year ahead of this week. */
export function canGoToPlanWeek(weekStart: string, today: string): boolean {
  const now = planWeekOf(today);
  return weekStart >= addDays(now, -364) && weekStart <= addDays(now, 364);
}

// ---- meal plan items ----

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";
export type FoodUnit = "serving" | "g" | "ml" | "cup" | "tbsp" | "tsp";

/** The planner's meal order, as the diary's (breakfast, lunch, dinner, snacks). */
export const PLAN_MEALS: readonly MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
export const FOOD_UNITS: readonly FoodUnit[] = ["serving", "g", "ml", "cup", "tbsp", "tsp"];

const isMeal = (v: unknown): v is MealSlot => typeof v === "string" && (PLAN_MEALS as readonly string[]).includes(v);
const isUnit = (v: unknown): v is FoodUnit => typeof v === "string" && (FOOD_UNITS as readonly string[]).includes(v);

export interface MealPlan {
  id: string;
  weekStart: string;
  name: string;
}

/** A member_meal_plans row, or null. */
export function parsePlan(data: unknown): MealPlan | null {
  const r = obj(data);
  const id = str(r?.id);
  const weekStart = ymd(r?.week_start);
  if (!r || !id || !weekStart) return null;
  return { id, weekStart, name: str(r.name) ?? "" };
}

export type ItemKind = "recipe" | "food" | "custom_food" | "note";

/** What the item points at, with what the planner shows of it. */
export interface PlanItem {
  id: string;
  planId: string;
  dayOffset: number;
  meal: MealSlot;
  kind: ItemKind;
  /** recipe_id, food_id or custom_food_id; null for a note. */
  refId: string | null;
  servings: number | null;
  quantity: number | null;
  unit: FoodUnit | null;
  note: string | null;
  position: number;
  /** The recipe's title or the food's name (embedded); null once it was deleted. */
  name: string | null;
  /** A food's serving label and calories per serving (for the kcal line). */
  servingLabel: string | null;
  kcalPerServing: number | null;
}

/** The item's kind, from which reference it holds (the Database allows one). */
export function itemKind(r: { recipe_id?: unknown; food_id?: unknown; custom_food_id?: unknown; note?: unknown }): ItemKind {
  if (str(r.recipe_id)) return "recipe";
  if (str(r.food_id)) return "food";
  if (str(r.custom_food_id)) return "custom_food";
  return "note";
}

/** member_meal_plan_items rows (with recipes / foods / custom_foods embedded). */
export function parseItems(data: unknown): PlanItem[] {
  return rowsOf(data).flatMap((r): PlanItem[] => {
    const id = str(r.id);
    const planId = str(r.plan_id);
    const day = num(r.day_offset);
    if (!id || !planId || day === null || day < 0 || day > 6 || !isMeal(r.meal)) return [];
    const kind = itemKind(r);
    const recipe = obj(r.recipes);
    const food = obj(r.foods) ?? obj(r.custom_foods);
    const refId = kind === "recipe" ? str(r.recipe_id) : kind === "food" ? str(r.food_id) : kind === "custom_food" ? str(r.custom_food_id) : null;
    return [
      {
        id,
        planId,
        dayOffset: Math.floor(day),
        meal: r.meal,
        kind,
        refId,
        servings: num(r.servings),
        quantity: num(r.quantity),
        unit: isUnit(r.unit) ? r.unit : null,
        note: str(r.note),
        position: num(r.position) ?? 0,
        name: kind === "recipe" ? str(recipe?.title) : kind === "note" ? null : str(food?.name),
        servingLabel: kind === "food" || kind === "custom_food" ? str(food?.serving_label) : null,
        kcalPerServing: kind === "food" || kind === "custom_food" ? num(food?.calories) : null,
      },
    ];
  });
}

/** One day's items by meal, each meal in position order; empty meals left out. */
export function itemsByMeal(items: readonly PlanItem[], dayOffset: number): { meal: MealSlot; items: PlanItem[] }[] {
  return PLAN_MEALS.flatMap((meal) => {
    const here = items.filter((i) => i.dayOffset === dayOffset && i.meal === meal).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    return here.length ? [{ meal, items: here }] : [];
  });
}

/** The position a new item takes: after the last in its day and meal. */
export function nextPosition(items: readonly PlanItem[], dayOffset: number, meal: MealSlot): number {
  const here = items.filter((i) => i.dayOffset === dayOffset && i.meal === meal);
  return here.length ? Math.max(...here.map((i) => i.position)) + 1 : 0;
}

/**
 * Moving an item up or down within its day and meal: the positions to write
 * (every item of that meal renumbered 0..n-1 in the new order, only the ones
 * that changed). Empty when it can't move that way.
 */
export function moveItem(items: readonly PlanItem[], id: string, dir: -1 | 1): { id: string; position: number }[] {
  const it = items.find((i) => i.id === id);
  if (!it) return [];
  const group = itemsByMeal(items, it.dayOffset).find((g) => g.meal === it.meal)?.items ?? [];
  const at = group.findIndex((i) => i.id === id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= group.length) return [];
  const order = [...group];
  [order[at], order[to]] = [order[to], order[at]];
  return order.flatMap((i, n) => (i.position === n ? [] : [{ id: i.id, position: n }]));
}

/** What the add / edit sheet holds before it is saved. */
export type ItemDraft =
  | { kind: "recipe"; refId: string | null; servings: string }
  | { kind: "food" | "custom_food"; refId: string | null; quantity: string; unit: FoodUnit }
  | { kind: "note"; note: string };

/** The columns an item writes: exactly one thing, as the Database's checks require. */
export interface ItemColumns {
  recipe_id: string | null;
  food_id: string | null;
  custom_food_id: string | null;
  servings: number | null;
  quantity: number | null;
  unit: FoodUnit | null;
  note: string | null;
}

const parseAmount = (s: string): number | null => {
  const n = Number(s.trim().replace(",", "."));
  return s.trim() !== "" && Number.isFinite(n) ? n : null;
};

/** Why a draft can't be saved yet (one sentence), or null when it can. */
export function draftError(d: ItemDraft): string | null {
  if (d.kind === "note") {
    const n = d.note.trim();
    if (!n) return t("Write a note.");
    if (n.length > 200) return t("Keep the note to 200 characters.");
    return null;
  }
  if (!d.refId) return d.kind === "recipe" ? t("Choose a recipe.") : t("Choose a food.");
  if (d.kind === "recipe") {
    const s = parseAmount(d.servings);
    return s === null || s <= 0 || s > 20 ? t("Servings must be more than 0 and at most 20.") : null;
  }
  const q = parseAmount(d.quantity);
  return q === null || q <= 0 || q > 10000 ? t("The amount must be more than 0 and at most 10,000.") : null;
}

/** The draft as the columns to write (call draftError first; null if it isn't valid). */
export function draftColumns(d: ItemDraft): ItemColumns | null {
  if (draftError(d)) return null;
  const none: ItemColumns = { recipe_id: null, food_id: null, custom_food_id: null, servings: null, quantity: null, unit: null, note: null };
  if (d.kind === "note") return { ...none, note: d.note.trim() };
  if (d.kind === "recipe") return { ...none, recipe_id: d.refId, servings: parseAmount(d.servings) };
  const amount = { quantity: parseAmount(d.quantity), unit: d.unit };
  return d.kind === "food" ? { ...none, food_id: d.refId, ...amount } : { ...none, custom_food_id: d.refId, ...amount };
}

/** An item as the sheet's draft, for editing. */
export function draftOf(i: PlanItem): ItemDraft {
  if (i.kind === "note") return { kind: "note", note: i.note ?? "" };
  if (i.kind === "recipe") return { kind: "recipe", refId: i.refId, servings: String(i.servings ?? 1) };
  return { kind: i.kind, refId: i.refId, quantity: String(i.quantity ?? 1), unit: i.unit ?? "serving" };
}

/** "Breakfast" … (the diary's names). */
export function mealName(m: MealSlot): string {
  switch (m) {
    case "breakfast":
      return t("Breakfast");
    case "lunch":
      return t("Lunch");
    case "dinner":
      return t("Dinner");
    default:
      return t("Snacks");
  }
}

const fmt1 = (n: number, locale?: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);

/** "200 g", "2 servings", "1 cup" (an amount and its unit). */
export function amountText(quantity: number, unit: FoodUnit, locale?: string): string {
  const n = fmt1(quantity, locale);
  switch (unit) {
    case "serving":
      return tn(quantity, "{n} serving", "{n} servings", { n });
    case "cup":
      return tn(quantity, "{n} cup", "{n} cups", { n });
    case "g":
      return t("{n} g", { n });
    case "ml":
      return t("{n} ml", { n });
    case "tbsp":
      return t("{n} tbsp", { n });
    default:
      return t("{n} tsp", { n });
  }
}

/** A unit chip's word. */
export function unitWord(u: FoodUnit): string {
  switch (u) {
    case "serving":
      return t("serving");
    case "cup":
      return t("cup");
    case "g":
      return t("g");
    case "ml":
      return t("ml");
    case "tbsp":
      return t("tbsp");
    default:
      return t("tsp");
  }
}

/**
 * The row's title: the recipe or food (or the note itself). Deleting a recipe
 * or food takes its plan lines with it (G fixes), so a line always has one;
 * a name the reader can't see reads as plain "Recipe" / "Food".
 */
export function itemTitle(i: PlanItem): string {
  if (i.kind === "note") return i.note ?? "";
  return i.name ?? (i.kind === "recipe" ? t("Recipe") : t("Food"));
}

/** The row's second line: "2 servings" for a recipe, "200 g" for a food, "Note" for a note. */
export function itemDetail(i: PlanItem, locale?: string): string {
  if (i.kind === "note") return t("Note");
  if (i.kind === "recipe") return tn(i.servings ?? 1, "{n} serving", "{n} servings", { n: fmt1(i.servings ?? 1, locale) });
  return i.quantity !== null && i.unit ? amountText(i.quantity, i.unit, locale) : "";
}

/**
 * The item's calories, where they can be worked out: a recipe from its
 * per-serving calories times the servings planned, a food from its calories
 * per serving times the amount (`multiplier`: the app's servingMultiplier).
 * Null when unknown, and ALWAYS null while numbers are hidden
 * (recovery-sensitive mode, useHideNumbers): the planner then shows none.
 */
export function itemKcal(
  i: PlanItem,
  opts: { hideNumbers: boolean; recipeKcalPerServing: (id: string) => number | null; multiplier: (servingLabel: string, quantity: number, unit: FoodUnit) => number }
): number | null {
  if (opts.hideNumbers) return null;
  if (i.kind === "recipe") {
    const per = i.refId ? opts.recipeKcalPerServing(i.refId) : null;
    return per === null ? null : Math.round(per * (i.servings ?? 1));
  }
  if ((i.kind === "food" || i.kind === "custom_food") && i.kcalPerServing !== null && i.quantity !== null && i.unit) {
    return Math.round(i.kcalPerServing * opts.multiplier(i.servingLabel ?? "", i.quantity, i.unit));
  }
  return null;
}

/** A day's planned calories (the known items only), or null when hidden or none is known. */
export function dayKcal(kcals: readonly (number | null)[], hideNumbers: boolean): number | null {
  if (hideNumbers) return null;
  const known = kcals.filter((k): k is number => k !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

/** The write's refusal in words (ATXQ1 is the prompt, worded by the caller). */
export function planErrorText(code: string | null | undefined): string {
  if (code === "23505") return t("This week already has a plan.");
  if (code === "23514") return t("Check the amount and try again.");
  return t("Couldn't save. Try again.");
}

// ---- the grocery list ----

export interface GroceryLine {
  key: string;
  name: string;
  quantity: number | null;
  unit: FoodUnit | null;
  fromRecipes: string[];
  checked: boolean;
}

/** my_grocery_list(plan): item_key, name, quantity, unit, from_recipes, checked. */
export function parseGrocery(data: unknown): GroceryLine[] {
  return rowsOf(data).flatMap((r): GroceryLine[] => {
    const key = str(r.item_key);
    const name = str(r.name);
    if (!key || !name) return [];
    return [
      {
        key,
        name,
        quantity: num(r.quantity),
        unit: isUnit(r.unit) ? r.unit : null,
        fromRecipes: (Array.isArray(r.from_recipes) ? r.from_recipes : []).filter((x): x is string => typeof x === "string" && x.trim() !== ""),
        checked: r.checked === true,
      },
    ];
  });
}

export interface GroceryView {
  key: string;
  name: string;
  /** "600 ml"; null for a note. */
  amount: string | null;
  /** "For Porridge, Lentil soup"; null when it isn't from a recipe. */
  from: string | null;
  checked: boolean;
}

/**
 * The list as shown: what's still to buy first, then what's ticked, each in
 * the Database's order (by name). A note line has no amount.
 */
export function groceryView(lines: readonly GroceryLine[], locale?: string): { toBuy: GroceryView[]; done: GroceryView[] } {
  const view = (l: GroceryLine): GroceryView => ({
    key: l.key,
    name: l.name,
    amount: l.quantity !== null && l.unit ? amountText(l.quantity, l.unit, locale) : null,
    from: l.fromRecipes.length ? t("For {recipes}", { recipes: l.fromRecipes.join(t(", ")) }) : null,
    checked: l.checked,
  });
  return { toBuy: lines.filter((l) => !l.checked).map(view), done: lines.filter((l) => l.checked).map(view) };
}

/** A tick on screen at once (put back if the write fails). */
export const withChecked = (lines: readonly GroceryLine[], key: string, checked: boolean): GroceryLine[] => lines.map((l) => (l.key === key ? { ...l, checked } : l));

// ---- progress photos ----

export type Pose = "front" | "side" | "back" | "other";
export const POSES: readonly Pose[] = ["front", "side", "back", "other"];
const isPose = (v: unknown): v is Pose => typeof v === "string" && (POSES as readonly string[]).includes(v);

export function poseName(p: Pose): string {
  switch (p) {
    case "front":
      return tx("Front", "photo pose");
    case "side":
      return tx("Side", "photo pose");
    case "back":
      return tx("Back", "photo pose");
    default:
      return tx("Other", "photo pose");
  }
}

/**
 * Progress photos may show at all: the switch on, a Database with G4, and
 * recovery-sensitive mode known to be off (useHideNumbers is true while it is
 * still loading). False means NOTHING renders and NO reader is called.
 */
export function photosVisible(o: { premiumOn: boolean; g4: boolean; hideNumbers: boolean }): boolean {
  return o.premiumOn && o.g4 && !o.hideNumbers;
}

/** The Add button: visible photos, and i_may_add_progress_photos() said yes. */
export const photosAddable = (o: { visible: boolean; mayAdd: boolean | null }): boolean => o.visible && o.mayAdd === true;

/** The bucket's rules (progress-photos: 10 MB; jpeg, png, webp, heic). */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
const EXT: Record<PhotoType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/**
 * The file's type as the bucket takes it. Browsers often leave a HEIC file's
 * type empty (or call it image/heif), so the name decides then.
 */
export function photoType(f: { type: string; name: string }): PhotoType | null {
  const type = f.type.toLowerCase();
  if ((PHOTO_TYPES as readonly string[]).includes(type)) return type as PhotoType;
  if (type === "image/jpg") return "image/jpeg";
  if (type === "image/heif" || ((type === "" || type === "application/octet-stream") && /\.(heic|heif)$/i.test(f.name))) return "image/heic";
  if (type === "" && /\.jpe?g$/i.test(f.name)) return "image/jpeg";
  if (type === "" && /\.png$/i.test(f.name)) return "image/png";
  if (type === "" && /\.webp$/i.test(f.name)) return "image/webp";
  return null;
}

/** Why a file can't be uploaded (checked before the upload), or null. */
export function photoFileError(f: { type: string; name: string; size: number }): string | null {
  if (!photoType(f)) return t("Choose a JPEG, PNG, WebP or HEIC photo.");
  if (f.size <= 0) return t("That file is empty.");
  if (f.size > PHOTO_MAX_BYTES) return t("Choose a photo under 10 MB.");
  return null;
}

/** The object's path: in the member's own folder (<own id>/<file>), never another's. */
export function photoPath(ownerId: string, type: PhotoType, takenOn: string, rand: string): string {
  const safe = rand.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "photo";
  return `${ownerId}/${takenOn}-${safe}.${EXT[type]}`;
}

/** The note as stored: trimmed, 1–200 characters, or null. */
export function photoNote(s: string): string | null {
  const n = s.trim();
  return n ? n.slice(0, 200) : null;
}

/** A taken-on date the photo may have: a real day, not in the future. */
export const takenOnValid = (day: string, today: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today && day >= "1900-01-01";

export interface ProgressPhoto {
  id: string;
  takenOn: string;
  pose: Pose;
  note: string | null;
  path: string;
  createdAt: string;
}

/** my_progress_photos(), newest first (kept in that order). */
export function parsePhotos(data: unknown): ProgressPhoto[] {
  return rowsOf(data).flatMap((r): ProgressPhoto[] => {
    const id = str(r.photo_id);
    const takenOn = ymd(r.taken_on);
    const path = str(r.storage_path);
    if (!id || !takenOn || !path) return [];
    return [{ id, takenOn, pose: isPose(r.pose) ? r.pose : "other", note: str(r.note), path, createdAt: str(r.created_at) ?? "" }];
  });
}

/** Newest first, as the reader returns them (a fresh insert lands in place). */
export const newestFirst = (photos: readonly ProgressPhoto[]): ProgressPhoto[] =>
  [...photos].sort((a, b) => b.takenOn.localeCompare(a.takenOn) || b.createdAt.localeCompare(a.createdAt));

export interface PhotoPair {
  first: { id: string; takenOn: string; path: string };
  second: { id: string; takenOn: string; path: string };
  daysBetween: number;
}

/** progress_photo_pair(a, b): earlier first, with the days between. */
export function parsePair(data: unknown): PhotoPair | null {
  const r = rowsOf(data)[0];
  if (!r) return null;
  const a = { id: str(r.first_photo_id), takenOn: ymd(r.first_taken_on), path: str(r.first_path) };
  const b = { id: str(r.second_photo_id), takenOn: ymd(r.second_taken_on), path: str(r.second_path) };
  if (!a.id || !a.takenOn || !a.path || !b.id || !b.takenOn || !b.path) return null;
  const first = { id: a.id, takenOn: a.takenOn, path: a.path };
  const second = { id: b.id, takenOn: b.takenOn, path: b.path };
  const days = Math.abs(num(r.days_between) ?? 0);
  // Earlier first, as the Database promises; kept even if a row came back the other way.
  return first.takenOn <= second.takenOn ? { first, second, daysBetween: days } : { first: second, second: first, daysBetween: days };
}

/** Two picked photos, earlier first (for the screen before the reader answers). */
export function pairOrder<P extends { takenOn: string; createdAt?: string }>(a: P, b: P): [P, P] {
  if (a.takenOn !== b.takenOn) return a.takenOn < b.takenOn ? [a, b] : [b, a];
  return (a.createdAt ?? "") <= (b.createdAt ?? "") ? [a, b] : [b, a];
}

/** Two photos may be compared: two different ones. */
export const pairReady = (a: string | null, b: string | null): boolean => !!a && !!b && a !== b;

/** "{n} days apart"; "Same day" for 0. */
export const daysApartText = (n: number): string => (n === 0 ? t("Same day") : tn(n, "{n} day apart", "{n} days apart"));

export function photoErrorText(code: string | null | undefined): string {
  if (code === "ATX08") return t("Choose two of your own photos.");
  return t("Couldn't save the photo. Try again.");
}

// ---- colour themes ----

/** The color_theme labels the Database marks Premium (Round G4). */
export type PremiumDbTheme = "forest_sage" | "midnight_indigo" | "plum_lilac";
export const PREMIUM_DB_THEMES: readonly PremiumDbTheme[] = ["forest_sage", "midnight_indigo", "plum_lilac"];

export interface ThemeAccessRow {
  theme: string;
  /** The Database's name for a Premium theme (G fixes); null for the free ones. */
  name: string | null;
  premium: boolean;
  locked: boolean;
}

/** my_color_themes(): theme, name, premium, locked (Premium ones only while the switch is on). */
export function parseColorThemes(data: unknown): ThemeAccessRow[] {
  return rowsOf(data).flatMap((r): ThemeAccessRow[] => {
    const theme = str(r.theme);
    return theme ? [{ theme, name: str(r.name), premium: r.premium === true, locked: r.locked === true }] : [];
  });
}

/**
 * A theme's name on the picker: the app's own label (through t(), with its
 * Arabic) for a theme the app knows; the Database's name only for a key it
 * doesn't; else the key itself.
 */
export function themeName(theme: string, appLabel: string | null | undefined, rows: readonly ThemeAccessRow[] | null): string {
  if (appLabel) return t(appLabel);
  return rows?.find((r) => r.theme === theme)?.name ?? theme;
}

export type ThemeAccess = "hidden" | "locked" | "open";

/**
 * A Premium theme on the picker: "hidden" while the switch is off, loading,
 * unknown, or the reader doesn't list it; "locked" (the label and the
 * prompt) without Premium; "open" with it. The five free themes never ask.
 */
export function themeAccess(theme: PremiumDbTheme, o: { premiumOn: boolean; rows: readonly ThemeAccessRow[] | null }): ThemeAccess {
  if (!o.premiumOn || !o.rows) return "hidden";
  const row = o.rows.find((r) => r.theme === theme);
  if (!row || !row.premium) return "hidden";
  return row.locked ? "locked" : "open";
}

// ---- share-card designs ----

export interface ShareDesignRow {
  key: string;
  name: string;
  premium: boolean;
  locked: boolean;
}

/** member_share_card_designs(): key, name, premium, locked, in the Database's order. */
export function parseShareDesigns(data: unknown): ShareDesignRow[] {
  return rowsOf(data).flatMap((r): ShareDesignRow[] => {
    const key = str(r.key);
    return key ? [{ key, name: str(r.name) ?? key, premium: r.premium === true, locked: r.locked === true }] : [];
  });
}

/** The three Premium designs this app draws, by the Database's key. */
export type PremiumDesign = "bold" | "gradient" | "premium_badge";
export const PREMIUM_DESIGNS: readonly PremiumDesign[] = ["bold", "gradient", "premium_badge"];

/** The three free designs (today's backgrounds: Centium, the metric pattern, Your photo), by the Database's key (G fixes). */
export type FreeDesign = "centium" | "pattern" | "photo";
export const FREE_DESIGNS: readonly FreeDesign[] = ["centium", "pattern", "photo"];

/** Every share-card design key the Database lists and this app draws. */
export type ShareDesignKey = FreeDesign | PremiumDesign;
export const SHARE_DESIGN_KEYS: readonly ShareDesignKey[] = [...FREE_DESIGNS, ...PREMIUM_DESIGNS];

/** A Premium design in the share sheet: hidden (switch off / not listed), locked, or open. */
export function designAccess(key: PremiumDesign, o: { premiumOn: boolean; rows: readonly ShareDesignRow[] | null }): ThemeAccess {
  if (!o.premiumOn || !o.rows) return "hidden";
  const row = o.rows.find((r) => r.key === key);
  if (!row || !row.premium) return "hidden";
  return row.locked ? "locked" : "open";
}

// ---- cycle insights ----

/** An insight's area (G fixes): one insight per area for a phase. */
export type InsightArea = "training" | "food" | "sleep" | "mood";
const AREAS: readonly InsightArea[] = ["training", "food", "sleep", "mood"];

export interface CycleInsight {
  key: string | null;
  area: InsightArea | null;
  title: string;
  body: string;
}

export interface CycleNote {
  key: string | null;
  body: string;
}

export interface CycleInsights {
  phase: string | null;
  cycleDay: number | null;
  insights: CycleInsight[];
  /** The general note (cycle.note), for every member: under the insights, beside the lock, or on its own. */
  note: CycleNote | null;
  /**
   * The phase's insights are Premium and this member is free (G fixes 2: the
   * Database's `insights_locked`, or `locked`), so the insights list is empty
   * and only they are locked; the note still comes.
   */
  locked: boolean;
}

/**
 * my_cycle_insights(): phase, cycle_day, insights [{key, area, title, body}],
 * note {key, body} and (the Database's fix, G fixes 2) insights_locked, in the
 * member's language. Tolerant: `locked` is read too, and a missing flag is false.
 */
export function parseCycleInsights(data: unknown): CycleInsights {
  const r = rowsOf(data)[0] ?? obj(data);
  if (!r) return { phase: null, cycleDay: null, insights: [], note: null, locked: false };
  const list = Array.isArray(r.insights) ? r.insights : [];
  const n = obj(r.note);
  const noteBody = n ? str(n.body) : null;
  return {
    phase: str(r.phase),
    cycleDay: num(r.cycle_day),
    insights: rowsOf(list).flatMap((i): CycleInsight[] => {
      const title = str(i.title);
      const body = str(i.body);
      const area = str(i.area);
      return title && body ? [{ key: str(i.key), area: area && (AREAS as readonly string[]).includes(area) ? (area as InsightArea) : null, title, body }] : [];
    }),
    note: noteBody ? { key: n ? str(n.key) : null, body: noteBody } : null,
    locked: r.insights_locked === true || r.locked === true,
  };
}

/** An insight's area label: Training, Food, Sleep, Mood. Null for an area the app doesn't know. */
export function insightAreaLabel(area: InsightArea | null): string | null {
  switch (area) {
    case "training":
      return t("Training");
    case "food":
      return t("Food");
    case "sleep":
      return t("Sleep");
    case "mood":
      return t("Mood");
    default:
      return null;
  }
}

/**
 * What the cycle tracker shows (G fixes; G fixes 2: the general note is for
 * every member, and only the phase's insights are Premium):
 * - an empty list, no lock and a null note (not tracking, insights turned
 *   off, pregnant, no copy; the Database asks no Premium): NOTHING at all;
 * - the insights (one per area, labelled), when there are any;
 * - the lock (the Premium label and the prompt) in their place for a free
 *   member: the Database's insights_locked, or today's ATXQ1;
 * - the note, whenever it is returned, always outside the lock;
 * - ATXQ0, the switch off, loading, a Database without G4 or a failure:
 *   nothing.
 * Until the Database's fix lands, a free member's ATXQ1 carries no note, so
 * it is the lock alone.
 */
export type InsightsView =
  | { kind: "none" }
  | { kind: "show"; phase: string | null; cycleDay: number | null; insights: CycleInsight[]; locked: boolean; note: CycleNote | null };
export function insightsView(state: { kind: string; value?: CycleInsights }): InsightsView {
  if (state.kind === "premium") return { kind: "show", phase: null, cycleDay: null, insights: [], locked: true, note: null };
  if (state.kind !== "ready" || !state.value) return { kind: "none" };
  const v = state.value;
  const locked = v.locked && v.insights.length === 0;
  if (v.insights.length === 0 && !locked && !v.note) return { kind: "none" };
  return { kind: "show", phase: v.phase, cycleDay: v.cycleDay, insights: v.insights, locked, note: v.note };
}

/** The phase in words. */
export function phaseName(p: string | null): string | null {
  switch (p) {
    case "menstrual":
      return t("Period");
    case "follicular":
      return t("Follicular");
    case "ovulatory":
      return t("Ovulation");
    case "luteal":
      return t("Luteal");
    default:
      return null;
  }
}

/**
 * The "Phase insights" switch in the cycle settings (G fixes): only while the
 * Premium switch is on, the Database has G4, and insights_enabled could be
 * read. Off, loading or unknown: no row (today's settings).
 */
export const insightsToggleShown = (p: Pick<MyPremium, "premiumOn"> | null | undefined, g4: boolean, enabled: boolean | null): boolean =>
  !!p && p.premiumOn && g4 && enabled !== null;
