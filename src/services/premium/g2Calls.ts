// Round G2 · the Database calls (DB_G2_HANDOVER.md). EVERY ONE FAILS OPEN:
// a Database without G2 (a missing function) reads as "no limit / off", and
// a failed claim lets the action go ahead. The pure decisions are in ./g2.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import { premiumCodeMessage } from "./model";
import { exportErrorText, parseHistoryFrom, parsePremiumBooking, parseScansLeft, parseStreakShields, type PremiumBooking, type StreakShields } from "./g2";

type Err = { code?: string; message?: string; details?: string | null };
type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: Err | null }>;
// The functions are hand-typed in database.types; an untyped door for the
// offers one (offers isn't in the generated types) and to keep one shape.
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

async function safe(run: () => PromiseLike<{ data: unknown; error: Err | null }>): Promise<{ data: unknown; error: Err | null; thrown?: unknown }> {
  try {
    const r = await run();
    return { data: r.data, error: r.error };
  } catch (e) {
    return { data: null, error: null, thrown: e };
  }
}

// ---- barcode scans ----

export type BarcodeClaim = { kind: "ok"; scansLeft: number | null } | { kind: "limit" };

/**
 * claim_barcode_scan() for a scan answered from the catalogue the app
 * already has: the scans left (null = no limit). ATXQ2 is the free limit;
 * ANY OTHER FAILURE (a Database without G2, offline, an error) lets the scan
 * go ahead with nothing shown.
 */
export async function claimBarcodeScan(): Promise<BarcodeClaim> {
  const r = await safe(() => rpc("claim_barcode_scan"));
  if (r.error?.code === "ATXQ2") return { kind: "limit" };
  if (r.error || r.thrown) return { kind: "ok", scansLeft: null };
  return { kind: "ok", scansLeft: parseScansLeft(r.data) };
}

// ---- 14 days of history ----

/** my_history_from(): the first day a free member's charts show, or null (no cap, or any failure). */
export async function fetchHistoryFrom(): Promise<string | null> {
  const r = await safe(() => rpc("my_history_from"));
  return r.error || r.thrown ? null : parseHistoryFrom(r.data);
}

// ---- the full export ----

export type ExportResult = { ok: true; json: unknown } | { ok: false; message: string };

/** export_my_data(): the member's whole record as one JSON object. Always free; 3 a day (ATX02). */
export async function exportMyData(): Promise<ExportResult> {
  const r = await safe(() => rpc("export_my_data"));
  if (r.thrown) return { ok: false, message: isOffline(r.thrown) ? OFFLINE_MESSAGE : exportErrorText(null) };
  if (r.error) {
    if (isOffline(r.error)) return { ok: false, message: OFFLINE_MESSAGE };
    console.error("[export] export_my_data:", r.error.code, r.error.message);
    return { ok: false, message: exportErrorText(r.error.code) };
  }
  return { ok: true, json: r.data };
}

// ---- streak shields ----

/** my_streak_shields(): null when off, without Premium, or on any failure. */
export async function fetchStreakShields(): Promise<StreakShields | null> {
  const r = await safe(() => rpc("my_streak_shields"));
  return r.error || r.thrown ? null : parseStreakShields(r.data);
}

// ---- Premium-only offers ----

export type Saved<T> = { ok: true; value: T } | { ok: false; message: string };

/** set_offer_premium_only(p_offer_id, p_on): the offer's professional, or business staff with marketing. */
export async function setOfferPremiumOnly(offerId: string, on: boolean): Promise<Saved<boolean>> {
  const r = await safe(() => rpc("set_offer_premium_only", { p_offer_id: offerId, p_on: on }));
  if (r.thrown || (r.error && isOffline(r.error))) return { ok: false, message: OFFLINE_MESSAGE };
  if (r.error) {
    if (r.error.code === "42501") return { ok: false, message: t("Only the offer's owner can change this.") };
    return { ok: false, message: premiumCodeMessage(r.error.code, { message: r.error.message }) ?? t("Couldn't save. Try again.") };
  }
  const row = (Array.isArray(r.data) ? r.data[0] : r.data) as { premium_only?: unknown } | null;
  return { ok: true, value: row?.premium_only === true };
}

/** offers.premium_only for the owner's editor; null on a Database without G2 or any failure. */
export async function fetchOfferPremiumOnly(offerId: string): Promise<boolean | null> {
  const r = await safe(() => (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: Err | null }> } } } }).from("offers").select("premium_only").eq("id", offerId).maybeSingle());
  if (r.error || r.thrown || !r.data) return null;
  return (r.data as { premium_only?: unknown }).premium_only === true;
}

// ---- early booking and waitlist priority ----

/** A business's Premium class settings; null on a Database without G2 (no columns) or any failure. */
export async function fetchPremiumBooking(businessId: string): Promise<PremiumBooking | null> {
  const r = await safe(() => supabase.from("business_profiles").select("premium_early_booking_days, premium_waitlist_priority").eq("id", businessId).maybeSingle());
  return r.error || r.thrown ? null : parsePremiumBooking(r.data);
}

/** set_business_premium_booking: staff with schedule; 0 to 7 days. */
export async function setPremiumBooking(businessId: string, earlyDays: number, waitlistPriority: boolean): Promise<Saved<PremiumBooking>> {
  const r = await safe(() => supabase.rpc("set_business_premium_booking", { p_business_id: businessId, p_early_days: earlyDays, p_waitlist_priority: waitlistPriority }));
  if (r.thrown || (r.error && isOffline(r.error))) return { ok: false, message: OFFLINE_MESSAGE };
  if (r.error) {
    if (r.error.code === "42501") return { ok: false, message: t("Only staff who manage the schedule can change this.") };
    return { ok: false, message: premiumCodeMessage(r.error.code, { message: r.error.message }) ?? t("Couldn't save. Try again.") };
  }
  const b = parsePremiumBooking(r.data);
  return b ? { ok: true, value: b } : { ok: false, message: t("Couldn't save. Try again.") };
}
