// Round G4 · the Database calls (DB_G4_HANDOVER.md). The pure decisions are
// in ./g4.
//
// HIDDEN WHILE OFF: every Premium reader answers ATXQ0 while the switch is
// off for the caller, and a Database without G4 has no such function or
// table; both read as "hidden", so the screen shows nothing new. ATXQ1 is the
// locked state (the prompt), never an error line. A write refused with ATXQ1
// asks the one prompt host (services/premium/asks) and keeps what was
// entered on screen.
//
// The member's own meal plans are member_meal_plans, NOT the coach-assigned
// meal_plans (MealPlanCard / PlanBuilder): nothing here touches those.
//
// PROGRESS PHOTOS are never read in recovery-sensitive mode: the screens
// don't call these at all then (g4 photosVisible), and the Database returns
// nothing besides.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { stripPrivateExif } from "../storage/exif";
import { t, tk } from "../../i18n/core";
import { premiumRefusalMessage } from "./asks";
import type { PremiumFeature } from "./features";
import { failKind, type G3State } from "./g3";
import {
  g4Missing,
  parseColorThemes,
  parseCycleInsights,
  parseGrocery,
  parseItems,
  parsePair,
  parsePhotos,
  parsePlan,
  parseShareDesigns,
  photoErrorText,
  photoFileError,
  photoNote,
  photoPath,
  photoType,
  planErrorText,
  type CycleInsights,
  type GroceryLine,
  type ItemColumns,
  type MealPlan,
  type MealSlot,
  type PhotoPair,
  type PlanItem,
  type Pose,
  type ProgressPhoto,
  type ShareDesignRow,
  type ThemeAccessRow,
} from "./g4";

type Err = { code?: string; message?: string; details?: string | null; status?: number };
type Answer = PromiseLike<{ data: unknown; error: Err | null }>;
type Rpc = (fn: string, args?: Record<string, unknown>) => Answer;
// The G4 functions and tables are hand-typed in database.types; the embedded
// select and the RPCs go through one untyped door so each keeps one shape here.
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);
type Filter = Answer & {
  eq: (c: string, v: unknown) => Filter;
  in: (c: string, v: unknown[]) => Filter;
  order: (c: string, o?: { ascending?: boolean }) => Filter;
  maybeSingle: () => Answer;
  single: () => Answer;
  select: (c: string) => Filter;
};
type Table = {
  select: (c: string) => Filter;
  insert: (v: Record<string, unknown> | Record<string, unknown>[]) => Filter;
  update: (v: Record<string, unknown>) => Filter;
  delete: () => Filter;
};
const from = (table: string): Table => (supabase.from as unknown as (t: string) => Table).call(supabase, table);

const LOAD_FAILED = tk("Couldn't load this. Try again.");
const PHOTOS = "progress-photos";
const SIGN_SECONDS = 60 * 60;

/** A G4 read as the screen's state (never "loading"). */
async function read<T>(run: () => Answer, parse: (d: unknown) => T, label: string): Promise<G3State<T>> {
  try {
    const { data, error } = await run();
    if (error) {
      if (isOffline(error)) return { kind: "error", message: OFFLINE_MESSAGE };
      if (g4Missing(error)) return { kind: "hidden" };
      const k = failKind(error);
      if (k === "hidden") return { kind: "hidden" };
      if (k === "premium") return { kind: "premium" };
      console.error(`[premium] ${label}:`, error.code, error.message);
      return { kind: "error", message: t(LOAD_FAILED) };
    }
    return { kind: "ready", value: parse(data) };
  } catch (e) {
    return { kind: "error", message: isOffline(e) ? OFFLINE_MESSAGE : t(LOAD_FAILED) };
  }
}

export type G4Write<T> = { ok: true; value: T } | { ok: false; code: string | null; message: string; premium: boolean };

/** A G4 write: ATXQ1 asks the host for the prompt; anything else is worded by `words`. */
async function write<T>(run: () => Answer, parse: (d: unknown) => T, feature: PremiumFeature, words: (code: string | null) => string, label: string): Promise<G4Write<T>> {
  try {
    const { data, error } = await run();
    if (error) {
      if (isOffline(error)) return { ok: false, code: null, message: OFFLINE_MESSAGE, premium: false };
      const premium = premiumRefusalMessage(error, feature);
      if (premium) return { ok: false, code: error.code ?? "ATXQ1", message: premium, premium: true };
      console.error(`[premium] ${label}:`, error.code, error.message);
      return { ok: false, code: error.code ?? null, message: words(error.code ?? null), premium: false };
    }
    return { ok: true, value: parse(data) };
  } catch (e) {
    return { ok: false, code: null, message: isOffline(e) ? OFFLINE_MESSAGE : words(null), premium: false };
  }
}

