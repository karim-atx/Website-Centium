import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

// v6 Batch 4 · the store (B11) and appointments (B12) boundary.
//
// NEITHER STAGE IS ON THE LOCAL STACK YET (checked 14 Oct 2026: the latest
// local migration is 20261120040000, and HANDOVER_API.md has no B11 / B12
// section). The screens are built now with a pending state, and every call
// goes through this one loose handle so the column and function names are
// spelled in one place per domain (services/store/orders.ts, customer.ts,
// products.ts, services/appointments). The names follow
// BACKEND_REQUIREMENTS-v6 ST-01 to ST-05 and AP-01; when B11 / B12 land in
// HANDOVER_API.md, check each name there and change it here, not in a page.
//
// "Pending" is decided by the server's own answer, never by a flag: a table
// or function that does not exist yet (42P01, 42883, PostgREST PGRST202 /
// PGRST205, or a 404) means the stage has not shipped, and the page shows
// its pending state. Any other error is a real failure (Couldn't load ...).

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B11 / B12 tables and functions, not in the production-generated types
export const db = supabase as any;

export type PgError = { code?: string; message?: string; status?: number; details?: string } | null | undefined;

/** The stage this read or write needs has not shipped to this database yet. */
export function isNotShipped(error: PgError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "42P01" || code === "42883" || code === "PGRST202" || code === "PGRST205" || code === "PGRST200") return true;
  // A column the stage adds (stock, visible, ...): 42703 undefined column, PGRST204 for writes.
  return false;
}

/** A column this read asked for is not there yet (B11 extends business_offerings). */
export function isMissingColumn(error: PgError): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .* does not exist/i.test(error.message ?? "");
}

export type Load<T> =
  | { status: "ok"; value: T }
  | { status: "pending" }
  | { status: "error"; offline: boolean };

export function loadFail<T>(error: PgError, where: string): Load<T> {
  if (isNotShipped(error)) return { status: "pending" };
  console.error(`[store] ${where}:`, error?.message);
  return { status: "error", offline: isOffline(error) };
}

export type Write<T = null> =
  | { ok: true; value: T }
  | { ok: false; pending?: boolean; offline?: boolean; code?: string; message?: string };

export function writeFail<T>(error: PgError, where: string): Write<T> {
  if (isNotShipped(error)) return { ok: false, pending: true };
  console.error(`[store] ${where}:`, error?.message);
  return { ok: false, offline: isOffline(error), code: error?.code, message: error?.message };
}

/** A whole-number count of money from PostgREST's numeric string or a number. */
export function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
