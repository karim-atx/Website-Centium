import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";

// v6 Batch 4 · the store (B11) and appointments (B12) boundary.
//
// B11 (20261121260000) is on the local stack and in HANDOVER_API.md; the
// names in services/store follow it. Production may still be behind, so every
// call goes through this one loose handle and "pending" is still decided by
// the server's own answer, never by a flag: a table or function that does not
// exist yet (42P01, 42883, PostgREST PGRST202 / PGRST205) means the stage has
// not shipped there, and the page shows its pending state. Any other error is
// a real failure (Couldn't load ...).

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- B11 / B12 tables and functions, not in the production-generated types (narrow casts at this boundary)
export const db = supabase as any;

export type PgError = { code?: string; message?: string; status?: number; details?: string } | null | undefined;

/** The stage this read or write needs has not shipped to this database yet. */
export function isNotShipped(error: PgError): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  return code === "42P01" || code === "42883" || code === "PGRST202" || code === "PGRST205" || code === "PGRST200";
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

export { num, str } from "./mapping";