// ---- the probe and the lists that are read once ----

/** member_share_card_designs(): also the probe for "this Database has G4". */
export const fetchShareDesigns = (): Promise<G3State<ShareDesignRow[]>> => read(() => rpc("member_share_card_designs"), parseShareDesigns, "member_share_card_designs");

/** my_color_themes(): every free theme, and the Premium ones while the switch is on. */
export const fetchColorThemes = (): Promise<G3State<ThemeAccessRow[]>> => read(() => rpc("my_color_themes"), parseColorThemes, "my_color_themes");

// ---- the meal planner (member_meal_plans, member_meal_plan_items) ----

const ITEM_COLUMNS =
  "id, plan_id, day_offset, meal, recipe_id, food_id, custom_food_id, servings, quantity, unit, note, position, recipes(title, servings), foods(name, serving_label, calories), custom_foods(name, serving_label, calories)";

/** The member's plan for one week (reading their own always works), or null. */
export const fetchPlan = (weekStart: string): Promise<G3State<MealPlan | null>> =>
  read(() => from("member_meal_plans").select("id, week_start, name").eq("week_start", weekStart).maybeSingle(), parsePlan, "member_meal_plans");

export const fetchPlanItems = (planId: string): Promise<G3State<PlanItem[]>> =>
  read(() => from("member_meal_plan_items").select(ITEM_COLUMNS).eq("plan_id", planId).order("day_offset").order("position"), parseItems, "member_meal_plan_items");

/** Starts a week's plan (Premium: ATXQ1 → the prompt). */
export const createPlan = (ownerId: string, weekStart: string): Promise<G4Write<MealPlan | null>> =>
  write(() => from("member_meal_plans").insert({ owner_id: ownerId, week_start: weekStart }).select("id, week_start, name").single(), parsePlan, "meal_planner", planErrorText, "create plan");

/** Deleting always works, Premium or not; the items and ticks go with it. */
export const deletePlan = (planId: string): Promise<G4Write<true>> =>
  write(() => from("member_meal_plans").delete().eq("id", planId), () => true as const, "meal_planner", () => t("Couldn't delete the plan. Try again."), "delete plan");

export const addPlanItem = (planId: string, dayOffset: number, meal: MealSlot, position: number, cols: ItemColumns): Promise<G4Write<true>> =>
  write(() => from("member_meal_plan_items").insert({ plan_id: planId, day_offset: dayOffset, meal, position, ...cols }), () => true as const, "meal_planner", planErrorText, "add item");

export const updatePlanItem = (id: string, patch: Partial<ItemColumns> & { meal?: MealSlot; day_offset?: number; position?: number }): Promise<G4Write<true>> =>
  write(() => from("member_meal_plan_items").update(patch).eq("id", id), () => true as const, "meal_planner", planErrorText, "update item");

export const deletePlanItem = (id: string): Promise<G4Write<true>> =>
  write(() => from("member_meal_plan_items").delete().eq("id", id), () => true as const, "meal_planner", () => t("Couldn't delete that. Try again."), "delete item");

/** Writes new positions one by one (a move touches two or three rows). Stops at the first refusal. */
export async function reorderPlanItems(moves: readonly { id: string; position: number }[]): Promise<G4Write<true>> {
  for (const m of moves) {
    const r = await updatePlanItem(m.id, { position: m.position });
    if (!r.ok) return r;
  }
  return { ok: true, value: true };
}

// ---- the grocery list ----

export const fetchGroceryList = (planId: string): Promise<G3State<GroceryLine[]>> => read(() => rpc("my_grocery_list", { p_plan_id: planId }), parseGrocery, "my_grocery_list");

export const setGroceryChecked = (planId: string, key: string, checked: boolean): Promise<G4Write<true>> =>
  write(() => rpc("set_grocery_item_checked", { p_plan_id: planId, p_item_key: key, p_checked: checked }), () => true as const, "meal_planner", () => t("Couldn't save. Try again."), "set_grocery_item_checked");

// ---- progress photos ----

/** i_may_add_progress_photos(): the switch on, Premium, recovery-sensitive mode off. Null when unknown. */
export async function fetchMayAddPhotos(): Promise<boolean | null> {
  try {
    const { data, error } = await rpc("i_may_add_progress_photos");
    if (error) return null;
    return data === true;
  } catch {
    return null;
  }
}

