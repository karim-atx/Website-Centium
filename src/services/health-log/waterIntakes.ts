import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { tk } from "../../i18n/core";
import { OUTSIDE_WINDOW } from "./waterRemove";

// Database stage B1 "water_intakes — drinks, not a running total"
// (HANDOVER_API.md): one row per drink, amount_ml 10-3,000, logged_at (not in
// the future), source 'manual'. The day cap (5,000 ml in the person's own
// timezone) is enforced by the database and refused as ATXA5.
//
// The health_metrics running totals are still what every reader uses until
// B16. Round D: a new drink is one log_water call, which writes the drink and
// that day's total together (no second write, nothing to take back).

export type WaterResult =
  | { ok: true; id: string; day: string; dayTotalMl: number }
  | { ok: false; message: string; overCap?: boolean };

type LogWaterRpc = {
  rpc: (
    fn: "log_water",
    args: { p_ml: number; p_logged_at: string; p_request_id: string | null }
  ) => PromiseLike<{ data: { status: "saved" | "already_saved"; intake_id: string; day: string; day_total_ml: number } | null; error: { code?: string; message: string } | null }>;
};

/**
 * Round D (Database 20261222020000): the drink AND the day total in one call,
 * one transaction. Every drink carries a uuid as p_request_id (the outbox
 * item's, or a fresh one online that the queue reuses if the answer was lost),
 * so a replay answers already_saved and changes nothing. Returns the drink's
 * id, the day the server filed it under and that day's total, for the
 * device's copy.
 */
export type WaterRemoveResult =
  | { ok: true; day: string; removedMl: number; dayTotalMl: number }
  | { ok: false; message: string; outsideWindow?: boolean };

type WaterRemoveRpc = {
  rpc: (
    fn: "unlog_water" | "clear_water_day",
    args: { p_ml?: number; p_day: string; p_request_id: string }
  ) => PromiseLike<{ data: { status: "saved" | "already_saved"; day: string; removed_ml: number; day_total_ml: number } | null; error: { code?: string; message: string } | null }>;
};

/**
 * Round I · FA (Database 20261226450000, services/health-log/waterRemove):
 * takes `amountMl` off `day`'s hand-logged drinks, newest first, never below
 * 0, and rewrites the day's total in the same transaction. Returns what was
 * actually removed (removed_ml) and the day's new total. A replay of the
 * same request id answers the first removal and changes nothing.
 */
export function unlogWater(amountMl: number, day: string, requestId: string): Promise<WaterRemoveResult> {
  return removeCall("unlog_water", { p_ml: Math.round(amountMl), p_day: day, p_request_id: requestId });
}

/** Round I · FA: "Delete day": every hand-logged drink of `day` (imported water stays). */
export function clearWaterDay(day: string, requestId: string): Promise<WaterRemoveResult> {
  return removeCall("clear_water_day", { p_day: day, p_request_id: requestId });
}

async function removeCall(fn: "unlog_water" | "clear_water_day", args: { p_ml?: number; p_day: string; p_request_id: string }): Promise<WaterRemoveResult> {
  const { data, error } = await (supabase as unknown as WaterRemoveRpc).rpc(fn, args);
  if (!error && data) return { ok: true, day: data.day, removedMl: data.removed_ml, dayTotalMl: data.day_total_ml };
  if (error && isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  // 22023: the day is outside today and the 7 days before it.
  if (error?.code === "22023") return { ok: false, message: OUTSIDE_WINDOW, outsideWindow: true };
  return { ok: false, message: tk("Couldn't save. Try again.") };
}

export async function logWater(amountMl: number, loggedAt: Date, requestId: string | null): Promise<WaterResult> {
  const { data, error } = await (supabase as unknown as LogWaterRpc).rpc("log_water", {
    p_ml: Math.round(amountMl),
    p_logged_at: loggedAt.toISOString(),
    p_request_id: requestId,
  });
  if (!error && data) return { ok: true, id: data.intake_id, day: data.day, dayTotalMl: data.day_total_ml };
  if (error && isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error?.code === "ATXA5") return { ok: false, message: tk("That's more than 5 L today. Check the amount."), overCap: true };
  return { ok: false, message: tk("Couldn't save. Try again.") };
}
