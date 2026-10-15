// Release 3 W6 · Settings › Practice (MO23 v3): the professional's practice
// defaults in practice_settings (Database DB-2, migration 20261124020300).
// Column grants differ between INSERT and UPDATE, so writes are "update, else
// insert", never an upsert (as services/pro/calendar.ts does for the same row).
//
// - default_data_requests access_category[]: asked of every new client when
//   they hire you (W2's accept reads it).
// - invoice_details jsonb (an object, at most 4 KB): the keys are not set by
//   the backend contract; this screen writes { name, tax_number, prefix }.
// - calls_with_hired_clients boolean (default true): thread_allows_calls
//   follows it for professional and client chats (DB-7).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { Read, Write } from "./clients";

export type AccessCategory =
  | "food_diary"
  | "workout_activity"
  | "weight"
  | "progress"
  | "health_metrics"
  | "lab_results"
  | "medical_history"
  | "body_measurements"
  | "blood_pressure"
  | "cycle_phase"
  | "pregnancy"
  | "allergies_dietary"
  | "habits";

export interface InvoiceDetails {
  name: string;
  taxNumber: string;
  prefix: string;
}

export interface PracticeSettings {
  dataRequests: AccessCategory[];
  invoice: InvoiceDetails;
  callsWithHiredClients: boolean;
  /** False while no row exists: the column defaults apply. */
  stored: boolean;
}

export const DEFAULT_PRACTICE: PracticeSettings = {
  dataRequests: [],
  invoice: { name: "", taxNumber: "", prefix: "" },
  callsWithHiredClients: true,
  stored: false,
};

const from = (table: string) => supabase.from(table as never);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function fetchPracticeSettings(me: string): Promise<Read<PracticeSettings>> {
  const { data, error } = await from("practice_settings")
    .select("default_data_requests, invoice_details, calls_with_hired_clients")
    .eq("professional_id", me)
    .maybeSingle();
  if (error) return { ok: false, offline: isOffline(error) };
  const r = data as unknown as {
    default_data_requests: AccessCategory[] | null;
    invoice_details: Record<string, unknown> | null;
    calls_with_hired_clients: boolean;
  } | null;
  if (!r) return { ok: true, data: DEFAULT_PRACTICE };
  const inv = r.invoice_details ?? {};
  return {
    ok: true,
    data: {
      dataRequests: r.default_data_requests ?? [],
      invoice: { name: str(inv.name), taxNumber: str(inv.tax_number), prefix: str(inv.prefix) },
      callsWithHiredClients: r.calls_with_hired_clients,
      stored: true,
    },
  };
}

async function write(me: string, row: Record<string, unknown>, fallback: string): Promise<Write> {
  const fail = (e: unknown): Write => ({ ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : fallback });
  const up = await from("practice_settings").update(row as never).eq("professional_id", me).select("professional_id");
  if (up.error) return fail(up.error);
  if ((up.data ?? []).length > 0) return { ok: true };
  const ins = await from("practice_settings").insert({ ...row, professional_id: me } as never);
  return ins.error ? fail(ins.error) : { ok: true };
}

export const saveDataRequests = (me: string, cats: AccessCategory[]) =>
  write(me, { default_data_requests: cats }, "Couldn't save your data requests. Try again.");

export const saveCallsWithHiredClients = (me: string, on: boolean) =>
  write(me, { calls_with_hired_clients: on }, "Couldn't save this setting. Try again.");

/**
 * Keeps any other keys already stored in invoice_details: the object is read,
 * the three keys this screen owns are replaced, and empty ones removed.
 */
export async function saveInvoiceDetails(me: string, d: InvoiceDetails): Promise<Write> {
  const { data, error } = await from("practice_settings").select("invoice_details").eq("professional_id", me).maybeSingle();
  if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't save your invoice details. Try again." };
  const prev = ((data as unknown as { invoice_details: Record<string, unknown> } | null)?.invoice_details ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...prev };
  const put = (k: string, v: string) => {
    const t = v.trim();
    if (t) next[k] = t;
    else delete next[k];
  };
  put("name", d.name);
  put("tax_number", d.taxNumber);
  put("prefix", d.prefix);
  return write(me, { invoice_details: next }, "Couldn't save your invoice details. Try again.");
}

/** practice_settings.gone_quiet_days (default 7); null when it couldn't be read. */
export async function fetchGoneQuietDays(me: string): Promise<number | null> {
  const { data, error } = await from("practice_settings").select("gone_quiet_days").eq("professional_id", me).maybeSingle();
  if (error) return null;
  return (data as unknown as { gone_quiet_days: number } | null)?.gone_quiet_days ?? 7;
}
