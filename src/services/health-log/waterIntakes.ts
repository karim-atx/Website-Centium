import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// Database stage B1 "water_intakes — drinks, not a running total"
// (HANDOVER_API.md): one row per drink, amount_ml 10-3,000, logged_at (not in
// the future), source 'manual'. The day cap (5,000 ml in the person's own
// timezone) is enforced by the database and refused as ATXA5.
//
// TWO-PHASE: the health_metrics running totals are still what every reader
// uses until B16, so the log sheet keeps writing the day total (addWater)
// and records the drink here as well. INSERT sends only granted columns
// (user_id, amount_ml, logged_at); `source` keeps its default and
// `backfilled` is never sent.

// Newer than lib/supabase/database.types.ts (generated from production).
const supabase = typed as unknown as SupabaseClient;

export type DrinkResult = { ok: true; id: string } | { ok: false; message: string; overCap?: boolean };

export async function logDrink(userId: string, amountMl: number, loggedAt: Date): Promise<DrinkResult> {
  const { data, error } = await supabase
    .from("water_intakes")
    .insert({ user_id: userId, amount_ml: Math.round(amountMl), logged_at: loggedAt.toISOString() })
    .select("id")
    .single();
  if (!error) return { ok: true, id: (data as { id: string }).id };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATXA5") return { ok: false, message: "That's more than 5 L today. Check the amount.", overCap: true };
  return { ok: false, message: "Couldn't save. Try again." };
}

/** Undoes a drink whose day total could not be written, so the two stay in step. */
export async function deleteDrink(id: string): Promise<void> {
  await supabase.from("water_intakes").delete().eq("id", id);
}
