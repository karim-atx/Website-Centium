import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../../../lib/supabase/client";

// Display units, synced everywhere (Database B3, 20261116000000:
// app_preferences.unit_system metric / imperial and water_unit ml / l / fl_oz,
// both NOT NULL, defaulting to metric / l). STORAGE STAYS METRIC: kilograms
// and millilitres in every table; these only change what is shown.
//
// REPLACES THE TWO DEVICE STORES, centium.waterUnit and centium.weightUnit
// (localStorage, one browser only). A choice made there before this existed
// is carried up ONCE: if the account's row still holds the defaults (no row,
// or metric / l), the stored choice is written to it; either way the local
// key is then removed, so it can never overwrite a later choice made on
// another device.
//
// ONE SHARED STORE for every screen that shows a unit (Water, Weight, and
// any later settings row), so a change on one is the value on all.

/** The app's spelling: "floz" is the database's "fl_oz". */
export type WaterUnit = "l" | "ml" | "floz";
export type WeightUnit = "kg" | "lb";

interface Units {
  water: WaterUnit;
  weight: WeightUnit;
}

const WATER_KEY = "centium.waterUnit";
const WEIGHT_KEY = "centium.weightUnit";
/** The column defaults (metric / l, migration 20261116000000): what an account without a row shows. */
const DEFAULTS: Units = { water: "l", weight: "kg" };

type Row = { unit_system: string | null; water_unit: string | null };

const toWater = (v: string | null | undefined): WaterUnit => (v === "ml" ? "ml" : v === "fl_oz" ? "floz" : "l");
const toWeight = (v: string | null | undefined): WeightUnit => (v === "imperial" ? "lb" : "kg");
const waterColumn = (u: WaterUnit) => (u === "floz" ? "fl_oz" : u);
const weightColumn = (u: WeightUnit) => (u === "lb" ? "imperial" : "metric");

// The generated types come from production, without B3's two columns.
const table = () =>
  supabase.from("app_preferences") as unknown as {
    select: (c: string) => { maybeSingle: () => PromiseLike<{ data: Row | null; error: { message: string } | null }> };
    update: (v: Partial<Row>) => {
      eq: (c: "owner_id", v: string) => { select: (c: string) => PromiseLike<{ data: Row[] | null; error: { code?: string; message: string } | null }> };
    };
    insert: (v: Partial<Row> & { owner_id: string }) => PromiseLike<{ error: { code?: string; message: string } | null }>;
  };

/** Update first, insert only if no row matched (the UPDATE grant excludes owner_id, so never upsert). */
async function write(ownerId: string, patch: Partial<Row>): Promise<boolean> {
  const updated = await table().update(patch).eq("owner_id", ownerId).select("unit_system, water_unit");
  if (updated.error) {
    console.error("[units] Could not save:", updated.error.message);
    return false;
  }
  if (updated.data && updated.data.length > 0) return true;
  const inserted = await table().insert({ owner_id: ownerId, ...patch });
  if (inserted.error?.code === "23505") return write(ownerId, patch);
  if (inserted.error) {
    console.error("[units] Could not save:", inserted.error.message);
    return false;
  }
  return true;
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function dropLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* private mode: nothing was stored */
  }
}

// --- the store ---------------------------------------------------------------

let state: Units = DEFAULTS;
let loadedFor: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

async function ownerId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Reads the account's units once per signed-in account, carrying a device choice up first. */
async function load(): Promise<void> {
  const uid = await ownerId();
  if (!uid || loadedFor === uid) return;
  const { data, error } = await table().select("unit_system, water_unit").maybeSingle();
  if (error) {
    // Kept as shown; the next screen that needs units tries again.
    console.error("[units] Could not read:", error.message);
    return;
  }
  let next: Units = { water: toWater(data?.water_unit), weight: toWeight(data?.unit_system) };

  // ONE-TIME MIGRATION of a choice stored on this device.
  const localWater = readLocal(WATER_KEY);
  const localWeight = readLocal(WEIGHT_KEY);
  if (localWater !== null || localWeight !== null) {
    const untouched = (data?.water_unit ?? "l") === "l" && (data?.unit_system ?? "metric") === "metric";
    if (untouched) {
      const carried: Units = {
        water: localWater === "ml" || localWater === "floz" ? localWater : localWater === "l" ? "l" : next.water,
        weight: localWeight === "lb" ? "lb" : localWeight === "kg" ? "kg" : next.weight,
      };
      const patch: Partial<Row> = {};
      if (carried.water !== next.water) patch.water_unit = waterColumn(carried.water);
      if (carried.weight !== next.weight) patch.unit_system = weightColumn(carried.weight);
      if (Object.keys(patch).length === 0 || (await write(uid, patch))) {
        next = carried;
        dropLocal(WATER_KEY);
        dropLocal(WEIGHT_KEY);
      }
    } else {
      // Chosen on the account already: the account wins.
      dropLocal(WATER_KEY);
      dropLocal(WEIGHT_KEY);
    }
  }
  loadedFor = uid;
  state = next;
  emit();
}

function ensureLoaded(): Promise<void> {
  if (!loading)
    loading = load().finally(() => {
      loading = null;
    });
  return loading;
}

/** Reads the account's units (running the one-time carry-over first) and returns them. */
export async function loadUnits(): Promise<Units> {
  await ensureLoaded();
  return state;
}

// A different account signing in on this tab reads its own units.
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    loadedFor = null;
    state = DEFAULTS;
    emit();
  } else if (event === "SIGNED_IN") {
    void ensureLoaded();
  }
});

/** Saves one unit; shown at once and put back if the write fails. Resolves false on failure. */
async function save(patch: Partial<Units>): Promise<boolean> {
  const uid = await ownerId();
  if (!uid) return false;
  const before = state;
  state = { ...state, ...patch };
  emit();
  const row: Partial<Row> = {};
  if (patch.water) row.water_unit = waterColumn(patch.water);
  if (patch.weight) row.unit_system = weightColumn(patch.weight);
  const ok = await write(uid, row);
  if (!ok) {
    state = before;
    emit();
  }
  return ok;
}

/** The account's water unit and a setter (same shape as the old device hook). */
export function useWaterUnit(): [WaterUnit, (u: WaterUnit) => void] {
  const units = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => void ensureLoaded(), []);
  return [units.water, (u) => void save({ water: u })];
}

/** The account's weight unit (unit_system: kg = metric, lb = imperial) and a setter. */
export function useWeightUnit(): [WeightUnit, (u: WeightUnit) => void] {
  const units = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => void ensureLoaded(), []);
  return [units.weight, (u) => void save({ weight: u })];
}

/** For a settings row that wants to know whether the save landed. */
export const saveWaterUnit = (u: WaterUnit) => save({ water: u });
export const saveWeightUnit = (u: WeightUnit) => save({ weight: u });