export interface SignedPhoto extends ProgressPhoto {
  url: string | null;
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  try {
    const { data } = await supabase.storage.from(PHOTOS).createSignedUrls(paths, SIGN_SECONDS);
    for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  } catch {
    // A photo without a URL shows its placeholder; the list still loads.
  }
  return out;
}

/** my_progress_photos(), newest first, each with a signed URL (the bucket is private). */
export async function fetchPhotos(): Promise<G3State<SignedPhoto[]>> {
  const r = await read(() => rpc("my_progress_photos"), parsePhotos, "my_progress_photos");
  if (r.kind !== "ready") return r;
  const urls = await signPaths(r.value.map((p) => p.path));
  return { kind: "ready", value: r.value.map((p) => ({ ...p, url: urls.get(p.path) ?? null })) };
}

export interface PairWithUrls extends PhotoPair {
  firstUrl: string | null;
  secondUrl: string | null;
}

/** progress_photo_pair(a, b): earlier first, "days_between", with signed URLs. */
export async function fetchPhotoPair(a: string, b: string): Promise<G3State<PairWithUrls | null> | { kind: "refused"; message: string }> {
  try {
    const { data, error } = await rpc("progress_photo_pair", { p_first: a, p_second: b });
    if (error) {
      if (isOffline(error)) return { kind: "error", message: OFFLINE_MESSAGE };
      if (g4Missing(error)) return { kind: "hidden" };
      const k = failKind(error);
      if (k === "hidden") return { kind: "hidden" };
      if (k === "premium") return { kind: "premium" };
      return { kind: "refused", message: photoErrorText(error.code) };
    }
    const pair = parsePair(data);
    if (!pair) return { kind: "ready", value: null };
    const urls = await signPaths([pair.first.path, pair.second.path]);
    return { kind: "ready", value: { ...pair, firstUrl: urls.get(pair.first.path) ?? null, secondUrl: urls.get(pair.second.path) ?? null } };
  } catch (e) {
    return { kind: "error", message: isOffline(e) ? OFFLINE_MESSAGE : t(LOAD_FAILED) };
  }
}

/**
 * Adds a photo: the type and size are checked first, the location and camera
 * details are stripped (services/storage/exif), the file goes to the member's
 * own folder, then the row is inserted. If the row is refused the file is
 * removed again, so no orphan stays in the bucket.
 */
export async function addProgressPhoto(
  ownerId: string,
  file: File,
  o: { takenOn: string; pose: Pose; note: string }
): Promise<G4Write<true>> {
  const bad = photoFileError(file);
  const type = photoType(file);
  if (bad || !type) return { ok: false, code: null, message: bad ?? photoErrorText(null), premium: false };
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const path = photoPath(ownerId, type, o.takenOn, rand);
  const clean = await stripPrivateExif(file);
  const up = await write(
    () => supabase.storage.from(PHOTOS).upload(path, clean, { contentType: type, upsert: false }) as unknown as Answer,
    () => true as const,
    "progress_photos",
    photoErrorText,
    "upload progress photo"
  );
  if (!up.ok) return up;
  const row = await write(
    () => from("member_progress_photos").insert({ owner_id: ownerId, taken_on: o.takenOn, pose: o.pose, note: photoNote(o.note), storage_path: path }),
    () => true as const,
    "progress_photos",
    photoErrorText,
    "insert progress photo"
  );
  if (!row.ok) {
    try {
      await supabase.storage.from(PHOTOS).remove([path]);
    } catch {
      // The reset and the erasure clear the folder; nothing else can read it.
    }
  }
  return row;
}

/** Deletes the row and the file (deleting always works). */
export async function deleteProgressPhoto(id: string, path: string): Promise<G4Write<true>> {
  const r = await write(() => from("member_progress_photos").delete().eq("id", id), () => true as const, "progress_photos", () => t("Couldn't delete the photo. Try again."), "delete progress photo");
  if (!r.ok) return r;
  try {
    const { error } = await supabase.storage.from(PHOTOS).remove([path]);
    if (error) console.error("[premium] remove progress photo file:", error.message);
  } catch {
    // The row is gone, so the photo shows nowhere; the reset clears the file.
  }
  return r;
}

// ---- cycle insights ----

export const fetchCycleInsights = (): Promise<G3State<CycleInsights>> => read(() => rpc("my_cycle_insights"), parseCycleInsights, "my_cycle_insights");
